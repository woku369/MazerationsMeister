"use client";
import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableIcon, FileSpreadsheet, Trash2 } from 'lucide-react';

interface Protocol {
  id?: string;
  macerationName?: string;
  batchNumber?: string;
  creationDate?: string;
  plantName?: string;
  plantPart?: string;
  plantWeight?: number | null;
  plantWeightUnit?: string;
  alcoholType?: string;
  alcoholVolume?: number | null;
  alcoholVolumeUnit?: string;
  alcoholConcentration?: number | null;
  macerationStart?: string;
  macerationEnd?: string;
  yieldVolume?: number | null;
  yieldVolumeUnit?: string;
  endConcentration?: number | null;
  roomTemperature?: number | null;
  remarks?: string;
  [key: string]: unknown;
}

function toL(vol: number | null | undefined, unit: string | undefined): number | null {
  if (!vol) return null;
  return unit === 'ml' ? vol / 1000 : vol;
}

function laL(vol: number | null | undefined, unit: string | undefined, conc: number | null | undefined): number | null {
  const vL = toL(vol, unit);
  if (!vL || !conc) return null;
  return vL * conc / 100;
}

function fmtN(v: number | null | undefined, dec = 3) {
  return v != null ? v.toFixed(dec).replace('.', ',') : '–';
}

function fmtKraut(p: Protocol) {
  if (!p.plantWeight) return '–';
  return `${String(p.plantWeight).replace('.', ',')} ${p.plantWeightUnit || 'g'}`;
}

function fmtDate(s: string | undefined) {
  if (!s) return '–';
  return s.split('-').reverse().join('.');
}

