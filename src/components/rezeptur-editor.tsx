"use client";
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Beaker, FlaskConical, PackageCheck, ArrowUpCircle, Percent } from 'lucide-react';
import * as StockService from '@/lib/stock-service';
import * as RezepturService from '@/lib/rezeptur-service';
import { getTankDefinitions, formatTankLabel } from '@/lib/tank-sync';
import {
  fuegeKomponenteHinzu, fuegeFreieZutatHinzu, entferneKomponente, aktualisiereKomponente,
  berechneRezeptur, berechneVerschnittMitFixUndReduzierbar, berechneAlkoholKorrektur,
  kannFreigebenWerden, berechneMaxProduktionsmenge, erstelleScaleUp, formatiereRezepturWert,
} from '@/lib/rezeptur-manager';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { Rezeptur } from '@/schemas/rezepturSchema';
import type { TankDefinition } from '@/schemas/tankSchema';
import { REZEPTUR_STATUS_LABELS, REZEPTUR_STATUS_COLORS } from '@/schemas/rezepturSchema';

function fmt(n: number | undefined | null, dec = 2) {
  return n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '–';
}

export default function RezepturEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = searchParams.get('id') || '';

  const [rezeptur, setRezeptur] = useState<Rezeptur | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);
  const [tanks, setTanks] = useState<TankDefinition[]>([]);
  const [alleRezepturen, setAlleRezepturen] = useState<Rezeptur[]>([]);

  const [neueKomponenteId, setNeueKomponenteId] = useState('');
  const [neueKomponenteFix, setNeueKomponenteFix] = useState(true);
  const [neuerSpritId, setNeuerSpritId] = useState('');
  const [gemessenerAlkohol, setGemessenerAlkohol] = useState('');
  const [zielAlkohol, setZielAlkohol] = useState('');

  const [sensorikGeruch, setSensorikGeruch] = useState('');
  const [sensorikGeschmack, setSensorikGeschmack] = useState('');
  const [sensorikNotizen, setSensorikNotizen] = useState('');
  const [sensorikFreigegeben, setSensorikFreigegeben] = useState(false);

  const [isProduceOpen, setIsProduceOpen] = useState(false);
  const [zielTankNr, setZielTankNr] = useState('');
  const [chargenNummer, setChargenNummer] = useState('');
  // Datum des tatsächlichen Produktionsvorgangs (Nutzer-Anfrage 10.10.2026:
  // beim Nachbuchen vergangener Mazerationen/Ausmischungen braucht es ein vom
  // heutigen Tag abweichendes Datum) - persistProduziereRezeptur() nahm das
  // Feld bereits entgegen, nur die Editor-UI hatte dafür bisher kein Eingabefeld.
  const [produktionsdatum, setProduktionsdatum] = useState(() => new Date().toISOString().slice(0, 10));

  const [isScaleUpOpen, setIsScaleUpOpen] = useState(false);
  const [scaleUpTankNr, setScaleUpTankNr] = useState('');
  const [scaleUpMenge, setScaleUpMenge] = useState('');

  const [isVerschnittZielOpen, setIsVerschnittZielOpen] = useState(false);
  const [verschnittZielBasisAnteil, setVerschnittZielBasisAnteil] = useState('');
  const [verschnittZielKomponenteId, setVerschnittZielKomponenteId] = useState('');
  const [verschnittZielHinweis, setVerschnittZielHinweis] = useState('');

  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    const alle = RezepturService.readAll();
    const gefunden = alle.find(r => r.id === id);
    setRezeptur(gefunden || null);
    setNotFound(!gefunden);
    setAlleRezepturen(alle);
    setInventoryItems(StockService.readAll());
    setTanks(getTankDefinitions());
  }, [id]);

  function persist(updated: Rezeptur) {
    const alle = RezepturService.readAll().map(r => r.id === updated.id ? updated : r);
    RezepturService.writeAll(alle);
    setRezeptur(updated);
  }

  const availableItems = useMemo(() => inventoryItems.filter(i => i.currentQuantityLiters > 0), [inventoryItems]);

  // Testansatz, aus dem diese Rezeptur per "Scale-up ableiten" entstanden ist
  // (falls vorhanden) - für den Sensorik-Vergleich im UI, siehe
  // docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md Abschnitt 8.
  const vorgaenger = useMemo(
    () => rezeptur?.vorgaengerRezepturId ? alleRezepturen.find(r => r.id === rezeptur.vorgaengerRezepturId) : undefined,
    [rezeptur?.vorgaengerRezepturId, alleRezepturen],
  );

  const scaleUpTank = tanks.find(t => t.tankNr === scaleUpTankNr);
  // Freie Kapazitaet statt Brutto-Tankgroesse (Nutzer-Meldung 10.10.2026: ein
  // Zieltank wie T 349 mit bereits 3190 L Vorlage hatte hier faelschlich die
  // volle Nenngroesse als Obergrenze vorgeschlagen, ohne den vorhandenen
  // Inhalt abzuziehen - echte Ueberfuellungsgefahr bei genau dem Verschnitt-
  // in-einen-bereits-befuellten-Tank-Fall, der heute vorlag).
  const scaleUpTankBelegt = scaleUpTank
    ? inventoryItems.filter(i => i.tankNr === scaleUpTank.tankNr).reduce((s, i) => s + (i.currentQuantityLiters || 0), 0)
    : 0;
  const scaleUpTankFrei = scaleUpTank ? Math.max(0, (scaleUpTank.volumenLiter ?? 0) - scaleUpTankBelegt) : 0;
  const maxProduktion = rezeptur && scaleUpTank
    ? berechneMaxProduktionsmenge(rezeptur, scaleUpTankFrei)
    : null;

  if (notFound) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Rezeptur nicht gefunden. <Button variant="link" onClick={() => router.push('/rezepturen')}>Zurück zur Liste</Button>
      </div>
    );
  }
  if (!rezeptur) return <div className="p-8 text-center text-muted-foreground">Lädt…</div>;

  const gesperrt = rezeptur.status === 'produziert';

  function handleAddKomponente() {
    if (!neueKomponenteId || !rezeptur) return;
    const item = inventoryItems.find(i => i.id === neueKomponenteId);
    if (!item) return;
    const updated = fuegeKomponenteHinzu(rezeptur, item, 'liter', 0, neueKomponenteFix);
    persist(updated);
    setNeueKomponenteId('');
  }

  function handleAddWasser() {
    if (!rezeptur) return;
    persist(fuegeFreieZutatHinzu(rezeptur, 'Wasser', 'liter', 0, 0));
  }

  function handleUpdateKomponente(komponenteId: string, patch: Record<string, unknown>) {
    if (!rezeptur) return;
    persist(aktualisiereKomponente(rezeptur, komponenteId, patch));
  }

  function handleRemoveKomponente(komponenteId: string) {
    if (!rezeptur) return;
    persist(entferneKomponente(rezeptur, komponenteId));
  }

  function handleBasisMenge(value: string) {
    if (!rezeptur) return;
    const n = parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    persist(berechneRezeptur({ ...rezeptur, basisMenge: n }));
  }

  function handleBerechneKorrektur() {
    if (!rezeptur?.ergebnis) return;
    const gemessen = parseFloat(gemessenerAlkohol.replace(',', '.'));
    const ziel = parseFloat(zielAlkohol.replace(',', '.'));
    if (!Number.isFinite(gemessen) || !Number.isFinite(ziel)) {
      toast({ title: 'Bitte gemessenen und Ziel-ABV eingeben', variant: 'destructive' });
      return;
    }
    const spritItem = inventoryItems.find(i => i.id === neuerSpritId);
    const spritAlkoholgehalt = spritItem?.alcoholVolProzent ?? 96;
    const result = berechneAlkoholKorrektur(rezeptur.ergebnis.gesamtMengeLiter, gemessen, ziel, spritAlkoholgehalt);

    persist({
      ...rezeptur,
      alkoholKorrektur: {
        gemessenerAlkohol: gemessen,
        zielAlkohol: ziel,
        korrekturBerechnet: true,
        korrekturDurchgefuehrt: false,
        wasserZugabe: result.wasserZugabe > 0 ? result.wasserZugabe : undefined,
        spritZugabe: result.spritZugabe > 0 ? result.spritZugabe : undefined,
        spritZugabeId: result.spritZugabe > 0 ? neuerSpritId : undefined,
        spritZugabeAlkoholgehalt: result.spritZugabe > 0 ? spritAlkoholgehalt : undefined,
      },
    });
    toast({
      title: 'Korrektur berechnet',
      description: result.wasserZugabe > 0
        ? `${result.wasserZugabe.toFixed(2)} L Wasser zugeben`
        : result.spritZugabe > 0
          ? `${result.spritZugabe.toFixed(2)} L Sprit (${spritAlkoholgehalt}%) zugeben`
          : 'Bereits auf Zielwert.',
    });
  }

  function handleAddSensorik() {
    if (!rezeptur) return;
    const bewertung = {
      id: `sens_${Date.now()}`,
      datum: new Date().toISOString().slice(0, 10),
      geruch: sensorikGeruch ? parseFloat(sensorikGeruch) : undefined,
      geschmack: sensorikGeschmack ? parseFloat(sensorikGeschmack) : undefined,
      notizen: sensorikNotizen,
      freigegeben: sensorikFreigegeben,
    };
    persist({ ...rezeptur, sensorikBewertungen: [...rezeptur.sensorikBewertungen, bewertung] });
    setSensorikGeruch(''); setSensorikGeschmack(''); setSensorikNotizen(''); setSensorikFreigegeben(false);
  }

  function setStatus(status: Rezeptur['status']) {
    if (!rezeptur) return;
    persist({ ...rezeptur, status, geaendertAm: new Date().toISOString() });
  }

  function handleProduzieren() {
    if (!rezeptur) return;
    const result = RezepturService.persistProduziereRezeptur(rezeptur.id, {
      zielTankNr: zielTankNr.trim(),
      chargenNummer: chargenNummer.trim() || undefined,
      produktionsdatum,
    });
    if (!result.ok) {
      toast({ title: 'Buchung fehlgeschlagen', description: result.error, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Produziert & gebucht',
      description: `LA-Bilanz: ${fmt(result.laBilanz.eingesetzteLA)} L eingesetzt → ${fmt(result.laBilanz.ergebnisLA)} L im fertigen Posten (Differenz ${fmt(result.laBilanz.differenzLA)} LA).`,
    });
    setIsProduceOpen(false);
    setRezeptur(result.rezepturen.find(r => r.id === rezeptur.id) || null);
    setInventoryItems(result.inventoryItems);
  }

  function handleOpenScaleUp() {
    setScaleUpTankNr('');
    setScaleUpMenge('');
    setIsScaleUpOpen(true);
  }

  function handleErstelleScaleUp() {
    if (!rezeptur) return;
    const menge = parseFloat(scaleUpMenge.replace(',', '.'));
    if (!Number.isFinite(menge) || menge <= 0) {
      toast({ title: 'Bitte eine gültige Produktionsmenge eingeben', variant: 'destructive' });
      return;
    }
    const scaleUp = erstelleScaleUp(rezeptur, menge, inventoryItems);
    const alle = [...RezepturService.readAll(), scaleUp];
    RezepturService.writeAll(alle);
    toast({ title: 'Scale-up angelegt', description: `${fmt(menge)} L, Verhältnis vom Testansatz übernommen.` });
    // Dialog schliessen, BEVOR navigiert wird - fehlte bisher (Nutzer-Meldung
    // 10.10.2026: "Scale-up war etwas hakelig"). Da die Editor-Seite beim
    // Navigieren zur neuen Rezeptur-ID dieselbe Komponenteninstanz wiederver-
    // wendet, blieb der Scale-up-Dialog danach weiterhin sichtbar ueber der
    // frisch geladenen Rezeptur - wirkte wie "nichts passiert", ein zweiter
    // Versuch half nur zufaellig, weil inzwischen die Werte gueltig waren.
    setIsScaleUpOpen(false);
    router.push(`/rezepturen/editor?id=${scaleUp.id}`);
  }

  function handleOpenVerschnittZiel() {
    if (!rezeptur) return;
    const bestehend = rezeptur.verschnittZiel;
    setVerschnittZielBasisAnteil(bestehend ? formatiereRezepturWert(bestehend.basisAnteil * 100, 0) : '');
    setVerschnittZielKomponenteId(bestehend?.zusatzKomponenteId || '');
    setVerschnittZielHinweis(bestehend?.hinweis || '');
    setIsVerschnittZielOpen(true);
  }

  function handleSaveVerschnittZiel() {
    if (!rezeptur) return;
    const prozent = parseFloat(verschnittZielBasisAnteil.replace(',', '.'));
    if (!Number.isFinite(prozent) || prozent <= 0 || prozent >= 100) {
      toast({ title: 'Bitte einen Basis-Anteil zwischen 0 und 100% eingeben', variant: 'destructive' });
      return;
    }
    if (!verschnittZielKomponenteId) {
      toast({ title: 'Bitte eine Zusatzkomponente wählen', variant: 'destructive' });
      return;
    }
    const basisAnteil = prozent / 100;
    persist({
      ...rezeptur,
      verschnittZiel: {
        basisAnteil,
        zusatzKomponenteId: verschnittZielKomponenteId,
        zusatzAnteil: 1 - basisAnteil,
        hinweis: verschnittZielHinweis.trim() || undefined,
      },
    });
    setIsVerschnittZielOpen(false);
    toast({ title: 'Verschnittziel gespeichert' });
  }

  function handleRemoveVerschnittZiel() {
    if (!rezeptur) return;
    persist({ ...rezeptur, verschnittZiel: undefined });
  }

  function handleUebernehmeZusatzVolumen() {
    if (!rezeptur?.verschnittZiel || !verschnittPreview) return;
    const zusatzItem = inventoryItems.find(i => i.id === rezeptur.verschnittZiel!.zusatzKomponenteId);
    if (!zusatzItem) return;
    const menge = parseFloat(verschnittPreview.zusatzVolumen.toFixed(3));
    const bestehendeKomponente = rezeptur.komponenten.find(k => k.produktId === zusatzItem.id);
    const updated = bestehendeKomponente
      ? aktualisiereKomponente(rezeptur, bestehendeKomponente.id, { eingabeWert: menge })
      : fuegeKomponenteHinzu(rezeptur, zusatzItem, 'liter', menge, true);
    persist(updated);
    toast({ title: 'Zusatzmenge übernommen', description: `${fmt(menge)} L ${zusatzItem.produktName}` });
  }

  const freigabe = kannFreigebenWerden(rezeptur);
  // Die Zusatzkomponente selbst zaehlt NICHT zur "Basis" - wird sie (z.B. durch
  // einen vorherigen Klick auf "Zusatzmenge übernehmen") bereits als eigene
  // Komponentenzeile gefuehrt, muss sie vor der Berechnung herausgefiltert
  // werden, sonst würde sich ihre eigene Menge selbstverstärkend in die
  // Basis-Summe einrechnen und bei jeder weiteren Berechnung eine immer
  // größere Zusatz-Menge vorschlagen, statt bei der korrekten zu konvergieren.
  const verschnittBasisKomponenten = rezeptur.verschnittZiel
    ? rezeptur.komponenten.filter(k => k.produktId !== rezeptur.verschnittZiel!.zusatzKomponenteId)
    : rezeptur.komponenten;
  const verschnittPreview = rezeptur.verschnittZiel
    ? berechneVerschnittMitFixUndReduzierbar(
        verschnittBasisKomponenten,
        rezeptur.verschnittZiel.basisAnteil,
        inventoryItems.find(i => i.id === rezeptur.verschnittZiel!.zusatzKomponenteId)?.alcoholVolProzent ?? 0,
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/rezepturen')}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Beaker className="w-5 h-5" />{rezeptur.name}{rezeptur.variantenName ? ` – ${rezeptur.variantenName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">{rezeptur.zielProduktName} · Version {rezeptur.version}</p>
        </div>
        <Badge className={REZEPTUR_STATUS_COLORS[rezeptur.status]}>{REZEPTUR_STATUS_LABELS[rezeptur.status]}</Badge>
      </div>

      {/* Basisdaten */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Basisdaten
            {rezeptur.istDirektverschnitt && <Badge variant="outline" className="font-normal">Direktverschnitt</Badge>}
          </CardTitle>
          {rezeptur.istDirektverschnitt && (
            <CardDescription>Direktverschnitt bereits gelagerter Mengen — keine Sensorik-Freigabe und kein Scale-up nötig, direkt „Produzieren &amp; Buchen" sobald alle Komponenten eingetragen sind.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>{rezeptur.istDirektverschnitt ? 'Gesamtmenge (L, aus Komponenten berechnet)' : 'Basismenge (L, Testansatz)'}</Label>
            {rezeptur.istDirektverschnitt ? (
              <div className="text-sm border rounded-md px-3 py-2 bg-muted/50">{fmt(rezeptur.basisMenge, 2)} L</div>
            ) : (
              <Input type="text" inputMode="decimal" defaultValue={rezeptur.basisMenge} disabled={gesperrt}
                onBlur={e => handleBasisMenge(e.target.value)} />
            )}
          </div>
          <div>
            <Label>Ergebnis (Basismenge)</Label>
            <div className="text-sm pt-2">
              {rezeptur.ergebnis
                ? <>{fmt(rezeptur.ergebnis.gesamtMengeLiter)} L bei <strong>{fmt(rezeptur.ergebnis.durchschnittAlkohol)}%</strong> vol ({fmt(rezeptur.ergebnis.gesamtLiterAlkohol)} LA)</>
                : '–'}
            </div>
          </div>
          {rezeptur.produktionsMenge != null && (
            <div className="col-span-2 border-t pt-3">
              <Label>Produktionsmenge (Scale-up)</Label>
              <div className="text-sm pt-1">
                <strong>{fmt(rezeptur.produktionsMenge)} L</strong> — Komponentenmengen unten zeigen „→ X L für Produktion"
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Komponenten */}
      <Card>
        <CardHeader><CardTitle className="text-base">Komponenten</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rezeptur.komponenten.map(k => (
            <div key={k.id} className="flex items-center gap-2 border rounded-lg p-2">
              <div className="flex-1">
                <div className="font-medium text-sm">{k.produktName}{k.istFreieZutat && <span className="text-muted-foreground"> (freie Zutat)</span>}</div>
                <div className="text-xs text-muted-foreground">
                  {k.alkoholgehalt}% vol{k.tankNr ? ` · ${k.tankNr}` : ''}
                  {k.mengeFuerProduktion != null && <span className="font-medium text-primary"> · → {fmt(k.mengeFuerProduktion)} L für Produktion</span>}
                  {!k.istVerfuegbar && !k.istFreieZutat && <span className="text-red-600"> · nicht genug auf Lager</span>}
                </div>
              </div>
              <Input
                type="text" inputMode="decimal" className="w-24" disabled={gesperrt}
                defaultValue={k.eingabeWert} placeholder="Menge" key={`${k.id}-eingabeWert-${k.eingabeWert}`}
                onBlur={e => handleUpdateKomponente(k.id, { eingabeWert: parseFloat(e.target.value.replace(',', '.')) || 0 })}
              />
              <span className="text-xs text-muted-foreground w-8">{k.eingabeTyp === 'liter' ? 'L' : '%'}</span>
              {!k.istFreieZutat && (
                <label className="flex items-center gap-1 text-xs shrink-0">
                  <Checkbox checked={k.istFix} disabled={gesperrt} onCheckedChange={c => handleUpdateKomponente(k.id, { istFix: !!c })} />
                  fix
                </label>
              )}
              {!k.istFix && (
                <Input
                  type="text" inputMode="decimal" className="w-20" disabled={gesperrt}
                  defaultValue={k.reduktionsfaktor} placeholder="Faktor" key={`${k.id}-reduktionsfaktor-${k.reduktionsfaktor}`}
                  onBlur={e => handleUpdateKomponente(k.id, { reduktionsfaktor: Math.min(1, Math.max(0, parseFloat(e.target.value.replace(',', '.')) || 0)) })}
                />
              )}
              <span className="text-xs text-muted-foreground w-20 text-right">{fmt(k.literAlkohol)} LA</span>
              <Button size="icon" variant="ghost" disabled={gesperrt} onClick={() => handleRemoveKomponente(k.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}

          {!gesperrt && (
            <div className="flex items-center gap-2 pt-2">
              <Select value={neueKomponenteId} onValueChange={setNeueKomponenteId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Komponente aus Lagerbestand wählen" /></SelectTrigger>
                <SelectContent>
                  {availableItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.produktName} — {i.tankNr} ({fmt(i.currentQuantityLiters, 0)} L, {i.alcoholVolProzent}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-1 text-xs shrink-0">
                <Checkbox checked={neueKomponenteFix} onCheckedChange={c => setNeueKomponenteFix(!!c)} /> fix
              </label>
              <Button size="sm" onClick={handleAddKomponente}><Plus className="w-4 h-4 mr-1" />Hinzufügen</Button>
              <Button size="sm" variant="outline" onClick={handleAddWasser}>+ Wasser</Button>
            </div>
          )}

          {rezeptur.ergebnis && rezeptur.ergebnis.fehlendeKomponenten.length > 0 && (
            <p className="text-xs text-red-600">{rezeptur.ergebnis.fehlendeKomponenten.join(' · ')}</p>
          )}
        </CardContent>
      </Card>

      {/* Verschnittziel: fixe Basismenge + Ergänzung bis zu einem Zielverhältnis (GFKC-O-Fall, z.B. 65:35) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verschnittziel (fix/reduzierbar)</CardTitle>
          <CardDescription>Für Mischungen aus bereits feststehender Basismenge (z.B. vorhandenes GFKC-M) plus einer Zusatzkomponente, die bis zu einem Zielverhältnis auffüllt — statt einer von vornherein feststehenden Gesamtmenge.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!rezeptur.verschnittZiel ? (
            !gesperrt && (
              <Button size="sm" variant="outline" onClick={handleOpenVerschnittZiel}>
                <Percent className="w-4 h-4 mr-1" />Verschnittziel festlegen
              </Button>
            )
          ) : (
            <>
              <div className="text-sm">
                Basis <strong>{fmt(rezeptur.verschnittZiel.basisAnteil * 100, 0)}%</strong> · Zusatz „{inventoryItems.find(i => i.id === rezeptur.verschnittZiel!.zusatzKomponenteId)?.produktName ?? '–'}" <strong>{fmt(rezeptur.verschnittZiel.zusatzAnteil * 100, 0)}%</strong>
                {rezeptur.verschnittZiel.hinweis && <p className="text-xs text-muted-foreground mt-1">{rezeptur.verschnittZiel.hinweis}</p>}
              </div>
              {verschnittPreview && (
                <div className="text-sm space-y-1 border rounded-lg p-3 bg-muted/50">
                  <div>Basis-Summe: {fmt(verschnittPreview.basisSumme)} L</div>
                  <div>Ziel-Gesamtmenge: {fmt(verschnittPreview.zielGesamtmenge)} L</div>
                  <div>Zusatz-Volumen: {fmt(verschnittPreview.zusatzVolumen)} L</div>
                  {verschnittPreview.warnung && <p className="text-amber-700 text-xs">{verschnittPreview.warnung}</p>}
                  {!gesperrt && (
                    <Button size="sm" variant="link" className="px-0 h-auto" onClick={handleUebernehmeZusatzVolumen}>
                      Zusatzmenge in Komponente übernehmen
                    </Button>
                  )}
                </div>
              )}
              {!gesperrt && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleOpenVerschnittZiel}>Bearbeiten</Button>
                  <Button size="sm" variant="ghost" onClick={handleRemoveVerschnittZiel}>Entfernen</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Alkoholkorrektur */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alkoholkorrektur</CardTitle>
          <CardDescription>Ziel-ABV ist ein gelebter Richtwert, kein fixer Wert — frei editierbar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gemessener ABV (%vol)</Label>
              <Input type="text" inputMode="decimal" disabled={gesperrt} value={gemessenerAlkohol} onChange={e => setGemessenerAlkohol(e.target.value)} placeholder={rezeptur.ergebnis ? fmt(rezeptur.ergebnis.durchschnittAlkohol) : ''} />
            </div>
            <div>
              <Label>Ziel-ABV (%vol)</Label>
              <Input type="text" inputMode="decimal" disabled={gesperrt} value={zielAlkohol} onChange={e => setZielAlkohol(e.target.value)} placeholder="z.B. 53,5" />
            </div>
          </div>
          <div>
            <Label>Sprit für Aufspriten (falls nötig) — echte Konzentration aus dem Lager, nicht hartcodiert</Label>
            <Select value={neuerSpritId} onValueChange={setNeuerSpritId}>
              <SelectTrigger><SelectValue placeholder="Sprit-Posten wählen" /></SelectTrigger>
              <SelectContent>
                {availableItems.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.produktName} ({i.alcoholVolProzent}%, {fmt(i.currentQuantityLiters, 0)} L)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={gesperrt} onClick={handleBerechneKorrektur}><FlaskConical className="w-4 h-4 mr-1" />Korrektur berechnen</Button>

          {rezeptur.alkoholKorrektur?.korrekturBerechnet && (
            <div className="border rounded-lg p-3 bg-muted/50 text-sm">
              {rezeptur.alkoholKorrektur.wasserZugabe ? (
                <p><strong>{fmt(rezeptur.alkoholKorrektur.wasserZugabe)} L Wasser</strong> zugeben (verdünnen)</p>
              ) : rezeptur.alkoholKorrektur.spritZugabe ? (
                <p><strong>{fmt(rezeptur.alkoholKorrektur.spritZugabe)} L Sprit</strong> ({rezeptur.alkoholKorrektur.spritZugabeAlkoholgehalt}%) zugeben (aufspriten)</p>
              ) : <p>Bereits auf Zielwert, keine Korrektur nötig.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sensorik - entfällt beim Direktverschnitt (Nutzer-Anfrage 10.10.2026): bereits
          gelagerte, bereits in Vorperioden sensorisch beurteilte Mengen brauchen keine
          erneute Testansatz-Bewertung. */}
      {!rezeptur.istDirektverschnitt && (
      <Card>
        <CardHeader><CardTitle className="text-base">Sensorik-Bewertungen ({rezeptur.sensorikBewertungen.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rezeptur.sensorikBewertungen.map(b => (
            <div key={b.id} className="text-sm border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{b.datum}</span>
                {b.freigegeben && <Badge variant="outline" className="text-green-700">freigegeben</Badge>}
              </div>
              <p>{b.notizen}</p>
            </div>
          ))}
          {!gesperrt && (
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Input type="text" inputMode="decimal" placeholder="Geruch (1-10)" value={sensorikGeruch} onChange={e => setSensorikGeruch(e.target.value)} />
                <Input type="text" inputMode="decimal" placeholder="Geschmack (1-10)" value={sensorikGeschmack} onChange={e => setSensorikGeschmack(e.target.value)} />
              </div>
              <Textarea placeholder="Notizen" value={sensorikNotizen} onChange={e => setSensorikNotizen(e.target.value)} rows={2} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={sensorikFreigegeben} onCheckedChange={c => setSensorikFreigegeben(!!c)} />
                Zur Produktion freigegeben
              </label>
              <Button size="sm" variant="outline" onClick={handleAddSensorik}><Plus className="w-4 h-4 mr-1" />Bewertung hinzufügen</Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Vergleich mit dem Testansatz, aus dem diese Rezeptur per Scale-up entstand */}
      {vorgaenger && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vergleich mit Testansatz „{vorgaenger.name}{vorgaenger.variantenName ? ` – ${vorgaenger.variantenName}` : ''}"</CardTitle>
            <CardDescription>Zur sensorischen Gegenprobe: Ergebnis und Bewertungen der Rezeptur, aus der dieses Scale-up abgeleitet wurde.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {vorgaenger.ergebnis && (
              <p>{fmt(vorgaenger.ergebnis.gesamtMengeLiter)} L bei <strong>{fmt(vorgaenger.ergebnis.durchschnittAlkohol)}%</strong> vol</p>
            )}
            {vorgaenger.sensorikBewertungen.length === 0 ? (
              <p className="text-muted-foreground">Keine Sensorik-Bewertungen beim Testansatz hinterlegt.</p>
            ) : vorgaenger.sensorikBewertungen.map(b => (
              <div key={b.id} className="border-b pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{b.datum}</span>
                  {b.freigegeben && <Badge variant="outline" className="text-green-700">freigegeben</Badge>}
                </div>
                <p>{b.notizen}</p>
              </div>
            ))}
            <Button variant="link" className="px-0 h-auto" onClick={() => router.push(`/rezepturen/editor?id=${vorgaenger.id}`)}>
              Testansatz öffnen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status & Produktion - Status-Toggle und Scale-up entfallen beim
          Direktverschnitt (Nutzer-Anfrage 10.10.2026): kein Testansatz-Status
          zu pflegen, kein Hochskalieren nötig, da die Komponenten bereits die
          realen Mengen sind. */}
      <Card>
        <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!rezeptur.istDirektverschnitt && (
            <div className="flex gap-2 flex-wrap">
              {(['entwurf', 'test', 'freigegeben'] as const).map(s => (
                <Button key={s} size="sm" variant={rezeptur.status === s ? 'default' : 'outline'} disabled={gesperrt} onClick={() => setStatus(s)}>
                  {REZEPTUR_STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          )}

          {!freigabe.kannFreigeben && rezeptur.status !== 'produziert' && (
            <p className="text-xs text-amber-700">Für "Produzieren & Buchen" noch offen: {freigabe.gruende.join(' · ')}</p>
          )}

          {rezeptur.status === 'produziert' ? (
            <div className="border rounded-lg p-3 bg-green-50 text-sm">
              <p className="font-medium flex items-center gap-2"><PackageCheck className="w-4 h-4" />Produziert & gebucht</p>
              <p>{fmt(rezeptur.produktionsDaten?.produzierteMenge)} L bei {fmt(rezeptur.produktionsDaten?.tatsaechlicherAlkohol)}% vol in {rezeptur.produktionsDaten?.zielTankNr}</p>
              <p className="text-xs text-muted-foreground">Tatsächlicher ABV für Lohnabfüller-Neuberechnung: {fmt(rezeptur.produktionsDaten?.tatsaechlicherAlkohol)}%</p>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {!rezeptur.istDirektverschnitt && rezeptur.status === 'freigegeben' && (
                <Button variant="outline" onClick={handleOpenScaleUp}>
                  <ArrowUpCircle className="w-4 h-4 mr-1" />Scale-up ableiten
                </Button>
              )}
              <Button onClick={() => { setZielTankNr(''); setChargenNummer(''); setProduktionsdatum(new Date().toISOString().slice(0, 10)); setIsProduceOpen(true); }} disabled={!freigabe.kannFreigeben}>
                <PackageCheck className="w-4 h-4 mr-1" />Produzieren &amp; Buchen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isProduceOpen} onOpenChange={setIsProduceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produzieren & Buchen</DialogTitle>
            <DialogDescription>Bucht Abgang für alle Komponenten (+ Alkoholkorrektur) und legt den fertigen Posten im Zieltank an.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Zieltank</Label>
              <Select value={zielTankNr} onValueChange={setZielTankNr}>
                <SelectTrigger><SelectValue placeholder="Tank wählen" /></SelectTrigger>
                <SelectContent>
                  {tanks.map(t => <SelectItem key={t.tankNr} value={t.tankNr}>{formatTankLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chargennummer</Label>
              <Input value={chargenNummer} onChange={e => setChargenNummer(e.target.value)} placeholder={rezeptur.name} />
            </div>
            <div>
              <Label>Datum der Produktion</Label>
              <Input type="date" value={produktionsdatum} onChange={e => setProduktionsdatum(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Das tatsächliche Datum des Vorgangs — beim Nachbuchen zurückliegender Ausmischungen hier das echte Datum eintragen.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProduceOpen(false)}>Abbrechen</Button>
            <Button onClick={handleProduzieren}>Buchen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScaleUpOpen} onOpenChange={setIsScaleUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scale-up ableiten</DialogTitle>
            <DialogDescription>
              Legt eine neue Rezeptur mit demselben Komponentenverhältnis in Produktionsmenge an. Die Menge
              ist durch die knappste Komponente und die Kapazität des gewählten Tanks begrenzt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ausmisch-Tank (für die Kapazitätsgrenze)</Label>
              <Select value={scaleUpTankNr} onValueChange={v => { setScaleUpTankNr(v); setScaleUpMenge(''); }}>
                <SelectTrigger><SelectValue placeholder="Tank wählen" /></SelectTrigger>
                <SelectContent>
                  {tanks.map(t => <SelectItem key={t.tankNr} value={t.tankNr}>{formatTankLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {maxProduktion && (
              <div className="text-sm border rounded-lg p-3 bg-muted/50 space-y-1">
                {scaleUpTankBelegt > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tank bereits mit {fmt(scaleUpTankBelegt, 0)} L befüllt — freie Kapazität: {fmt(scaleUpTankFrei, 0)} L.
                  </p>
                )}
                <p>Maximal möglich: <strong>{fmt(maxProduktion.maxMenge)} L</strong></p>
                <p className="text-xs text-muted-foreground">
                  {maxProduktion.limitiertDurchTank
                    ? `Begrenzt durch die freie Tank-Kapazität (${fmt(maxProduktion.tankKapazitaet, 0)} L).`
                    : maxProduktion.limitierendeKomponente
                      ? `Begrenzt durch die verfügbare Menge von „${maxProduktion.limitierendeKomponente}".`
                      : 'Keine Lagerbindung in den Komponenten gefunden.'}
                </p>
                {maxProduktion.maxMenge > 0 && (
                  <Button size="sm" variant="link" className="px-0 h-auto" onClick={() => setScaleUpMenge(formatiereRezepturWert(maxProduktion.maxMenge, 2))}>
                    Maximalmenge übernehmen
                  </Button>
                )}
              </div>
            )}
            <div>
              <Label>Produktionsmenge (L)</Label>
              <Input type="text" inputMode="decimal" value={scaleUpMenge} onChange={e => setScaleUpMenge(e.target.value)} placeholder="z.B. 80" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScaleUpOpen(false)}>Abbrechen</Button>
            <Button onClick={handleErstelleScaleUp} disabled={!(parseFloat(scaleUpMenge.replace(',', '.')) > 0)}>Scale-up erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVerschnittZielOpen} onOpenChange={setIsVerschnittZielOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verschnittziel festlegen</DialogTitle>
            <DialogDescription>
              Berechnet, wie viel von der gewählten Zusatzkomponente nötig ist, damit die fixen/reduzierbaren
              Komponenten oben zusammen den angegebenen Anteil der fertigen Gesamtmenge ausmachen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Basis-Anteil (%) — fixe/reduzierbare Komponenten zusammen</Label>
              <Input type="text" inputMode="decimal" value={verschnittZielBasisAnteil} onChange={e => setVerschnittZielBasisAnteil(e.target.value)} placeholder="z.B. 65" />
            </div>
            <div>
              <Label>Zusatzkomponente (füllt auf den Rest auf)</Label>
              <Select value={verschnittZielKomponenteId} onValueChange={setVerschnittZielKomponenteId}>
                <SelectTrigger><SelectValue placeholder="Komponente aus Lagerbestand wählen" /></SelectTrigger>
                <SelectContent>
                  {availableItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.produktName} — {i.tankNr} ({fmt(i.currentQuantityLiters, 0)} L, {i.alcoholVolProzent}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hinweis (optional)</Label>
              <Input value={verschnittZielHinweis} onChange={e => setVerschnittZielHinweis(e.target.value)} placeholder="z.B. unverifizierter Richtwert" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerschnittZielOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveVerschnittZiel}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
