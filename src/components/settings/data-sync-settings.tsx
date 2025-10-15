/**
 * Daten-Synchronisation UI-Komponente
 * Verwaltet Single-File Auto-Sync (app-data.json) zu GitHub
 * VERWENDET ZENTRALE GITHUB-CONFIG aus github-config.ts
 */

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Cloud, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Loader2,
  Info
} from "lucide-react";
import { getAppAutoSync } from "@/lib/app-auto-sync";
import { githubConfigManager } from "@/lib/github-config";
import type { SyncStatus, SyncConflict } from "@/types/app-data";

export function DataSyncSettings() {
  const [hydrated, setHydrated] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastSyncFrom, setLastSyncFrom] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
  } | null>(null);

  // GitHub Config kommt jetzt zentral aus githubConfigManager
  const [isGitHubConfigured, setIsGitHubConfigured] = useState(false);

  // Hydration-Fix
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Load Config und Status
  useEffect(() => {
    if (hydrated) {
      loadSyncInfo();
      checkGitHubConfig();
    }

    // Höre auf GitHub-Config-Updates
    const handleConfigUpdate = () => {
      checkGitHubConfig();
    };
    window.addEventListener('githubConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('githubConfigUpdated', handleConfigUpdate);
  }, [hydrated]);

  const checkGitHubConfig = () => {
    const config = githubConfigManager.getConfig();
    setIsGitHubConfigured(!!config?.token && !!config?.username && !!config?.repository);
  };

  const loadSyncInfo = async () => {
    try {
      const appSync = getAppAutoSync();
      const info = await appSync.getSyncInfo();
      const conflictList = await appSync.getConflicts();

      setSyncStatus(info.status);
      setLastSync(info.lastSync);
      setLastSyncFrom(info.lastSyncFrom);
      setAutoSyncEnabled(info.isEnabled);
      setSyncInterval(info.interval);
      setConflicts(conflictList);
      setIsSynced(info.lastSync !== null);
    } catch (error) {
      console.error('[DataSyncSettings] Fehler beim Laden:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Laden der Sync-Informationen'
      });
    }
  };

  // Erste Synchronisation (Upload/Download)
  const handleInitialSync = async (direction: 'upload' | 'download') => {
    // Hole GitHub-Config zentral
    const githubConfig = githubConfigManager.getConfig();
    
    if (!githubConfig?.token || !githubConfig?.username || !githubConfig?.repository) {
      setMessage({
        type: 'error',
        text: 'Bitte GitHub-Konfiguration im Tab "🔐 GitHub-Verbindung" vervollständigen'
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const appSync = getAppAutoSync();
      
      // Initialisiere mit Config (OHNE Auto-Sync zu starten!)
      const initialized = await appSync.initialize({
        enabled: false, // ← WICHTIG: Bei Initial-Sync KEIN Auto-Start!
        interval: syncInterval,
        githubToken: githubConfig.token,
        githubUsername: githubConfig.username,
        githubRepository: githubConfig.repository,
        branch: githubConfig.branch || 'pages-clean'
      });

      if (!initialized) {
        throw new Error('Auto-Sync Initialisierung fehlgeschlagen');
      }

      // Führe erste Sync durch
      const result = await appSync.performInitialSync(direction);

      if (result.success) {
        setIsSynced(true);
        setLastSync(new Date(result.timestamp));
        setSyncStatus('synced');
        
        const directionText = direction === 'upload' ? 'hochgeladen' : 'heruntergeladen';
        const sizeKB = (result.dataSize / 1024).toFixed(2);
        
        setMessage({
          type: 'success',
          text: `Erste Synchronisation erfolgreich ${directionText} (${sizeKB} KB in ${result.duration}ms)`
        });

        // Reload info
        await loadSyncInfo();
      } else {
        throw new Error(result.error || 'Synchronisation fehlgeschlagen');
      }
    } catch (error) {
      console.error('[DataSyncSettings] Erste Sync fehlgeschlagen:', error);
      setMessage({
        type: 'error',
        text: `Fehler: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-Sync aktivieren/deaktivieren
  const handleToggleAutoSync = async () => {
    // Hole GitHub-Config zentral
    const githubConfig = githubConfigManager.getConfig();
    
    if (!githubConfig?.token || !githubConfig?.username || !githubConfig?.repository) {
      setMessage({
        type: 'error',
        text: 'Bitte GitHub-Konfiguration im Tab "🔐 GitHub-Verbindung" vervollständigen'
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const appSync = getAppAutoSync();
      const newEnabled = !autoSyncEnabled;

      if (newEnabled) {
        // Aktiviere Auto-Sync
        const initialized = await appSync.initialize({
          enabled: true,
          interval: syncInterval,
          githubToken: githubConfig.token,
          githubUsername: githubConfig.username,
          githubRepository: githubConfig.repository,
          branch: githubConfig.branch || 'pages-clean'
        });

        if (initialized) {
          setAutoSyncEnabled(true);
          setMessage({
            type: 'success',
            text: `Auto-Sync aktiviert (alle ${syncInterval} Minuten)`
          });
        } else {
          throw new Error('Auto-Sync Aktivierung fehlgeschlagen');
        }
      } else {
        // Deaktiviere Auto-Sync
        appSync.stopAutoSync();
        setAutoSyncEnabled(false);
        setMessage({
          type: 'info',
          text: 'Auto-Sync deaktiviert'
        });
      }

      await loadSyncInfo();
    } catch (error) {
      console.error('[DataSyncSettings] Toggle Auto-Sync fehlgeschlagen:', error);
      setMessage({
        type: 'error',
        text: `Fehler: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manuelle Synchronisation
  const handleSyncNow = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const appSync = getAppAutoSync();
      const result = await appSync.syncNow();

      if (result.success) {
        setLastSync(new Date(result.timestamp));
        setSyncStatus('synced');
        setMessage({
          type: 'success',
          text: `Synchronisation erfolgreich (${result.duration}ms)`
        });
        await loadSyncInfo();
      } else {
        throw new Error(result.error || 'Synchronisation fehlgeschlagen');
      }
    } catch (error) {
      console.error('[DataSyncSettings] Manuelle Sync fehlgeschlagen:', error);
      setMessage({
        type: 'error',
        text: `Fehler: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Status Badge
  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Synchronisiert</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Synchronisiere...</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Fehler</Badge>;
      case 'conflict':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Konflikt</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Bereit</Badge>;
    }
  };

  if (!hydrated) {
    return <div>Lädt...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Intro */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Daten-Synchronisation:</strong> Alle App-Daten (Tanks, Inventar, Kalender, TODOs, Protokolle) 
          werden als <code className="text-xs bg-muted px-1 py-0.5 rounded">app-data.json</code> zu GitHub synchronisiert.
        </AlertDescription>
      </Alert>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* GitHub Config Hinweis - Config erfolgt zentral im Tab "🔐 GitHub-Verbindung" */}
      {!isGitHubConfigured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>GitHub-Konfiguration fehlt!</strong><br />
            Bitte konfigurieren Sie Ihre GitHub-Verbindung im Tab <strong>"🔐 GitHub-Verbindung"</strong>.
          </AlertDescription>
        </Alert>
      )}

      {/* Initial Sync - IMMER sichtbar für manuelle Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Manuelle Synchronisation</CardTitle>
          <CardDescription>
            {isSynced 
              ? "Synchronisation bereits aktiv - Du kannst jederzeit manuell synchronisieren"
              : "Wähle die Richtung für die erste Synchronisation"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSynced && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Achtung:</strong> Download überschreibt alle lokalen Daten!
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleInitialSync('upload')}
              disabled={isLoading || !isGitHubConfigured}
              className="h-24 flex flex-col gap-2"
            >
              <Upload className="w-8 h-8" />
              <div className="text-center">
                <div className="font-bold">Von diesem Rechner hochladen</div>
                <div className="text-xs opacity-80">Lokale Daten → GitHub</div>
                <div className="text-xs opacity-60">(für Rechner 1 / Büro)</div>
              </div>
            </Button>

            <Button
              onClick={() => handleInitialSync('download')}
              disabled={isLoading || !isGitHubConfigured}
              variant="outline"
              className="h-24 flex flex-col gap-2"
            >
              <Download className="w-8 h-8" />
              <div className="text-center">
                <div className="font-bold">Vom Server herunterladen</div>
                <div className="text-xs opacity-80">GitHub → Dieser Rechner</div>
                <div className="text-xs opacity-60">(für Rechner 2 / Home-Office)</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Automatische Synchronisation
          </CardTitle>
          <CardDescription>
            Auto-Sync synchronisiert alle {syncInterval} Minuten automatisch mit GitHub
          </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <div className="font-medium">Status</div>
                  <div className="text-sm text-muted-foreground">
                    {lastSync ? (
                      <>Letzter Sync: {lastSync.toLocaleString('de-DE')}</>
                    ) : (
                      <>Noch nicht synchronisiert</>
                    )}
                  </div>
                  {lastSyncFrom && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Von: {lastSyncFrom}
                    </div>
                  )}
                </div>
                <div>{getStatusBadge()}</div>
              </div>

              {/* Intervall */}
              <div className="space-y-2">
                <Label htmlFor="sync-interval">Synchronisations-Intervall</Label>
                <select
                  id="sync-interval"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="1">1 Minute</option>
                  <option value="5">5 Minuten</option>
                  <option value="15">15 Minuten</option>
                  <option value="30">30 Minuten</option>
                  <option value="60">60 Minuten</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleToggleAutoSync}
                  disabled={isLoading || !isGitHubConfigured}
                  className="flex-1"
                  variant={autoSyncEnabled ? 'destructive' : 'default'}
                >
                  {autoSyncEnabled ? 'Auto-Sync deaktivieren' : 'Auto-Sync aktivieren'}
                </Button>

                <Button
                  onClick={handleSyncNow}
                  disabled={isLoading || !autoSyncEnabled || !isGitHubConfigured}
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Jetzt synchronisieren
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conflicts (falls vorhanden) */}
          {conflicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Konflikte ({conflicts.length})
                </CardTitle>
                <CardDescription>
                  Synchronisations-Konflikte die automatisch aufgelöst wurden
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conflicts.slice(0, 5).map((conflict, idx) => (
                    <div key={idx} className="p-3 border rounded-lg text-sm">
                      <div className="font-medium">
                        {new Date(conflict.timestamp).toLocaleString('de-DE')}
                      </div>
                      <div className="text-muted-foreground mt-1">
                        Lokal: {conflict.localVersion.computerName} ({conflict.localVersion.lastUpdate})
                      </div>
                      <div className="text-muted-foreground">
                        Remote: {conflict.remoteVersion.computerName} ({conflict.remoteVersion.lastUpdate})
                      </div>
                      <Badge variant="outline" className="mt-2">
                        {conflict.resolution === 'local' && 'Lokale Version behalten'}
                        {conflict.resolution === 'remote' && 'Remote-Version übernommen'}
                        {conflict.resolution === 'merge' && 'Zusammengeführt'}
                        {conflict.resolution === 'pending' && 'Ausstehend'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

      {/* Info-Box: Workflow-Erklärung */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>💡 Workflow für 2 Rechner:</strong>
          <div className="mt-2 space-y-2 text-sm">
            <div>
              <strong>🖥️ Rechner 1 (Büro):</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Klicke "Von diesem Rechner hochladen"</li>
                <li>Aktiviere Auto-Sync (alle {syncInterval} Min.)</li>
                <li>Daten werden automatisch zu GitHub synchronisiert</li>
              </ul>
            </div>
            <div className="mt-2">
              <strong>🏠 Rechner 2 (Home-Office):</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Klicke "Vom Server herunterladen"</li>
                <li>Aktiviere Auto-Sync (alle {syncInterval} Min.)</li>
                <li>Daten werden automatisch von GitHub abgerufen</li>
              </ul>
            </div>
            <div className="mt-2 p-2 bg-muted rounded text-xs">
              <strong>🔄 Auto-Sync:</strong> Läuft alle {syncInterval} Minuten automatisch im Hintergrund. 
              Nutze "Jetzt synchronisieren" für sofortige manuelle Sync.
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Synchronisierte Daten */}
      <Alert variant="default">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>📦 Synchronisierte Daten:</strong>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1">
            <li>✅ Tanks & Container-Definitionen (50 Tanks)</li>
            <li>✅ Inventar & Lagerbestand (50 Items)</li>
            <li>🆕 Kalendereinträge</li>
            <li>🆕 TODO-Listen</li>
            <li>🆕 Mazerations-Protokolle</li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            <strong>🔒 Sicherheit:</strong> GitHub Token wird NICHT synchronisiert (bleibt lokal auf jedem Rechner).
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}