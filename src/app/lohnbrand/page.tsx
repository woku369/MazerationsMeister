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
import { Truck, PackageCheck, Plus, Trash2 } from 'lucide-react';
import * as StockService from '@/lib/stock-service';
import * as LohnbrandService from '@/lib/lohnbrand-service';
import { calcLA } from '@/lib/mazeration-calc';
import { getTankDefinitions } from '@/lib/tank-sync';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { LohnbrandAuftrag, LohnbrandContainer } from '@/schemas/lohnbrandSchema';
import type { TankDefinition } from '@/schemas/tankSchema';

type DraftContainer = { inventoryItemId: string; mengeLiter: string };

function fmtL(n: number | undefined | null) {
  return n != null ? n.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '–';
}
function fmtLA(n: number | undefined | null) {
  return n != null ? `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} LA` : '–';
}
function fmtDate(iso: string | undefined) {
  if (!iso) return '–';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE');
}

export default function LohnbrandPage() {
  const { toast } = useToast();
  const [auftraege, setAuftraege] = useState<LohnbrandAuftrag[]>([]);
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);
  const [tanks, setTanks] = useState<TankDefinition[]>([]);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [lohnbrennerName, setLohnbrennerName] = useState('');
  const [ausgangsdatum, setAusgangsdatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [bemerkungen, setBemerkungen] = useState('');
  const [draftContainers, setDraftContainers] = useState<DraftContainer[]>([{ inventoryItemId: '', mengeLiter: '' }]);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [ruecklaufdatum, setRuecklaufdatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [ergebnisProduktName, setErgebnisProduktName] = useState('');
  const [ergebnisMengeLiter, setErgebnisMengeLiter] = useState('');
  const [ergebnisAlkoholVolProzent, setErgebnisAlkoholVolProzent] = useState('');
  const [zielTankNr, setZielTankNr] = useState('');

  const loadAll = () => {
    setAuftraege(LohnbrandService.readAll());
    setInventoryItems(StockService.readAll());
    setTanks(getTankDefinitions());
  };
  useEffect(() => { loadAll(); }, []);

  const unterwegs = auftraege.filter(a => a.status === 'unterwegs').sort((a, b) => b.ausgangsdatum.localeCompare(a.ausgangsdatum));
  const abgeschlossen = auftraege.filter(a => a.status === 'abgeschlossen').sort((a, b) => (b.ruecklaufdatum || '').localeCompare(a.ruecklaufdatum || ''));

  const availableItems = inventoryItems.filter(i => i.currentQuantityLiters > 0);

  function resetNewForm() {
    setLohnbrennerName('');
    setAusgangsdatum(new Date().toISOString().slice(0, 10));
    setBemerkungen('');
    setDraftContainers([{ inventoryItemId: '', mengeLiter: '' }]);
  }

  function addDraftRow() {
    setDraftContainers(prev => [...prev, { inventoryItemId: '', mengeLiter: '' }]);
  }
  function removeDraftRow(idx: number) {
    setDraftContainers(prev => prev.filter((_, i) => i !== idx));
  }
  function updateDraftRow(idx: number, patch: Partial<DraftContainer>) {
    setDraftContainers(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function buildContainerPayload(): LohnbrandContainer[] | null {
    const rows = draftContainers.filter(r => r.inventoryItemId);
    if (rows.length === 0) return null;
    const result: LohnbrandContainer[] = [];
    for (const r of rows) {
      const item = inventoryItems.find(i => i.id === r.inventoryItemId);
      if (!item) continue;
      const menge = parseFloat(r.mengeLiter.replace(',', '.'));
      if (!Number.isFinite(menge) || menge <= 0 || menge > item.currentQuantityLiters) return null;
      result.push({
        inventoryItemId: item.id,
        tankNr: item.tankNr,
        produktName: item.produktName,
        chargenNummer: item.chargenNummer,
        mengeLiter: menge,
        alkoholVolProzent: item.alcoholVolProzent,
      });
    }
    return result.length === rows.length ? result : null;
  }

  function handleCreateAuftrag() {
    if (!lohnbrennerName.trim()) {
      toast({ title: 'Lohnbrenner-Name fehlt', variant: 'destructive' });
      return;
    }
    const container = buildContainerPayload();
    if (!container) {
      toast({ title: 'Ungültige Gebinde-Auswahl', description: 'Bitte für jede Zeile ein Gebinde und eine gültige Menge (≤ verfügbarer Bestand) angeben.', variant: 'destructive' });
      return;
    }
    const auftrag = LohnbrandService.persistCreateAuftrag({
      lohnbrennerName: lohnbrennerName.trim(),
      ausgangsdatum,
      container,
      bemerkungen: bemerkungen.trim() || undefined,
    });
    toast({
      title: `Auftrag ${auftrag.auftragsNummer} angelegt`,
      description: `Abgang für ${container.length} Gebinde gebucht: ${container.reduce((s, c) => s + c.mengeLiter, 0).toFixed(1)} L, ${fmtLA(auftrag.ausgangsLA)} an ${lohnbrennerName.trim()}.`,
    });
    setIsNewOpen(false);
    resetNewForm();
    loadAll();
  }

  function openComplete(auftrag: LohnbrandAuftrag) {
    setCompletingId(auftrag.id);
    setRuecklaufdatum(new Date().toISOString().slice(0, 10));
    setErgebnisProduktName(`Destillat ${auftrag.container[0]?.produktName ?? ''}`.trim());
    setErgebnisMengeLiter('');
    setErgebnisAlkoholVolProzent('');
    setZielTankNr('');
  }

  function handleCompleteAuftrag() {
    if (!completingId) return;
    const menge = parseFloat(ergebnisMengeLiter.replace(',', '.'));
    const alk = parseFloat(ergebnisAlkoholVolProzent.replace(',', '.'));
    if (!ergebnisProduktName.trim() || !Number.isFinite(menge) || menge <= 0 || !Number.isFinite(alk) || alk < 0 || alk > 100 || !zielTankNr.trim()) {
      toast({ title: 'Angaben unvollständig oder ungültig', variant: 'destructive' });
      return;
    }
    LohnbrandService.persistCompleteAuftrag(completingId, {
      ruecklaufdatum,
      ergebnisProduktName: ergebnisProduktName.trim(),
      ergebnisMengeLiter: menge,
      ergebnisAlkoholVolProzent: alk,
      zielTankNr: zielTankNr.trim(),
    });
    const aktualisiert = LohnbrandService.readAll().find(a => a.id === completingId);
    toast({
      title: 'Rücklauf eingebucht',
      description: `${menge.toFixed(1)} L ${ergebnisProduktName.trim()} in ${zielTankNr.trim()} eingelagert. ${aktualisiert ? `Brennverlust: ${fmtLA(aktualisiert.verlustLA)}` : ''}`,
    });
    setCompletingId(null);
    loadAll();
  }

  const completingAuftrag = auftraege.find(a => a.id === completingId) || null;

  return (
    <div className="space-y-8 p-4 container mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Truck className="w-6 h-6" />Lohnbrand-Aufträge</h1>
          <p className="text-muted-foreground text-sm">Mazerate, die extern destilliert werden — Ausgang und Rücklauf im Überblick.</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)}><Plus className="w-4 h-4 mr-1" />Neuer Auftrag</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Truck className="w-5 h-5" />Unterwegs ({unterwegs.length})</CardTitle>
          <CardDescription>Material ist beim Lohnbrenner, noch kein Rücklauf verbucht.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {unterwegs.length === 0 && <p className="text-sm text-muted-foreground">Kein Auftrag unterwegs.</p>}
          {unterwegs.map(a => (
            <div key={a.id} className="border rounded-lg p-3 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.auftragsNummer}</span>
                  <Badge variant="outline">{a.lohnbrennerName}</Badge>
                  <span className="text-xs text-muted-foreground">Ausgang: {fmtDate(a.ausgangsdatum)}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {a.container.map((c, i) => (
                    <div key={i}>{c.produktName} ({c.tankNr}): {fmtL(c.mengeLiter)} L, {c.alkoholVolProzent}% → {fmtLA(calcLA(c.mengeLiter, c.alkoholVolProzent))}</div>
                  ))}
                  <div className="font-medium text-foreground mt-0.5">Σ Ausgang: {fmtL(a.container.reduce((s, c) => s + c.mengeLiter, 0))} L, {fmtLA(a.ausgangsLA)}</div>
                </div>
                {a.bemerkungen && <p className="text-xs text-muted-foreground mt-1 italic">{a.bemerkungen}</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => openComplete(a)}>
                <PackageCheck className="w-4 h-4 mr-1" />Rücklauf verbuchen
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Abgeschlossen ({abgeschlossen.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {abgeschlossen.length === 0 && <p className="text-sm text-muted-foreground">Noch kein abgeschlossener Auftrag.</p>}
          {abgeschlossen.map(a => (
            <div key={a.id} className="border rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{a.auftragsNummer}</span>
                <Badge variant="secondary">{a.lohnbrennerName}</Badge>
                <span className="text-xs text-muted-foreground">{fmtDate(a.ausgangsdatum)} → {fmtDate(a.ruecklaufdatum)}</span>
              </div>
              <div className="text-muted-foreground mt-1">
                {fmtL(a.ergebnisMengeLiter)} L {a.ergebnisProduktName} ({a.ergebnisAlkoholVolProzent}%) → {a.zielTankNr}
              </div>
              <div className="mt-1 font-medium">
                {fmtLA(a.ausgangsLA)} Ausgang → {fmtLA(a.ergebnisLA)} Rücklauf
                {a.verlustLA != null && (
                  <span className={a.verlustLA > 0 ? 'text-amber-700' : a.verlustLA < 0 ? 'text-red-700' : ''}>
                    {' '}(Verlust: {fmtLA(a.verlustLA)}{a.ausgangsLA > 0 ? `, ${((a.verlustLA / a.ausgangsLA) * 100).toFixed(1)}%` : ''})
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Neuer Auftrag */}
      <Dialog open={isNewOpen} onOpenChange={(open) => { setIsNewOpen(open); if (!open) resetNewForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neuer Lohnbrand-Auftrag</DialogTitle>
            <DialogDescription>Der Abgang für alle ausgewählten Gebinde wird sofort gebucht, sobald der Auftrag angelegt wird.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lohnbrenner</Label>
                <Input value={lohnbrennerName} onChange={e => setLohnbrennerName(e.target.value)} placeholder="Name / Firma" />
              </div>
              <div>
                <Label>Ausgangsdatum</Label>
                <Input type="date" value={ausgangsdatum} onChange={e => setAusgangsdatum(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gebinde</Label>
              {draftContainers.map((row, idx) => {
                const item = inventoryItems.find(i => i.id === row.inventoryItemId);
                const menge = parseFloat(row.mengeLiter.replace(',', '.'));
                const rowLA = item && Number.isFinite(menge) && menge > 0 ? calcLA(menge, item.alcoholVolProzent) : null;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={row.inventoryItemId} onValueChange={v => updateDraftRow(idx, { inventoryItemId: v, mengeLiter: inventoryItems.find(i => i.id === v)?.currentQuantityLiters.toFixed(1) ?? '' })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Gebinde wählen" /></SelectTrigger>
                      <SelectContent>
                        {availableItems.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.produktName} — {i.tankNr} ({fmtL(i.currentQuantityLiters)} L, {i.alcoholVolProzent}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="text" inputMode="decimal" className="w-28"
                      placeholder="Menge (L)"
                      value={row.mengeLiter}
                      onChange={e => updateDraftRow(idx, { mengeLiter: e.target.value })}
                    />
                    <span className="text-xs text-muted-foreground shrink-0 w-32">
                      {item && `/ ${fmtL(item.currentQuantityLiters)} L`}
                      {rowLA != null && ` · ${fmtLA(rowLA)}`}
                    </span>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeDraftRow(idx)} disabled={draftContainers.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              <Button type="button" size="sm" variant="outline" onClick={addDraftRow}><Plus className="w-4 h-4 mr-1" />Weiteres Gebinde</Button>
              {(() => {
                const container = buildContainerPayload();
                if (!container || container.length === 0) return null;
                const gesamtL = container.reduce((s, c) => s + c.mengeLiter, 0);
                const gesamtLA = LohnbrandService.calcContainerLA(container);
                return (
                  <p className="text-sm font-medium text-right pt-1">
                    Σ Gesamt: {fmtL(gesamtL)} L, {fmtLA(gesamtLA)}
                  </p>
                );
              })()}
            </div>

            <div>
              <Label>Bemerkungen</Label>
              <Textarea value={bemerkungen} onChange={e => setBemerkungen(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreateAuftrag}>Auftrag anlegen &amp; Abgang buchen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rücklauf verbuchen */}
      <Dialog open={!!completingId} onOpenChange={(open) => !open && setCompletingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rücklauf verbuchen{completingAuftrag ? ` – ${completingAuftrag.auftragsNummer}` : ''}</DialogTitle>
            <DialogDescription>Bucht das Destillat als neuen Lagerposten im Zieltank ein.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {completingAuftrag && (
              <p className="text-sm bg-muted rounded-md px-3 py-2">Ausgangs-LA (unversteuert): <span className="font-semibold">{fmtLA(completingAuftrag.ausgangsLA)}</span></p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rücklaufdatum</Label>
                <Input type="date" value={ruecklaufdatum} onChange={e => setRuecklaufdatum(e.target.value)} />
              </div>
              <div>
                <Label>Zieltank</Label>
                <Select value={zielTankNr} onValueChange={setZielTankNr}>
                  <SelectTrigger><SelectValue placeholder="Tank wählen" /></SelectTrigger>
                  <SelectContent>
                    {tanks.map(t => (
                      <SelectItem key={t.tankNr} value={t.tankNr}>{t.bezeichnung} ({t.tankNr})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Produktname (Destillat)</Label>
              <Input value={ergebnisProduktName} onChange={e => setErgebnisProduktName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Menge (L)</Label>
                <Input type="text" inputMode="decimal" value={ergebnisMengeLiter} onChange={e => setErgebnisMengeLiter(e.target.value)} />
              </div>
              <div>
                <Label>Alkohol (%vol.)</Label>
                <Input type="text" inputMode="decimal" value={ergebnisAlkoholVolProzent} onChange={e => setErgebnisAlkoholVolProzent(e.target.value)} />
              </div>
            </div>
            {(() => {
              if (!completingAuftrag) return null;
              const menge = parseFloat(ergebnisMengeLiter.replace(',', '.'));
              const alk = parseFloat(ergebnisAlkoholVolProzent.replace(',', '.'));
              if (!Number.isFinite(menge) || menge <= 0 || !Number.isFinite(alk) || alk < 0) return null;
              const ergebnisLA = calcLA(menge, alk);
              const verlustLA = completingAuftrag.ausgangsLA - ergebnisLA;
              const verlustPct = completingAuftrag.ausgangsLA > 0 ? (verlustLA / completingAuftrag.ausgangsLA) * 100 : 0;
              return (
                <p className={`text-sm font-medium ${verlustLA < 0 ? 'text-red-700' : 'text-amber-700'}`}>
                  Rücklauf: {fmtLA(ergebnisLA)} — Verlust beim Brennen: {fmtLA(verlustLA)} ({verlustPct.toFixed(1)}%)
                </p>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingId(null)}>Abbrechen</Button>
            <Button onClick={handleCompleteAuftrag}>Rücklauf einbuchen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
