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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Upload, Trash2, Settings, Cloud, Smartphone, Github, Clock, CheckCircle, DatabaseBackup, CalendarClock } from "lucide-react";
import { getTankAutoSync } from "@/lib/tank-auto-sync";
import { getGithubToken, getGithubEnabled, setGithubConfig } from "@/lib/github-token";
import { getGoogleClientId, getGoogleClientSecret, isGoogleCalendarConnected, onGoogleCalendarConfigChanged } from "@/lib/google-calendar-token";
import { connectGoogleCalendar, disconnectGoogleCalendar } from "@/lib/google-calendar";
import { isElectron } from "@/lib/electron-bridge";
import { useToast } from "@/hooks/use-toast";
import * as BackupService from "@/lib/backup-service";
import type { FullBackup } from "@/lib/backup-service";
import { getFullDataSync, getPendingConflict, clearPendingConflict, markResolved } from "@/lib/full-data-sync";
import buildInfo from "@/build-info.json";


export default function EinstellungenPage() {
  // Hydration-Fix
  const [hydrated, setHydrated] = useState(false);
  React.useEffect(() => { setHydrated(true); }, []);
  
  // Lokaler Exportpfad - Ziel für XLSX-Exporte und Backups (Nutzer-Meldung
  // 01.10.2026: Es gab bislang ZWEI Orte, einen Speicherpfad zu setzen -
  // hier und zusätzlich ein eigener "Speicher-Einstellungen"-Dialog in der
  // Lagerverwaltung. Verwirrend, und funktional war nur Letzterer wirksam:
  // dieses Feld schrieb in den Schlüssel "dataPath", den schlicht niemand
  // auslas (useAppSettings(), der einzige Konsument, wird nirgends
  // verwendet) - tatsächlich benutzt wurde ausschließlich "exportPath" aus
  // dem Lagerverwaltungs-Dialog. Jetzt vereinheitlicht: dieses Feld ist die
  // einzige Stelle, liest/schreibt direkt "exportPath"; ein zuvor hier
  // eingegebener (aber nie wirksamer) "dataPath"-Wert wird einmalig als
  // Startwert übernommen, falls "exportPath" noch leer ist.
  const [exportPath, setExportPath] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('exportPath') || localStorage.getItem('dataPath');
      if (stored) return stored;
      // Standardpfad: %APPDATA%/MazerationsMeister. War bis Aufgabe 40 über
      // window.process?.env?.APPDATA gelesen - im echten Programm wegen
      // contextIsolation ohne Node-Zugriff im Renderer nie vorhanden, daher
      // über die Electron-Bridge (electronAPI.appDataDir aus preload.js).
      const appData = (window as any).electronAPI?.appDataDir || '';
      if (appData) return appData + '/MazerationsMeister';
    }
    return '';
  });
  const handleSaveExportPath = () => {
    localStorage.setItem('exportPath', exportPath);
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

  // Google Calendar (Nutzer-Anfrage 07.10.2026, Aufgabe 73)
  const [googleClientId, setGoogleClientId] = useState(() => getGoogleClientId());
  const [googleClientSecret, setGoogleClientSecret] = useState(() => getGoogleClientSecret());
  const [googleConnected, setGoogleConnected] = useState(() => isGoogleCalendarConnected());
  const [googleConnecting, setGoogleConnecting] = useState(false);

  React.useEffect(() => {
    return onGoogleCalendarConfigChanged(() => setGoogleConnected(isGoogleCalendarConnected()));
  }, []);

  const handleConnectGoogleCalendar = async () => {
    if (!googleClientId.trim() || !googleClientSecret.trim()) {
      toast({ title: 'Client-ID und Client-Secret erforderlich', variant: 'destructive' });
      return;
    }
    setGoogleConnecting(true);
    const result = await connectGoogleCalendar(googleClientId, googleClientSecret);
    setGoogleConnecting(false);
    if (result.ok) {
      setGoogleConnected(true);
      toast({ title: 'Google Calendar verbunden', description: 'Deine Termine erscheinen jetzt im Dashboard.' });
    } else {
      toast({ title: 'Verbindung fehlgeschlagen', description: result.error, variant: 'destructive' });
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    disconnectGoogleCalendar();
    setGoogleConnected(false);
    toast({ title: 'Google Calendar getrennt' });
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

  const handleLocalBackup = async () => {
    const filePath = await BackupService.saveBackupToFile();
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

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    // Sicherheitsnetz: den jetzigen (gleich überschriebenen) Stand vorher
    // noch lokal sichern - muss abgewartet werden, bevor irgendetwas
    // angewendet wird, sonst könnte applyFullBackup() die Daten schon
    // überschrieben haben, bevor die Sicherung sie ausliest.
    await BackupService.saveBackupToFile();
    BackupService.applyFullBackup(pendingRestore.backup);
    setPendingRestore(null);
    toast({
      title: 'Wiederhergestellt',
      description: 'Die App wird neu geladen, damit alle Seiten den neuen Datenstand übernehmen.',
    });
    setTimeout(() => window.location.reload(), 1200);
  };

  // Automatischer Abgleich mit GitHub (Fortsetzung von Aufgabe 39/40): Push
  // periodisch + vor dem Beenden ist unkritisch, Pull nur dann automatisch,
  // wenn lokal nachweislich nichts verloren gehen kann (siehe full-data-sync.ts).
  const [fullSyncEnabled, setFullSyncEnabled] = useState(false);
  const [fullSyncInterval, setFullSyncInterval] = useState(15);
  const [fullSyncStatus, setFullSyncStatus] = useState<{ enabled: boolean; interval: number; hasPendingConflict: boolean } | null>(null);
  const [conflictBackup, setConflictBackup] = useState<FullBackup | null>(null);

  React.useEffect(() => {
    if (!hydrated) return;
    const sync = getFullDataSync();
    const status = sync.getStatus();
    setFullSyncEnabled(status.enabled);
    setFullSyncInterval(status.interval);
    setFullSyncStatus(status);
    setConflictBackup(getPendingConflict());
  }, [hydrated]);

  const handleSaveFullSyncConfig = () => {
    const sync = getFullDataSync();
    sync.initialize({ enabled: fullSyncEnabled, interval: fullSyncInterval });
    setFullSyncStatus(sync.getStatus());
    toast({
      title: 'Auto-Sync gespeichert',
      description: fullSyncEnabled
        ? `Datenstand wird alle ${fullSyncInterval} Minuten automatisch mit GitHub abgeglichen.`
        : 'Automatischer Abgleich deaktiviert.',
    });
  };

  const handleManualFullSync = async () => {
    setGithubBackupBusy(true);
    await getFullDataSync().reconcileNow();
    setGithubBackupBusy(false);
    setFullSyncStatus(getFullDataSync().getStatus());
    setConflictBackup(getPendingConflict());
  };

  // Konflikt-Auflösung: an beiden Rechnern wurde seit dem letzten Abgleich
  // gearbeitet - kann nicht automatisch entschieden werden, ohne
  // möglicherweise echte Arbeit zu verlieren (siehe full-data-sync.ts).
  const handleKeepLocalOverConflict = async () => {
    const result = await BackupService.uploadBackupToGithub();
    if (result.ok) {
      markResolved(BackupService.collectFullBackup());
      setConflictBackup(null);
      toast({ title: 'Dieser Rechner behalten', description: 'Der lokale Stand wurde zu GitHub hochgeladen und gilt jetzt als aktuell.' });
    } else {
      toast({ title: 'Fehlgeschlagen', description: result.error, variant: 'destructive' });
    }
  };

  const handleTakeRemoteOverConflict = async () => {
    if (!conflictBackup) return;
    // Sicherheitsnetz wie beim manuellen Wiederherstellen: den jetzigen
    // Stand vorher noch lokal sichern, bevor er überschrieben wird.
    await BackupService.saveBackupToFile();
    BackupService.applyFullBackup(conflictBackup);
    markResolved(conflictBackup);
    toast({ title: 'Anderen Rechner übernommen', description: 'Die App wird neu geladen.' });
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="font-sans text-3xl md:text-4xl text-primary mb-4">Einstellungen</h1>
      <Tabs defaultValue="speicher" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="speicher">Speicherpfade</TabsTrigger>
          <TabsTrigger value="github">GitHub Integration</TabsTrigger>
          <TabsTrigger value="google-calendar">Google Calendar</TabsTrigger>
          <TabsTrigger value="kategorien">Kategorien</TabsTrigger>
          <TabsTrigger value="backup">Datensicherung</TabsTrigger>
        </TabsList>
        <TabsContent value="speicher">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-primary mt-6 mb-2">Lokaler Exportpfad</label>
            <Input type="text" value={exportPath} onChange={e => setExportPath(e.target.value)} placeholder="z.B. C:\\Users\\wolfg\\Desktop\\MazerationsMeister Exporte" />
            <Button className="mt-2" onClick={handleSaveExportPath}>Pfad speichern</Button>
            <div className="text-xs text-muted-foreground mt-1">Aktueller Pfad: <span className="font-mono">{hydrated ? (exportPath || '(nicht gesetzt, Arbeitsverzeichnis wird verwendet)') : '(nicht gesetzt)'}</span></div>
            <div className="text-xs text-muted-foreground mt-4">Hier landen XLSX-Exporte (Lagerübersicht, Lagerbestand) und lokale Backups.</div>
            
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
                        id="sync-interval" key={autoSyncInterval}
                        type="text" inputMode="numeric"
                        defaultValue={autoSyncInterval}
                        onBlur={e => setAutoSyncInterval(parseInt(e.target.value) || 15)}
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
        <TabsContent value="google-calendar">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-primary mb-4">Google Calendar</h2>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Persönlicher Kalender im Dashboard
              </h3>
              <p className="text-sm text-blue-700">
                Zeigt deine echten Google-Calendar-Termine im Dashboard an und erlaubt dort Anlegen,
                Ändern und Löschen. Nur im installierten Programm verfügbar (nicht im Browser), da der
                Verbindungsaufbau einen lokalen Server braucht.
              </p>
            </div>

            {!isElectron() && (
              <Alert className="mb-4">
                <AlertDescription>
                  Google-Calendar-Anbindung ist nur im installierten Programm verfügbar, nicht im Browser.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="google-client-id" className="text-sm font-medium text-primary">Client-ID</Label>
                <Input
                  id="google-client-id"
                  value={googleClientId}
                  onChange={e => setGoogleClientId(e.target.value)}
                  placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                  className="mt-1"
                  disabled={googleConnected}
                />
              </div>
              <div>
                <Label htmlFor="google-client-secret" className="text-sm font-medium text-primary">Client-Secret</Label>
                <Input
                  id="google-client-secret"
                  type="password"
                  value={googleClientSecret}
                  onChange={e => setGoogleClientSecret(e.target.value)}
                  placeholder="GOCSPX-..."
                  className="mt-1"
                  disabled={googleConnected}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Aus der Google Cloud Console: APIs &amp; Dienste → Anmeldedaten → OAuth-Client-ID (Typ „Desktop-App")
                </div>
              </div>

              <div className="flex gap-2">
                {googleConnected ? (
                  <Button variant="outline" onClick={handleDisconnectGoogleCalendar} className="flex items-center gap-2">
                    Trennen
                  </Button>
                ) : (
                  <Button onClick={handleConnectGoogleCalendar} disabled={googleConnecting || !isElectron()} className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    {googleConnecting ? 'Öffne Google-Anmeldung…' : 'Verbinden'}
                  </Button>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                <strong>Status:</strong><br />
                Verbindung: <span className="font-mono">{hydrated ? (googleConnected ? 'Verbunden' : 'Nicht verbunden') : 'Lade...'}</span>
              </div>

              {googleConnected && (
                <Alert>
                  <AlertDescription>
                    ✅ Google Calendar ist verbunden. Deine Termine erscheinen im Dashboard.
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
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleGithubBackup} disabled={githubBackupBusy} className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" /> Jetzt zu GitHub sichern
                      </Button>
                      <Button variant="outline" onClick={handleGithubRestore} disabled={githubBackupBusy} className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" /> Von GitHub laden
                      </Button>
                    </div>

                    <Separator />

                    {/* Automatischer Abgleich (Fortsetzung von Aufgabe 39/40):
                        Push ist unkritisch, Pull nur dann automatisch, wenn
                        lokal nachweislich nichts verloren gehen kann. */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="full-sync-enabled"
                          checked={fullSyncEnabled}
                          onChange={e => setFullSyncEnabled(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="full-sync-enabled" className="text-sm font-medium">
                          Automatisch synchronisieren
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lädt regelmäßig und beim Beenden der App automatisch hoch. Lädt einen neueren Stand vom
                        anderen Rechner automatisch herunter, aber nur solange hier seit dem letzten Abgleich
                        nichts verändert wurde - sonst erscheint unten eine Auflösungs-Abfrage statt eines
                        stillen Überschreibens.
                      </p>
                      {fullSyncEnabled && (
                        <div>
                          <Label htmlFor="full-sync-interval" className="text-sm">Intervall (Minuten)</Label>
                          <Input
                            id="full-sync-interval" key={fullSyncInterval}
                            type="text" inputMode="numeric"
                            defaultValue={fullSyncInterval}
                            onBlur={e => setFullSyncInterval(parseInt(e.target.value) || 15)}
                            className="mt-1 w-32"
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" onClick={handleSaveFullSyncConfig}>Speichern</Button>
                        <Button size="sm" variant="outline" onClick={handleManualFullSync} disabled={githubBackupBusy}>
                          Jetzt abgleichen
                        </Button>
                      </div>
                      {fullSyncStatus?.enabled && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" /> Aktiv, alle {fullSyncStatus.interval} Minuten
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {conflictBackup && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">Sync-Konflikt</CardTitle>
                  <CardDescription>
                    An diesem UND am anderen Rechner wurde seit dem letzten Abgleich gearbeitet. Bitte wählen, welcher
                    Stand gelten soll - die jeweils andere Seite wird dabei überschrieben.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleKeepLocalOverConflict}>Diesen Rechner behalten</Button>
                  <Button variant="destructive" onClick={handleTakeRemoteOverConflict}>Anderen Rechner übernehmen</Button>
                </CardContent>
              </Card>
            )}
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
      {/* Versionsanzeige (Nutzer-Anfrage 01.10.2026: "ich erhalte immer nur die
          0.1.0") - gerade bei mehreren Geräten/Rechnern im Einsatz nützlich,
          um nachzuvollziehen, welcher Stand gerade läuft. */}
      <p className="text-center text-xs text-muted-foreground mt-10">
        MazerationsMeister v{buildInfo.version} · Build {buildInfo.buildNumber} ({buildInfo.gitCommit}) ·{' '}
        {new Date(buildInfo.buildDate).toLocaleString('de-DE')}
      </p>
    </main>
  );
}
