import { useState, useRef, useEffect } from "react";
import { initialTankDefinitions, TankDefinition } from "@/schemas/tankSchema";
import type { StoredInventoryItem } from "@/schemas/inventorySchema";
import { syncTankDefinitionsWithInventory, getTankDefinitions, fixTankIds } from "@/lib/tank-sync";
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
} from "@/components/ui/dialog";
import QRCode from "qrcode";
import * as cloudQRGenerator from "@/lib/cloud-qr-generator";
import OneDriveAutoUploader from "@/lib/onedrive-auto-uploader";
import * as oneDriveExport from "@/lib/onedrive-export";
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Github,
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
  const [volumenLiter, setVolumenLiter] = useState(initialData?.volumenLiter || 5000); // Standard 5.000L

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tankNr.trim() && bezeichnung.trim() && volumenLiter > 0) {
      onSubmit({
        tankNr: tankNr.trim(),
        bezeichnung: bezeichnung.trim(),
        volumenLiter
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
          type="number"
          value={volumenLiter}
          onChange={(e) => setVolumenLiter(Number(e.target.value))}
          placeholder="5000"
          min="1"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Standard: 5.000 Liter (bearbeitbar)
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

export default function TankManagement() {
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
    
    // Höre auf GitHub Config Updates von anderen Komponenten
    const handleGitHubUpdate = (event: any) => {
      if (event.detail) {
        setGithubToken(event.detail.token || '');
        setGithubEnabled(event.detail.enabled || false);
      }
    };
    
    window.addEventListener('tankDefinitionsUpdated', handleTankUpdate);
    window.addEventListener('githubConfigUpdated', handleGitHubUpdate);
    
    return () => {
      window.removeEventListener('tankDefinitionsUpdated', handleTankUpdate);
      window.removeEventListener('githubConfigUpdated', handleGitHubUpdate);
    };
  }, []);

  const loadTankData = () => {
    try {
      // KRITISCHE KORREKTUR: Tank-IDs erst bereinigen
      fixTankIds();
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
  
  // GitHub Integration State - Von Einstellungen laden
  const [githubEnabled, setGithubEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('github-enabled') === 'true';
    }
    return false;
  });
  const [githubToken, setGithubToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('github-token') || '';
    }
    return '';
  });
  const [showGithubSetup, setShowGithubSetup] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Einfache GitHub Funktionen
  const handleGitHubConnect = () => {
    setShowGithubSetup(true);
  };

  const handleGitHubSetup = () => {
    if (githubToken.trim()) {
      setGithubEnabled(true);
      setShowGithubSetup(false);
      // In localStorage speichern UND Einstellungen synchronisieren
      if (typeof window !== "undefined") {
        localStorage.setItem("github-token", githubToken);
        localStorage.setItem("github-enabled", "true");
      }
      
      // Event für Synchronisation mit anderen Komponenten aussenden
      window.dispatchEvent(new CustomEvent('githubConfigUpdated', {
        detail: { token: githubToken, enabled: true }
      }));
    }
  };

  const generateQRCode = async (tank: Tank) => {
    try {
      let url = "";
      
      // GitHub zuerst versuchen, wenn aktiviert
      if (githubEnabled && githubToken) {
        // Teste ob GitHub Pages verfügbar ist
        const githubPagesUrl = `https://woku369.github.io/MazerationsMeister/tank-offline.html?tank=${tank.tankNr}&fallback=${encodeURIComponent(JSON.stringify({
          tankNr: tank.tankNr,
          bezeichnung: tank.bezeichnung,
          volumen: tank.volumenLiter,
          aktuellerFuellstand: getTankFillLevel(tank.tankNr).totalVolume,
          sorte: getTankFillLevel(tank.tankNr).contents,
          batch: "GitHub-Integration aktiv"
        }))}&mode=github`;
        
        try {
          // Teste GitHub Pages Verfügbarkeit (einfacher Fetch-Test)
          const testResponse = await fetch(githubPagesUrl, { method: 'HEAD', mode: 'no-cors' });
          
          // Wenn verfügbar, verwende GitHub Pages
          url = githubPagesUrl;
          console.log('✅ GitHub Pages verfügbar:', url);
          
        } catch (error) {
          // GitHub Pages nicht verfügbar - verwende lokalen Fallback mit GitHub-Modus
          console.log('⚠️ GitHub Pages noch nicht verfügbar, verwende lokalen GitHub-Modus');
          
          const fallbackData = {
            tankNr: tank.tankNr,
            bezeichnung: tank.bezeichnung,
            volumen: tank.volumenLiter,
            aktuellerFuellstand: getTankFillLevel(tank.tankNr).totalVolume,
            sorte: getTankFillLevel(tank.tankNr).contents,
            batch: "GitHub-Integration aktiv",
            temperatur: "Siehe Desktop-App",
            alkoholgehalt: "Siehe Desktop-App", 
            ph_wert: "Nicht gemessen",
            status: "GitHub-verbunden (lokaler Fallback)",
            verantwortlicher: "GitHub System",
            naechsteKontrolle: "Nach GitHub Pages Setup",
            letzteAktualisierung: new Date().toLocaleDateString('de-DE'),
            githubConnected: true,
            githubSetupNeeded: true
          };
          
          const encodedFallback = encodeURIComponent(JSON.stringify(fallbackData));
          url = `${window.location.origin}/tank-offline.html?fallback=${encodedFallback}&mode=github`;
        }
      } else {
        // Offline-Fallback mit eingebetteten Tank-Daten
        const fallbackData = {
          tankNr: tank.tankNr,
          bezeichnung: tank.bezeichnung,
          volumen: tank.volumenLiter,
          aktuellerFuellstand: getTankFillLevel(tank.tankNr).totalVolume,
          sorte: getTankFillLevel(tank.tankNr).contents || "Leer",
          batch: "Offline verfügbar",
          temperatur: "Siehe Desktop-App",
          alkoholgehalt: "Siehe Desktop-App", 
          ph_wert: "Nicht gemessen",
          status: "Offline verfügbar",
          verantwortlicher: "Lokales System",
          naechsteKontrolle: "Bei App-Neustart",
          letzteAktualisierung: new Date().toLocaleDateString('de-DE')
        };
        
        // Try OneDrive first, fall back to offline viewer with embedded data
        try {
          const tankInfo = { 
            tankNr: tank.tankNr, 
            bezeichnung: tank.bezeichnung, 
            volumen: tank.volumenLiter 
          };
          url = await cloudQRGenerator.generateCloudQRUrl(tank.tankNr, tankInfo);
        } catch (oneDriveError) {
          // Fallback zu Offline-Viewer mit eingebetteten Daten
          console.log("OneDrive nicht verfügbar, verwende Offline-Viewer");
          const encodedFallback = encodeURIComponent(JSON.stringify(fallbackData));
          url = `${window.location.origin}/tank-offline.html?tank=${tank.tankNr}&fallback=${encodedFallback}`;
        }
      }
      
      const qrCodeUrl = await QRCode.toDataURL(url);
      setQrCodeDataUrl(qrCodeUrl);
      setQrCodeTank(tank);
    } catch (error) {
      console.error("Fehler beim Generieren des QR-Codes:", error);
      
      // Emergency fallback - basic offline viewer
      const basicFallback = {
        tankNr: tank.tankNr,
        bezeichnung: tank.bezeichnung,
        volumen: tank.volumenLiter,
        status: "Notfall-Modus"
      };
      const encodedFallback = encodeURIComponent(JSON.stringify(basicFallback));
      const fallbackUrl = `${window.location.origin}/tank-offline.html?tank=${tank.tankNr}&fallback=${encodedFallback}`;
      
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
    const updatedTanks = tanks.filter((tank) => tank.id !== id);
    setTanks(updatedTanks);
    
    // Speichere in localStorage als tankDefinitions
    if (typeof window !== 'undefined') {
      localStorage.setItem('tankDefinitions', JSON.stringify(updatedTanks));
    }
  };

  // Berechne aktuellen Füllstand aus Inventar
  const getTankFillLevel = (tankNr: string) => {
    const tankItems = inventoryItems.filter(item => item.tankNr === tankNr);
    const totalVolume = tankItems.reduce((sum, item) => sum + (item.currentQuantityLiters || 0), 0);
    const contents = tankItems.map(item => `${item.produktName} (${item.currentQuantityLiters}L)`).join(', ') || 'Leer';
    
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