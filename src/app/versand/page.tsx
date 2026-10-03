"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, Plus, Trash2 } from 'lucide-react';
import * as StockService from '@/lib/stock-service';
import * as VersandService from '@/lib/versand-service';
import * as LeergebindeService from '@/lib/leergebinde-service';
import { calcLA } from '@/lib/mazeration-calc';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { LohnabfuellerVersand, VersandContainer } from '@/schemas/versandSchema';
import type { Leergebinde } from '@/schemas/leergebindeSchema';

type DraftRow = { leergebindeId: string };

function fmtL(n: number | undefined | null) {
  return n != null ? n.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '–';
}
function fmtLA(n: number | undefined | null) {
  return n != null ? `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} LA` : '–';
}
function fmtKg(n: number | undefined | null) {
  return n != null ? `${n.toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg` : '–';
}
function fmtDate(iso: string | undefined) {
  if (!iso) return '–';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE');
}

export default function VersandPage() {
  const { toast } = useToast();
  const [versaende, setVersaende] = useState<LohnabfuellerVersand[]>([]);
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);
  const [gebinde, setGebinde] = useState<Leergebinde[]>([]);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [lohnabfuellerName, setLohnabfuellerName] = useState('');
  const [versanddatum, setVersanddatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [bemerkungen, setBemerkungen] = useState('');
  const [draftRows, setDraftRows] = useState<DraftRow[]>([{ leergebindeId: '' }]);
  // Nur zur Dokumentation für das externe (Schlumberger-)Lieferschein-Papierformular -
  // die App erzeugt daraus kein eigenes Dokument, siehe versandSchema.ts.
  const [plombenNummern, setPlombenNummern] = useState('');
  const [externeLieferscheinNr, setExterneLieferscheinNr] = useState('');

  const loadAll = () => {
    setVersaende(VersandService.readAll());
    setInventoryItems(StockService.readAll());
    setGebinde(LeergebindeService.readAll());
  };
  useEffect(() => { loadAll(); }, []);

  const historie = [...versaende].sort((a, b) => b.versanddatum.localeCompare(a.versanddatum));
  const befuellteGebinde = gebinde.filter(g => g.status === 'befuellt');

  function resetNewForm() {
    setLohnabfuellerName('Mozart');
    setVersanddatum(new Date().toISOString().slice(0, 10));
    setBemerkungen('');
    setDraftRows([{ leergebindeId: '' }]);
    setPlombenNummern('');
    setExterneLieferscheinNr('');
  }

  function addDraftRow() {
    setDraftRows(prev => [...prev, { leergebindeId: '' }]);
  }
  function removeDraftRow(idx: number) {
    setDraftRows(prev => prev.filter((_, i) => i !== idx));
  }
  function updateDraftRow(idx: number, patch: Partial<DraftRow>) {
    setDraftRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function buildContainerPayload(): VersandContainer[] | null {
    const rows = draftRows.filter(r => r.leergebindeId);
    if (rows.length === 0) return null;
    const result: VersandContainer[] = [];
    for (const r of rows) {
      const g = gebinde.find(x => x.id === r.leergebindeId);
      const item = g?.inventoryItemId ? inventoryItems.find(i => i.id === g.inventoryItemId) : undefined;
      if (!g || !item) continue;
      result.push({
        inventoryItemId: item.id,
        leergebindeId: g.id,
        tankNr: item.tankNr,
        produktName: item.produktName,
        chargenNummer: item.chargenNummer,
        mengeLiter: item.currentQuantityLiters,
        alkoholVolProzent: item.alcoholVolProzent,
        dichte20C: item.dichte20C,
        taraKg: g.taraKg,
      });
    }
    return result.length === rows.length ? result : null;
  }

  function handleCreateVersand() {
    if (!lohnabfuellerName.trim()) {
      toast({ title: 'Lohnabfüller-Name fehlt', variant: 'destructive' });
      return;
    }
    const container = buildContainerPayload();
    if (!container) {
      toast({ title: 'Ungültige Gebinde-Auswahl', description: 'Bitte für jede Zeile ein befülltes Leergebinde angeben.', variant: 'destructive' });
      return;
    }
    const result = VersandService.persistCreateVersand({
      lohnabfuellerName: lohnabfuellerName.trim(),
      versanddatum,
      container,
      bemerkungen: bemerkungen.trim() || undefined,
      plombenNummern: plombenNummern.trim() || undefined,
      externeLieferscheinNr: externeLieferscheinNr.trim() || undefined,
    });
    if (!result.ok) {
      toast({ title: 'Versand nicht möglich', description: result.error, variant: 'destructive' });
      return;
    }
    const versand = result.versand;
    for (const c of container) {
      LeergebindeService.persistMarkVersendet(c.leergebindeId);
    }
    toast({
      title: `Versand ${versand.versandNummer} gebucht`,
      description: `Abgang für ${container.length} Gebinde gebucht: ${container.reduce((s, c) => s + c.mengeLiter, 0).toFixed(1)} L, ${fmtLA(versand.versandLA)} an ${lohnabfuellerName.trim()}.`,
    });
    setIsNewOpen(false);
    resetNewForm();
    loadAll();
  }

  return (
    <div className="space-y-8 p-4 container mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Send className="w-6 h-6" />Versand an Lohnabfüller</h1>
          <p className="text-muted-foreground text-sm">Befüllte Leergebinde (z.B. IBCs mit GFKC bulk) versenden — bucht den Abgang aus dem Lager.</p>
        </div>
        <Button onClick={() => { resetNewForm(); setIsNewOpen(true); }}><Plus className="w-4 h-4 mr-1" />Neuer Versand</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Versand-Historie ({historie.length})</CardTitle>
          <CardDescription>Nur der Versand (Abgang) wird geführt — fertig abgefüllte Ware kommt als Flaschen zurück und wird nicht als Bulk-Bestand in dieser App getrackt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {historie.length === 0 && <p className="text-sm text-muted-foreground">Noch kein Versand erfasst.</p>}
          {historie.map(v => (
            <div key={v.id} className="border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{v.versandNummer}</span>
                <Badge variant="outline">{v.lohnabfuellerName}</Badge>
                <span className="text-xs text-muted-foreground">Versand: {fmtDate(v.versanddatum)}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {v.container.map((c, i) => (
                  <div key={i}>{c.produktName} ({c.tankNr}): {fmtL(c.mengeLiter)} L, {c.alkoholVolProzent}% → {fmtLA(calcLA(c.mengeLiter, c.alkoholVolProzent))}{c.taraKg != null && ` · Tara ${fmtKg(c.taraKg)}`}</div>
                ))}
                <div className="font-medium text-foreground mt-0.5">Σ Versand: {fmtL(v.container.reduce((s, c) => s + c.mengeLiter, 0))} L, {fmtLA(v.versandLA)}</div>
              </div>
              {v.bemerkungen && <p className="text-xs text-muted-foreground mt-1 italic">{v.bemerkungen}</p>}
              {(() => {
                const nettoKg = VersandService.calcContainerNettogewichtKg(v.container);
                const bruttoKg = VersandService.calcContainerBruttogewichtKg(v.container);
                const chargen = Array.from(new Set(v.container.map(c => c.chargenNummer).filter(Boolean)));
                return (
                  <div className="mt-2 pt-2 border-t text-xs space-y-0.5">
                    <p className="font-medium text-foreground">Für das Lieferschein-Formular (Ladestelle: Stift Gurk, Domplatz 11, 9342 Gurk):</p>
                    <p>Charge: {chargen.length > 0 ? chargen.join(', ') : '–'} · Gebinde: {v.container.length}× {v.container[0]?.tankNr ?? ''}</p>
                    <p>
                      Nettogewicht: {nettoKg != null ? `${fmtL(nettoKg)} kg` : 'nicht berechenbar (Dichte fehlt bei mind. einem Posten)'}
                      {bruttoKg != null && ` · Bruttogewicht (inkl. Tara): ${fmtL(bruttoKg)} kg`}
                    </p>
                    {(v.plombenNummern || v.externeLieferscheinNr) && (
                      <p>{v.plombenNummern && `Plomben: ${v.plombenNummern}`}{v.plombenNummern && v.externeLieferscheinNr && ' · '}{v.externeLieferscheinNr && `Schlumberger-Lieferschein-Nr.: ${v.externeLieferscheinNr}`}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Neuer Versand */}
      <Dialog open={isNewOpen} onOpenChange={(open) => { setIsNewOpen(open); if (!open) resetNewForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neuer Versand an Lohnabfüller</DialogTitle>
            <DialogDescription>Der Abgang für alle ausgewählten Gebinde wird sofort gebucht, sobald der Versand angelegt wird. Jedes Gebinde geht komplett (mit seiner gesamten Füllmenge) raus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lohnabfüller</Label>
                <Input value={lohnabfuellerName} onChange={e => setLohnabfuellerName(e.target.value)} placeholder="z.B. Mozart" />
              </div>
              <div>
                <Label>Versanddatum</Label>
                <Input type="date" value={versanddatum} onChange={e => setVersanddatum(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gebinde (befüllte Leergebinde)</Label>
              {befuellteGebinde.length === 0 && (
                <p className="text-xs text-amber-700">Keine befüllten Leergebinde vorhanden — zuerst unter „Leergebinde" ein Gebinde befüllen.</p>
              )}
              {draftRows.map((row, idx) => {
                const g = gebinde.find(x => x.id === row.leergebindeId);
                const item = g?.inventoryItemId ? inventoryItems.find(i => i.id === g.inventoryItemId) : undefined;
                const rowLA = item ? calcLA(item.currentQuantityLiters, item.alcoholVolProzent) : null;
                const bereitsGewaehlt = new Set(draftRows.filter((_, i) => i !== idx).map(r => r.leergebindeId));
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={row.leergebindeId} onValueChange={v => updateDraftRow(idx, { leergebindeId: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Gebinde wählen" /></SelectTrigger>
                      <SelectContent>
                        {befuellteGebinde.filter(bg => !bereitsGewaehlt.has(bg.id)).map(bg => {
                          const bgItem = bg.inventoryItemId ? inventoryItems.find(i => i.id === bg.inventoryItemId) : undefined;
                          return (
                            <SelectItem key={bg.id} value={bg.id}>
                              {bg.bezeichnung}{bgItem && ` — ${bgItem.produktName} (${fmtL(bgItem.currentQuantityLiters)} L, ${bgItem.alcoholVolProzent}%)`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground shrink-0 w-36">
                      {item && `${fmtL(item.currentQuantityLiters)} L`}
                      {rowLA != null && ` · ${fmtLA(rowLA)}`}
                      {g && ` · Tara ${fmtKg(g.taraKg)}`}
                    </span>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeDraftRow(idx)} disabled={draftRows.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              <Button type="button" size="sm" variant="outline" onClick={addDraftRow} disabled={draftRows.length >= befuellteGebinde.length}><Plus className="w-4 h-4 mr-1" />Weiteres Gebinde</Button>
              {(() => {
                const container = buildContainerPayload();
                if (!container || container.length === 0) return null;
                const gesamtL = container.reduce((s, c) => s + c.mengeLiter, 0);
                const gesamtLA = VersandService.calcContainerLA(container);
                const nettoKg = VersandService.calcContainerNettogewichtKg(container);
                const bruttoKg = VersandService.calcContainerBruttogewichtKg(container);
                return (
                  <p className="text-sm font-medium text-right pt-1">
                    Σ Gesamt: {fmtL(gesamtL)} L, {fmtLA(gesamtLA)}
                    {bruttoKg != null && ` · Brutto ${fmtL(bruttoKg)} kg`}
                    {bruttoKg == null && nettoKg != null && ` · Netto ${fmtL(nettoKg)} kg (Tara fehlt für Brutto)`}
                  </p>
                );
              })()}
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium">Für das externe Lieferschein-Formular (optional)</p>
              <p className="text-xs text-muted-foreground -mt-2">Nur zur Dokumentation — die App erzeugt kein eigenes Lieferschein-PDF, das offizielle Formular läuft auf Schlumberger-Briefkopf. Brutto-/Nettogewicht werden oben automatisch aus den Gebinde-Werten berechnet.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plomben-Nummern</Label>
                  <Input value={plombenNummern} onChange={e => setPlombenNummern(e.target.value)} placeholder="z.B. 2762725-2762730" />
                </div>
                <div>
                  <Label>Externe Lieferschein-Nr. (Schlumberger)</Label>
                  <Input value={externeLieferscheinNr} onChange={e => setExterneLieferscheinNr(e.target.value)} placeholder="z.B. 1/2026" />
                </div>
              </div>
            </div>

            <div>
              <Label>Bemerkungen</Label>
              <Textarea value={bemerkungen} onChange={e => setBemerkungen(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreateVersand}>Versand anlegen &amp; Abgang buchen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
