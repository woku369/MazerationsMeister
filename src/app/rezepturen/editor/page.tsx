'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Beaker,
  Printer,
  ClipboardList
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  berechneRezeptur,
  validiereRezeptur,
  fuegeKomponenteHinzu,
} from '@/lib/rezeptur-manager';
import { ladeAlleLagerbestaende, ladeRezepturen, speichereRezepturen } from '@/lib/app-auto-sync';
import type { 
  Rezeptur, 
  RezepturKomponente,
} from '@/schemas/rezepturSchema';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';

/**
 * Rezeptur-Editor
 * Excel-Style Komponenten-Tabelle mit Live-Berechnungen
 */
export default function RezepturEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const rezepturId = searchParams.get('id');
  const [rezeptur, setRezeptur] = useState<Rezeptur | null>(null);
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [protokollOpen, setProtokollOpen] = useState(false);
  const [istWerte, setIstWerte] = useState<Record<string, number>>({});

  // Lade Daten beim Mount
  useEffect(() => {
    async function loadData() {
      try {
        // Lade Inventory für Dropdown
        const inventory = await ladeAlleLagerbestaende();
        setInventoryItems(inventory);

        if (rezepturId === 'neu') {
          // Neue Rezeptur erstellen
          const neueRezeptur: Rezeptur = {
            id: `rez_${Date.now()}`,
            name: 'Neue Rezeptur',
            zielProduktName: '',
            variantenName: '',
            basisMenge: 1.0,
            komponenten: [],
            status: 'entwurf',
            erstelltAm: new Date().toISOString(),
            geaendertAm: new Date().toISOString(),
            sensorikBewertungen: [],
            version: 1,
          };
          setRezeptur(neueRezeptur);
        } else if (rezepturId) {
          // Existierende Rezeptur laden
          const rezepturen = await ladeRezepturen();
          const gefunden = rezepturen.find((r: Rezeptur) => r.id === rezepturId);
          if (gefunden) {
            setRezeptur(gefunden);
          } else {
            toast({
              title: 'Fehler',
              description: 'Rezeptur nicht gefunden',
              variant: 'destructive',
            });
            router.push('/rezepturen');
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden:', error);
        toast({
          title: 'Fehler',
          description: 'Daten konnten nicht geladen werden',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [rezepturId, router, toast]);

  // Berechne Rezeptur bei jeder Änderung
  const berechneteRezeptur = useMemo(() => {
    if (!rezeptur) return null;
    return berechneRezeptur(rezeptur);
  }, [rezeptur]);

  // Validierung
  const validierung = useMemo(() => {
    if (!berechneteRezeptur) return { valid: false, errors: [] };
    return validiereRezeptur(berechneteRezeptur);
  }, [berechneteRezeptur]);

  // Display-Einheit: ml für Testmischung (≤ 2L), L für Scale-up
  const istTestmischung = rezeptur && rezeptur.basisMenge <= 2;
  const mengenEinheit = istTestmischung ? 'ml' : 'L';
  const mengenFaktor = istTestmischung ? 1000 : 1;
  const mengenDezimalen = istTestmischung ? 0 : 1;

  // Helper: Liter zu Display-Wert konvertieren
  const literZuDisplay = (liter: number) => {
    return istTestmischung ? Math.round(liter * 1000) : parseFloat(liter.toFixed(1));
  };

  // Helper: Display-Wert zu Liter konvertieren
  const displayZuLiter = (display: number) => {
    return istTestmischung ? display / 1000 : display;
  };

  // Komponente hinzufügen
  const handleKomponenteHinzufuegen = () => {
    if (!rezeptur) return;

    // Standard: Lagerbestand-Item
    if (inventoryItems.length > 0) {
      const erstesItem = inventoryItems[0];
      const updated = fuegeKomponenteHinzu(rezeptur, erstesItem, 'liter', 0);
      setRezeptur(updated);
    } else {
      // Fallback: Freie Zutat
      handleFreieZutatHinzufuegen();
    }
  };

  // Freie Zutat hinzufügen (Wasser, Zucker, etc.)
  const handleFreieZutatHinzufuegen = () => {
    if (!rezeptur) return;

    const neueKomponente: RezepturKomponente = {
      id: `komp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      produktId: 'FREITEXT',
      produktName: 'Freie Zutat',
      istFreieZutat: true,
      freitextZutat: 'Wasser',
      eingabeTyp: 'liter',
      eingabeWert: 0,
      alkoholgehalt: 0,
      verfuegbareMenge: 999999, // Unendlich verfügbar
      mengeInLiter: 0,
      anteilProzent: 0,
      literAlkohol: 0,
      istVerfuegbar: true,
    };

    setRezeptur({
      ...rezeptur,
      komponenten: [...rezeptur.komponenten, neueKomponente],
      geaendertAm: new Date().toISOString(),
    });
  };

  // Komponente entfernen
  const handleKomponenteEntfernen = (komponenteId: string) => {
    if (!rezeptur) return;
    
    setRezeptur({
      ...rezeptur,
      komponenten: rezeptur.komponenten.filter(k => k.id !== komponenteId),
      geaendertAm: new Date().toISOString(),
    });
  };

  // Komponente aktualisieren
  const handleKomponenteUpdate = (
    komponenteId: string, 
    updates: Partial<RezepturKomponente>
  ) => {
    if (!rezeptur) return;

    setRezeptur({
      ...rezeptur,
      komponenten: rezeptur.komponenten.map(k => 
        k.id === komponenteId ? { ...k, ...updates } : k
      ),
      geaendertAm: new Date().toISOString(),
    });
  };

  // Produkt wechseln (Dropdown)
  const handleProduktWechsel = (komponenteId: string, produktId: string) => {
    if (!rezeptur) return;

    if (produktId === 'FREITEXT') {
      // Freie Zutat
      handleKomponenteUpdate(komponenteId, {
        produktId: 'FREITEXT',
        produktName: 'Freie Zutat',
        istFreieZutat: true,
        freitextZutat: 'Wasser',
        alkoholgehalt: 0,
        verfuegbareMenge: 999999,
        tankNr: undefined,
      });
    } else {
      // Lagerbestand-Item
      const item = inventoryItems.find(i => i.id === produktId);
      if (!item) return;

      handleKomponenteUpdate(komponenteId, {
        produktId: item.id,
        produktName: item.produktName,
        istFreieZutat: false,
        freitextZutat: undefined,
        alkoholgehalt: item.alcoholVolProzent || 0,
        verfuegbareMenge: item.currentQuantityLiters || 0,
        tankNr: item.tankNr,
      });
    }
  };

  // Eingabe-Typ togglen (Liter ↔ Prozent)
  const handleEingabeTypToggle = (komponenteId: string) => {
    if (!rezeptur) return;

    const komponente = rezeptur.komponenten.find(k => k.id === komponenteId);
    if (!komponente) return;

    const neuerTyp = komponente.eingabeTyp === 'liter' ? 'prozent' : 'liter';
    const neuerWert = neuerTyp === 'liter' 
      ? komponente.mengeInLiter 
      : komponente.anteilProzent;

    handleKomponenteUpdate(komponenteId, {
      eingabeTyp: neuerTyp,
      eingabeWert: neuerWert,
    });
  };

  // Eingabe-Wert ändern
  const handleEingabeWertChange = (komponenteId: string, wert: number) => {
    handleKomponenteUpdate(komponenteId, {
      eingabeWert: wert,
    });
  };

  // Speichern
  const handleSpeichern = async () => {
    if (!berechneteRezeptur) return;

    console.log('=== SPEICHERN START ===');
    console.log('Rezeptur:', berechneteRezeptur);
    
    // Validierung entfernt - Abweichungen bei Korrektur sind normal
    setIsSaving(true);
    try {
      const rezepturen = await ladeRezepturen();
      console.log('Geladene Rezepturen:', rezepturen.length);
      
      const index = rezepturen.findIndex((r: Rezeptur) => r.id === berechneteRezeptur.id);
      console.log('Index:', index);
      
      if (index >= 0) {
        rezepturen[index] = berechneteRezeptur;
      } else {
        rezepturen.push(berechneteRezeptur);
      }

      await speichereRezepturen(rezepturen);
      console.log('=== SPEICHERN ERFOLGREICH ===');
      
      toast({
        title: 'Gespeichert',
        description: 'Rezeptur wurde erfolgreich gespeichert',
      });
      
      router.push('/rezepturen');
    } catch (error) {
      console.error('=== SPEICHERN FEHLER ===', error);
      toast({
        title: 'Fehler',
        description: 'Rezeptur konnte nicht gespeichert werden',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Löschen
  const handleLoeschen = async () => {
    if (!rezeptur) return;

    if (!confirm('Rezeptur wirklich löschen?')) return;

    try {
      const rezepturen = await ladeRezepturen();
      const gefiltert = rezepturen.filter((r: Rezeptur) => r.id !== rezeptur.id);
      await speichereRezepturen(gefiltert);
      
      toast({
        title: 'Gelöscht',
        description: 'Rezeptur wurde gelöscht',
      });
      
      router.push('/rezepturen');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast({
        title: 'Fehler',
        description: 'Rezeptur konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!rezeptur || !berechneteRezeptur) {
    return null;
  }

  const ergebnis = berechneteRezeptur.ergebnis;
  const prozenteSumme = berechneteRezeptur.komponenten.reduce(
    (sum, k) => sum + k.anteilProzent, 
    0
  );
  const prozentCheck = Math.abs(prozenteSumme - 100) < 0.01;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/rezepturen')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Beaker className="h-8 w-8" />
            {rezepturId === 'neu' ? 'Neue Rezeptur' : 'Rezeptur bearbeiten'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {validierung.valid ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Gültig
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validierung.errors.length} Fehler
            </Badge>
          )}
          
          {rezepturId !== 'neu' && (
            <Button variant="destructive" onClick={handleLoeschen}>
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => setProtokollOpen(true)}
            disabled={!berechneteRezeptur || berechneteRezeptur.komponenten.length === 0}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Produktions-Protokoll
          </Button>
          
          <Button onClick={handleSpeichern} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Speichert...' : 'Speichern'}
          </Button>
        </div>
      </div>

      {/* Grundinformationen */}
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
          <CardDescription>
            Name und Status der Rezeptur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name der Rezeptur *</Label>
              <Input
                id="name"
                value={rezeptur.name}
                onChange={(e) => setRezeptur({ 
                  ...rezeptur, 
                  name: e.target.value,
                  geaendertAm: new Date().toISOString(),
                })}
                placeholder="z.B. GFKC 2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zielProduktName">Zielprodukt</Label>
              <Input
                id="zielProduktName"
                value={rezeptur.zielProduktName}
                onChange={(e) => setRezeptur({ 
                  ...rezeptur, 
                  zielProduktName: e.target.value,
                  geaendertAm: new Date().toISOString(),
                })}
                placeholder="z.B. GFKC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variantenName">Varianten-Name</Label>
              <Input
                id="variantenName"
                value={rezeptur.variantenName || ''}
                onChange={(e) => setRezeptur({ 
                  ...rezeptur, 
                  variantenName: e.target.value,
                  geaendertAm: new Date().toISOString(),
                })}
                placeholder="z.B. Variante A - mehr Zitrone"
              />
            </div>

            <div className="space-y-3">
              <Label>Workflow-Status</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="status-entwurf"
                    checked={rezeptur.status === 'entwurf' || rezeptur.status === 'test' || rezeptur.status === 'freigegeben' || rezeptur.status === 'produziert'}
                    disabled
                  />
                  <label
                    htmlFor="status-entwurf"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Entwurf erstellt
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="status-test"
                    checked={rezeptur.status === 'test' || rezeptur.status === 'freigegeben' || rezeptur.status === 'produziert'}
                    onCheckedChange={(checked) => {
                      console.log('Checkbox Test geklickt:', checked, 'Aktueller Status:', rezeptur.status);
                      if (checked) {
                        setRezeptur({ 
                          ...rezeptur, 
                          status: 'test',
                          geaendertAm: new Date().toISOString(),
                        });
                      } else if (rezeptur.status === 'test') {
                        setRezeptur({ 
                          ...rezeptur, 
                          status: 'entwurf',
                          geaendertAm: new Date().toISOString(),
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="status-test"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Testmischung hergestellt (1L)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="status-freigegeben"
                    checked={rezeptur.status === 'freigegeben' || rezeptur.status === 'produziert'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setRezeptur({ 
                          ...rezeptur, 
                          status: 'freigegeben',
                          geaendertAm: new Date().toISOString(),
                        });
                      } else if (rezeptur.status === 'freigegeben') {
                        setRezeptur({ 
                          ...rezeptur, 
                          status: 'test',
                          geaendertAm: new Date().toISOString(),
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="status-freigegeben"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Sensorik OK - zur Produktion freigegeben
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="status-produziert"
                    checked={rezeptur.status === 'produziert'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setRezeptur({ 
                          ...rezeptur, 
                          status: 'produziert',
                          geaendertAm: new Date().toISOString(),
                        });
                      } else if (rezeptur.status === 'produziert') {
                        setRezeptur({ 
                          ...rezeptur, 
                          status: 'freigegeben',
                          geaendertAm: new Date().toISOString(),
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="status-produziert"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Produktionsmischung hergestellt
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="status-archiviert"
                    checked={rezeptur.status === 'archiviert'}
                    onCheckedChange={(checked) => {
                      setRezeptur({ 
                        ...rezeptur, 
                        status: checked ? 'archiviert' : 'produziert',
                        geaendertAm: new Date().toISOString(),
                      });
                    }}
                  />
                  <label
                    htmlFor="status-archiviert"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Archiviert (alte Version)
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basisMenge">Basis-Menge (Liter) *</Label>
              <Input
                id="basisMenge"
                type="number"
                step="0.1"
                min="0.1"
                value={rezeptur.basisMenge}
                onChange={(e) => setRezeptur({ 
                  ...rezeptur, 
                  basisMenge: parseFloat(e.target.value) || 0,
                  geaendertAm: new Date().toISOString(),
                })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rezepturNotizen">Notizen</Label>
            <Textarea
              id="rezepturNotizen"
              value={rezeptur.rezepturNotizen || ''}
              onChange={(e) => setRezeptur({ 
                ...rezeptur, 
                rezepturNotizen: e.target.value,
                geaendertAm: new Date().toISOString(),
              })}
              placeholder="Allgemeine Notizen zur Rezeptur..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Komponenten-Tabelle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Komponenten</CardTitle>
              <CardDescription>
                Excel-Style Tabelle mit Live-Berechnungen
              </CardDescription>
            </div>
            <Button onClick={handleKomponenteHinzufuegen}>
              <Plus className="h-4 w-4 mr-2" />
              Komponente hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {berechneteRezeptur.komponenten.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Noch keine Komponenten hinzugefügt</p>
              <p className="text-sm mt-2">
                Klicken Sie auf "Komponente hinzufügen" um zu starten
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Produkt / Zutat</TableHead>
                    <TableHead className="w-[100px]">Tank</TableHead>
                    <TableHead className="w-[120px]">{mengenEinheit}</TableHead>
                    <TableHead className="w-[100px] text-right">Anteil %</TableHead>
                    <TableHead className="w-[100px] text-right">%vol</TableHead>
                    <TableHead className="w-[100px] text-right">LA</TableHead>
                    <TableHead className="w-[100px] text-right">Verfügbar</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {berechneteRezeptur.komponenten.map((komponente) => (
                    <TableRow key={komponente.id}>
                      {/* Produkt-Dropdown oder Freitext */}
                      <TableCell>
                        {komponente.istFreieZutat ? (
                          <Input
                            type="text"
                            value={komponente.freitextZutat || ''}
                            onChange={(e) => handleKomponenteUpdate(komponente.id, {
                              freitextZutat: e.target.value,
                              produktName: e.target.value,
                            })}
                            placeholder="z.B. Wasser, Zucker..."
                            className="w-full"
                          />
                        ) : (
                          <Select
                            value={komponente.produktId}
                            onValueChange={(value) => handleProduktWechsel(komponente.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {(() => {
                                  const item = inventoryItems.find(i => i.id === komponente.produktId);
                                  return item ? (
                                    <div className="flex items-center justify-between gap-2 w-full">
                                      <span className="truncate">{item.produktName}</span>
                                      <span className="text-xs text-muted-foreground flex-shrink-0">
                                        ({item.category})
                                      </span>
                                    </div>
                                  ) : komponente.produktName;
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FREITEXT">
                                <div className="flex items-center gap-2">
                                  <Plus className="h-4 w-4" />
                                  <span className="font-semibold">Freie Zutat eingeben...</span>
                                </div>
                              </SelectItem>
                              {inventoryItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span>{item.produktName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({item.category})
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>

                      {/* Tank-Nr */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {komponente.tankNr || '-'}
                        </span>
                      </TableCell>

                      {/* Menge (Eingabe in ml oder L) */}
                      <TableCell>
                        <Input
                          type="number"
                          step={istTestmischung ? "1" : "0.1"}
                          min="0"
                          inputMode="decimal"
                          value={literZuDisplay(komponente.eingabeWert)}
                          onChange={(e) => {
                            const displayWert = parseFloat(e.target.value) || 0;
                            const literWert = displayZuLiter(displayWert);
                            handleEingabeWertChange(komponente.id, literWert);
                          }}
                          className="w-full font-mono"
                        />
                      </TableCell>

                      {/* Anteil % (berechnet) */}
                      <TableCell className="text-right font-mono">
                        {komponente.anteilProzent.toFixed(1)}%
                      </TableCell>

                      {/* %vol (editierbar) */}
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={komponente.alkoholgehaltManuell ?? komponente.alkoholgehalt}
                          onChange={(e) => 
                            handleKomponenteUpdate(komponente.id, {
                              alkoholgehaltManuell: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full font-mono text-right ${
                            komponente.alkoholgehaltManuell !== undefined 
                              ? 'bg-yellow-50 border-yellow-300' 
                              : ''
                          }`}
                          title={komponente.alkoholgehaltManuell !== undefined 
                            ? `Original: ${komponente.alkoholgehalt.toFixed(2)}%` 
                            : 'Aus Lagerbestand'
                          }
                        />
                      </TableCell>

                      {/* LA (berechnet) */}
                      <TableCell className="text-right font-mono">
                        {komponente.literAlkohol.toFixed(3)}
                      </TableCell>

                      {/* Verfügbar */}
                      <TableCell className="text-right">
                        {komponente.istFreieZutat ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            ∞
                          </Badge>
                        ) : (
                          <Badge 
                            variant={
                              komponente.verfuegbareMenge >= komponente.mengeInLiter 
                                ? 'default' 
                                : 'destructive'
                            }
                            className="font-mono text-xs"
                          >
                            {komponente.verfuegbareMenge.toFixed(2)}L
                          </Badge>
                        )}
                      </TableCell>

                      {/* Löschen */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleKomponenteEntfernen(komponente.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Summen-Zeile */}
                  {berechneteRezeptur.komponenten.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold border-t-2">
                      <TableCell colSpan={2} className="text-right">
                        SUMME:
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {(() => {
                          const summe = berechneteRezeptur.komponenten.reduce(
                            (sum, k) => sum + k.mengeInLiter, 
                            0
                          );
                          return istTestmischung 
                            ? `${Math.round(summe * 1000)} ml`
                            : `${summe.toFixed(1)} L`;
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        <span className={prozentCheck ? 'text-green-600' : 'text-red-600'}>
                          {prozenteSumme.toFixed(1)}%
                          {prozentCheck ? ' ✓' : ' ✗'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(berechneteRezeptur.komponenten.reduce(
                          (sum, k) => sum + (k.mengeInLiter * (k.alkoholgehaltManuell ?? k.alkoholgehalt) / 100), 
                          0
                        ) / berechneteRezeptur.komponenten.reduce(
                          (sum, k) => sum + k.mengeInLiter, 
                          0
                        ) * 100).toFixed(1)}%vol
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {berechneteRezeptur.komponenten.reduce(
                          (sum, k) => sum + k.literAlkohol, 
                          0
                        ).toFixed(3)}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alkohol-Korrektur Bereich */}
      {berechneteRezeptur.komponenten.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alkohol-Korrektur (nach Mischung)</CardTitle>
            <CardDescription>
              Messe den tatsächlichen %vol und korrigiere durch Wasser- oder Sprit-Zugabe (60%vol)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="berechneter-alkohol">Berechneter %vol</Label>
                <Input
                  id="berechneter-alkohol"
                  type="number"
                  value={ergebnis?.durchschnittAlkohol.toFixed(2) || '0'}
                  disabled
                  className="font-mono bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gemessener-alkohol">Gemessener %vol *</Label>
                <Input
                  id="gemessener-alkohol"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={rezeptur.alkoholKorrektur?.gemessenerAlkohol || ''}
                  onChange={(e) => setRezeptur({
                    ...rezeptur,
                    alkoholKorrektur: {
                      ...rezeptur.alkoholKorrektur,
                      gemessenerAlkohol: parseFloat(e.target.value) || undefined,
                      korrekturBerechnet: false,
                      korrekturDurchgefuehrt: false,
                    },
                    geaendertAm: new Date().toISOString(),
                  })}
                  placeholder="z.B. 42.5"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ziel-alkohol">Ziel %vol *</Label>
                <Input
                  id="ziel-alkohol"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={rezeptur.alkoholKorrektur?.zielAlkohol || ''}
                  onChange={(e) => setRezeptur({
                    ...rezeptur,
                    alkoholKorrektur: {
                      ...rezeptur.alkoholKorrektur,
                      zielAlkohol: parseFloat(e.target.value) || undefined,
                      korrekturBerechnet: false,
                      korrekturDurchgefuehrt: false,
                    },
                    geaendertAm: new Date().toISOString(),
                  })}
                  placeholder="z.B. 40.0"
                  className="font-mono"
                />
              </div>
            </div>

            <Button
              disabled={!rezeptur.alkoholKorrektur?.gemessenerAlkohol || !rezeptur.alkoholKorrektur?.zielAlkohol}
              onClick={() => {
                if (!rezeptur.alkoholKorrektur?.gemessenerAlkohol || !rezeptur.alkoholKorrektur?.zielAlkohol || !ergebnis) {
                  toast({
                    title: 'Fehlende Werte',
                    description: 'Bitte "Gemessener %vol" und "Ziel %vol" eingeben',
                    variant: 'destructive',
                  });
                  return;
                }

                const gemessen = rezeptur.alkoholKorrektur.gemessenerAlkohol;
                const ziel = rezeptur.alkoholKorrektur.zielAlkohol;
                const aktuelleMenge = ergebnis.gesamtMengeLiter;

                let wasserZugabe = 0;
                let spritZugabe = 0;

                if (gemessen > ziel) {
                  // Zu hoch → Wasser zugeben (verdünnen)
                  // Formel: Wasser = Menge * (gemessen - ziel) / ziel
                  wasserZugabe = (aktuelleMenge * gemessen / ziel) - aktuelleMenge;
                } else if (gemessen < ziel) {
                  // Zu niedrig → Sprit zugeben (60%vol)
                  // Formel: Sprit = Menge * (ziel - gemessen) / (60 - ziel)
                  const spritStaerke = 60; // %vol des Sprits
                  spritZugabe = (aktuelleMenge * (ziel - gemessen)) / (spritStaerke - ziel);
                }

                setRezeptur({
                  ...rezeptur,
                  alkoholKorrektur: {
                    ...rezeptur.alkoholKorrektur,
                    gemessenerAlkohol: gemessen,
                    zielAlkohol: ziel,
                    wasserZugabe: wasserZugabe > 0 ? wasserZugabe : undefined,
                    spritZugabe: spritZugabe > 0 ? spritZugabe : undefined,
                    korrekturBerechnet: true,
                    korrekturDurchgefuehrt: false,
                  },
                  geaendertAm: new Date().toISOString(),
                });

                toast({
                  title: 'Korrektur berechnet',
                  description: wasserZugabe > 0 
                    ? `${wasserZugabe.toFixed(2)}L Wasser zugeben` 
                    : `${spritZugabe.toFixed(2)}L Sprit (60%vol) zugeben`,
                });
              }}
              className="mb-4"
            >
              <Beaker className="h-4 w-4 mr-2" />
              Korrektur berechnen
            </Button>

            {rezeptur.alkoholKorrektur?.korrekturBerechnet && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Berechnete Korrektur:
                </h4>
                
                {rezeptur.alkoholKorrektur.wasserZugabe && rezeptur.alkoholKorrektur.wasserZugabe > 0 && (
                  <div className="space-y-2">
                    <p className="text-lg">
                      <span className="font-semibold text-blue-600">
                        {rezeptur.alkoholKorrektur.wasserZugabe.toFixed(2)} Liter Wasser
                      </span>
                      {' '}zugeben (verdünnen)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Endmenge: {(ergebnis!.gesamtMengeLiter + rezeptur.alkoholKorrektur.wasserZugabe).toFixed(2)}L
                      bei {rezeptur.alkoholKorrektur.zielAlkohol?.toFixed(1)}%vol
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Wasser als freie Zutat hinzufügen
                        const wasserKomponente: RezepturKomponente = {
                          id: `komp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          produktId: 'FREITEXT',
                          produktName: 'Wasser (Korrektur)',
                          istFreieZutat: true,
                          freitextZutat: 'Wasser (Korrektur)',
                          eingabeTyp: 'liter',
                          eingabeWert: rezeptur.alkoholKorrektur!.wasserZugabe!,
                          alkoholgehalt: 0,
                          verfuegbareMenge: 999999,
                          mengeInLiter: rezeptur.alkoholKorrektur!.wasserZugabe!,
                          anteilProzent: 0,
                          literAlkohol: 0,
                          istVerfuegbar: true,
                        };
                        
                        setRezeptur({
                          ...rezeptur,
                          komponenten: [...rezeptur.komponenten, wasserKomponente],
                          alkoholKorrektur: {
                            ...rezeptur.alkoholKorrektur!,
                            korrekturDurchgefuehrt: true,
                          },
                          geaendertAm: new Date().toISOString(),
                        });

                        toast({
                          title: 'Wasser hinzugefügt',
                          description: 'Wasser-Korrektur als Komponente eingetragen',
                        });
                      }}
                      disabled={rezeptur.alkoholKorrektur.korrekturDurchgefuehrt}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Als Komponente eintragen
                    </Button>
                  </div>
                )}

                {rezeptur.alkoholKorrektur.spritZugabe && rezeptur.alkoholKorrektur.spritZugabe > 0 && (
                  <div className="space-y-2">
                    <p className="text-lg">
                      <span className="font-semibold text-orange-600">
                        {rezeptur.alkoholKorrektur.spritZugabe.toFixed(2)} Liter Sprit (60%vol)
                      </span>
                      {' '}zugeben (aufstärken)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Endmenge: {(ergebnis!.gesamtMengeLiter + rezeptur.alkoholKorrektur.spritZugabe).toFixed(2)}L
                      bei {rezeptur.alkoholKorrektur.zielAlkohol?.toFixed(1)}%vol
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Sprit als freie Zutat hinzufügen
                        const spritKomponente: RezepturKomponente = {
                          id: `komp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          produktId: 'FREITEXT',
                          produktName: 'Sprit 60% (Korrektur)',
                          istFreieZutat: true,
                          freitextZutat: 'Sprit 60% (Korrektur)',
                          eingabeTyp: 'liter',
                          eingabeWert: rezeptur.alkoholKorrektur!.spritZugabe!,
                          alkoholgehalt: 60,
                          verfuegbareMenge: 999999,
                          mengeInLiter: rezeptur.alkoholKorrektur!.spritZugabe!,
                          anteilProzent: 0,
                          literAlkohol: rezeptur.alkoholKorrektur!.spritZugabe! * 0.6,
                          istVerfuegbar: true,
                        };
                        
                        setRezeptur({
                          ...rezeptur,
                          komponenten: [...rezeptur.komponenten, spritKomponente],
                          alkoholKorrektur: {
                            ...rezeptur.alkoholKorrektur!,
                            korrekturDurchgefuehrt: true,
                          },
                          geaendertAm: new Date().toISOString(),
                        });

                        toast({
                          title: 'Sprit hinzugefügt',
                          description: 'Sprit-Korrektur als Komponente eingetragen',
                        });
                      }}
                      disabled={rezeptur.alkoholKorrektur.korrekturDurchgefuehrt}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Als Komponente eintragen
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ergebnis-Anzeige */}
      {ergebnis && (
        <Card>
          <CardHeader>
            <CardTitle>Berechnungs-Ergebnis</CardTitle>
            <CardDescription>
              Automatisch berechnete Werte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamt-Menge</p>
                <p className="text-2xl font-bold font-mono">
                  {ergebnis.gesamtMengeLiter.toFixed(2)} L
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Durchschn. %vol</p>
                <p className="text-2xl font-bold font-mono">
                  {ergebnis.durchschnittAlkohol.toFixed(2)}%
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamt LA</p>
                <p className="text-2xl font-bold font-mono">
                  {ergebnis.gesamtLiterAlkohol.toFixed(3)} L
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Prozent-Check</p>
                <Badge 
                  variant={prozentCheck ? 'default' : 'destructive'}
                  className="text-lg font-mono"
                >
                  {prozenteSumme.toFixed(2)}%
                  {prozentCheck ? ' ✓' : ' ✗'}
                </Badge>
              </div>
            </div>

            {!ergebnis.komponentenVerfuegbar && ergebnis.fehlendeKomponenten.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  ⚠️ Fehlende Komponenten:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {ergebnis.fehlendeKomponenten.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Produktions-Protokoll Dialog */}
      <Dialog open={protokollOpen} onOpenChange={setProtokollOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full">
          <DialogHeader>
            <DialogTitle className="text-2xl">Produktions-Protokoll</DialogTitle>
            <DialogDescription>
              Druckvorlage für die Herstellung im Tankraum
            </DialogDescription>
          </DialogHeader>

          {/* Protokoll-Inhalt */}
          <div className="protokoll-content space-y-6">
            {/* Kopfdaten */}
            <div className="border-2 border-black p-4 rounded">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">Rezeptur:</p>
                  <p className="text-lg">{rezeptur?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Zielprodukt:</p>
                  <p className="text-lg">{rezeptur?.zielProduktName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Variante:</p>
                  <p className="text-lg">{rezeptur?.variantenName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Basis-Menge:</p>
                  <p className="text-lg font-mono">
                    {istTestmischung 
                      ? `${Math.round(rezeptur?.basisMenge * 1000)} ml` 
                      : `${rezeptur?.basisMenge.toFixed(1).replace('.', ',')} L`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Datum:</p>
                  <p className="text-lg">{new Date().toLocaleDateString('de-DE')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Status:</p>
                  <p className="text-lg">{rezeptur?.status}</p>
                </div>
              </div>
            </div>

            {/* Komponenten Einwaage-Tabelle */}
            <div>
              <h3 className="text-lg font-bold mb-3">Komponenten Einwaage</h3>
              <Table className="border-2 border-black">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="border border-black font-bold">Komponente</TableHead>
                    <TableHead className="border border-black font-bold">Tank</TableHead>
                    <TableHead className="border border-black font-bold text-right">SOLL ({mengenEinheit})</TableHead>
                    <TableHead className="border border-black font-bold text-right">IST ({mengenEinheit})</TableHead>
                    <TableHead className="border border-black font-bold text-right">Abweichung</TableHead>
                    <TableHead className="border border-black font-bold text-right">%vol</TableHead>
                    <TableHead className="border border-black font-bold">Notizen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {berechneteRezeptur?.komponenten.map((komp) => (
                    <TableRow key={komp.id}>
                      <TableCell className="border border-black">
                        {komp.istFreieZutat ? komp.freitextZutat : komp.produktName}
                      </TableCell>
                      <TableCell className="border border-black text-center">
                        {komp.tankNr || '-'}
                      </TableCell>
                      <TableCell className="border border-black text-right font-mono">
                        {literZuDisplay(komp.mengeInLiter).toFixed(mengenDezimalen).replace('.', ',')}
                      </TableCell>
                      <TableCell className="border border-black">
                        <Input
                          type="number"
                          step={istTestmischung ? "1" : "0.1"}
                          min="0"
                          value={istWerte[komp.id] || ''}
                          onChange={(e) => setIstWerte({
                            ...istWerte,
                            [komp.id]: parseFloat(e.target.value) || 0
                          })}
                          className="w-24 text-right font-mono print:border-0 print:p-0"
                          placeholder="____"
                        />
                      </TableCell>
                      <TableCell className="border border-black text-right font-mono">
                        {istWerte[komp.id] 
                          ? ((istWerte[komp.id] - literZuDisplay(komp.mengeInLiter)) >= 0 ? '+' : '') + 
                            (istWerte[komp.id] - literZuDisplay(komp.mengeInLiter)).toFixed(mengenDezimalen).replace('.', ',')
                          : '____'}
                      </TableCell>
                      <TableCell className="border border-black text-right font-mono">
                        {(komp.alkoholgehaltManuell ?? komp.alkoholgehalt).toFixed(1).replace('.', ',')}%
                      </TableCell>
                      <TableCell className="border border-black">
                        <div className="w-32 h-6 print:border-b print:border-gray-300"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Summenzeile */}
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell className="border border-black" colSpan={2}>SUMME:</TableCell>
                    <TableCell className="border border-black text-right font-mono">
                      {literZuDisplay(berechneteRezeptur?.komponenten.reduce((sum, k) => sum + k.mengeInLiter, 0) || 0).toFixed(mengenDezimalen).replace('.', ',')}
                    </TableCell>
                    <TableCell className="border border-black text-right font-mono">
                      {Object.values(istWerte).length > 0
                        ? Object.values(istWerte).reduce((sum, v) => sum + v, 0).toFixed(mengenDezimalen).replace('.', ',')
                        : '____'}
                    </TableCell>
                    <TableCell className="border border-black text-right font-mono">
                      {Object.values(istWerte).length > 0
                        ? ((Object.values(istWerte).reduce((sum, v) => sum + v, 0) >= 
                            literZuDisplay(berechneteRezeptur?.komponenten.reduce((sum, k) => sum + k.mengeInLiter, 0) || 0) ? '+' : '') +
                           (Object.values(istWerte).reduce((sum, v) => sum + v, 0) - 
                           literZuDisplay(berechneteRezeptur?.komponenten.reduce((sum, k) => sum + k.mengeInLiter, 0) || 0)).toFixed(mengenDezimalen).replace('.', ','))
                        : '____'}
                    </TableCell>
                    <TableCell className="border border-black text-right font-mono">
                      {ergebnis?.durchschnittAlkohol.toFixed(1).replace('.', ',')}%
                    </TableCell>
                    <TableCell className="border border-black"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Workflow Checkboxen */}
            <div className="border-2 border-black p-4">
              <h3 className="text-lg font-bold mb-3">Workflow</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black"></div>
                  <span>Entwurf erstellt</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black"></div>
                  <span>Testmischung hergestellt (1L)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black"></div>
                  <span>Sensorik durchgeführt</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black"></div>
                  <span>Zur Produktion freigegeben</span>
                </div>
              </div>
            </div>

            {/* Sensorik-Bereich mit Referenz */}
            <div className="border-2 border-black p-4">
              <h3 className="text-lg font-bold mb-3">Sensorik-Bewertung & Referenzvergleich</h3>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-4">
                  <Label className="font-semibold w-32">Referenzprodukt:</Label>
                  <div className="flex-1 border-b border-gray-400 h-6"></div>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="font-semibold w-32">Tester:</Label>
                  <div className="flex-1 border-b border-gray-400 h-6"></div>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="font-semibold w-32">Datum:</Label>
                  <div className="flex-1 border-b border-gray-400 h-6"></div>
                </div>
              </div>
              
              {/* Große karierte Notiz-Box */}
              <div className="mt-4">
                <Label className="font-semibold mb-2 block">
                  Notizen zum Vergleich mit Referenz (Geruch, Geschmack, Nachgeschmack, Anpassungen):
                </Label>
                <div 
                  className="w-full border-2 border-black p-2"
                  style={{
                    minHeight: '300px',
                    backgroundImage: `
                      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                >
                  {/* Karierter Hintergrund für handschriftliche Notizen */}
                </div>
              </div>

              {/* Freigabe */}
              <div className="mt-4 flex items-center gap-4">
                <Label className="font-semibold">Freigabe zur Produktion:</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black"></div>
                    <span>Ja</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black"></div>
                    <span>Nein</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 print:hidden">
              <Button
                onClick={() => window.print()}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Drucken / Als PDF speichern
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  // Ist-Werte in Rezeptur übernehmen
                  if (Object.keys(istWerte).length === 0) {
                    toast({
                      title: 'Keine Ist-Werte',
                      description: 'Bitte erst Ist-Werte eintragen',
                      variant: 'destructive',
                    });
                    return;
                  }

                  if (!rezeptur) return;

                  const aktualisierteKomponenten = rezeptur.komponenten.map(k => ({
                    ...k,
                    eingabeWert: istWerte[k.id] || k.eingabeWert,
                  }));

                  setRezeptur({
                    ...rezeptur,
                    komponenten: aktualisierteKomponenten,
                    geaendertAm: new Date().toISOString(),
                  });

                  setProtokollOpen(false);
                  setIstWerte({});

                  toast({
                    title: 'Ist-Werte übernommen',
                    description: 'Komponenten wurden mit den tatsächlichen Mengen aktualisiert',
                  });
                }}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ist-Werte in Rezeptur übernehmen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
