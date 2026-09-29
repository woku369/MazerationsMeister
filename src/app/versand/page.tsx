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
import { calcLA } from '@/lib/mazeration-calc';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { LohnabfuellerVersand, VersandContainer } from '@/schemas/versandSchema';

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

export default function VersandPage() {
  const { toast } = useToast();
  const [versaende, setVersaende] = useState<LohnabfuellerVersand[]>([]);
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [lohnabfuellerName, setLohnabfuellerName] = useState('');
  const [versanddatum, setVersanddatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [bemerkungen, setBemerkungen] = useState('');
  const [draftContainers, setDraftContainers] = useState<DraftContainer[]>([{ inventoryItemId: '', mengeLiter: '' }]);
  // Nur zur Dokumentation für das externe (Schlumberger-)Lieferschein-Papierformular -
  // die App erzeugt daraus kein eigenes Dokument, siehe versandSchema.ts.
  const [plombenNummern, setPlombenNummern] = useState('');
  const [externeLieferscheinNr, setExterneLieferscheinNr] = useState('');
  const [bruttogewichtKg, setBruttogewichtKg] = useState('');
  const [taragewichtKg, setTaragewichtKg] = useState('');

  const loadAll = () => {
    setVersaende(VersandService.readAll());
    setInventoryItems(StockService.readAll());
  };
  useEffect(() => { loadAll(); }, []);

  const historie = [...versaende].sort((a, b) => b.versanddatum.localeCompare(a.versanddatum));
  const availableItems = inventoryItems.filter(i => i.currentQuantityLiters > 0);

  function resetNewForm() {
    setLohnabfuellerName('Mozart');
    setVersanddatum(new Date().toISOString().slice(0, 10));
    setBemerkungen('');
    setDraftContainers([{ inventoryItemId: '', mengeLiter: '' }]);
    setPlombenNummern('');
    setExterneLieferscheinNr('');
    setBruttogewichtKg('');
    setTaragewichtKg('');
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

  function buildContainerPayload(): VersandContainer[] | null {
    const rows = draftContainers.filter(r => r.inventoryItemId);
    if (rows.length === 0) return null;
    const result: VersandContainer[] = [];
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
        dichte20C: item.dichte20C,
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
      toast({ title: 'Ungültige Gebinde-Auswahl', description: 'Bitte für jede Zeile ein Gebinde und eine gültige Menge (≤ verfügbarer Bestand) angeben.', variant: 'destructive' });
      return;
    }
    const bruttogewicht = parseFloat(bruttogewichtKg.replace(',', '.'));
    const taragewicht = parseFloat(taragewichtKg.replace(',', '.'));
    const versand = VersandService.persistCreateVersand({
      lohnabfuellerName: lohnabfuellerName.trim(),
      versanddatum,
      container,
      bemerkungen: bemerkungen.trim() || undefined,
      bruttogewichtKg: Number.isFinite(bruttogewicht) && bruttogewicht > 0 ? bruttogewicht : undefined,
      taragewichtKg: Number.isFinite(taragewicht) && taragewicht > 0 ? taragewicht : undefined,
      plombenNummern: plombenNummern.trim() || undefined,
      externeLieferscheinNr: externeLieferscheinNr.trim() || undefined,
    });
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
          <p className="text-muted-foreground text-sm">Fertige Ware (z.B. GFKC bulk) zur Abfüllung versenden — bucht den Abgang aus dem Lager.</p>
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
                  <div key={i}>{c.produktName} ({c.tankNr}): {fmtL(c.mengeLiter)} L, {c.alkoholVolProzent}% → {fmtLA(calcLA(c.mengeLiter, c.alkoholVolProzent))}</div>
                ))}
                <div className="font-medium text-foreground mt-0.5">Σ Versand: {fmtL(v.container.reduce((s, c) => s + c.mengeLiter, 0))} L, {fmtLA(v.versandLA)}</div>
              </div>
              {v.bemerkungen && <p className="text-xs text-muted-foreground mt-1 italic">{v.bemerkungen}</p>}
              {(() => {
                const nettoKgSchaetzung = VersandService.calcContainerNettogewichtKg(v.container);
                const nettoKgGewogen = v.bruttogewichtKg != null && v.taragewichtKg != null ? v.bruttogewichtKg - v.taragewichtKg : null;
                const chargen = Array.from(new Set(v.container.map(c => c.chargenNummer).filter(Boolean)));
                return (
                  <div className="mt-2 pt-2 border-t text-xs space-y-0.5">
                    <p className="font-medium text-foreground">Für das Lieferschein-Formular (Ladestelle: Stift Gurk, Domplatz 11, 9342 Gurk):</p>
                    <p>Charge: {chargen.length > 0 ? chargen.join(', ') : '–'} · Gebinde: {v.container.length}× {v.container[0]?.tankNr ?? ''}</p>
                    <p>Nettogewicht (Schätzung aus Menge × Dichte): {nettoKgSchaetzung != null ? `${fmtL(nettoKgSchaetzung)} kg` : 'nicht berechenbar (Dichte fehlt bei mind. einem Posten)'}</p>
                    {(v.bruttogewichtKg != null || v.taragewichtKg != null) && (
                      <p>
                        {v.bruttogewichtKg != null && `Bruttogewicht (Waage): ${fmtL(v.bruttogewichtKg)} kg`}
                        {v.bruttogewichtKg != null && v.taragewichtKg != null && ' · '}
                        {v.taragewichtKg != null && `Taragewicht (Waage): ${fmtL(v.taragewichtKg)} kg`}
                        {nettoKgGewogen != null && ` · Nettogewicht (gewogen): ${fmtL(nettoKgGewogen)} kg`}
                      </p>
                    )}
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
            <DialogDescription>Der Abgang für alle ausgewählten Gebinde wird sofort gebucht, sobald der Versand angelegt wird.</DialogDescription>
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
                const gesamtLA = VersandService.calcContainerLA(container);
                return (
                  <p className="text-sm font-medium text-right pt-1">
                    Σ Gesamt: {fmtL(gesamtL)} L, {fmtLA(gesamtLA)}
                  </p>
                );
              })()}
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-sm font-medium">Für das externe Lieferschein-Formular (optional)</p>
              <p className="text-xs text-muted-foreground -mt-2">Nur zur Dokumentation — die App erzeugt kein eigenes Lieferschein-PDF, das offizielle Formular läuft auf Schlumberger-Briefkopf.</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Bruttogewicht (kg, per Waage)</Label>
                  <Input type="text" inputMode="decimal" value={bruttogewichtKg} onChange={e => setBruttogewichtKg(e.target.value)} placeholder="z.B. 3047" />
                </div>
                <div>
                  <Label>Taragewicht (kg, leere Gebinde, per Waage)</Label>
                  <Input type="text" inputMode="decimal" value={taragewichtKg} onChange={e => setTaragewichtKg(e.target.value)} placeholder="z.B. 215" />
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
