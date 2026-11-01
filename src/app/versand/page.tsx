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
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Send, Plus, Trash2, Tag } from 'lucide-react';
import * as ElectronBridge from '@/lib/electron-bridge';
import { LABEL_SUBDIR } from '@/lib/tank-label';
import {
  buildVersandLabelData, generateVersandLabelsPdf, versandLabelFileName, type VersandLabelFormat,
} from '@/lib/versand-label';
import * as StockService from '@/lib/stock-service';
import * as VersandService from '@/lib/versand-service';
import * as LeergebindeService from '@/lib/leergebinde-service';
import { getTankDefinitions } from '@/lib/tank-sync';
import { calcLA } from '@/lib/mazeration-calc';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { LohnabfuellerVersand, VersandContainer } from '@/schemas/versandSchema';
import type { Leergebinde } from '@/schemas/leergebindeSchema';
import type { TankDefinition } from '@/schemas/tankSchema';

// sourceId kodiert, woher die Auswahl stammt: "lg:<leergebindeId>" (über die
// Leergebinde-Verwaltung befüllt) oder "item:<inventoryItemId>" (Fallback,
// siehe unten). manualTaraKg nur relevant im "item"-Fall, wenn weder ein
// Leergebinde- noch ein Tank-Datensatz eine Tara kennt.
type DraftRow = { sourceId: string; manualTaraKg: string };

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
  const [tanks, setTanks] = useState<TankDefinition[]>([]);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [lohnabfuellerName, setLohnabfuellerName] = useState('');
  const [versanddatum, setVersanddatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [bemerkungen, setBemerkungen] = useState('');
  const [draftRows, setDraftRows] = useState<DraftRow[]>([{ sourceId: '', manualTaraKg: '' }]);
  // Nur zur Dokumentation für das externe (Schlumberger-)Lieferschein-Papierformular -
  // die App erzeugt daraus kein eigenes Dokument, siehe versandSchema.ts.
  const [plombenNummern, setPlombenNummern] = useState('');
  const [externeLieferscheinNr, setExterneLieferscheinNr] = useState('');

  // Gebinde-Etiketten (Nutzer-Anfrage 31.10.2026): Thermotransfer 80 × 105 mm
  // oder A4-Bogen mit 4 Etiketten 105 × 148 mm. Zuletzt gewähltes Format merken.
  const [labelVersand, setLabelVersand] = useState<LohnabfuellerVersand | null>(null);
  const [labelFormat, setLabelFormat] = useState<VersandLabelFormat>(() => {
    try { return (localStorage.getItem('versandLabelFormat') as VersandLabelFormat) || 'thermo'; } catch { return 'thermo'; }
  });
  const [labelStartSlot, setLabelStartSlot] = useState(1);

  async function handleCreateLabels() {
    if (!labelVersand) return;
    try {
      try { localStorage.setItem('versandLabelFormat', labelFormat); } catch { /* egal */ }
      const labels = buildVersandLabelData(labelVersand);
      const { base64, pages } = generateVersandLabelsPdf(labels, labelFormat, labelStartSlot);
      const fileName = versandLabelFileName(labelVersand.versandNummer, labelFormat);
      const was = `${labels.length} Etikett(en) auf ${pages} Seite(n)`;
      if (ElectronBridge.isElectron()) {
        const result = await ElectronBridge.writeToExportDir(fileName, base64, 'base64', LABEL_SUBDIR);
        if (result.ok) {
          // Direkt öffnen, damit gleich gedruckt werden kann.
          await ElectronBridge.openPath(result.path);
          toast({
            title: 'Etiketten erstellt',
            description: `${was} — ${fileName} wurde geöffnet. Gespeichert in: ${result.dir}`,
            action: <ToastAction altText="Ordner öffnen" onClick={() => ElectronBridge.openPath(result.dir)}>Ordner öffnen</ToastAction>,
          });
          setLabelVersand(null);
          return;
        }
      }
      const link = document.createElement('a');
      link.download = fileName;
      link.href = `data:application/pdf;base64,${base64}`;
      link.click();
      toast({ title: 'Etiketten erstellt', description: `${was} — als Download gespeichert.` });
      setLabelVersand(null);
    } catch (error) {
      toast({ title: 'Etiketten fehlgeschlagen', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    }
  }

  const loadAll = () => {
    setVersaende(VersandService.readAll());
    setInventoryItems(StockService.readAll());
    setGebinde(LeergebindeService.readAll());
    setTanks(getTankDefinitions());
  };
  useEffect(() => { loadAll(); }, []);

  const historie = [...versaende].sort((a, b) => b.versanddatum.localeCompare(a.versanddatum));
  const befuellteGebinde = gebinde.filter(g => g.status === 'befuellt');
  // Fallback für Gebinde, die nie über die Leergebinde-Verwaltung angelegt
  // wurden (Nutzer-Meldung 11.10.2026: 3 per Tank-Splitten entstandene IBCs
  // - IBC-GFKC-M-A/B/C - tauchten im Versand gar nicht auf, weil die
  // Leergebinde-Liste komplett leer war, das Splitten aber unabhängig davon
  // direkt Lagerposten anlegt, ohne je einen Leergebinde-Datensatz zu
  // erzeugen). Jeder Lagerposten mit Bestand, der noch an keinem Leergebinde
  // hängt, gilt hier als "direkt verschickbar".
  const leergebindeInventoryIds = new Set(gebinde.map(g => g.inventoryItemId).filter(Boolean));
  const direkteItems = inventoryItems.filter(i => i.currentQuantityLiters > 0 && !leergebindeInventoryIds.has(i.id));

  function resetNewForm() {
    setLohnabfuellerName('Mozart');
    setVersanddatum(new Date().toISOString().slice(0, 10));
    setBemerkungen('');
    setDraftRows([{ sourceId: '', manualTaraKg: '' }]);
    setPlombenNummern('');
    setExterneLieferscheinNr('');
  }

  function addDraftRow() {
    setDraftRows(prev => [...prev, { sourceId: '', manualTaraKg: '' }]);
  }
  function removeDraftRow(idx: number) {
    setDraftRows(prev => prev.filter((_, i) => i !== idx));
  }
  function updateDraftRow(idx: number, patch: Partial<DraftRow>) {
    setDraftRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  /**
   * Registriert einen direkt gewählten Lagerposten nachträglich als
   * Leergebinde (Status gleich "befuellt", da der Inhalt ja längst da ist) -
   * damit bleibt leergebindeId im VersandContainer durchgängig eine echte
   * Referenz statt eines Behelfswerts, und das Gebinde taucht ab sofort auch
   * korrekt in der Leergebinde-Verwaltung auf. Tara kommt, falls vorhanden,
   * vom Tank-Splitten-Datensatz (tank-management.tsx erlaubt eine Tara-
   * Eingabe beim Splitten) oder sonst aus dem manuellen Eingabefeld hier.
   */
  function ensureLeergebindeForItem(item: StoredInventoryItem, manualTaraKg: string): Leergebinde | null {
    const vorhanden = LeergebindeService.readAll().find(g => g.inventoryItemId === item.id);
    if (vorhanden) return vorhanden;
    const tankTara = tanks.find(t => t.tankNr === item.tankNr)?.taraKg;
    const manualTara = parseFloat(manualTaraKg.replace(',', '.'));
    const taraKg = tankTara ?? (Number.isFinite(manualTara) ? manualTara : 0);
    const created = LeergebindeService.persistCreateLeergebinde({
      bezeichnung: item.tankNr || item.id,
      taraKg,
      status: 'leer',
      herkunft: 'Nachträglich aus Lagerbestand registriert (Tank-Splitten o.ä.)',
    });
    if (!created.ok) return null;
    const alleGebinde = LeergebindeService.readAll().map(g =>
      g.id === created.gebinde.id ? { ...g, status: 'befuellt' as const, inventoryItemId: item.id, updatedAt: new Date().toISOString() } : g,
    );
    LeergebindeService.writeAll(alleGebinde);
    return alleGebinde.find(g => g.id === created.gebinde.id) ?? null;
  }

  /** Rein lesend - löst eine Zeile auf Posten+Tara auf, OHNE etwas anzulegen. Für Live-Vorschau während der Eingabe. */
  function resolveRowPreview(r: DraftRow): { item: StoredInventoryItem; taraKg: number | undefined } | null {
    if (r.sourceId.startsWith('lg:')) {
      const g = gebinde.find(x => x.id === r.sourceId.slice(3));
      const item = g?.inventoryItemId ? inventoryItems.find(i => i.id === g.inventoryItemId) : undefined;
      if (!g || !item) return null;
      return { item, taraKg: g.taraKg };
    }
    if (r.sourceId.startsWith('item:')) {
      const item = inventoryItems.find(i => i.id === r.sourceId.slice(5));
      if (!item) return null;
      const tankTara = tanks.find(t => t.tankNr === item.tankNr)?.taraKg;
      const manualTara = parseFloat(r.manualTaraKg.replace(',', '.'));
      return { item, taraKg: tankTara ?? (Number.isFinite(manualTara) ? manualTara : undefined) };
    }
    return null;
  }

  /** Nur für die Live-Summenanzeige - baut Container-ähnliche Objekte rein aus resolveRowPreview(), legt nichts an. */
  function previewContainers(): VersandContainer[] {
    return draftRows
      .map(r => {
        const resolved = resolveRowPreview(r);
        if (!resolved) return null;
        const { item, taraKg } = resolved;
        const c: VersandContainer = {
          inventoryItemId: item.id, leergebindeId: '', tankNr: item.tankNr, produktName: item.produktName,
          chargenNummer: item.chargenNummer, mengeLiter: item.currentQuantityLiters,
          alkoholVolProzent: item.alcoholVolProzent, dichte20C: item.dichte20C, taraKg,
        };
        return c;
      })
      .filter((c): c is VersandContainer => c !== null);
  }

  /**
   * Nur beim tatsächlichen Anlegen aufrufen (nicht für die Vorschau!) - legt
   * für "item:"-Zeilen bei Bedarf tatsächlich ein Leergebinde an
   * (ensureLeergebindeForItem schreibt in localStorage).
   */
  function buildContainerPayload(): VersandContainer[] | null {
    const rows = draftRows.filter(r => r.sourceId);
    if (rows.length === 0) return null;
    const result: VersandContainer[] = [];
    for (const r of rows) {
      let g: Leergebinde | null | undefined;
      let item: StoredInventoryItem | undefined;
      if (r.sourceId.startsWith('lg:')) {
        g = gebinde.find(x => x.id === r.sourceId.slice(3));
        item = g?.inventoryItemId ? inventoryItems.find(i => i.id === g!.inventoryItemId) : undefined;
      } else if (r.sourceId.startsWith('item:')) {
        item = inventoryItems.find(i => i.id === r.sourceId.slice(5));
        if (item) g = ensureLeergebindeForItem(item, r.manualTaraKg);
      }
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
      toast({ title: 'Ungültige Gebinde-Auswahl', description: 'Bitte für jede Zeile ein Gebinde angeben.', variant: 'destructive' });
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
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => { setLabelStartSlot(1); setLabelVersand(v); }}
                  title="Gebinde-Etiketten zum Bekleben der IBCs drucken">
                  <Tag className="w-4 h-4 mr-1" />Etiketten
                </Button>
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

      {/* Gebinde-Etiketten */}
      <Dialog open={!!labelVersand} onOpenChange={(open) => { if (!open) setLabelVersand(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gebinde-Etiketten{labelVersand ? ` – ${labelVersand.versandNummer}` : ''}</DialogTitle>
            <DialogDescription>
              Ein Etikett je Gebinde ({labelVersand?.container.length ?? 0}): Artikel, Charge, Datum, Liter / %vol. / LA,
              Tara / Netto / Brutto und „Gebinde x von y". Das PDF wird gespeichert und zum Drucken geöffnet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <label className="flex items-start gap-2 border rounded-md p-3 cursor-pointer">
                <input type="radio" name="labelFormat" className="mt-1" checked={labelFormat === 'thermo'} onChange={() => setLabelFormat('thermo')} />
                <span>
                  <span className="font-medium">Thermotransfer 80 × 105 mm</span>
                  <span className="block text-xs text-muted-foreground">Hochformat, ein Etikett je Seite — im Druckdialog den Etikettendrucker wählen, Papiergröße 80 × 105 mm, Skalierung „Tatsächliche Größe".</span>
                </span>
              </label>
              <label className="flex items-start gap-2 border rounded-md p-3 cursor-pointer">
                <input type="radio" name="labelFormat" className="mt-1" checked={labelFormat === 'a4'} onChange={() => setLabelFormat('a4')} />
                <span>
                  <span className="font-medium">A4-Bogen, 4 Etiketten 105 × 148 mm</span>
                  <span className="block text-xs text-muted-foreground">Z.B. Avery Zweckform 3483 — am normalen Drucker, Skalierung „Tatsächliche Größe" (nicht „An Seite anpassen").</span>
                </span>
              </label>
            </div>

            {labelFormat === 'a4' && (
              <div className="space-y-2">
                <Label>Erstes freies Etikett auf dem Bogen</Label>
                <p className="text-xs text-muted-foreground -mt-1">Für einen schon angebrochenen Bogen: auf das erste noch freie Feld klicken.</p>
                <div className="grid grid-cols-2 gap-1 w-40 border rounded p-1 bg-muted/40">
                  {[1, 2, 3, 4].map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setLabelStartSlot(slot)}
                      className={`h-14 rounded text-sm font-medium border ${slot < labelStartSlot ? 'bg-muted text-muted-foreground line-through' : slot === labelStartSlot ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                      title={slot < labelStartSlot ? 'Bereits verbraucht' : `Ab Feld ${slot} drucken`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelVersand(null)}>Abbrechen</Button>
            <Button onClick={handleCreateLabels}><Tag className="w-4 h-4 mr-1" />PDF erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label>Gebinde</Label>
              {befuellteGebinde.length === 0 && direkteItems.length === 0 && (
                <p className="text-xs text-amber-700">Weder befüllte Leergebinde noch passende Lagerposten vorhanden.</p>
              )}
              {draftRows.map((row, idx) => {
                const resolved = resolveRowPreview(row);
                const item = resolved?.item;
                const rowLA = item ? calcLA(item.currentQuantityLiters, item.alcoholVolProzent) : null;
                const istDirekterPosten = row.sourceId.startsWith('item:');
                const brauchtManuelleTara = istDirekterPosten && item && resolved?.taraKg == null;
                const bereitsGewaehlt = new Set(draftRows.filter((_, i) => i !== idx).map(r => r.sourceId));
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={row.sourceId} onValueChange={v => updateDraftRow(idx, { sourceId: v, manualTaraKg: '' })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Gebinde wählen" /></SelectTrigger>
                      <SelectContent>
                        {befuellteGebinde.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Befüllte Leergebinde</SelectLabel>
                            {befuellteGebinde.filter(bg => !bereitsGewaehlt.has(`lg:${bg.id}`)).map(bg => {
                              const bgItem = bg.inventoryItemId ? inventoryItems.find(i => i.id === bg.inventoryItemId) : undefined;
                              return (
                                <SelectItem key={bg.id} value={`lg:${bg.id}`}>
                                  {bg.bezeichnung}{bgItem && ` — ${bgItem.produktName} (${fmtL(bgItem.currentQuantityLiters)} L, ${bgItem.alcoholVolProzent}%)`}
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        )}
                        {direkteItems.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Direkt aus Lagerbestand (noch nicht als Leergebinde erfasst)</SelectLabel>
                            {direkteItems.filter(it => !bereitsGewaehlt.has(`item:${it.id}`)).map(it => (
                              <SelectItem key={it.id} value={`item:${it.id}`}>
                                {it.tankNr} — {it.produktName} ({fmtL(it.currentQuantityLiters)} L, {it.alcoholVolProzent}%)
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                    {brauchtManuelleTara && (
                      <Input
                        type="text" inputMode="decimal" className="w-24 shrink-0" placeholder="Tara (kg)"
                        value={row.manualTaraKg} onChange={e => updateDraftRow(idx, { manualTaraKg: e.target.value })}
                      />
                    )}
                    <span className="text-xs text-muted-foreground shrink-0 w-32">
                      {item && `${fmtL(item.currentQuantityLiters)} L`}
                      {rowLA != null && ` · ${fmtLA(rowLA)}`}
                      {!brauchtManuelleTara && resolved?.taraKg != null && ` · Tara ${fmtKg(resolved.taraKg)}`}
                    </span>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeDraftRow(idx)} disabled={draftRows.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              <Button type="button" size="sm" variant="outline" onClick={addDraftRow} disabled={draftRows.length >= befuellteGebinde.length + direkteItems.length}><Plus className="w-4 h-4 mr-1" />Weiteres Gebinde</Button>
              {(() => {
                const container = previewContainers();
                if (container.length === 0) return null;
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
