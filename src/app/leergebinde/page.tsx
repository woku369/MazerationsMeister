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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, PackageCheck, AlertTriangle } from 'lucide-react';
import * as StockService from '@/lib/stock-service';
import * as LeergebindeService from '@/lib/leergebinde-service';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { Leergebinde, LeergebindeStatus } from '@/schemas/leergebindeSchema';

function fmtL(n: number | undefined | null) {
  return n != null ? n.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '–';
}
function fmtKg(n: number | undefined | null) {
  return n != null ? `${n.toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg` : '–';
}

const STATUS_BADGE: Record<LeergebindeStatus, { label: string; variant: 'outline' | 'secondary' | 'default' }> = {
  erwartet: { label: 'Erwartet', variant: 'outline' },
  leer: { label: 'Leer', variant: 'secondary' },
  befuellt: { label: 'Befüllt', variant: 'default' },
  versendet: { label: 'Versendet', variant: 'outline' },
};

export default function LeergebindePage() {
  const { toast } = useToast();
  const [gebinde, setGebinde] = useState<Leergebinde[]>([]);
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [bezeichnung, setBezeichnung] = useState('');
  const [taraKg, setTaraKg] = useState('');
  const [volumenLiter, setVolumenLiter] = useState('');
  const [herkunft, setHerkunft] = useState('');
  const [bemerkungen, setBemerkungen] = useState('');
  const [neuStatus, setNeuStatus] = useState<'leer' | 'erwartet'>('leer');

  const [fillingId, setFillingId] = useState<string | null>(null);
  const [quellItemId, setQuellItemId] = useState('');
  const [mengeLiter, setMengeLiter] = useState('');

  const loadAll = () => {
    setGebinde(LeergebindeService.readAll());
    setInventoryItems(StockService.readAll());
  };
  useEffect(() => { loadAll(); }, []);

  const erwartet = gebinde.filter(g => g.status === 'erwartet');
  const leer = gebinde.filter(g => g.status === 'leer');
  const befuellt = gebinde.filter(g => g.status === 'befuellt');
  const versendet = gebinde.filter(g => g.status === 'versendet');
  const availableItems = inventoryItems.filter(i => i.currentQuantityLiters > 0);

  function inhaltVon(g: Leergebinde) {
    return inventoryItems.find(i => i.id === g.inventoryItemId);
  }

  function resetNewForm() {
    setBezeichnung('');
    setTaraKg('');
    setVolumenLiter('');
    setHerkunft('');
    setBemerkungen('');
    setNeuStatus('leer');
  }

  function handleCreate() {
    const tara = parseFloat(taraKg.replace(',', '.'));
    const volumen = volumenLiter.trim() ? parseFloat(volumenLiter.replace(',', '.')) : undefined;
    if (!bezeichnung.trim() || !Number.isFinite(tara) || tara < 0) {
      toast({ title: 'Bezeichnung oder Tara ungültig', variant: 'destructive' });
      return;
    }
    const result = LeergebindeService.persistCreateLeergebinde({
      bezeichnung: bezeichnung.trim(),
      taraKg: tara,
      volumenLiter: volumen != null && Number.isFinite(volumen) ? volumen : undefined,
      status: neuStatus,
      herkunft: herkunft.trim() || undefined,
      bemerkungen: bemerkungen.trim() || undefined,
    });
    if (!result.ok) {
      toast({ title: 'Anlegen fehlgeschlagen', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: `Leergebinde "${result.gebinde.bezeichnung}" angelegt` });
    setIsNewOpen(false);
    resetNewForm();
    loadAll();
  }

  function handleAngekommen(g: Leergebinde) {
    LeergebindeService.persistMarkAngekommen(g.id);
    toast({ title: `"${g.bezeichnung}" als angekommen markiert` });
    loadAll();
  }

  function openFill(g: Leergebinde) {
    setFillingId(g.id);
    setQuellItemId('');
    setMengeLiter('');
  }

  const fillingGebinde = gebinde.find(g => g.id === fillingId) || null;
  const quellItem = inventoryItems.find(i => i.id === quellItemId);
  const mengeNum = parseFloat(mengeLiter.replace(',', '.'));
  const mengeGueltig = Number.isFinite(mengeNum) && mengeNum > 0;
  const ueberKapazitaet = fillingGebinde?.volumenLiter != null && mengeGueltig && mengeNum > fillingGebinde.volumenLiter;
  const ueberBestand = quellItem && mengeGueltig && mengeNum > quellItem.currentQuantityLiters;

  function handleBefuellen() {
    if (!fillingId || !quellItemId || !mengeGueltig) {
      toast({ title: 'Quellposten oder Menge fehlt', variant: 'destructive' });
      return;
    }
    const result = LeergebindeService.persistBefuellen(fillingId, { quellItemId, mengeLiter: mengeNum });
    if (!result.ok) {
      toast({ title: 'Befüllen fehlgeschlagen', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: `"${fillingGebinde?.bezeichnung}" befüllt`, description: `${fmtL(mengeNum)} L aus ${quellItem?.tankNr} umgefüllt.` });
    setFillingId(null);
    loadAll();
  }

  return (
    <div className="space-y-8 p-4 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Package className="w-6 h-6" />Leergebinde</h1>
          <p className="text-muted-foreground text-sm">
            Physische Versandgebinde (z.B. IBCs) mit eigener Bezeichnung und eigenem Tara verwalten — von „erwartet"
            über „befüllt" bis zum Versand.
          </p>
        </div>
        <Button onClick={() => { resetNewForm(); setIsNewOpen(true); }}><Plus className="w-4 h-4 mr-1" />Neues Leergebinde</Button>
      </div>

      {erwartet.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Erwartet ({erwartet.length})</CardTitle>
            <CardDescription>Noch nicht physisch vor Ort — z.B. Leergut, das der Lohnabfüller noch schickt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {erwartet.map(g => (
              <div key={g.id} className="border rounded-lg p-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{g.bezeichnung}</span>
                    <Badge variant={STATUS_BADGE[g.status].variant}>{STATUS_BADGE[g.status].label}</Badge>
                    {g.herkunft && <span className="text-xs text-muted-foreground">von {g.herkunft}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Tara: {fmtKg(g.taraKg)}{g.volumenLiter != null && ` · Volumen: ${fmtL(g.volumenLiter)} L`}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleAngekommen(g)}>Als angekommen markieren</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leer — befüllbar ({leer.length})</CardTitle>
          <CardDescription>Physisch vor Ort, bereit zum Befüllen aus einem Lagerposten.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {leer.length === 0 && <p className="text-sm text-muted-foreground">Kein leeres Gebinde vorhanden.</p>}
          {leer.map(g => (
            <div key={g.id} className="border rounded-lg p-3 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{g.bezeichnung}</span>
                  <Badge variant={STATUS_BADGE[g.status].variant}>{STATUS_BADGE[g.status].label}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Tara: {fmtKg(g.taraKg)}{g.volumenLiter != null && ` · Volumen: ${fmtL(g.volumenLiter)} L`}</div>
              </div>
              <Button size="sm" onClick={() => openFill(g)}>Befüllen</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Befüllt — bereit für den Versand ({befuellt.length})</CardTitle>
          <CardDescription>Die Auswahl fürs Verschicken passiert auf der Seite „Versand an Lohnabfüller".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {befuellt.length === 0 && <p className="text-sm text-muted-foreground">Kein befülltes Gebinde vorhanden.</p>}
          {befuellt.map(g => {
            const inhalt = inhaltVon(g);
            return (
              <div key={g.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{g.bezeichnung}</span>
                  <Badge variant={STATUS_BADGE[g.status].variant}>{STATUS_BADGE[g.status].label}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Tara: {fmtKg(g.taraKg)}
                  {inhalt && ` · ${inhalt.produktName}: ${fmtL(inhalt.currentQuantityLiters)} L @ ${inhalt.alcoholVolProzent}%`}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {versendet.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Versendet — Verlauf ({versendet.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {versendet.map(g => (
              <div key={g.id} className="text-sm text-muted-foreground flex items-center gap-2">
                <span>{g.bezeichnung}</span>
                <Badge variant={STATUS_BADGE[g.status].variant}>{STATUS_BADGE[g.status].label}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Neues Leergebinde */}
      <Dialog open={isNewOpen} onOpenChange={(open) => { setIsNewOpen(open); if (!open) resetNewForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neues Leergebinde</DialogTitle>
            <DialogDescription>Kann auch angelegt werden, bevor das Gebinde physisch vor Ort ist.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Bezeichnung</Label>
              <Input value={bezeichnung} onChange={e => setBezeichnung(e.target.value)} placeholder="z.B. IBC-A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tara (kg)</Label>
                <Input type="text" inputMode="decimal" value={taraKg} onChange={e => setTaraKg(e.target.value)} placeholder="z.B. 60" />
              </div>
              <div>
                <Label>Volumen (L, optional)</Label>
                <Input type="text" inputMode="decimal" value={volumenLiter} onChange={e => setVolumenLiter(e.target.value)} placeholder="z.B. 1000" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Status</Label>
              <RadioGroup value={neuStatus} onValueChange={v => setNeuStatus(v as 'leer' | 'erwartet')} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="leer" id="status-leer" />
                  <Label htmlFor="status-leer" className="font-normal cursor-pointer">Schon vor Ort (leer)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="erwartet" id="status-erwartet" />
                  <Label htmlFor="status-erwartet" className="font-normal cursor-pointer">Noch nicht da (erwartet)</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Herkunft (optional)</Label>
              <Input value={herkunft} onChange={e => setHerkunft(e.target.value)} placeholder="z.B. Mozart" />
            </div>
            <div>
              <Label>Bemerkungen</Label>
              <Textarea value={bemerkungen} onChange={e => setBemerkungen(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate}>Anlegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Befüllen */}
      <Dialog open={!!fillingId} onOpenChange={(open) => !open && setFillingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Befüllen{fillingGebinde ? ` – ${fillingGebinde.bezeichnung}` : ''}</DialogTitle>
            <DialogDescription>Bucht sofort den Abgang beim Quellposten und den Zugang in dieses Gebinde.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quellposten</Label>
              <Select value={quellItemId} onValueChange={setQuellItemId}>
                <SelectTrigger><SelectValue placeholder="Quellposten wählen" /></SelectTrigger>
                <SelectContent>
                  {availableItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.produktName} — {i.tankNr} ({fmtL(i.currentQuantityLiters)} L, {i.alcoholVolProzent}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Menge (L)</Label>
              <Input type="text" inputMode="decimal" value={mengeLiter} onChange={e => setMengeLiter(e.target.value)} placeholder="z.B. 1000" />
              {quellItem && <p className="text-xs text-muted-foreground mt-1">Verfügbar: {fmtL(quellItem.currentQuantityLiters)} L</p>}
            </div>
            {ueberBestand && (
              <p className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />Menge übersteigt den verfügbaren Bestand des Quellpostens.</p>
            )}
            {ueberKapazitaet && (
              <p className="text-sm text-amber-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />Übersteigt das angegebene Volumen des Gebindes ({fmtL(fillingGebinde?.volumenLiter)} L) — trotzdem möglich, falls beabsichtigt.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFillingId(null)}>Abbrechen</Button>
            <Button onClick={handleBefuellen} disabled={!!ueberBestand}><PackageCheck className="w-4 h-4 mr-1" />Befüllen &amp; Buchen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