export default function SammellistePage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mazerationProtocols');
      if (stored) setProtocols(JSON.parse(stored));
    } catch {}
    try {
      const sl = localStorage.getItem('sammellisteIds');
      if (sl) setSelectedIds(new Set(JSON.parse(sl)));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('sammellisteIds', JSON.stringify([...selectedIds]));
  }, [selectedIds]);

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selected = useMemo(
    () => protocols
      .filter(p => p.id && selectedIds.has(p.id))
      .sort((a, b) => (a.creationDate || '').localeCompare(b.creationDate || '')),
    [protocols, selectedIds]
  );

  const totals = useMemo(() => {
    let krautG = 0, laEin = 0, mazerat = 0, laAus = 0;
    selected.forEach(p => {
      if (p.plantWeight) krautG += p.plantWeightUnit === 'kg' ? p.plantWeight * 1000 : p.plantWeight;
      const le = laL(p.alcoholVolume, p.alcoholVolumeUnit, p.alcoholConcentration);
      const ml = toL(p.yieldVolume, p.yieldVolumeUnit);
      const la = laL(p.yieldVolume, p.yieldVolumeUnit, p.endConcentration);
      if (le) laEin += le;
      if (ml) mazerat += ml;
      if (la) laAus += la;
    });
    const krautStr = krautG >= 1000 ? `${(krautG / 1000).toFixed(2).replace('.', ',')} kg` : `${krautG.toFixed(0)} g`;
    return { krautStr, laEin, mazerat, laAus };
  }, [selected]);

  function exportXLSX() {
    if (!selected.length) return;
    const header = ['Datum', 'Bezeichnung', 'Charge', 'Pflanze', 'Pflanzenteil',
      'Kraut (Menge)', 'Einheit Kraut', 'Alkoholtyp', 'Sprit (L)', 'Alkohol (%vol)',
      'LA Einsatz (L abs.)', 'Mazerat (L)', 'Endalkohol (%vol)', 'LA Ausbeute (L abs.)',
      'Beginn', 'Ende', 'Temp (°C)', 'Bemerkungen'];

    const rows = selected.map(p => {
      const spritL = toL(p.alcoholVolume, p.alcoholVolumeUnit);
      const mazL = toL(p.yieldVolume, p.yieldVolumeUnit);
      const le = laL(p.alcoholVolume, p.alcoholVolumeUnit, p.alcoholConcentration);
      const la = laL(p.yieldVolume, p.yieldVolumeUnit, p.endConcentration);
      return [
        p.creationDate || '', p.macerationName || '', p.batchNumber || '',
        p.plantName || '', p.plantPart || '',
        p.plantWeight ?? '', p.plantWeightUnit || '',
        p.alcoholType || '', spritL != null ? Math.round(spritL * 1000) / 1000 : '',
        p.alcoholConcentration ?? '',
        le != null ? Math.round(le * 1000) / 1000 : '',
        mazL != null ? Math.round(mazL * 1000) / 1000 : '',
        p.endConcentration ?? '',
        la != null ? Math.round(la * 1000) / 1000 : '',
        p.macerationStart || '', p.macerationEnd || '',
        p.roomTemperature ?? '', p.remarks || '',
      ];
    });

    let krautG = 0;
    selected.forEach(p => { if (p.plantWeight) krautG += p.plantWeightUnit === 'kg' ? p.plantWeight * 1000 : p.plantWeight; });
    const sumRow = ['∑ Gesamt', '', `${selected.length} Chargen`, '', '',
      krautG >= 1000 ? Math.round(krautG / 10) / 100 : krautG,
      krautG >= 1000 ? 'kg' : 'g',
      '', '', '',
      Math.round(totals.laEin * 1000) / 1000,
      Math.round(totals.mazerat * 1000) / 1000, '',
      Math.round(totals.laAus * 1000) / 1000,
      '', '', '', ''];

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows, [], sumRow]);
    ws['!cols'] = [10,20,10,18,16,10,8,14,10,10,12,10,12,12,12,12,8,30].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sammelliste');
    XLSX.writeFile(wb, `Sammelliste_Mazerationen_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  }

  return (
    <main className="px-4 py-8" style={{ marginLeft: '16rem', width: 'calc(100% - 16rem)' }}>
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-sans text-3xl md:text-4xl text-primary">Sammelliste Mazerationen</h1>
          <p className="text-muted-foreground mt-2 text-sm">Protokolle auswählen → Übersichtstabelle + XLSX-Export</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Linke Spalte: Protokollauswahl */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-muted-foreground" />
                  Protokolle ({protocols.length})
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-xs text-muted-foreground">
                  Auswahl leeren
                </Button>
              </div>
              {protocols.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Keine Protokolle gespeichert</p>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {[...protocols].sort((a, b) => (b.creationDate || '').localeCompare(a.creationDate || '')).map((p, i) => {
                    const id = p.id || String(i);
                    return (
                      <label key={id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                        <Checkbox
                          checked={selectedIds.has(id)}
                          onCheckedChange={() => toggleId(id)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{p.macerationName || '–'}</div>
                          <div className="text-xs text-muted-foreground">{p.batchNumber} · {fmtDate(p.creationDate)}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Rechte Spalte: Tabelle */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base">{selected.length} Chargen ausgewählt</h2>
                <div className="flex gap-2">
                  <Button onClick={exportXLSX} disabled={!selected.length} size="sm" variant="outline" className="gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    XLSX
                  </Button>
                  <Button
                    onClick={() => setSelectedIds(prev => {
                      const next = new Set(prev);
                      selected.forEach(p => p.id && next.delete(p.id));
                      return next;
                    })}
                    disabled={!selected.length}
                    size="sm"
                    variant="ghost"
                    className="gap-2 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selected.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Protokolle links auswählen</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: 700 }}>
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {['Datum', 'Bezeichnung / Ch.', 'Kraut', 'Sprit (L / %)', 'LA Einsatz', 'Mazerat (L)', 'Alk.%', 'LA Ausbeute'].map(h => (
                          <th key={h} className="p-2 text-right first:text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.map((p, i) => {
                        const spritL = toL(p.alcoholVolume, p.alcoholVolumeUnit);
                        const mazL = toL(p.yieldVolume, p.yieldVolumeUnit);
                        const le = laL(p.alcoholVolume, p.alcoholVolumeUnit, p.alcoholConcentration);
                        const la = laL(p.yieldVolume, p.yieldVolumeUnit, p.endConcentration);
                        const spritStr = spritL != null
                          ? `${spritL.toFixed(2).replace('.', ',')} L${p.alcoholConcentration ? ` / ${String(p.alcoholConcentration).replace('.', ',')}%` : ''}`
                          : '–';
                        return (
                          <tr key={p.id || i} className="border-b hover:bg-accent/30">
                            <td className="p-2 whitespace-nowrap">{fmtDate(p.creationDate)}</td>
                            <td className="p-2">
                              <div className="font-medium">{p.macerationName}</div>
                              <div className="text-muted-foreground">{p.batchNumber}</div>
                            </td>
                            <td className="p-2 text-right whitespace-nowrap">{fmtKraut(p)}</td>
                            <td className="p-2 text-right whitespace-nowrap">{spritStr}</td>
                            <td className="p-2 text-right whitespace-nowrap font-medium">{le != null ? fmtN(le) + ' L' : '–'}</td>
                            <td className="p-2 text-right whitespace-nowrap">{mazL != null ? fmtN(mazL, 2) + ' L' : '–'}</td>
                            <td className="p-2 text-right whitespace-nowrap">{p.endConcentration != null ? String(p.endConcentration).replace('.', ',') + ' %' : '–'}</td>
                            <td className="p-2 text-right whitespace-nowrap font-medium">{la != null ? fmtN(la) + ' L' : '–'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-primary/10 font-bold">
                        <td className="p-2" colSpan={2}>∑ Gesamt ({selected.length} Chargen)</td>
                        <td className="p-2 text-right whitespace-nowrap">{totals.krautStr}</td>
                        <td className="p-2"></td>
                        <td className="p-2 text-right whitespace-nowrap">{fmtN(totals.laEin)} L</td>
                        <td className="p-2 text-right whitespace-nowrap">{fmtN(totals.mazerat, 2)} L</td>
                        <td className="p-2"></td>
                        <td className="p-2 text-right whitespace-nowrap">{fmtN(totals.laAus)} L</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
