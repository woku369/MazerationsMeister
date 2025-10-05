import { useState, useRef, useEffect } from "react";
import { initialTankDefinitions, TankDefinition, ContainerType } from "@/schemas/tankSchema";
import type { StoredInventoryItem } from "@/schemas/inventorySchema";
import { syncTankDefinitionsWithInventory, getTankDefinitions, fixTankIds } from "@/lib/tank-sync";
import { getTankAutoSync } from "@/lib/tank-auto-sync-hybrid";
import { fillContainerFromTank, shipContainer, returnContainer, emptyContainer, getNextContainerNumber } from "@/lib/container-management";
import { ContainerFillDialog } from "@/components/container-fill-dialog";
import { ContainerHistory } from "@/components/container-history";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Github, Download, Upload, Trash2, AlertCircle, CheckCircle, Printer, Copy } from 'lucide-react';
import { hybridStorage } from '@/lib/hybrid-storage';
import QRCode from "qrcode";
import * as cloudQRGenerator from "@/lib/cloud-qr-generator";
import OneDriveAutoUploader from "@/lib/onedrive-auto-uploader";
import * as oneDriveExport from "@/lib/onedrive-export";

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
  const [volumenLiter, setVolumenLiter] = useState(initialData?.volumenLiter || 5000);
  const [containerType, setContainerType] = useState<ContainerType>(initialData?.containerType || 'tank');
  const [hasUniqueNumber, setHasUniqueNumber] = useState(initialData?.hasUniqueNumber ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tankNr.trim() && bezeichnung.trim() && volumenLiter > 0) {
      onSubmit({
        tankNr: tankNr.trim(),
        bezeichnung: bezeichnung.trim(),
        volumenLiter,
        containerType,
        hasUniqueNumber
      });
    }
  };

  // Container Type Options
  const containerTypeOptions: { value: ContainerType; label: string; defaultVolume: number }[] = [
    { value: 'tank', label: 'Tank (nummeriert)', defaultVolume: 5000 },
    { value: 'bottle', label: 'Flasche', defaultVolume: 1 },
    { value: 'barrel', label: 'Fass', defaultVolume: 200 },
    { value: 'ibc', label: 'IBC-Container', defaultVolume: 1000 },
    { value: 'balloon', label: 'Ballon', defaultVolume: 25 },
    { value: 'other', label: 'Sonstiges', defaultVolume: 100 }
  ];

  const handleContainerTypeChange = (newType: ContainerType) => {
    setContainerType(newType);
    
    // Auto-Update Volumen basierend auf Container-Typ
    const option = containerTypeOptions.find(opt => opt.value === newType);
    if (option && (!initialData || volumenLiter === 5000)) {
      setVolumenLiter(option.defaultVolume);
    }
    
    // Auto-Update hasUniqueNumber
    setHasUniqueNumber(newType === 'tank');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Behältnistyp</label>
        <select 
          value={containerType} 
          onChange={(e) => handleContainerTypeChange(e.target.value as ContainerType)}
          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
        >
          {containerTypeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium">
          {containerType === 'tank' ? 'Tank-Nummer' : 'Bezeichnung/Nummer'}
        </label>
        <Input
          value={tankNr}
          onChange={(e) => setTankNr(e.target.value)}
          placeholder={
            containerType === 'tank' ? 'z.B. T 341' :
            containerType === 'bottle' ? 'z.B. Flasche A oder Flasche #1' :
            containerType === 'barrel' ? 'z.B. Fass #1' :
            containerType === 'ibc' ? 'z.B. IBC Container #1' :
            containerType === 'balloon' ? 'z.B. Ballon A' :
            'z.B. Behältnis #1'
          }
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {containerType === 'tank' ? 
            'Eindeutige Tank-Nummer (z.B. T 341, T 431)' : 
            'Frei wählbare Bezeichnung, da keine feste Nummerierung vorhanden'
          }
        </p>
      </div>
      
      <div>
        <label className="text-sm font-medium">Beschreibung</label>
        <Input
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          placeholder={
            containerType === 'tank' ? 'z.B. Edelstahl 5000L' :
            containerType === 'bottle' ? 'z.B. Glasflasche 0,75L' :
            containerType === 'barrel' ? 'z.B. Holzfass 200L' :
            containerType === 'ibc' ? 'z.B. Kunststoff IBC 1000L' :
            containerType === 'balloon' ? 'z.B. Glasballon 25L' :
            'z.B. Material und Größe'
          }
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Volumen (Liter)</label>
        <Input
          type="number"
          value={volumenLiter}
          onChange={(e) => setVolumenLiter(Number(e.target.value))}
          placeholder={volumenLiter.toString()}
          min="0.1"
          step="0.1"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Standard: {containerTypeOptions.find(opt => opt.value === containerType)?.defaultVolume} Liter für {containerTypeOptions.find(opt => opt.value === containerType)?.label}
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
  
  // Container-Management States
  const [selectedTankForFill, setSelectedTankForFill] = useState<TankDefinition | null>(null);
  const [showContainerFillDialog, setShowContainerFillDialog] = useState(false);
  const [selectedTankForHistory, setSelectedTankForHistory] = useState<TankDefinition | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  
  // Lade Daten beim Component Mount und bei Änderungen
  // Nur EINMAL beim Mount: Tanks synchronisieren
  useEffect(() => {
    (async () => {
      // WICHTIG: fixTankIds() NICHT mehr aufrufen - verursacht Endlosschleife!
      // Nur einmal beim ersten Laden synchronisieren
      await syncTankDefinitionsWithInventory();
      await loadTankData();
      loadInventoryData();
    })();
    // Event: Nur Tanks neu laden, NICHT synchronisieren!
    const handleTankUpdate = () => {
      loadTankData();
    };
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

  const loadTankData = async () => {
    try {
      // NUR Tanks laden, NICHT synchronisieren (verhindert Endlosschleife!)
      const realTanks = await getTankDefinitions();
      console.log('🔍 Geladene echte Tanks:', realTanks);
      setTanks(realTanks);
    } catch (error) {
      console.error('Fehler beim Laden der Tank-Daten:', error);
    }
  };

  const loadInventoryData = async () => {
    try {
      // KRITISCH: Aus hybridStorage laden, nicht localStorage!
      const { hybridStorage } = await import('@/lib/hybrid-storage');
      const items = await hybridStorage.get('inventoryItems') || [];
      setInventoryItems(items);
      console.log('🔍 Geladenes Inventar aus hybridStorage:', items.length, 'Artikel');
    } catch (error) {
      console.error('Fehler beim Laden der Inventar-Daten:', error);
    }
  };

  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTanks, setSelectedTanks] = useState<Set<string>>(new Set());
  const [qrCodeTank, setQrCodeTank] = useState<Tank | null>(null);
  const [allSelected, setAllSelected] = useState(false);
  const [filterType, setFilterType] = useState<ContainerType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'empty' | 'filled' | 'shipped' | 'returned'>('all');
  
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
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  
  // Batch-Druck State
  const [showBatchPrintDialog, setShowBatchPrintDialog] = useState(false);
  const [batchQRSize, setBatchQRSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [batchLayout, setBatchLayout] = useState<'grid' | 'list'>('grid');
  const [batchQRCodes, setBatchQRCodes] = useState<Map<string, string>>(new Map()); // tankId -> QR DataURL

  // Filter Tanks basierend auf Typ und Status
  const filteredTanks = tanks.filter(tank => {
    const typeMatch = filterType === 'all' || tank.containerType === filterType;
    const statusMatch = filterStatus === 'all' || (tank.status || 'empty') === filterStatus;
    return typeMatch && statusMatch;
  });

  // Einfache GitHub Funktionen
  const handleGitHubConnect = () => {
    setShowGithubSetup(true);
  };

  // Statisches QR-System Upload Handler
  const handleUploadStaticQR = async () => {
    if (!githubToken) {
      setShowGithubSetup(true);
      return;
    }

    setIsUploading(true);
    try {
      const autoSync = getTankAutoSync();
      await autoSync.initialize({
        enabled: true,
        interval: 60,
        githubToken: githubToken.trim(),
        githubUsername: 'woku369',
        githubRepository: 'MazerationsMeister'
      });
      
      // Verwende den GitHub Service direkt über uploadStaticFiles Methode
      const result = await autoSync.uploadStaticFiles();
      
      if (result?.success) {
        alert('✅ Statisches QR-System erfolgreich hochgeladen!\n\nNeue URL:\n• tank-viewer-simple.html - Einfache QR-Codes ohne Backup-URLs');
      } else {
        throw new Error(result?.message || 'Upload fehlgeschlagen');
      }
    } catch (error: any) {
      console.error('Fehler beim Upload des statischen QR-Systems:', error);
      alert('❌ Fehler beim Upload: ' + (error?.message || 'Unbekannter Fehler'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleGitHubSetup = async () => {
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

  const getTankFillLevel = (tank: Tank) => {
    // WICHTIG: Für Container mit Suffix (z.B. "Fass-1", "B-2") müssen wir den Index finden!
    // Format: "Fass-1" → tankNr="Fass", index=1
    const match = tank.id.match(/^(.+?)-(\d+)$/);
    
    let tankItems: typeof inventoryItems = [];
    
    if (match) {
      // Container mit Suffix (z.B. "Fass-1", "B-2")
      const baseTankNr = match[1]; // "Fass", "B", "Fl"
      const containerIndex = parseInt(match[2], 10); // 1, 2, 3...
      
      // Finde ALLE Items mit dieser tankNr und nimm das richtige Item nach Index
      const allItemsWithTankNr = inventoryItems.filter(item => item.tankNr === baseTankNr);
      if (containerIndex > 0 && containerIndex <= allItemsWithTankNr.length) {
        tankItems = [allItemsWithTankNr[containerIndex - 1]]; // Arrays sind 0-basiert, Index ist 1-basiert
      }
    } else {
      // Eindeutige Tanks (z.B. "T 341") - ALLE Chargen dieses Tanks
      tankItems = inventoryItems.filter(item => item.tankNr === tank.tankNr);
    }
    
    const totalVolume = tankItems.reduce((sum, item) => sum + (item.currentQuantityLiters || 0), 0);
    const contents = tankItems.map(item => {
      const category = item.category ? ` (${item.category})` : '';
      return `${item.produktName}${category} (${item.currentQuantityLiters}L)`;
    }).join(', ') || 'Leer';
    
    return {
      totalVolume,
      contents,
      products: tankItems.map(item => item.produktName), // Array von Produktnamen
      items: tankItems
    };
  };

  const generateQRCode = async (tank: Tank) => {
    try {
      // IMMER GitHub Pages URLs verwenden für Produktion
      const url = `https://woku369.github.io/MazerationsMeister/tank-viewer-secure.html?tank=${encodeURIComponent(tank.tankNr)}`;
      
      const qrCodeUrl = await QRCode.toDataURL(url);
      setQrCodeDataUrl(qrCodeUrl);
      setQrCodeTank(tank);
    } catch (error) {
      console.error("Fehler beim Generieren des QR-Codes:", error);
    }
  };

  // Batch-QR-Code-Generierung
  const generateBatchQRCodes = async () => {
    const newQRCodes = new Map<string, string>();
    
    for (const tankId of Array.from(selectedTanks)) {
      const tank = tanks.find(t => t.id === tankId);
      if (!tank) continue;
      
      try {
        // IMMER GitHub Pages URLs verwenden
        const url = `https://woku369.github.io/MazerationsMeister/tank-viewer-secure.html?tank=${encodeURIComponent(tank.tankNr)}`;
        
        const qrCodeUrl = await QRCode.toDataURL(url, { width: 512, margin: 1 });
        newQRCodes.set(tankId, qrCodeUrl);
      } catch (error) {
        console.error(`Fehler beim Generieren des QR-Codes für ${tank.tankNr}:`, error);
      }
    }
    
    setBatchQRCodes(newQRCodes);
  };

  // QR-Code Druck-Funktionen
  const printQRCode = () => {
    if (!qrCodeDataUrl || !qrCodeTank) return;
    
    // Erstelle druckbares HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup wurde blockiert. Bitte aktivieren Sie Popups für diese Seite.');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tank QR-Code - ${qrCodeTank.tankNr}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              margin: 20px;
              background: white;
            }
            .qr-container {
              border: 2px solid #000;
              padding: 20px;
              display: inline-block;
              margin: 20px auto;
            }
            .qr-image { 
              display: block; 
              margin: 0 auto 15px auto;
            }
            .tank-info {
              font-size: 14px;
              font-weight: bold;
              margin: 10px 0;
            }
            h1 { 
              font-size: 18px; 
              margin-bottom: 10px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>Tank ${qrCodeTank.tankNr}</h1>
            <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-image" style="width: 200px; height: 200px;" />
            <div class="tank-info">Typ: ${qrCodeTank.containerType}</div>
            <div class="tank-info">Kapazität: ${qrCodeTank.volumenLiter}L</div>
            <div class="tank-info">Bezeichnung: ${qrCodeTank.bezeichnung}</div>
          </div>
          <p class="no-print" style="margin-top: 30px;">
            <button onclick="window.print()">Drucken</button>
            <button onclick="window.close()">Schließen</button>
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Automatisch drucken nach 500ms (damit das Dokument geladen ist)
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const downloadQRCodePDF = async () => {
    if (!qrCodeDataUrl || !qrCodeTank) return;
    
    try {
      // Erstelle Canvas für PDF
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 500;
      
      if (!ctx) return;
      
      // Weißer Hintergrund
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // QR-Code Bild laden
      const qrImage = new Image();
      qrImage.onload = () => {
        // Zeichne QR-Code
        ctx.drawImage(qrImage, 100, 50, 200, 200);
        
        // Zeichne Text
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Tank ${qrCodeTank.tankNr}`, 200, 30);
        
        ctx.font = '16px Arial';
        ctx.fillText(`Typ: ${qrCodeTank.containerType}`, 200, 280);
        ctx.fillText(`Kapazität: ${qrCodeTank.volumenLiter}L`, 200, 310);
        ctx.fillText(`Bezeichnung: ${qrCodeTank.bezeichnung}`, 200, 340);
        
        // Download als Bild (da wir keine PDF-Library haben)
        const link = document.createElement('a');
        link.download = `Tank-${qrCodeTank.tankNr}-QR.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      qrImage.src = qrCodeDataUrl;
      
    } catch (error) {
      console.error('Fehler beim PDF-Download:', error);
      alert('Fehler beim Erstellen der Datei');
    }
  };

  const copyQRCodeToClipboard = async () => {
    if (!qrCodeDataUrl) return;
    
    try {
      // Konvertiere Data URL zu Blob
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      
      // Kopiere zum Clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      alert('QR-Code wurde in die Zwischenablage kopiert!');
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
      alert('Kopieren fehlgeschlagen. Browser unterstützt diese Funktion möglicherweise nicht.');
    }
  };

  // Standard Tank-Management Funktionen
  const addTank = (newTank: Omit<Tank, "id">) => {
    const tank: Tank = {
      ...newTank,
      id: newTank.tankNr, // Verwende tankNr als ID für Konsistenz
      volumenLiter: newTank.volumenLiter || 5000,
      containerType: newTank.containerType || 'tank',
      hasUniqueNumber: newTank.hasUniqueNumber ?? true
    };
    
    const updatedTanks = [...tanks, tank];
    setTanks(updatedTanks);
    
    // Speichere in localStorage als tankDefinitions
    if (typeof window !== 'undefined') {
      localStorage.setItem('tankDefinitions', JSON.stringify(updatedTanks));
    }
    
    setIsAddDialogOpen(false);
  };

  const updateTank = (tankData: Omit<Tank, "id">) => {
    if (!editingTank) return;
    
    const updatedTank: Tank = {
      ...tankData,
      id: editingTank.id // Behalte die bestehende ID
    };
    
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
            
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (confirm('⚠️ ACHTUNG! Alle Container-Definitionen werden gelöscht und neu aus dem Inventar erstellt.\n\nDies löscht:\n- Alle "Auto-erkannt" Container\n- Alle manuell erstellten Container\n\nContainer werden dann neu synchronisiert.\n\nFortfahren?')) {
                  try {
                    await hybridStorage.set('tankDefinitions', []);
                    alert('✅ Alle Container gelöscht. App wird neu geladen...');
                    window.location.reload();
                  } catch (error) {
                    alert('❌ Fehler beim Löschen: ' + error);
                  }
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Container-Reset
            </Button>
            
            <Button variant="outline" onClick={exportTanks}>
              <Download className="mr-2 h-4 w-4" />
              Tanks exportieren
            </Button>
            
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Tanks importieren
            </Button>
            
            {selectedTanks.size > 0 && (
              <Button 
                variant="default"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  setShowBatchPrintDialog(true);
                  generateBatchQRCodes(); // QR-Codes generieren
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                QR-Codes drucken ({selectedTanks.size})
              </Button>
            )}
            
            <Button 
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={async () => {
                console.clear();
                console.log('🔍 INVENTAR-ANALYSE wird gestartet...');
                
                try {
                  const { analyzeInventoryData } = await import('@/lib/inventory-analyzer');
                  const result = await analyzeInventoryData();
                  
                  // Zeige Zusammenfassung als Alert
                  alert(
                    `📊 INVENTAR-ANALYSE\n\n` +
                    `📦 Total Einträge: ${result.totalItems}\n` +
                    `✅ Mit Tank-Nr: ${result.withTankNr}\n` +
                    `❌ Ohne Tank-Nr: ${result.withoutTankNr}\n\n` +
                    `🔢 Erwartete Container: ${result.expectedContainers}\n` +
                    `   🏭 Eindeutige Tanks: ${result.uniqueTanks}\n` +
                    `   📦 Separate Behälter: ${result.nonUniqueContainers}\n\n` +
                    `💧 Total Volumen: ${(result.totalVolume || 0).toLocaleString('de-DE')}L\n\n` +
                    `Siehe Console (F12) für Details!`
                  );
                } catch (error) {
                  console.error('❌ Analyse-Fehler:', error);
                  alert('❌ Fehler bei Analyse: ' + error);
                }
              }}
            >
              🔍 Inventar analysieren
            </Button>
          </div>

          {/* Filter nach Status */}
          <div className="mt-4">
            <label className="text-sm font-medium">Filter nach Status:</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button 
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Alle ({tanks.length})
              </button>
              <button 
                onClick={() => setFilterStatus('empty')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === 'empty' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ⚪ Leer ({tanks.filter(t => t.status === 'empty' || !t.status).length})
              </button>
              <button 
                onClick={() => setFilterStatus('filled')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === 'filled' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-200 text-blue-700 hover:bg-blue-300'
                }`}
              >
                🔵 Befüllt ({tanks.filter(t => t.status === 'filled').length})
              </button>
              <button 
                onClick={() => setFilterStatus('shipped')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === 'shipped' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-amber-200 text-amber-700 hover:bg-amber-300'
                }`}
              >
                🟡 Verschickt ({tanks.filter(t => t.status === 'shipped').length})
              </button>
              <button 
                onClick={() => setFilterStatus('returned')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === 'returned' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-200 text-purple-700 hover:bg-purple-300'
                }`}
              >
                🟣 Retour ({tanks.filter(t => t.status === 'returned').length})
              </button>
            </div>
          </div>

          {/* Filter nach Behältnistyp */}
          <div className="mt-4">
            <label className="text-sm font-medium">Filter nach Behältnistyp:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as ContainerType | 'all')}
              className="ml-2 p-2 border border-gray-300 rounded-md"
            >
              <option value="all">Alle Behältnisse ({tanks.length})</option>
              <option value="tank">🏭 Tanks ({tanks.filter(t => t.containerType === 'tank').length})</option>
              <option value="bottle">🍾 Flaschen ({tanks.filter(t => t.containerType === 'bottle').length})</option>
              <option value="barrel">🛢️ Fässer ({tanks.filter(t => t.containerType === 'barrel').length})</option>
              <option value="ibc">📦 IBC-Container ({tanks.filter(t => t.containerType === 'ibc').length})</option>
              <option value="balloon">🎈 Ballons ({tanks.filter(t => t.containerType === 'balloon').length})</option>
              <option value="other">📋 Sonstiges ({tanks.filter(t => t.containerType === 'other').length})</option>
            </select>
          </div>

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

          {/* Statisches QR-System Upload */}
          <div className="mt-4">
            <Button 
              onClick={handleUploadStaticQR}
              disabled={!githubEnabled || isUploading}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full"
            >
              {isUploading ? (
                <>🔄 Uploading...</>
              ) : (
                <>📤 Statisches QR-System hochladen</>
              )}
            </Button>
            {!githubEnabled && (
              <p className="text-xs text-muted-foreground mt-1">
                GitHub-Verbindung erforderlich für Upload
              </p>
            )}
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

          {/* Add Tank Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Tank hinzufügen</DialogTitle>
              </DialogHeader>
              <TankForm
                onSubmit={addTank}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Edit Tank Dialog */}
          <Dialog open={!!editingTank} onOpenChange={() => setEditingTank(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tank bearbeiten</DialogTitle>
              </DialogHeader>
              {editingTank && (
                <TankForm
                  initialData={editingTank}
                  onSubmit={updateTank}
                  onCancel={() => setEditingTank(null)}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Tank Liste */}
          <div className="space-y-4">
            {filteredTanks.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    {filterType === 'all' ? 
                      'Keine Tanks gefunden. Tanks werden automatisch aus der Lagerverwaltung synchronisiert, oder Sie können manuell neue Tanks hinzufügen.' :
                      `Keine Behältnisse vom Typ "${filterType}" gefunden.`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTanks.map((tank) => {
                const fillInfo = getTankFillLevel(tank); // Übergebe ganzes Tank-Objekt statt nur tankNr
                const fillPercentage = tank.volumenLiter > 0 ? Math.round((fillInfo.totalVolume / tank.volumenLiter) * 100) : 0;
                
                return (
                  <Card key={tank.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        {/* Checkbox für Batch-Auswahl */}
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox 
                            checked={selectedTanks.has(tank.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedTanks);
                              if (checked) {
                                newSelected.add(tank.id);
                              } else {
                                newSelected.delete(tank.id);
                              }
                              setSelectedTanks(newSelected);
                            }}
                            className="mt-1"
                          />
                          
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {/* Container-ID als Hauptbezeichnung */}
                            <h3 className="font-bold text-xl">{tank.bezeichnung}</h3>
                            
                            {/* Container-Typ Badge */}
                            <span className={`text-sm px-2 py-1 rounded font-medium ${
                              tank.containerType === 'tank' ? 'bg-green-100 text-green-800' :
                              tank.containerType === 'bottle' ? 'bg-purple-100 text-purple-800' :
                              tank.containerType === 'barrel' ? 'bg-orange-100 text-orange-800' :
                              tank.containerType === 'ibc' ? 'bg-cyan-100 text-cyan-800' :
                              tank.containerType === 'balloon' ? 'bg-pink-100 text-pink-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {tank.containerType === 'tank' ? '🏭 Tank' :
                               tank.containerType === 'bottle' ? '🍾 Flasche' :
                               tank.containerType === 'barrel' ? '🛢️ Fass' :
                               tank.containerType === 'ibc' ? '📦 IBC' :
                               tank.containerType === 'balloon' ? '🎈 Ballon' :
                               '📋 Sonstiges'}
                            </span>
                            
                            {/* Status Badge */}
                            <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                              tank.status === 'empty' ? 'bg-gray-200 text-gray-700' :
                              tank.status === 'filled' ? 'bg-blue-500 text-white' :
                              tank.status === 'shipped' ? 'bg-amber-500 text-white' :
                              tank.status === 'returned' ? 'bg-purple-500 text-white' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {tank.status === 'empty' ? '⚪ Leer' :
                               tank.status === 'filled' ? '🔵 Befüllt' :
                               tank.status === 'shipped' ? '🟡 Verschickt' :
                               tank.status === 'returned' ? '🟣 Retour' :
                               '⚪ Leer'}
                            </span>
                          </div>
                          
                          {/* Inhalt als Detail-Info (nicht als Hauptüberschrift) */}
                          {tank.currentContent && (
                            <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                              <span className="text-xs text-blue-600 font-medium mb-1 block">📦 Aktueller Inhalt:</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {fillInfo.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-blue-900">
                                      {item.produktName}
                                    </span>
                                    {item.category && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                        item.category === 'M' ? 'bg-green-500 text-white' :
                                        item.category === 'Dest' ? 'bg-orange-500 text-white' :
                                        'bg-gray-400 text-white'
                                      }`}>
                                        {item.category === 'M' ? '🌿 Mazerat' :
                                         item.category === 'Dest' ? '💧 Destillat' :
                                         item.category}
                                      </span>
                                    )}
                                    <span className="text-xs text-blue-600">
                                      ({item.currentQuantityLiters}L)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Kapazität:</span>
                              <div className="font-medium">{tank.volumenLiter.toLocaleString('de-DE')} L</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Füllstand:</span>
                              <div className="font-medium">{fillInfo.totalVolume.toLocaleString('de-DE')} L ({fillPercentage}%)</div>
                            </div>
                          </div>
                          
                          {fillInfo.contents !== 'Leer' && fillInfo.contents !== tank.currentContent && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Details:</span>
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
                          {/* Container-Management Buttons */}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedTankForFill(tank);
                              setShowContainerFillDialog(true);
                            }}
                            disabled={fillInfo.totalVolume === 0}
                            className="w-full"
                          >
                            📦 Container befüllen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTankForHistory(tank);
                              setShowHistoryDialog(true);
                            }}
                            className="w-full"
                          >
                            📜 Historie
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateQRCode(tank)}
                            className="w-full"
                          >
                            📱 QR-Code
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
                        </div> {/* Schließt flex items-start gap-3 */}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
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
                  {githubEnabled ? "GitHub Pages URL" : "OneDrive/Offline URL"}
                </p>
                <div className="text-xs text-muted-foreground text-center">
                  <p><strong>Tank:</strong> {qrCodeTank?.tankNr}</p>
                  <p><strong>Typ:</strong> {qrCodeTank?.containerType}</p>
                  <p><strong>Kapazität:</strong> {qrCodeTank?.volumenLiter}L</p>
                </div>
                
                {/* Druck-Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={printQRCode}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Printer className="h-4 w-4" />
                    Drucken
                  </Button>
                  
                  <Button
                    onClick={downloadQRCodePDF}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    PDF Erstellen
                  </Button>
                  
                  <Button
                    onClick={copyQRCodeToClipboard}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Batch-Druck Dialog */}
          <Dialog open={showBatchPrintDialog} onOpenChange={setShowBatchPrintDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Print-spezifisches CSS */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #batch-print-content, #batch-print-content * {
                    visibility: visible;
                  }
                  #batch-print-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                  }
                  .print\\:break-inside-avoid {
                    break-inside: avoid;
                    page-break-inside: avoid;
                  }
                }
              `}</style>
              
              <DialogHeader>
                <DialogTitle>🖨️ QR-Codes Batch-Druck ({selectedTanks.size} ausgewählt)</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Einstellungen */}
                <div className="flex gap-4 p-4 bg-gray-50 rounded">
                  <div>
                    <label className="text-sm font-medium mb-2 block">QR-Code-Größe:</label>
                    <select 
                      value={batchQRSize}
                      onChange={(e) => setBatchQRSize(e.target.value as 'small' | 'medium' | 'large')}
                      className="px-3 py-2 border rounded"
                    >
                      <option value="small">Klein (10x10cm)</option>
                      <option value="medium">Mittel (15x15cm)</option>
                      <option value="large">Groß (20x20cm)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Layout:</label>
                    <select 
                      value={batchLayout}
                      onChange={(e) => setBatchLayout(e.target.value as 'grid' | 'list')}
                      className="px-3 py-2 border rounded"
                    >
                      <option value="grid">Raster (2 pro Seite)</option>
                      <option value="list">Liste (1 pro Seite)</option>
                    </select>
                  </div>
                  
                  <Button
                    onClick={() => {
                      window.print();
                    }}
                    className="ml-auto"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Jetzt drucken
                  </Button>
                </div>
                
                {/* Druckvorschau */}
                <div id="batch-print-content" className={`
                  ${batchLayout === 'grid' ? 'grid grid-cols-2 gap-6' : 'space-y-6'}
                `}>
                  {Array.from(selectedTanks).map(tankId => {
                    const tank = tanks.find(t => t.id === tankId);
                    if (!tank) return null;
                    
                    const fillInfo = getTankFillLevel(tank);
                    const sizeClass = 
                      batchQRSize === 'small' ? 'w-32 h-32' :
                      batchQRSize === 'medium' ? 'w-48 h-48' :
                      'w-64 h-64';
                    
                    return (
                      <div key={tankId} className="border rounded p-4 bg-white print:break-inside-avoid">
                        <div className="flex flex-col items-center gap-3">
                          <h3 className="font-bold text-xl">
                            {tank.hasUniqueNumber ? tank.tankNr : `${tank.tankNr}-${tanks.filter(t => t.tankNr === tank.tankNr).indexOf(tank) + 1}`}
                          </h3>
                          <div className={`border-4 border-black ${sizeClass} overflow-hidden`}>
                            {batchQRCodes.has(tankId) ? (
                              <img 
                                src={batchQRCodes.get(tankId)} 
                                alt={`QR-Code ${tank.tankNr}`}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                                Wird generiert...
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-center">
                            {fillInfo.totalVolume > 0 ? (
                              <>
                                <p className="text-green-600 font-semibold">
                                  ✓ {fillInfo.products.join(', ')}
                                </p>
                                <p className="text-blue-600">
                                  {fillInfo.totalVolume.toFixed(1)}L / {tank.volumenLiter}L
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-500">
                                ○ Leer
                              </p>
                            )}
                            <p className="text-gray-400 text-xs mt-1">
                              {new Date().toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Container-Fill Dialog */}
          {selectedTankForFill && (
            <Dialog open={showContainerFillDialog} onOpenChange={setShowContainerFillDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Container aus {selectedTankForFill.bezeichnung} befüllen</DialogTitle>
                </DialogHeader>
                <ContainerFillDialog
                  container={selectedTankForFill}
                  onSuccess={() => {
                    setShowContainerFillDialog(false);
                    setSelectedTankForFill(null);
                    loadTankData(); // Tanks neu laden nach Befüllung
                    loadInventoryData(); // Inventar neu laden
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
          
          {/* Container-History Dialog */}
          <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Container-Historie: {selectedTankForHistory?.bezeichnung}</DialogTitle>
              </DialogHeader>
              {selectedTankForHistory && (
                <ContainerHistory container={selectedTankForHistory} />
              )}
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