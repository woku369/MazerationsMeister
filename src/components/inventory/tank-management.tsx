import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { initialTankDefinitions, TankDefinition } from "@/schemas/tankSchema";
import type { StoredInventoryItem } from "@/schemas/inventorySchema";
import { syncTankDefinitionsWithInventory, getTankDefinitions } from "@/lib/tank-sync";
import * as StockService from "@/lib/stock-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { getTankAutoSync } from "@/lib/tank-auto-sync";
import { getGithubToken, getGithubEnabled, setGithubConfig, onGithubConfigChanged } from "@/lib/github-token";
import OneDriveAutoUploader from "@/lib/onedrive-auto-uploader";
import * as oneDriveExport from "@/lib/onedrive-export";
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Github,
  Split,
  Plus,
  Trash2,
} from "lucide-react";

type Tank = TankDefinition;

const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
};

// Tank Form Komponente
function TankForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: {
  initialData?: Tank;
  onSubmit: (tank: Omit<Tank, "id">) => void;
  onCancel: () => void;
}) {
  const [tankNr, setTankNr] = useState(initialData?.tankNr || "");
  const [bezeichnung, setBezeichnung] = useState(initialData?.bezeichnung || "");
  const [volumenLiter, setVolumenLiter] = useState(String(initialData?.volumenLiter || 5000)); // Standard 5.000L
  const [taraKg, setTaraKg] = useState(initialData?.taraKg != null ? String(initialData.taraKg) : "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const volumenNum = parseFloat(volumenLiter.replace(',', '.'));
    if (tankNr.trim() && bezeichnung.trim() && Number.isFinite(volumenNum) && volumenNum > 0) {
      const taraNum = parseFloat(taraKg.replace(',', '.'));
      onSubmit({
        tankNr: tankNr.trim(),
        bezeichnung: bezeichnung.trim(),
        volumenLiter: volumenNum,
        taraKg: taraKg.trim() && Number.isFinite(taraNum) ? taraNum : undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Tank-Nummer</label>
        <Input
          value={tankNr}
          onChange={(e) => setTankNr(e.target.value)}
          placeholder="z.B. T 341"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Bezeichnung</label>
        <Input
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          placeholder="z.B. Edelstahl 5000L"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Volumen (Liter)</label>
        <Input
          type="text" inputMode="decimal"
          value={volumenLiter}
          onChange={(e) => setVolumenLiter(e.target.value)}
          placeholder="5000"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Standard: 5.000 Liter (bearbeitbar)
        </p>
      </div>
      <div>
        <label className="text-sm font-medium">Tara (kg, optional)</label>
        <Input
          type="text"
          inputMode="decimal"
          value={taraKg}
          onChange={(e) => setTaraKg(e.target.value)}
          placeholder="nur für mobile Gebinde relevant, z.B. 60"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Eigengewicht des leeren Gebindes - nur bei Bedarf eintragen, macht für fest installierte Tanks keinen Sinn.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit">
          {initialData ? "Aktualisieren" : "Hinzufügen"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

type SplitRow = { bezeichnung: string; mengeLiter: string; volumenLiter: string; taraKg: string };

export default function TankManagement() {
  const { toast } = useToast();
  // Lade echte Tank-Definitionen aus localStorage (synchronisiert mit Inventar)
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);

  // Lade Daten beim Component Mount und bei Änderungen
  useEffect(() => {
    loadTankData();
    loadInventoryData();
    
    // Höre auf Tank-Updates
    const handleTankUpdate = () => {
      loadTankData();
    };
    
    // Höre auf GitHub Config Updates von anderen Komponenten (z.B. Einstellungen-Seite)
    const unsubscribeGithubConfig = onGithubConfigChanged((config) => {
      setGithubToken(config.token);
      setGithubEnabled(config.enabled);
    });

    window.addEventListener('tankDefinitionsUpdated', handleTankUpdate);

    return () => {
      window.removeEventListener('tankDefinitionsUpdated', handleTankUpdate);
      unsubscribeGithubConfig();
    };
  }, []);

  const loadTankData = () => {
    try {
      // Synchronisiere zunächst mit Inventory
      syncTankDefinitionsWithInventory();
      // Dann lade die aktualisierten Tank-Definitionen
      const realTanks = getTankDefinitions();
      console.log('🔍 Geladene echte Tanks:', realTanks);
      setTanks(realTanks);
    } catch (error) {
      console.error('Fehler beim Laden der Tank-Daten:', error);
    }
  };

  const loadInventoryData = () => {
    try {
      const stored = localStorage.getItem('inventoryItems');
      if (stored) {
        const items = JSON.parse(stored);
        setInventoryItems(items);
        console.log('🔍 Geladenes Inventar:', items.length, 'Artikel');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Inventar-Daten:', error);
    }
  };
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTanks, setSelectedTanks] = useState<Set<string>>(new Set());
  const [qrCodeTank, setQrCodeTank] = useState<Tank | null>(null);
  const [allSelected, setAllSelected] = useState(false);
  const [splittingTank, setSplittingTank] = useState<Tank | null>(null);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  
  // GitHub Integration State - Von Einstellungen laden
  const [githubEnabled, setGithubEnabled] = useState(() => getGithubEnabled());
  const [githubToken, setGithubToken] = useState(() => getGithubToken());
  const [showGithubSetup, setShowGithubSetup] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Einfache GitHub Funktionen
  const handleGitHubConnect = () => {
    setShowGithubSetup(true);
  };

  const handleGitHubSetup = async () => {
    if (githubToken.trim()) {
      setGithubEnabled(true);
      setShowGithubSetup(false);
      // In localStorage speichern UND andere Komponenten (z.B. Einstellungen-Seite) benachrichtigen
      setGithubConfig(githubToken, true);

      // WICHTIG: Auto-Sync über zentrale Steuerung initialisieren (verhindert Race Conditions)
      console.log("🔄 Initialisiere zentrale Auto-Sync für Race Condition Prevention...");
      const autoSync = getTankAutoSync();
      await autoSync.initialize({
        enabled: true,
        interval: 60, // Standard: 60 Minuten
        githubToken: githubToken.trim(),
        githubUsername: 'woku369',
        githubRepository: 'MazerationsMeister'
      });
      console.log("✅ Auto-Sync erfolgreich initialisiert");
    }
  };

  const generateQRCode = async (tank: Tank) => {
    try {
      // Zweck des QR-Codes (Nutzer, 29.09.2026): im Tankraum gibt es kein WLAN und keinen PC,
      // der Code muss vom Mobilgerät rein über Mobilfunk lesbar sein - auch unterwegs, z.B.
      // beim Lohnabfüller oder während einer Führung. `window.location.origin` (die Adresse,
      // unter der die Desktop-App gerade läuft) ist dafür nutzlos, da nur im selben lokalen
      // Netz wie das Gerät erreichbar, auf dem der Code erzeugt wurde. GitHub Pages dagegen
      // ist von überall per Mobilfunk erreichbar - daher immer dorthin verlinken, mit den
      // aktuellen Tank-Daten direkt im QR-Code eingebettet (funktioniert auch dann korrekt,
      // wenn der zentrale tank-data.json-Datensatz gerade nicht ganz aktuell ist).
      const fallbackData = {
        tankNr: tank.tankNr,
        bezeichnung: tank.bezeichnung,
        volumen: tank.volumenLiter,
        aktuellerFuellstand: getTankFillLevel(tank.tankNr).totalVolume,
        sorte: getTankFillLevel(tank.tankNr).contents || "Leer",
        batch: githubEnabled ? "GitHub-Integration aktiv" : "Offline verfügbar",
        temperatur: "Siehe Desktop-App",
        alkoholgehalt: "Siehe Desktop-App",
        ph_wert: "Nicht gemessen",
        status: githubEnabled ? "GitHub-verbunden" : "Offline verfügbar",
        verantwortlicher: githubEnabled ? "GitHub System" : "Lokales System",
        naechsteKontrolle: "Bei nächster Aktualisierung",
        letzteAktualisierung: new Date().toLocaleDateString('de-DE'),
      };
      const encodedFallback = encodeURIComponent(JSON.stringify(fallbackData));
      // Garantiert erreichbare Variante mit eingebetteten Daten - Ausgangspunkt und
      // letzter Rückfall zugleich.
      let url = `https://woku369.github.io/MazerationsMeister/tank-offline/?tank=${tank.tankNr}&fallback=${encodedFallback}`;

      if (githubEnabled && githubToken) {
        // Falls der zentrale Datensatz gerade aktuell synchronisiert ist, zeigt
        // tank-viewer.html den echten Live-Stand statt nur des Schnappschusses von
        // jetzt - deshalb bevorzugt versuchen, mit Rückfall auf die oben garantiert
        // funktionierende Variante.
        const githubPagesUrl = `https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=${tank.tankNr}&fallback=${encodedFallback}&mode=github`;
        try {
          await fetch(githubPagesUrl, { method: 'HEAD', mode: 'no-cors' });
          url = githubPagesUrl;
          console.log('✅ GitHub Pages verfügbar:', url);
        } catch (error) {
          console.log('⚠️ tank-viewer.html nicht erreichbar, verwende tank-offline mit eingebetteten Daten');
        }
      }

      const qrCodeUrl = await QRCode.toDataURL(url);
      setQrCodeDataUrl(qrCodeUrl);
      setQrCodeTank(tank);
    } catch (error) {
      console.error("Fehler beim Generieren des QR-Codes:", error);

      // Notfall-Rückfall - ebenfalls GitHub Pages, nie eine lokale Adresse (siehe oben)
      const basicFallback = {
        tankNr: tank.tankNr,
        bezeichnung: tank.bezeichnung,
        volumen: tank.volumenLiter,
        status: "Notfall-Modus"
      };
      const encodedFallback = encodeURIComponent(JSON.stringify(basicFallback));
      const fallbackUrl = `https://woku369.github.io/MazerationsMeister/tank-offline/?tank=${tank.tankNr}&fallback=${encodedFallback}`;

      const qrCodeUrl = await QRCode.toDataURL(fallbackUrl);
      setQrCodeDataUrl(qrCodeUrl);
      setQrCodeTank(tank);
    }
  };

  // Standard Tank-Management Funktionen
  const addTank = (newTank: Omit<Tank, "id">) => {
    const tank: Tank = {
      ...newTank,
      id: newTank.tankNr, // Verwende tankNr als ID für Konsistenz
      volumenLiter: newTank.volumenLiter || 5000, // Standardkapazität 5.000L
      hasUniqueNumber: newTank.hasUniqueNumber ?? true, // neue Tanks sind inventardaten-getrieben
    };
    
    const updatedTanks = [...tanks, tank];
    setTanks(updatedTanks);
    
    // Speichere in localStorage als tankDefinitions
    if (typeof window !== 'undefined') {
      localStorage.setItem('tankDefinitions', JSON.stringify(updatedTanks));
    }
  };

  const updateTank = (updatedTank: Tank) => {
    const updatedTanks = tanks.map((tank) => (tank.id === updatedTank.id ? updatedTank : tank));
    setTanks(updatedTanks);
    
    // Speichere in localStorage als tankDefinitions  
    if (typeof window !== 'undefined') {
      localStorage.setItem('tankDefinitions', JSON.stringify(updatedTanks));
    }
    
    setEditingTank(null);
  };

  const deleteTank = (id: string) => {
    const tank = tanks.find(t => t.id === id);
    const updatedTanks = tanks.filter((tank) => tank.id !== id);
    setTanks(updatedTanks);

    // Speichere in localStorage als tankDefinitions
    if (typeof window !== 'undefined') {
      localStorage.setItem('tankDefinitions', JSON.stringify(updatedTanks));
    }

    // Leere (0 L) Lagerposten mit derselben Tanknummer ebenfalls entfernen -
    // sonst legt syncTankDefinitionsWithInventory() beim naechsten Lauf
    // automatisch wieder einen "Auto-erkannt"-Phantomtank dafuer an, da die
    // tankNr noch im Inventar steht (derselbe Fehler wie beim Splitten, siehe
    // handleSplit(), Nutzer-Meldung 06.10.2026). Posten mit echtem Restbestand
    // bleiben bewusst unangetastet - nur die Tank-Definition verschwindet dann,
    // die Daten selbst nicht, falls das Loeschen ein Versehen war.
    if (tank) {
      const updatedItems = StockService.readAll().filter(i => !(i.tankNr === tank.tankNr && i.currentQuantityLiters === 0));
      StockService.writeAll(updatedItems);
      setInventoryItems(updatedItems);
    }
  };

  /**
   * Splittet ein Gebinde, das in Wahrheit mehrere physische Behälter zusammenfasst
   * (Nutzer-Meldung 03.10.2026: "Fass-2301" ist nicht 1 Fass, sondern 2 - entsteht
   * z.B. durch die automatische Vereindeutigung generischer Tanknummern aus
   * Aufgabe 50, die nur die Chargennummer, nicht die Anzahl physischer Behälter
   * kennt). Manuelle Nachkorrektur, keine automatische Import-Erkennung - die
   * Importdaten selbst bilden diesen Split nicht ab.
   */
  const openSplit = (tank: Tank) => {
    setSplittingTank(tank);
    setSplitRows([
      { bezeichnung: `${tank.tankNr}-A`, mengeLiter: '', volumenLiter: String(tank.volumenLiter), taraKg: '' },
      { bezeichnung: `${tank.tankNr}-B`, mengeLiter: '', volumenLiter: String(tank.volumenLiter), taraKg: '' },
    ]);
  };

  const addSplitRow = () => {
    setSplitRows(prev => [...prev, { bezeichnung: '', mengeLiter: '', volumenLiter: '', taraKg: '' }]);
  };
  const removeSplitRow = (idx: number) => {
    setSplitRows(prev => prev.filter((_, i) => i !== idx));
  };
  const updateSplitRow = (idx: number, patch: Partial<SplitRow>) => {
    setSplitRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSplit = () => {
    if (!splittingTank) return;
    const itemsInTank = inventoryItems.filter(i => i.tankNr === splittingTank.tankNr);
    if (itemsInTank.length !== 1) {
      toast({
        title: 'Split nicht möglich',
        description: itemsInTank.length === 0
          ? 'Dieses Gebinde enthält keinen Lagerposten.'
          : 'Dieses Gebinde enthält mehrere unterschiedliche Lagerposten - Split wird derzeit nur für ein einzelnes Produkt je Gebinde unterstützt.',
        variant: 'destructive',
      });
      return;
    }
    const sourceItem = itemsInTank[0];

    if (splitRows.length < 2) {
      toast({ title: 'Mindestens 2 neue Gebinde nötig', variant: 'destructive' });
      return;
    }
    const bezeichnungen = splitRows.map(r => r.bezeichnung.trim());
    if (bezeichnungen.some(b => !b)) {
      toast({ title: 'Bezeichnung fehlt bei mindestens einem neuen Gebinde', variant: 'destructive' });
      return;
    }
    const existierendeTankNrs = new Set(tanks.filter(t => t.id !== splittingTank.id).map(t => t.tankNr));
    const doppelteBezeichnung = bezeichnungen.find((b, i) => existierendeTankNrs.has(b) || bezeichnungen.indexOf(b) !== i);
    if (doppelteBezeichnung) {
      toast({ title: `Bezeichnung "${doppelteBezeichnung}" bereits vergeben`, variant: 'destructive' });
      return;
    }
    const parsed = splitRows.map(r => ({
      bezeichnung: r.bezeichnung.trim(),
      menge: parseFloat(r.mengeLiter.replace(',', '.')),
      volumen: parseFloat(r.volumenLiter.replace(',', '.')),
      tara: r.taraKg.trim() ? parseFloat(r.taraKg.replace(',', '.')) : undefined,
    }));
    if (parsed.some(r => !Number.isFinite(r.menge) || r.menge <= 0 || !Number.isFinite(r.volumen) || r.volumen <= 0)) {
      toast({ title: 'Menge und Kapazität müssen bei jedem neuen Gebinde gültig sein', variant: 'destructive' });
      return;
    }
    const summe = parsed.reduce((s, r) => s + r.menge, 0);
    if (Math.abs(summe - sourceItem.currentQuantityLiters) > 0.01) {
      toast({
        title: 'Menge stimmt nicht überein',
        description: `Summe der neuen Gebinde: ${summe.toLocaleString('de-DE')} L, aber Quellgebinde enthält ${sourceItem.currentQuantityLiters.toLocaleString('de-DE')} L.`,
        variant: 'destructive',
      });
      return;
    }

    const abgang = StockService.recordTransaction(
      StockService.readAll(),
      StockService.readTransactions(),
      sourceItem.id,
      'Abgang',
      sourceItem.currentQuantityLiters,
      { notes: `Aufgeteilt auf: ${bezeichnungen.join(', ')}` },
    );
    if (!abgang.ok) {
      toast({ title: 'Split fehlgeschlagen', description: abgang.error, variant: 'destructive' });
      return;
    }
    // Den jetzt leeren Quellposten komplett entfernen, nicht nur auf 0 L buchen
    // (Nutzer-Meldung 06.10.2026: "Geister-Tanks" mit 0 L in der Tank-Viewer-PWA
    // nach dem Splitten mehrerer Fässer/Flaschen). Ursache: die Tank-Definition
    // des Quell-Gebindes wurde unten korrekt gelöscht, der 0-L-Lagerposten selbst
    // blieb aber mit seiner alten tankNr im Inventar liegen - syncTankDefinitionsWithInventory()
    // fand diese tankNr beim naechsten Lauf nicht mehr in den Tank-Definitionen und
    // legte automatisch einen neuen "Auto-erkannt"-Phantomtank dafuer an. Wie im
    // Kommentar unten bereits beabsichtigt ("nichts Physisches mehr dahinter"),
    // aber bisher nur fuer die Tank-Definition umgesetzt, nicht fuer den Posten selbst.
    let items = abgang.items.filter(i => i.id !== sourceItem.id);
    let txs = abgang.transactions;
    const neueTanks: Tank[] = [];
    for (const row of parsed) {
      const neuesItem: StoredInventoryItem = {
        id: uuidv4(),
        artikelNummer: sourceItem.artikelNummer,
        produktName: sourceItem.produktName,
        chargenNummer: sourceItem.chargenNummer,
        category: sourceItem.category,
        tankNr: row.bezeichnung,
        currentQuantityLiters: row.menge,
        alcoholVolProzent: sourceItem.alcoholVolProzent,
        dichte20C: sourceItem.dichte20C,
        lastInventoryDate: new Date(),
        bemerkungen: sourceItem.bemerkungen,
        kennzeichen: sourceItem.kennzeichen,
      };
      const zugang = StockService.recordNewEntry(items, txs, neuesItem, { notes: `Aufgeteilt aus ${splittingTank.tankNr}` });
      items = zugang.items;
      txs = zugang.transactions;
      neueTanks.push({
        id: row.bezeichnung,
        tankNr: row.bezeichnung,
        bezeichnung: row.bezeichnung,
        volumenLiter: row.volumen,
        taraKg: row.tara,
        hasUniqueNumber: true,
      });
    }

    StockService.writeAll(items);
    StockService.writeTransactions(txs);
    const updatedTanks = tanks.filter(t => t.id !== splittingTank.id).concat(neueTanks);
    setTanks(updatedTanks);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tankDefinitions', JSON.stringify(updatedTanks));
    }

    toast({ title: `"${splittingTank.tankNr}" aufgeteilt`, description: `${bezeichnungen.length} neue Gebinde angelegt: ${bezeichnungen.join(', ')}.` });
    setSplittingTank(null);
    loadTankData();
    loadInventoryData();
  };

  // Berechne aktuellen Füllstand aus Inventar
  const getTankFillLevel = (tankNr: string) => {
    const tankItems = inventoryItems.filter(item => item.tankNr === tankNr);
    const totalVolume = tankItems.reduce((sum, item) => sum + (item.currentQuantityLiters || 0), 0);
    // Kategorie (z.B. Mazerat/Destillat) mit anzeigen - ohne sie war hier nicht
    // unterscheidbar, was tatsächlich im Gebinde liegt (Nutzer-Meldung 03.10.2026:
    // "wieder einmal" nicht die Kategorie, gleicher Lückentyp wie Aufgabe 42).
    const contents = tankItems.map(item => `${item.produktName} [${item.category || '–'}] (${item.currentQuantityLiters}L)`).join(', ') || 'Leer';
    
    return {
      totalVolume,
      contents,
      items: tankItems
    };
  };

  const exportTanks = () => {
    const dataStr = JSON.stringify(tanks, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "tanks.json";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const importTanks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTanks = JSON.parse(e.target?.result as string);
          setTanks(importedTanks);
        } catch (error) {
          console.error("Fehler beim Importieren:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tank-Verwaltung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Button onClick={() => setIsAddDialogOpen(true)}>
              Neuen Tank hinzufügen
            </Button>
            
            <Button variant="outline" onClick={exportTanks}>
              <Download className="mr-2 h-4 w-4" />
              Tanks exportieren
            </Button>
            
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Tanks importieren
            </Button>
            
            {/* GitHub Integration Sektion */}
            <Card className="w-full mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!githubEnabled ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Verbinde dich mit GitHub für automatische QR-Code Generation
                    </p>
                    <Button onClick={handleGitHubConnect} variant="outline">
                      <Github className="mr-2 h-4 w-4" />
                      GitHub verbinden
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">GitHub verbunden</span>
                    </div>
                    <Button variant="outline" onClick={() => setGithubEnabled(false)}>
                      Trennen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* GitHub Setup Dialog */}
          <Dialog open={showGithubSetup} onOpenChange={setShowGithubSetup}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>GitHub Personal Access Token</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Gib deinen GitHub Personal Access Token ein:
                </p>
                <Input
                  type="password"
                  placeholder="ghp_..."
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleGitHubSetup} disabled={!githubToken.trim()}>
                    Verbinden
                  </Button>
                  <Button variant="outline" onClick={() => setShowGithubSetup(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tank hinzufügen Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Tank hinzufügen</DialogTitle>
              </DialogHeader>
              <TankForm
                onSubmit={(tankData) => {
                  addTank(tankData);
                  setIsAddDialogOpen(false);
                }}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Tank bearbeiten Dialog */}
          <Dialog open={!!editingTank} onOpenChange={() => setEditingTank(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tank bearbeiten</DialogTitle>
              </DialogHeader>
              {editingTank && (
                <TankForm
                  initialData={editingTank}
                  onSubmit={(tankData) => {
                    updateTank({ ...tankData, id: editingTank.id });
                  }}
                  onCancel={() => setEditingTank(null)}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Gebinde splitten Dialog */}
          <Dialog open={!!splittingTank} onOpenChange={(open) => !open && setSplittingTank(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Gebinde splitten{splittingTank ? ` – ${splittingTank.tankNr}` : ''}</DialogTitle>
                <DialogDescription>
                  Für Gebinde, die in Wahrheit mehrere physische Behälter zusammenfassen (z.B. ein als "Fass-2301"
                  gebuchter Posten, der tatsächlich auf 2 Fässer verteilt ist). Bucht den Abgang beim Quellgebinde und
                  legt die neuen Gebinde mit eigener Bezeichnung, Menge, Kapazität und optionalem Tara an.
                </DialogDescription>
              </DialogHeader>
              {splittingTank && (() => {
                const sourceItems = inventoryItems.filter(i => i.tankNr === splittingTank.tankNr);
                const sourceItem = sourceItems.length === 1 ? sourceItems[0] : null;
                const summe = splitRows.reduce((s, r) => {
                  const m = parseFloat(r.mengeLiter.replace(',', '.'));
                  return s + (Number.isFinite(m) ? m : 0);
                }, 0);
                const rest = sourceItem ? sourceItem.currentQuantityLiters - summe : null;
                return (
                  <div className="space-y-3">
                    {!sourceItem && (
                      <p className="text-sm text-red-600">
                        {sourceItems.length === 0
                          ? 'Dieses Gebinde enthält keinen Lagerposten.'
                          : 'Dieses Gebinde enthält mehrere unterschiedliche Lagerposten - Split wird derzeit nur für ein einzelnes Produkt je Gebinde unterstützt.'}
                      </p>
                    )}
                    {sourceItem && (
                      <p className="text-sm bg-muted rounded-md px-3 py-2">
                        {sourceItem.produktName} [{sourceItem.category}]: <span className="font-semibold">{sourceItem.currentQuantityLiters.toLocaleString('de-DE')} L</span> @ {sourceItem.alcoholVolProzent}%
                      </p>
                    )}
                    {splitRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end">
                        <div>
                          {idx === 0 && <label className="text-xs text-muted-foreground">Bezeichnung</label>}
                          <Input value={row.bezeichnung} onChange={e => updateSplitRow(idx, { bezeichnung: e.target.value })} placeholder="z.B. Fass-2301-A" />
                        </div>
                        <div>
                          {idx === 0 && <label className="text-xs text-muted-foreground">Menge (L)</label>}
                          <Input type="text" inputMode="decimal" value={row.mengeLiter} onChange={e => updateSplitRow(idx, { mengeLiter: e.target.value })} placeholder="z.B. 100" />
                        </div>
                        <div>
                          {idx === 0 && <label className="text-xs text-muted-foreground">Kapazität (L)</label>}
                          <Input type="text" inputMode="decimal" value={row.volumenLiter} onChange={e => updateSplitRow(idx, { volumenLiter: e.target.value })} placeholder="z.B. 220" />
                        </div>
                        <div>
                          {idx === 0 && <label className="text-xs text-muted-foreground">Tara (kg, optional)</label>}
                          <Input type="text" inputMode="decimal" value={row.taraKg} onChange={e => updateSplitRow(idx, { taraKg: e.target.value })} placeholder="z.B. 25" />
                        </div>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeSplitRow(idx)} disabled={splitRows.length <= 2}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" onClick={addSplitRow}><Plus className="w-4 h-4 mr-1" />Weiteres Gebinde</Button>
                    {sourceItem && rest != null && (
                      <p className={`text-sm font-medium text-right ${Math.abs(rest) > 0.01 ? 'text-amber-700' : 'text-foreground'}`}>
                        {Math.abs(rest) > 0.01
                          ? `Noch zu verteilen: ${rest.toLocaleString('de-DE')} L (Quellmenge ${sourceItem.currentQuantityLiters.toLocaleString('de-DE')} L)`
                          : `Vollständig verteilt: ${sourceItem.currentQuantityLiters.toLocaleString('de-DE')} L`}
                      </p>
                    )}
                  </div>
                );
              })()}
              <DialogFooter>
                <Button variant="outline" onClick={() => setSplittingTank(null)}>Abbrechen</Button>
                <Button onClick={handleSplit}>Aufteilen &amp; Buchen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Tanks Liste */}
          <div className="space-y-4">
            {tanks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">
                    Keine Tanks gefunden. Tanks werden automatisch aus der Lagerverwaltung synchronisiert, 
                    oder Sie können manuell neue Tanks hinzufügen.
                  </p>
                </CardContent>
              </Card>
            ) : (
              tanks.map((tank) => {
                const fillInfo = getTankFillLevel(tank.tankNr);
                const fillPercentage = tank.volumenLiter > 0 ? Math.round((fillInfo.totalVolume / tank.volumenLiter) * 100) : 0;
                
                return (
                  <Card key={tank.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h3 className="font-semibold text-lg">{tank.bezeichnung}</h3>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {tank.tankNr}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Kapazität:</span>
                              <div className="font-medium">{tank.volumenLiter.toLocaleString('de-DE')} L</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Aktueller Inhalt:</span>
                              <div className="font-medium">{fillInfo.totalVolume.toLocaleString('de-DE')} L ({fillPercentage}%)</div>
                            </div>
                            {tank.taraKg != null && (
                              <div>
                                <span className="text-muted-foreground">Tara:</span>
                                <div className="font-medium">{tank.taraKg.toLocaleString('de-DE')} kg</div>
                              </div>
                            )}
                          </div>
                          
                          {fillInfo.contents !== 'Leer' && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Inhalt:</span>
                              <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                                {fillInfo.contents}
                              </div>
                            </div>
                          )}
                          
                          {/* Füllstand-Balken */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateQRCode(tank)}
                          >
                            QR-Code
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTank(tank)}
                          >
                            Bearbeiten
                          </Button>
                          {fillInfo.totalVolume > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSplit(tank)}
                            >
                              <Split className="mr-1 h-3 w-3" />
                              Splitten
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteTank(tank.id)}
                          >
                            Löschen
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* QR Code Dialog */}
          <Dialog open={!!qrCodeTank} onOpenChange={() => setQrCodeTank(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>QR-Code für {qrCodeTank?.bezeichnung}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4">
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64 border rounded-lg" />
                )}
                
                {/* QR-Code Modus Anzeige */}
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {githubEnabled ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-700">GitHub Pages - Online verfügbar</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-orange-700">Offline-Modus - Grunddaten eingebettet</span>
                      </>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <div className="font-medium mb-1">📱 Mobile Nutzung:</div>
                    <ul className="space-y-1">
                      <li>• Funktioniert ohne Desktop-App</li>
                      <li>• Zeigt Tank-Grunddaten an</li>
                      <li>• Cross-Network kompatibel</li>
                      {!githubEnabled && <li>• Offline-Daten eingebettet</li>}
                    </ul>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      if (qrCodeDataUrl) {
                        const link = document.createElement('a');
                        link.download = `Tank-${qrCodeTank?.tankNr}-QR.png`;
                        link.href = qrCodeDataUrl;
                        link.click();
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Herunterladen
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      if (qrCodeDataUrl) {
                        window.print();
                      }
                    }}
                  >
                    Drucken
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <input
        type="file"
        ref={fileInputRef}
        onChange={importTanks}
        accept=".json"
        style={{ display: "none" }}
      />
    </div>
  );
}