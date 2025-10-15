"use client";

import * as React from "react";
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Trash2, Settings, Cloud, Smartphone, Github, Clock, CheckCircle, Bug, Database, AlertTriangle, ExternalLink, Info } from "lucide-react";
import { getTankAutoSync } from "@/lib/tank-auto-sync-hybrid";
import { TankDataMigration } from "@/lib/tank-data-migration";
import { hybridStorage } from "@/lib/hybrid-storage";
import { TankDebugUtility } from "@/lib/tank-debug-utility";
import { StorageDebugCLI } from "@/lib/storage-debug-cli";
import { DataSyncSettings } from "@/components/settings/data-sync-settings";
import { GitHubConnectionSettings } from "@/components/settings/github-connection-settings";
import Link from 'next/link';


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
  
  // Auto-Sync Status und Konfiguration
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(15);
  const [autoSyncStatus, setAutoSyncStatus] = useState<any>(null);
  
  // Auto-Sync initialisieren
  React.useEffect(() => {
    if (hydrated) {
      const autoSync = getTankAutoSync();
      const status = autoSync.getStatus();
      setAutoSyncEnabled(status.enabled);
      if (status.config?.interval) {
        setAutoSyncInterval(status.config.interval);
      }
      setAutoSyncStatus(status);
    }
  }, [hydrated]);

  // GitHub-Konfiguration - jetzt mit hybridStorage statt localStorage
  const [githubToken, setGithubToken] = useState('');
  const [githubEnabled, setGithubEnabled] = useState(false);
  
  // GitHub-Config aus hybridStorage laden
  React.useEffect(() => {
    const loadGitHubConfig = async () => {
      if (hydrated) {
        try {
          const token = await hybridStorage.get('github-token');
          const enabled = await hybridStorage.get('github-enabled');
          if (token) setGithubToken(token);
          if (enabled !== null) setGithubEnabled(enabled === true || enabled === 'true');
        } catch (error) {
          console.error('Failed to load GitHub config:', error);
        }
      }
    };
    loadGitHubConfig();
  }, [hydrated]);
  
  // Hybrid Storage Debug
  const [storageDebug, setStorageDebug] = useState<any>({});
  const [storageTestResult, setStorageTestResult] = useState<string>("");
  
  // Hybrid Storage Tests laden
  React.useEffect(() => {
    if (hydrated) {
      const loadStorageDebug = async () => {
        try {
          const debug = await hybridStorage.diagnose();
          setStorageDebug(debug);
          
          // Automatische Migration der Tank-Daten
          await TankDataMigration.migrateTankDataToHybridStorage();
        } catch (error) {
          console.error('Storage debug error:', error);
        }
      };
      loadStorageDebug();
    }
  }, [hydrated]);
  
  // GitHub Token mit Hybrid Storage verwalten
  const handleLoadGitHubTokenFromHybrid = async () => {
    try {
      const token = await hybridStorage.get('github-token');
      if (token) {
        setGithubToken(token);
        setStorageTestResult('✅ GitHub Token aus Hybrid Storage geladen');
      } else {
        setStorageTestResult('⚠️ Kein GitHub Token in Hybrid Storage gefunden');
      }
    } catch (error: any) {
      setStorageTestResult(`❌ Fehler: ${error.message}`);
    }
  };
  
  const handleSaveGitHubTokenToHybrid = async () => {
    try {
      await hybridStorage.set('github-token', githubToken.trim());
      setStorageTestResult('✅ GitHub Token in Hybrid Storage gespeichert');
    } catch (error: any) {
      setStorageTestResult(`❌ Fehler: ${error.message}`);
    }
  };
  
  const handleTestHybridStorage = async () => {
    try {
      setStorageTestResult('🔄 Testing Hybrid Storage...');
      
      // Test 1: Write
      const testKey = 'hybrid-test-' + Date.now();
      const testValue = 'Test Value ' + Math.random();
      await hybridStorage.set(testKey, testValue);
      
      // Test 2: Read
      const readValue = await hybridStorage.get(testKey);
      
      // Test 3: Verify
      if (readValue === testValue) {
        setStorageTestResult('✅ Hybrid Storage Test erfolgreich');
      } else {
        setStorageTestResult('❌ Hybrid Storage Test fehlgeschlagen: Werte stimmen nicht überein');
      }
      
      // Test 4: Cleanup
      await hybridStorage.remove(testKey);
      
      // Debug-Info aktualisieren
      const debug = await hybridStorage.diagnose();
      setStorageDebug(debug);
      
    } catch (error: any) {
      setStorageTestResult(`❌ Hybrid Storage Test Fehler: ${error.message}`);
    }
  };
  
  /* ALT - Wird durch GitHubConnectionSettings ersetzt
  const handleSaveGitHubConfig = async () => {
    // Speichere in hybridStorage statt localStorage für Persistenz
    await hybridStorage.set('github-token', githubToken.trim());
    await hybridStorage.set('github-enabled', githubEnabled);
    
    // Fallback für Kompatibilität
    localStorage.setItem('github-token', githubToken.trim());
    localStorage.setItem('github-enabled', githubEnabled.toString());
    
    // Auto-Sync konfigurieren
    if (githubEnabled && githubToken.trim()) {
      const autoSync = getTankAutoSync();
      const success = await autoSync.initialize({
        enabled: autoSyncEnabled,
        interval: autoSyncInterval,
        githubToken: githubToken.trim(),
        githubUsername: 'woku369',
        githubRepository: 'MazerationsMeister'
      });
      
      if (success) {
        setAutoSyncStatus(autoSync.getStatus());
        alert('GitHub-Konfiguration und Auto-Sync aktiviert!');
      } else {
        alert('GitHub-Konfiguration gespeichert, aber Auto-Sync-Aktivierung fehlgeschlagen!');
      }
    } else {
      alert('GitHub-Konfiguration gespeichert!');
    }
    
    // Event für Synchronisation mit anderen Komponenten aussenden
    window.dispatchEvent(new CustomEvent('githubConfigUpdated', {
      detail: { token: githubToken.trim(), enabled: githubEnabled }
    }));
  };
  */

  const handleManualSync = async () => {
    const autoSync = getTankAutoSync();
    const success = await autoSync.syncNow();
    if (success) {
      setAutoSyncStatus(autoSync.getStatus());
      alert('Tank-Daten erfolgreich zu GitHub synchronisiert!');
    } else {
      alert('Synchronisation fehlgeschlagen! Prüfen Sie Ihre GitHub-Konfiguration.');
    }
  };

  const handleTankDataDebug = async () => {
    try {
      console.log('🔍 Starte Tank-Daten Debug...');
      
      // Vollständige Diagnose
      const diagnosis = await TankDebugUtility.diagnoseTankData();
      
      // Debug-Information in einem Alert anzeigen
      const summary = `
Tank-Daten Debug Ergebnis:

localStorage:
- Tank-Definitionen: ${diagnosis.localStorage.tankDefinitions ? `${diagnosis.localStorage.tankDefinitions.length} Tanks` : 'Keine'}
- Inventory-Items: ${diagnosis.localStorage.inventoryItems ? `${diagnosis.localStorage.inventoryItems.length} Items` : 'Keine'}
- GitHub Token: ${diagnosis.localStorage.githubToken ? 'Vorhanden' : 'Nicht gefunden'}

Hybrid Storage:
- Tank-Definitionen: ${diagnosis.hybridStorage.tankDefinitions ? `${diagnosis.hybridStorage.tankDefinitions.length} Tanks` : 'Keine'}
- Inventory-Items: ${diagnosis.hybridStorage.inventoryItems ? `${diagnosis.hybridStorage.inventoryItems.length} Items` : 'Keine'}
- GitHub Token: ${diagnosis.hybridStorage.githubToken ? 'Vorhanden' : 'Nicht gefunden'}

Electron Storage:
- Verfügbar: ${diagnosis.electronStorage.available ? 'Ja' : 'Nein'}

Empfehlungen:
${diagnosis.recommendations.join('\n')}

Vollständige Details in der Browser-Konsole.
      `;
      
      alert(summary);
      
      // Automatische Reparatur anbieten
      if (diagnosis.recommendations.some(r => r.includes('Migration'))) {
        const shouldRepair = confirm('Soll eine automatische Reparatur versucht werden?');
        if (shouldRepair) {
          const repaired = await TankDebugUtility.autoFixTankData();
          alert(repaired ? '✅ Reparatur erfolgreich!' : '❌ Reparatur fehlgeschlagen');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Tank-Daten Debug fehlgeschlagen:', error);
      alert(`Debug fehlgeschlagen: ${error.message}`);
    }
  };

  const handleFullStorageAnalysis = async () => {
    try {
      console.log('🔍 Starte vollständige Storage-Analyse...');
      
      const result = await StorageDebugCLI.analyzeStorage();
      
      const summary = `
🔍 VOLLSTÄNDIGE STORAGE ANALYSE

📊 System:
- Environment: ${result.diagnosis.environment}
- Electron verfügbar: ${result.diagnosis.electronAvailable ? 'Ja' : 'Nein'}
- Electron bereit: ${result.diagnosis.electronReady ? 'Ja' : 'Nein'}
- Browser Storage: ${result.diagnosis.browserStorageAvailable ? 'Ja' : 'Nein'}

🔑 Gespeicherte Schlüssel: ${result.allKeys.length}
${result.allKeys.map((key, i) => `${i + 1}. ${key}`).join('\n')}

🏭 Tank-Daten:
- Tank-Definitionen: ${result.tankDefinitions ? result.tankDefinitions.length : 0}
- Inventory-Items: ${result.inventoryItems ? result.inventoryItems.length : 0}

📱 localStorage Keys: ${Object.keys(localStorage).length}
💾 Electron verfügbar: ${typeof window !== 'undefined' && (window as any).electronAPI ? 'Ja' : 'Nein'}

Vollständige Details in der Browser-Konsole.
      `;
      
      alert(summary);
      
    } catch (error: any) {
      console.error('❌ Storage-Analyse fehlgeschlagen:', error);
      alert(`Analyse fehlgeschlagen: ${error.message}`);
    }
  };

  const handleStorageRepair = async () => {
    try {
      console.log('🔧 Starte Storage-Reparatur...');
      
      const result = await StorageDebugCLI.repairStorage();
      
      const summary = `
🔧 STORAGE REPARATUR ABGESCHLOSSEN

✅ Reparierte Daten:
- Tank-Definitionen: ${result.tanks ? result.tanks.length : 0}
- Inventory-Items: ${result.inventory ? result.inventory.length : 0}

Die Tank-Daten sollten jetzt persistent gespeichert sein.
Starten Sie die App neu und prüfen Sie, ob die Daten erhalten bleiben.

Vollständige Details in der Browser-Konsole.
      `;
      
      alert(summary);
      
      // Bereinigung anbieten
      const shouldCleanup = confirm('Möchten Sie auch eine Storage-Bereinigung durchführen? (Entfernt überflüssige Keys)');
      if (shouldCleanup) {
        const removedCount = await StorageDebugCLI.cleanupStorage();
        alert(`✅ Bereinigung abgeschlossen: ${removedCount} überflüssige Keys entfernt`);
      }
      
    } catch (error: any) {
      console.error('❌ Storage-Reparatur fehlgeschlagen:', error);
      alert(`Reparatur fehlgeschlagen: ${error.message}`);
    }
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
      
      <Tabs defaultValue="github" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="github">🔐 GitHub-Verbindung</TabsTrigger>
          <TabsTrigger value="sync">📊 App-Daten-Sync</TabsTrigger>
          <TabsTrigger value="speicher">💾 Speicherpfade</TabsTrigger>
          <TabsTrigger value="onedrive">☁️ OneDrive QR-Codes</TabsTrigger>
          <TabsTrigger value="hybrid-storage-debug">🐛 Storage Debug</TabsTrigger>
          <TabsTrigger value="kategorien">📁 Kategorien</TabsTrigger>
        </TabsList>
        
        {/* NEU: Zentrale GitHub-Verbindung (ERSTE!) */}
        <TabsContent value="github">
          <GitHubConnectionSettings />
        </TabsContent>
        
        {/* App-Daten-Synchronisation (verwendet githubConfigManager) */}
        <TabsContent value="sync">
          <DataSyncSettings />
        </TabsContent>
        
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
          {/* ⚠️ ALTER TAB - WIRD ENTFERNT
          Dieser Tab wurde durch die neue zentrale GitHub-Verbindung ersetzt.
          Die Tank-Sync-Funktionen sind jetzt:
          - GitHub-Verbindung: Im ersten Tab "🔐 GitHub-Verbindung"
          - Tank-QR-Auto-Sync: Wird separat konfiguriert (Tank-Management)
          - Debug-Tools: Bleiben hier vorerst
          */}
          
          <Alert variant="default" className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>✅ Neues GitHub-System aktiv!</strong><br />
              Die GitHub-Konfiguration wurde vereinfacht. Bitte nutzen Sie den Tab <strong>"🔐 GitHub-Verbindung"</strong> für die zentrale Einrichtung.
              <br /><br />
              <strong>Was hat sich geändert?</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Nur noch <strong>eine</strong> GitHub-Konfiguration (statt zwei)</li>
                <li>Wird automatisch von Tank-QR-System UND App-Daten-Sync verwendet</li>
                <li>Token kann in <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> gespeichert werden</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Debug-Tools (bleiben vorerst hier) */}
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold text-primary mb-4">🛠️ Debug-Tools</h3>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={handleTankDataDebug} 
                className="flex items-center gap-2 text-orange-600 border-orange-300"
              >
                <AlertTriangle className="h-4 w-4" />
                Tank-Daten Debug
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleFullStorageAnalysis} 
                className="flex items-center gap-2 text-blue-600 border-blue-300"
              >
                <Database className="h-4 w-4" />
                Storage Analyse
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleStorageRepair} 
                className="flex items-center gap-2 text-green-600 border-green-300"
              >
                <Settings className="h-4 w-4" />
                Storage Reparatur
              </Button>
              
              {/* Manuelle Sync nur anzeigen wenn GitHub konfiguriert ist */}
              <Button 
                variant="outline" 
                onClick={handleManualSync} 
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Tank-Daten zu GitHub synchronisieren
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="hybrid-storage-debug">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-primary mb-4">Hybrid Storage Debug</h2>
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-amber-900 mb-2">🧪 Phase 4.8.1 - Storage System Testing</h3>
              <p className="text-sm text-amber-700 mb-2">
                Test und Validierung des neu implementierten Hybrid Storage Systems.
              </p>
              <div className="text-xs text-amber-600 mt-2">
                <strong>Erklärung der Werte:</strong><br/>
                • <strong>Environment "electron"</strong> = App läuft in Electron (Desktop-Version)<br/>
                • <strong>Storage Type "Electron Persistent"</strong> = Daten werden dauerhaft gespeichert<br/>
                • <strong>Electron API "✅ Verfügbar"</strong> = Verbindung zum Storage-System funktioniert<br/>
                • <strong>Performance</strong> = Durchschnittliche Zugriffszeit in Millisekunden
              </div>
            </div>

            {/* Storage System Info */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                System-Informationen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Environment:</span>
                  <span className="ml-2 font-mono">{storageDebug.environment || 'Loading...'}</span>
                </div>
                <div>
                  <span className="font-medium">Storage Type:</span>
                  <span className="ml-2 font-mono">
                    {storageDebug.electronReady ? 'Electron Persistent' : 
                     storageDebug.browserStorageAvailable ? 'Browser localStorage' : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Electron API:</span>
                  <span className="ml-2 font-mono">
                    {storageDebug.electronReady ? '✅ Verfügbar & Ready' : 
                     storageDebug.electronAvailable ? '🟡 Verfügbar (nicht ready)' : '❌ Nicht verfügbar'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Performance:</span>
                  <span className="ml-2 font-mono">
                    {storageDebug.performance?.averageReadTime ? 
                     `${storageDebug.performance.averageReadTime.toFixed(1)}ms (avg read)` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Browser Storage:</span>
                  <span className="ml-2 font-mono">
                    {storageDebug.browserStorageAvailable ? '✅ localStorage verfügbar' : '❌ localStorage nicht verfügbar'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Gespeicherte Schlüssel:</span>
                  <span className="ml-2 font-mono">{storageDebug.keyCount || 0} Schlüssel</span>
                </div>
              </div>
            </div>

            {/* GitHub Token Management */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub Token Hybrid Storage
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleLoadGitHubTokenFromHybrid} className="text-sm">
                    Token laden
                  </Button>
                  <Button variant="outline" onClick={handleSaveGitHubTokenToHybrid} className="text-sm">
                    Token speichern
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Testet das persistente Speichern und Laden des GitHub Tokens über das Hybrid Storage System.
                </p>
              </div>
            </div>

            {/* Storage Tests */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Storage System Tests
              </h3>
              <div className="space-y-3">
                <Button onClick={handleTestHybridStorage} className="w-full">
                  🧪 Hybrid Storage Funktionstest
                </Button>
                <p className="text-xs text-muted-foreground">
                  Führt einen kompletten Test des Storage Systems durch: Write → Read → Verify → Cleanup
                </p>
              </div>
            </div>

            {/* Test Results */}
            {storageTestResult && (
              <div className="border rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3">Test-Ergebnis</h3>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                  {storageTestResult}
                </div>
              </div>
            )}

            {/* Advanced Debug Info */}
            {storageDebug.keys && (
              <div className="border rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3">Gespeicherte Schlüssel</h3>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                  {storageDebug.keys.length > 0 ? (
                    <ul className="space-y-1">
                      {storageDebug.keys.map((key: string, index: number) => (
                        <li key={index}>• {key}</li>
                      ))}
                    </ul>
                  ) : (
                    'Keine Schlüssel gespeichert'
                  )}
                </div>
              </div>
            )}
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
      </Tabs>
      
      {/* Hinweis auf neue Gebindeverwaltung */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            📦 Gebindeverwaltung
          </CardTitle>
          <CardDescription className="text-blue-700">
            Die Verwaltung von Tanks, Fässern und anderen Behältern wurde in einen eigenen Hauptmenüpunkt verschoben.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/gebindeverwaltung">
            <Button className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Zur Gebindeverwaltung
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
