"use client";

import * as React from "react";
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TankManagement from '@/components/inventory/tank-management';
import TankContentManager from '@/components/inventory/tank-content-manager';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Trash2, Settings, Cloud, Smartphone, Github } from "lucide-react";


export default function EinstellungenPage() {
  // Hydration-Fix
  const [hydrated, setHydrated] = useState(false);
  React.useEffect(() => { setHydrated(true); }, []);
  
  // Daten-Speicherpfad
  const [dataPath, setDataPath] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dataPath');
      if (stored) return stored;
      // Standardpfad: %APPDATA%/MazerationsMeister
      const appData = window.process?.env?.APPDATA || '';
      if (appData) return appData + '/MazerationsMeister';
    }
    return '';
  });
  const handleSaveDataPath = () => {
    localStorage.setItem('dataPath', dataPath);
  };
  
  // OneDrive-Pfad für automatische Sync
  const [oneDrivePath, setOneDrivePath] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('oneDrivePath') || '';
    }
    return '';
  });
  const handleSaveOneDrivePath = () => {
    localStorage.setItem('oneDrivePath', oneDrivePath);
  };

  // OneDrive-Konfiguration
  const [oneDriveShareUrl, setOneDriveShareUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const config = localStorage.getItem('oneDriveConfig');
      if (config) {
        try {
          return JSON.parse(config).shareUrl || '';
        } catch (e) {
          return '';
        }
      }
    }
    return '';
  });
  
  // GitHub-Konfiguration
  const [githubToken, setGithubToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('github-token') || '';
    }
    return '';
  });
  const [githubEnabled, setGithubEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('github-enabled') === 'true';
    }
    return false;
  });
  
  const handleSaveGitHubConfig = () => {
    localStorage.setItem('github-token', githubToken.trim());
    localStorage.setItem('github-enabled', githubEnabled.toString());
    
    // Event für Synchronisation mit anderen Komponenten aussenden
    window.dispatchEvent(new CustomEvent('githubConfigUpdated', {
      detail: { token: githubToken.trim(), enabled: githubEnabled }
    }));
    
    alert('GitHub-Konfiguration gespeichert und synchronisiert!');
    // Optional: Test der GitHub-Verbindung hier
  };
  
  const handleSaveOneDriveConfig = () => {
    const config = {
      shareUrl: oneDriveShareUrl.trim(),
      appPath: ''
    };
    localStorage.setItem('oneDriveConfig', JSON.stringify(config));
    alert('OneDrive-Konfiguration gespeichert!');
  };

  const handleTestOneDriveConfig = () => {
    if (!oneDriveShareUrl.trim()) {
      alert('Bitte geben Sie zuerst eine OneDrive Share-URL ein.');
      return;
    }
    
    // Test ob die URL erreichbar ist
    const testUrl = oneDriveShareUrl.trim();
    window.open(testUrl, '_blank');
  };
  // Kategorien als Array von Objekten mit Name und Farbe
  const [categories, setCategories] = useState<{name: string, color: string}[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('inventoryCategories');
      if (stored) return JSON.parse(stored);
    }
    // Keine Default-Kategorien mehr - User muss eigene erstellen
    return [];
  });
  const [newCategory, setNewCategory] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [editIndex, setEditIndex] = useState<number|null>(null);
  const [editValue, setEditValue] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');

  const saveCategories = (cats: {name: string, color: string}[]) => {
    setCategories(cats);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventoryCategories', JSON.stringify(cats));
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.some(c => c.name === newCategory.trim())) {
      saveCategories([...categories, {name: newCategory.trim(), color: newColor}]);
      setNewCategory('');
      setNewColor('#3b82f6');
    }
  };
  const handleDeleteCategory = (idx: number) => {
    const cats = categories.filter((_, i) => i !== idx);
    saveCategories(cats);
  };
  const handleEditCategory = (idx: number) => {
    setEditIndex(idx);
    setEditValue(categories[idx].name);
    setEditColor(categories[idx].color);
  };
  const handleSaveEdit = () => {
    if (editIndex !== null && editValue.trim()) {
      const cats = [...categories];
      cats[editIndex] = {name: editValue.trim(), color: editColor};
      saveCategories(cats);
      setEditIndex(null);
      setEditValue('');
      setEditColor('#3b82f6');
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="font-sans text-3xl md:text-4xl text-primary mb-4">Einstellungen</h1>
      <Tabs defaultValue="speicher" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="speicher">Speicherpfade</TabsTrigger>
          <TabsTrigger value="onedrive">OneDrive QR-Codes</TabsTrigger>
          <TabsTrigger value="github">GitHub Integration</TabsTrigger>
          <TabsTrigger value="kategorien">Kategorien</TabsTrigger>
          <TabsTrigger value="tank">QR-Codes</TabsTrigger>
          <TabsTrigger value="tankinhalt">Tank-Inhalte</TabsTrigger>
        </TabsList>
        <TabsContent value="speicher">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-primary mt-6 mb-2">Lokaler Daten-Speicherpfad</label>
            <Input type="text" value={dataPath} onChange={e => setDataPath(e.target.value)} placeholder="z.B. C:\\Users\\wolfg\\Desktop\\MazerationsMeister Daten" />
            <Button className="mt-2" onClick={handleSaveDataPath}>Pfad speichern</Button>
            <div className="text-xs text-muted-foreground mt-1">Aktueller Pfad: <span className="font-mono">{hydrated ? (dataPath || '(nicht gesetzt)') : '(nicht gesetzt)'}</span></div>
            <div className="text-xs text-muted-foreground mt-4">Hier werden die Anwendungsdaten (z.B. Lagerbestand, Artikelstamm) gespeichert und geladen.</div>
            
            <label className="block text-sm font-medium text-primary mt-6 mb-2">OneDrive-Synchronisation</label>
            <Input type="text" value={oneDrivePath} onChange={e => setOneDrivePath(e.target.value)} placeholder="z.B. C:\\Users\\wolfg\\OneDrive\\MazerationsMeister" />
            <Button className="mt-2" onClick={handleSaveOneDrivePath}>Pfad speichern</Button>
            <div className="text-xs text-muted-foreground mt-1">Aktueller Pfad: <span className="font-mono">{hydrated ? (oneDrivePath || '(nicht gesetzt)') : '(nicht gesetzt)'}</span></div>
            <div className="text-xs text-muted-foreground mt-2">Tank-Daten werden automatisch in diesen OneDrive-Ordner synchronisiert.</div>
          </div>
        </TabsContent>
          <TabsContent value="onedrive">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-primary mb-4">OneDrive-QR-Code Konfiguration</h2>
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">🌐 Cloud-QR-Codes für Offline-Zugriff</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Konfigurieren Sie eine OneDrive Share-URL, damit die QR-Codes auch ohne laufende App funktionieren.
                </p>
              </div>

              <label className="block text-sm font-medium text-primary mb-2">OneDrive Share-URL</label>
              <Input 
                type="url" 
                value={oneDriveShareUrl} 
                onChange={e => setOneDriveShareUrl(e.target.value)} 
                placeholder="https://1drv.ms/f/s/[IHR-SHARE-LINK]" 
                className="mb-2"
              />
              <div className="flex gap-2 mb-4">
                <Button onClick={handleSaveOneDriveConfig}>
                  Konfiguration speichern
                </Button>
                <Button variant="outline" onClick={handleTestOneDriveConfig}>
                  URL testen
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground mb-4">
                <strong>Aktuelle Konfiguration:</strong><br />
                Share-URL: <span className="font-mono">{hydrated ? (oneDriveShareUrl || '(nicht konfiguriert)') : '(nicht konfiguriert)'}</span>
              </div>
            </div>
          </TabsContent>
          
        <TabsContent value="github">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-primary mb-4">GitHub Integration</h2>
            
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub-Synchronisation für Tank-Daten
              </h3>
              <p className="text-sm text-green-700 mb-2">
                Automatische Backup-Commits und Online-Zugriff auf Tank-Daten über GitHub Pages.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="github-token" className="text-sm font-medium text-primary">
                  GitHub Personal Access Token
                </Label>
                <Input 
                  id="github-token"
                  type="password" 
                  value={githubToken} 
                  onChange={e => setGithubToken(e.target.value)} 
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxx" 
                  className="mt-1"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Erstellen Sie einen Token unter: GitHub → Settings → Developer settings → Personal access tokens
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="github-enabled"
                  checked={githubEnabled}
                  onChange={e => setGithubEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="github-enabled" className="text-sm">
                  GitHub-Integration aktivieren
                </Label>
              </div>
              
              <Button onClick={handleSaveGitHubConfig} className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub-Konfiguration speichern
              </Button>
              
              <div className="text-xs text-muted-foreground">
                <strong>Status:</strong><br />
                Integration: <span className="font-mono">{hydrated ? (githubEnabled ? 'Aktiviert' : 'Deaktiviert') : 'Lade...'}</span><br />
                Token: <span className="font-mono">{hydrated ? (githubToken ? 'Konfiguriert' : 'Nicht konfiguriert') : 'Lade...'}</span>
              </div>
              
              {githubEnabled && githubToken && (
                <Alert>
                  <AlertDescription>
                    ✅ GitHub-Integration ist aktiv. Tank-Daten werden automatisch zu GitHub hochgeladen.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="kategorien">
           <div className="max-w-md">
             <label className="block text-sm font-medium text-primary mb-2">Kategorien für Lagerartikel</label>
             <p className="text-sm text-muted-foreground mb-4">
               Kategorie-Management temporär deaktiviert (Hydration-Fix)
             </p>
           </div>
        </TabsContent>
        <TabsContent value="tank">
          <TankManagement />
        </TabsContent>
        <TabsContent value="tankinhalt">
          <TankContentManager />
        </TabsContent>
      </Tabs>
    </main>
  );
}
