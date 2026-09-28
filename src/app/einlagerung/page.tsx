"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Droplets, Plus, Trash2, AlertTriangle } from 'lucide-react';
import * as StockService from '@/lib/stock-service';
import { calcLA } from '@/lib/mazeration-calc';
import { getTankDefinitions } from '@/lib/tank-sync';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { TankDefinition } from '@/schemas/tankSchema';

type ZielTankZeile = { tankNr: string; mengeLiter: string };

function fmtL(n: number | undefined | null) {
  return n != null ? n.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '–';
}
function fmtAbv(n: number | undefined | null) {
  return n != null ? `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })}%` : '–';
}

export default function EinlagerungPage() {
  const { toast } = useToast();
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);
  const [tanks, setTanks] = useState<TankDefinition[]>([]);
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([]);

  const [produktName, setProduktName] = useState('');
  const [chargenNummer, setChargenNummer] = useState('');
  const [category, setCategory] = useState('');
  const [alkoholVolProzent, setAlkoholVolProzent] = useState('');
  const [gesamtMenge, setGesamtMenge] = useState('');
  const [zielTanks, setZielTanks] = useState<ZielTankZeile[]>([{ tankNr: '', mengeLiter: '' }]);

  const loadAll = () => {
    setInventoryItems(StockService.readAll());
    setTanks(getTankDefinitions());
    try {
      const stored = localStorage.getItem('inventoryCategories');
      if (stored) setCategories(JSON.parse(stored));
    } catch {}
  };
  useEffect(() => { loadAll(); }, []);

  function resetForm() {
    setProduktName('');
    setChargenNummer('');
    setCategory('');
    setAlkoholVolProzent('');
    setGesamtMenge('');
    setZielTanks([{ tankNr: '', mengeLiter: '' }]);
  }

  function addZielTankRow() {
    setZielTanks(prev => [...prev, { tankNr: '', mengeLiter: '' }]);
  }
  function removeZielTankRow(idx: number) {
    setZielTanks(prev => prev.filter((_, i) => i !== idx));
  }
  function updateZielTankRow(idx: number, patch: Partial<ZielTankZeile>) {
    setZielTanks(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function tankInfo(tankNr: string) {
    const def = tanks.find(t => t.tankNr === tankNr);
    const itemsInTank = inventoryItems.filter(i => i.tankNr === tankNr);
    const belegt = itemsInTank.reduce((s, i) => s + i.currentQuantityLiters, 0);
    const kapazitaet = def?.volumenLiter ?? 0;
    const frei = Math.max(0, kapazitaet - belegt);
    const gleichesProdukt = itemsInTank.filter(i => i.produktName === produktName.trim());
    const bestehendeMenge = gleichesProdukt.reduce((s, i) => s + i.currentQuantityLiters, 0);
    const bestehendeLA = gleichesProdukt.reduce((s, i) => s + calcLA(i.currentQuantityLiters, i.alcoholVolProzent), 0);
    const bestehendeAbv = bestehendeMenge > 0 ? (bestehendeLA / bestehendeMenge) * 100 : 0;
    const fremdprodukt = itemsInTank.find(i => i.produktName !== produktName.trim());
    return { kapazitaet, belegt, frei, bestehendeMenge, bestehendeAbv, fremdprodukt: fremdprodukt?.produktName };
  }

  const abv = parseFloat(alkoholVolProzent.replace(',', '.'));
  const gesamt = parseFloat(gesamtMenge.replace(',', '.'));
  const verteilteSumme = zielTanks.reduce((s, r) => {
    const m = parseFloat(r.mengeLiter.replace(',', '.'));
    return s + (Number.isFinite(m) ? m : 0);
  }, 0);
  const restZuVerteilen = Number.isFinite(gesamt) ? gesamt - verteilteSumme : 0;

  function handleEinlagern() {
    if (!produktName.trim()) {
      toast({ title: 'Produktname fehlt', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(abv) || abv < 0) {
      toast({ title: 'Ungültiger Alkoholgehalt', variant: 'destructive' });
      return;
    }
    const rows = zielTanks
      .map(r => ({ tankNr: r.tankNr, menge: parseFloat(r.mengeLiter.replace(',', '.')) }))
      .filter(r => r.tankNr && Number.isFinite(r.menge) && r.menge > 0);
    if (rows.length === 0) {
      toast({ title: 'Kein Zieltank mit gültiger Menge angegeben', variant: 'destructive' });
      return;
    }
    if (Math.abs(restZuVerteilen) > 0.01) {
      toast({
        title: 'Menge stimmt nicht überein',
        description: `Gesamtmenge ${fmtL(gesamt)} L, aber ${fmtL(verteilteSumme)} L auf Zieltanks verteilt. Bitte angleichen.`,
        variant: 'destructive',
      });
      return;
    }

    let ok = true;
    let letzteFehlermeldung = '';
    const zusammenfassung: string[] = [];
    for (const row of rows) {
      const result = StockService.persistPoolIntoTank(row.tankNr, {
        produktName: produktName.trim(),
        chargenNummer: chargenNummer.trim() || undefined,
        category: category || 'M',
        alkoholVolProzent: abv,
        mengeLiter: row.menge,
      }, {
        notes: `Einlagerung ${produktName.trim()}${chargenNummer.trim() ? ` (${chargenNummer.trim()})` : ''}`,
      });
      if (!result.ok) {
        ok = false;
        letzteFehlermeldung = result.error;
        break;
      }
      zusammenfassung.push(`${row.tankNr}: +${fmtL(row.menge)} L → ${fmtL(result.konsolidiertesItem.currentQuantityLiters)} L @ ${fmtAbv(result.konsolidiertesItem.alcoholVolProzent)}`);
      loadAll();
    }

    if (!ok) {
      toast({ title: 'Einlagerung fehlgeschlagen', description: letzteFehlermeldung, variant: 'destructive' });
      return;
    }

    toast({ title: 'Eingelagert', description: zusammenfassung.join(' · ') });
    resetForm();
    loadAll();
  }

  return (
    <div className="space-y-8 p-4 container mx-auto max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Droplets className="w-6 h-6" />Einlagern</h1>
        <p className="text-muted-foreground text-sm">
          Neue Menge in einen oder mehrere Tanks einlagern — bereits vorhandener Inhalt desselben Produkts im Zieltank
          wird automatisch mit neu berechnetem Misch-ABV zu einem Posten verschmolzen, statt eine weitere separate
          Zeile anzulegen.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Neue Menge</CardTitle>
          <CardDescription>Was wird eingelagert?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Produktname</Label>
              <Input value={produktName} onChange={e => setProduktName(e.target.value)} placeholder="z.B. Zitronenmelisse-Mazerat" />
            </div>
            <div>
              <Label>Chargennummer (optional)</Label>
              <Input value={chargenNummer} onChange={e => setChargenNummer(e.target.value)} placeholder="z.B. 2600" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Kategorie wählen" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alkoholgehalt (%vol.)</Label>
              <Input type="text" inputMode="decimal" value={alkoholVolProzent} onChange={e => setAlkoholVolProzent(e.target.value)} placeholder="z.B. 54" />
            </div>
            <div>
              <Label>Gesamtmenge (L)</Label>
              <Input type="text" inputMode="decimal" value={gesamtMenge} onChange={e => setGesamtMenge(e.target.value)} placeholder="z.B. 1500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zieltank(e)</CardTitle>
          <CardDescription>Passt die Menge nicht in einen Tank, auf mehrere aufteilen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {zielTanks.map((row, idx) => {
            const info = row.tankNr ? tankInfo(row.tankNr) : null;
            const menge = parseFloat(row.mengeLiter.replace(',', '.'));
            const mengeGueltig = Number.isFinite(menge) && menge > 0;
            const neueGesamtmenge = info && mengeGueltig ? info.bestehendeMenge + menge : null;
            const neueLA = info && mengeGueltig ? info.bestehendeMenge * (info.bestehendeAbv / 100) + menge * (Number.isFinite(abv) ? abv : 0) / 100 : null;
            const neuerAbv = neueGesamtmenge && neueGesamtmenge > 0 && neueLA != null ? (neueLA / neueGesamtmenge) * 100 : null;
            const ueberKapazitaet = info && mengeGueltig && (info.belegt + menge) > info.kapazitaet && info.kapazitaet > 0;

            return (
              <div key={idx} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Select value={row.tankNr} onValueChange={v => updateZielTankRow(idx, { tankNr: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Tank wählen" /></SelectTrigger>
                    <SelectContent>
                      {tanks.map(t => <SelectItem key={t.tankNr} value={t.tankNr}>{t.bezeichnung} ({t.tankNr})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text" inputMode="decimal" className="w-28"
                    placeholder="Menge (L)"
                    value={row.mengeLiter}
                    onChange={e => updateZielTankRow(idx, { mengeLiter: e.target.value })}
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeZielTankRow(idx)} disabled={zielTanks.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {info && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Kapazität: {fmtL(info.kapazitaet)} L · aktuell belegt: {fmtL(info.belegt)} L · frei: {fmtL(info.frei)} L</div>
                    {info.bestehendeMenge > 0 && (
                      <div>Bereits vorhanden: {fmtL(info.bestehendeMenge)} L @ {fmtAbv(info.bestehendeAbv)}</div>
                    )}
                    {neuerAbv != null && (
                      <div className="font-medium text-foreground">
                        Nach Einlagerung: {fmtL(neueGesamtmenge)} L @ {fmtAbv(neuerAbv)}
                      </div>
                    )}
                    {info.fremdprodukt && (
                      <div className="text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Tank enthält bereits „{info.fremdprodukt}" — anderes Produkt!</div>
                    )}
                    {ueberKapazitaet && (
                      <div className="text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Übersteigt die Tankkapazität — bitte auf einen weiteren Tank aufteilen (Kapazitätswerte teils noch nicht final erfasst).</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <Button type="button" size="sm" variant="outline" onClick={addZielTankRow}><Plus className="w-4 h-4 mr-1" />Weiterer Tank</Button>

          {Number.isFinite(gesamt) && gesamt > 0 && (
            <p className={`text-sm font-medium text-right pt-1 ${Math.abs(restZuVerteilen) > 0.01 ? 'text-amber-700' : 'text-foreground'}`}>
              {Math.abs(restZuVerteilen) > 0.01
                ? `Noch zu verteilen: ${fmtL(restZuVerteilen)} L (Gesamtmenge ${fmtL(gesamt)} L)`
                : `Vollständig verteilt: ${fmtL(gesamt)} L`}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleEinlagern}><Droplets className="w-4 h-4 mr-1" />Einlagern &amp; Buchen</Button>
      </div>
    </div>
  );
}
