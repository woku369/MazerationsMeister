import { useState, useRef } from "react";
import { initialTankDefinitions, TankDefinition } from "@/schemas/tankSchema";
import type { StoredInventoryItem } from "@/schemas/inventorySchema";
import { syncTankDefinitionsWithInventory } from "@/lib/tank-sync";
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

export function TankManagementSimple() {
  const [tanks, setTanks] = useLocalStorage<Tank[]>("tanks", []);
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTanks, setSelectedTanks] = useState<Set<string>>(new Set());
  const [qrCodeTank, setQrCodeTank] = useState<Tank | null>(null);
  const [allSelected, setAllSelected] = useState(false);
  
  // GitHub Integration State - EINFACH
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [githubToken, setGithubToken] = useState("");
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
      // In localStorage speichern
      if (typeof window !== "undefined") {
        localStorage.setItem("github-token", githubToken);
      }
    }
  };

  const generateQRCode = async (tank: Tank) => {
    try {
      let url = "";
      
      // GitHub zuerst versuchen, wenn aktiviert
      if (githubEnabled && githubToken) {
        url = `https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=${tank.id}`;
      } else {
        // OneDrive Fallback
        const tankData = { tanks: [tank] };
        url = await cloudQRGenerator.generateCloudQRUrl(tank.tankNr, { tankNr: tank.tankNr, bezeichnung: tank.bezeichnung, volumen: tank.volumenLiter });
      }
      
      const qrCodeUrl = await QRCode.toDataURL(url);
      setQrCodeDataUrl(qrCodeUrl);
      setQrCodeTank(tank);
    } catch (error) {
      console.error("Fehler beim Generieren des QR-Codes:", error);
    }
  };

  // Standard Tank-Management Funktionen
  const addTank = (newTank: Omit<Tank, "id">) => {
    const tank: Tank = {
      ...newTank,
      id: crypto.randomUUID(),
    };
    setTanks([...tanks, tank]);
  };

  const updateTank = (updatedTank: Tank) => {
    setTanks(tanks.map((tank) => (tank.id === updatedTank.id ? updatedTank : tank)));
    setEditingTank(null);
  };

  const deleteTank = (id: string) => {
    setTanks(tanks.filter((tank) => tank.id !== id));
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

          {/* Rest der UI... */}
          <div className="space-y-4">
            {tanks.map((tank) => (
              <Card key={tank.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{tank.bezeichnung}</h3>
                      <p className="text-sm text-muted-foreground">
                        Kapazität: {tank.volumenLiter}L - Nr: {tank.tankNr}
                      </p>
                    </div>
                    <div className="flex gap-2">
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
            ))}
          </div>

          {/* QR Code Dialog */}
          <Dialog open={!!qrCodeTank} onOpenChange={() => setQrCodeTank(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>QR-Code für {qrCodeTank?.bezeichnung}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4">
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
                )}
                <p className="text-sm text-muted-foreground text-center">
                  {githubEnabled ? "GitHub Pages URL" : "OneDrive URL"}
                </p>
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