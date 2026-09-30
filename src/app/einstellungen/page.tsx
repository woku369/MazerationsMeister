"use client";

import * as React from "react";
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TankManagement from '@/components/inventory/tank-management';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Upload, Trash2, Settings, Cloud, Smartphone, Github, Clock, CheckCircle, DatabaseBackup } from "lucide-react";
import { getTankAutoSync } from "@/lib/tank-auto-sync";
import { getGithubToken, getGithubEnabled, setGithubConfig } from "@/lib/github-token";
import { useToast } from "@/hooks/use-toast";
import * as BackupService from "@/lib/backup-service";
import type { FullBackup } from "@/lib/backup-service";


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

  // GitHub-Konfiguration
  const [githubToken, setGithubToken] = useState(() => getGithubToken());
  const [githubEnabled, setGithubEnabled] = useState(() => getGithubEnabled());

  const handleSaveGitHubConfig = async () => {
    setGithubConfig(githubToken, githubEnabled);

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
  };

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

  // Datensicherung & mehrere Rechner (Nutzer-Anfrage 30.09.2026)
  const { toast } = useToast();
  const restoreFileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<{ backup: FullBackup; quelle: string } | null>(null);
  const [githubBackupBusy, setGithubBackupBusy] = useState(false);

  const handleLocalBackup = () => {
    const filePath = BackupService.saveBackupToFile();
    toast({
      title: 'Backup gespeichert',
      description: filePath ? `Gespeichert unter: ${filePath}` : 'Die Datei wurde als Download angeboten.',
    });
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const backup = BackupService.parseBackupFile(content);
      setPendingRestore({ backup, quelle: `Datei "${file.name}"` });
    } catch (err) {
      toast({
        title: 'Datei ungültig',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler beim Lesen der Datei.',
        variant: 'destructive',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleGithubBackup = async () => {
    setGithubBackupBusy(true);
    const result = await BackupService.uploadBackupToGithub();
    setGithubBackupBusy(false);
    if (result.ok) {
      toast({
        title: 'Zu GitHub gesichert',
        description: 'Der aktuelle Datenstand ist jetzt auf GitHub verfügbar und kann am anderen Rechner geladen werden.',
      });
    } else {
      toast({ title: 'Sicherung fehlgeschlagen', description: result.error, variant: 'destructive' });
    }
  };

  const handleGithubRestore = async () => {
    setGithubBackupBusy(true);
    const result = await BackupService.fetchBackupFromGithub();
    setGithubBackupBusy(false);
    if (result.ok) {
      setPendingRestore({ backup: result.backup, quelle: 'GitHub' });
    } else {
      toast({ title: 'Laden fehlgeschlagen', description: result.error, variant: 'destructive' });
    }
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    // Sicherheitsnetz: den jetzigen (gleich überschriebenen) Stand vorher
    // noch lokal sichern, bevor irgendetwas angewendet wird.
    BackupService.saveBackupToFile();
    BackupService.applyFullBackup(pendingRestore.backup);
    setPendingRestore(null);
    toast({
      title: 'Wiederhergestellt',
      description: 'Die App wird neu geladen, damit alle Seiten den neuen Datenstand übernehmen.',
    });
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="font-sans text-3xl md:text-4xl text-primary mb-4">Einstellungen</h1>
      <Tabs defaultValue="speicher" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="speicher">Speicherpfade</TabsTrigger>
          <TabsTrigger value="github">GitHub Integration</TabsTrigger>
          <TabsTrigger value="kategorien">Kategorien</TabsTrigger>
          <TabsTrigger value="tank">QR-Codes</TabsTrigger>
          <TabsTrigger value="backup">Datensicherung</TabsTrigger>
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

              {githubEnabled && (
                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Automatische Tank-Daten Synchronisation
                  </h4>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto-sync-enabled"
                      checked={autoSyncEnabled}
                      onChange={e => setAutoSyncEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="auto-sync-enabled" className="text-sm">
                      Auto-Sync aktivieren
                    </Label>
                  </div>

                  {autoSyncEnabled && (
                    <div>
                      <Label htmlFor="sync-interval" className="text-sm font-medium">
                        Sync-Intervall (Minuten)
                      </Label>
                      <Input
                        id="sync-interval"
                        type="number"
                        min="5"
                        max="1440"
                        value={autoSyncInterval}
                        onChange={e => setAutoSyncInterval(parseInt(e.target.value) || 15)}
                        className="mt-1 w-32"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Tank-Daten werden alle {autoSyncInterval} Minuten zu GitHub hochgeladen
                      </div>
                    </div>
                  )}

                  {autoSyncStatus && (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        {autoSyncStatus.enabled ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="font-semibold">Status:</span>
                        <span>{autoSyncStatus.enabled ? 'Aktiv' : 'Inaktiv'}</span>
                      </div>
                      {autoSyncStatus.lastSync && (
                        <div>
                          <span className="font-semibold">Letzte Sync:</span> {autoSyncStatus.lastSync.toLocaleString()}
                        </div>
                      )}
                      {autoSyncStatus.nextSync && (
                        <div>
                          <span className="font-semibold">Nächste Sync:</span> {autoSyncStatus.nextSync.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleSaveGitHubConfig} className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub-Konfiguration speichern
                </Button>
                
                {githubEnabled && githubToken && (
                  <Button variant="outline" onClick={handleManualSync} className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Jetzt synchronisieren
                  </Button>
                )}
              </div>
              
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
        <TabsContent value="backup">
          <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-semibold text-primary mb-2">Datensicherung &amp; mehrere Rechner</h2>
            <p className="text-sm text-muted-foreground">
              Sichert Artikelstamm, Lagerbestand, Buchungsjournal, Tank-Definitionen, Mazerationsprotokolle,
              Rezepturen, Lohnbrand-Aufträge und Versand-Historie in einer Datei. Damit lässt sich der Datenstand
              nach einer Neuinstallation wiederherstellen oder zwischen zwei Rechnern (z.B. Heimrechner und Büro)
              übertragen. GitHub-Token, Speicherpfade und sonstige Einstellungen sind bewusst nicht enthalten -
              die sind je Rechner unterschiedlich und werden nicht mitübertragen.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><DatabaseBackup className="h-5 w-5" /> Lokale Datei</CardTitle>
                <CardDescription>Für die Sicherung nach einer Neuinstallation, unabhängig von GitHub.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button onClick={handleLocalBackup} className="flex items-center gap-2">
                  <Download className="h-4 w-4" /> Backup jetzt speichern
                </Button>
                <input
                  type="file"
                  accept=".json"
                  ref={restoreFileInputRef}
                  onChange={handleRestoreFileSelected}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => restoreFileInputRef.current?.click()} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Aus Datei wiederherstellen
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Cloud className="h-5 w-5" /> Über GitHub (für mehrere Rechner)</CardTitle>
                <CardDescription>Am Heimrechner sichern, am Bürorechner laden - oder umgekehrt.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hydrated ? null : !githubEnabled || !githubToken ? (
                  <Alert>
                    <AlertDescription>
                      GitHub-Integration im Tab „GitHub Integration" zuerst aktivieren und Token hinterlegen.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleGithubBackup} disabled={githubBackupBusy} className="flex items-center gap-2">
                      <Cloud className="h-4 w-4" /> Jetzt zu GitHub sichern
                    </Button>
                    <Button variant="outline" onClick={handleGithubRestore} disabled={githubBackupBusy} className="flex items-center gap-2">
                      <Cloud className="h-4 w-4" /> Von GitHub laden
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Wiederherstellen-Bestätigung - überschreibt den lokalen Datenstand,
              deshalb immer mit Vorschau statt blind auszuführen. */}
          <Dialog open={!!pendingRestore} onOpenChange={(open) => { if (!open) setPendingRestore(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Backup wiederherstellen ({pendingRestore?.quelle})</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Der aktuelle Datenstand auf diesem Rechner wird überschrieben. Zur Sicherheit wird davor
                automatisch ein lokales Backup des jetzigen Stands gespeichert.
              </p>
              {pendingRestore && (
                <ul className="text-sm space-y-1 max-h-64 overflow-auto border rounded p-2">
                  {BackupService.summarizeBackup(pendingRestore.backup).map(s => (
                    <li key={s.key} className="flex justify-between gap-4">
                      <span>{BackupService.BACKUP_KEY_LABELS[s.key]}</span>
                      <span className="font-mono text-muted-foreground">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setPendingRestore(null)}>Abbrechen</Button>
                <Button variant="destructive" onClick={confirmRestore}>Überschreiben &amp; wiederherstellen</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </main>
  );
}
