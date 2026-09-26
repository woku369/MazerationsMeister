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
import { ArrowLeft, Plus, Trash2, Beaker, FlaskConical, PackageCheck } from 'lucide-react';
import * as StockService from '@/lib/stock-service';
import * as RezepturService from '@/lib/rezeptur-service';
import { getTankDefinitions } from '@/lib/tank-sync';
import {
  fuegeKomponenteHinzu, fuegeFreieZutatHinzu, entferneKomponente, aktualisiereKomponente,
  berechneRezeptur, berechneVerschnittMitFixUndReduzierbar, berechneAlkoholKorrektur,
  kannFreigebenWerden,
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

  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    const alle = RezepturService.readAll();
    const gefunden = alle.find(r => r.id === id);
    setRezeptur(gefunden || null);
    setNotFound(!gefunden);
    setInventoryItems(StockService.readAll());
    setTanks(getTankDefinitions());
  }, [id]);

  function persist(updated: Rezeptur) {
    const alle = RezepturService.readAll().map(r => r.id === updated.id ? updated : r);
    RezepturService.writeAll(alle);
    setRezeptur(updated);
  }

  const availableItems = useMemo(() => inventoryItems.filter(i => i.currentQuantityLiters > 0), [inventoryItems]);

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

  const freigabe = kannFreigebenWerden(rezeptur);
  const verschnittPreview = rezeptur.verschnittZiel
    ? berechneVerschnittMitFixUndReduzierbar(
        rezeptur.komponenten,
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
        <CardHeader><CardTitle className="text-base">Basisdaten</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Basismenge (L, Testansatz)</Label>
            <Input type="text" inputMode="decimal" defaultValue={rezeptur.basisMenge} disabled={gesperrt}
              onBlur={e => handleBasisMenge(e.target.value)} />
          </div>
          <div>
            <Label>Ergebnis</Label>
            <div className="text-sm pt-2">
              {rezeptur.ergebnis
                ? <>{fmt(rezeptur.ergebnis.gesamtMengeLiter)} L bei <strong>{fmt(rezeptur.ergebnis.durchschnittAlkohol)}%</strong> vol ({fmt(rezeptur.ergebnis.gesamtLiterAlkohol)} LA)</>
                : '–'}
            </div>
          </div>
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
                <div className="text-xs text-muted-foreground">{k.alkoholgehalt}% vol{k.tankNr ? ` · ${k.tankNr}` : ''}{!k.istVerfuegbar && !k.istFreieZutat && <span className="text-red-600"> · nicht genug auf Lager</span>}</div>
              </div>
              <Input
                type="text" inputMode="decimal" className="w-24" disabled={gesperrt}
                value={k.eingabeWert} placeholder="Menge"
                onChange={e => handleUpdateKomponente(k.id, { eingabeWert: parseFloat(e.target.value.replace(',', '.')) || 0 })}
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
                  value={k.reduktionsfaktor} placeholder="Faktor"
                  onChange={e => handleUpdateKomponente(k.id, { reduktionsfaktor: Math.min(1, Math.max(0, parseFloat(e.target.value.replace(',', '.')) || 0)) })}
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

      {/* Verschnitt fix/reduzierbar Vorschau (GFKC-O-Fall) */}
      {verschnittPreview && (
        <Card>
          <CardHeader><CardTitle className="text-base">Verschnitt-Auflösung (fix/reduzierbar)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Basis-Summe: {fmt(verschnittPreview.basisSumme)} L</div>
            <div>Ziel-Gesamtmenge: {fmt(verschnittPreview.zielGesamtmenge)} L</div>
            <div>Zusatz-Volumen: {fmt(verschnittPreview.zusatzVolumen)} L</div>
            {verschnittPreview.warnung && <p className="text-amber-700 text-xs">{verschnittPreview.warnung}</p>}
          </CardContent>
        </Card>
      )}

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

      {/* Sensorik */}
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

      {/* Status & Produktion */}
      <Card>
        <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(['entwurf', 'test', 'freigegeben'] as const).map(s => (
              <Button key={s} size="sm" variant={rezeptur.status === s ? 'default' : 'outline'} disabled={gesperrt} onClick={() => setStatus(s)}>
                {REZEPTUR_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>

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
            <Button onClick={() => { setZielTankNr(''); setChargenNummer(''); setIsProduceOpen(true); }} disabled={!freigabe.kannFreigeben}>
              <PackageCheck className="w-4 h-4 mr-1" />Produzieren &amp; Buchen
            </Button>
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
                  {tanks.map(t => <SelectItem key={t.tankNr} value={t.tankNr}>{t.bezeichnung} ({t.tankNr})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chargennummer</Label>
              <Input value={chargenNummer} onChange={e => setChargenNummer(e.target.value)} placeholder={rezeptur.name} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProduceOpen(false)}>Abbrechen</Button>
            <Button onClick={handleProduzieren}>Buchen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
