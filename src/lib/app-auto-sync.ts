/**
 * APP AUTO-SYNC - Erweiterte Version von tank-auto-sync.ts
 * Synchronisiert ALLE App-Daten (Tanks, Inventar, Kalender, TODOs, Protokolle)
 * als Single-File zu GitHub: docs/app-data.json
 * 
 * Features:
 * - Single-File Sync (eine JSON-Datei für alles)
 * - Erste Synchronisation (Upload/Download)
 * - Automatische Synchronisation (konfigurierbar)
 * - Conflict-Detection und Resolution
 * - Basiert auf bewährter tank-auto-sync Infrastruktur
 */

import { GitHubService } from './github-service';
import { hybridStorage } from './hybrid-storage';
import type {
  AppData,
  CalendarEvent,
  TodoItem,
  MazerationProtocol,
  SyncResult,
  SyncStatus,
  SyncConflict
} from '@/types/app-data';

export interface AutoSyncConfig {
  enabled: boolean;
  interval: number; // Minuten (z.B. 60)
  githubToken: string;
  githubUsername: string;
  githubRepository: string;
  branch: string; // 'pages-clean'
}

export class AppAutoSync {
  private config: AutoSyncConfig | null = null;
  private githubService: GitHubService | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSync: Date | null = null;
  private isSyncing: boolean = false; // MUTEX für parallele Syncs (Upload/Download/Auto-Sync)
  private syncStatus: SyncStatus = 'idle';

  constructor() {
    this.loadConfig();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Lädt gespeicherte Konfiguration
   * WICHTIG: Startet NICHT automatisch - nur Config laden!
   */
  private async loadConfig(): Promise<void> {
    try {
      const savedConfig = await hybridStorage.get('appAutoSyncConfig');
      if (savedConfig) {
        this.config = savedConfig;
        console.log('[AppAutoSync] 📋 Config geladen (Auto-Start deaktiviert)');
        
        // KEIN Auto-Start mehr! User muss explizit aktivieren.
        // Auto-Start würde beim App-Start ungewollt synchronisieren.
      }
    } catch (error) {
      console.error('[AppAutoSync] Config laden fehlgeschlagen:', error);
    }
  }

  /**
   * Initialisiert Auto-Sync mit Konfiguration
   */
  async initialize(config: AutoSyncConfig): Promise<boolean> {
    try {
      this.config = {
        ...config,
        branch: 'pages-clean' // Erzwinge pages-clean Branch
      };
      
      // Speichere Konfiguration
      await hybridStorage.set('appAutoSyncConfig', this.config);

      // GitHub Service IMMER initialisieren (für Upload/Download)
      if (config.githubToken) {
        this.githubService = new GitHubService({
          username: config.githubUsername,
          repository: config.githubRepository,
          token: config.githubToken,
          branch: 'pages-clean'
        });

        // Test GitHub Verbindung
        const connectionOk = await this.githubService.testConnection();
        if (!connectionOk) {
          console.error('[AppAutoSync] ❌ GitHub Verbindung fehlgeschlagen');
          this.syncStatus = 'error';
          return false;
        }

        console.log('[AppAutoSync] ✅ GitHub Service initialisiert');

        // Auto-Sync nur starten wenn enabled
        if (config.enabled) {
          this.startAutoSync();
          console.log(`[AppAutoSync] ✅ Auto-Sync aktiviert (alle ${config.interval} Minuten)`);
        } else {
          console.log('[AppAutoSync] ℹ️ Auto-Sync deaktiviert (nur manuelle Sync)');
        }
        
        return true;
      }

      return true;
    } catch (error) {
      console.error('[AppAutoSync] ❌ Initialisierung fehlgeschlagen:', error);
      this.syncStatus = 'error';
      return false;
    }
  }

  // ==========================================================================
  // INITIAL SYNC (Erste Synchronisation)
  // ==========================================================================

  /**
   * Erste Synchronisation - Manuell vom User getriggert
   * @param direction 'upload' = Rechner 1 (lokale Daten → GitHub)
   *                  'download' = Rechner 2 (GitHub → lokale Daten)
   */
  async performInitialSync(direction: 'upload' | 'download'): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[AppAutoSync] ⏳ Sync bereits aktiv, bitte warten...');
      return {
        success: false,
        direction,
        timestamp: new Date().toISOString(),
        dataSize: 0,
        duration: 0,
        error: 'Sync bereits aktiv'
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    
    try {
      if (!this.githubService) {
        throw new Error('GitHub Service nicht initialisiert');
      }

      if (direction === 'upload') {
        // Rechner 1: Lokale Daten → GitHub
        console.log('[AppAutoSync] 📤 Erste Synchronisation: Upload');
        
        const appData = await this.collectLocalData();
        await this.uploadToGitHub(appData);
        
        // Speichere Sync-Info
        await hybridStorage.set('lastAppSync', new Date().toISOString());
        await hybridStorage.set('lastSyncDirection', 'upload');
        
        this.lastSync = new Date();
        this.syncStatus = 'synced';
        
        console.log('[AppAutoSync] ✅ Erste Synchronisation abgeschlossen (Upload)');
        
        return {
          success: true,
          direction: 'upload',
          timestamp: new Date().toISOString(),
          dataSize: JSON.stringify(appData).length,
          duration: Date.now() - startTime
        };
        
      } else {
        // Rechner 2: GitHub → Lokale Daten
        console.log('[AppAutoSync] 📥 Erste Synchronisation: Download');
        
        const appData = await this.downloadFromGitHub();
        await this.saveLocalData(appData);
        
        // Speichere Sync-Info
        await hybridStorage.set('lastAppSync', new Date().toISOString());
        await hybridStorage.set('lastSyncDirection', 'download');
        await hybridStorage.set('lastSyncFrom', appData.computerName);
        
        this.lastSync = new Date();
        this.syncStatus = 'synced';
        
        console.log('[AppAutoSync] ✅ Erste Synchronisation abgeschlossen (Download)');
        
        return {
          success: true,
          direction: 'download',
          timestamp: new Date().toISOString(),
          dataSize: JSON.stringify(appData).length,
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error('[AppAutoSync] ❌ Erste Synchronisation fehlgeschlagen:', error);
      this.syncStatus = 'error';
      
      return {
        success: false,
        direction,
        timestamp: new Date().toISOString(),
        dataSize: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // ==========================================================================
  // DATA COLLECTION
  // ==========================================================================

  /**
   * Sammelt alle lokalen Daten für Upload
   */
  private async collectLocalData(): Promise<AppData> {
    console.log('[AppAutoSync] 📦 Sammle lokale Daten...');
    
    const [
      tanksRaw,
      inventoryRaw,
      calendarRaw,
      todosRaw,
      protocolsRaw,
      rezepturenRaw,
      settingsRaw
    ] = await Promise.all([
      hybridStorage.get('tankDefinitions'),
      hybridStorage.get('inventoryItems'),
      hybridStorage.get('calendarEvents'),
      hybridStorage.get('todos'),
      hybridStorage.get('mazerationProtocols'),
      hybridStorage.get('rezepturen'),
      hybridStorage.get('appSettings')
    ]);

    // Sichere Fallback-Werte
    const tanks = tanksRaw || [];
    const inventory = inventoryRaw || [];
    const calendar = calendarRaw || [];
    const todos = todosRaw || [];
    const protocols = protocolsRaw || [];
    const rezepturen = rezepturenRaw || [];
    const settings = settingsRaw || {};

    const appData: AppData = {
      version: '1.0.0',
      lastUpdate: new Date().toISOString(),
      computerName: this.getComputerName(),
      userName: this.getUserName(),
      tanks,
      inventory,
      calendar,
      todos,
      mazerationProtocols: protocols,
      rezepturen,
      settings: {
        ...settings,
        autoSync: {
          enabled: this.config?.enabled || false,
          interval: this.config?.interval || 60,
          lastSync: this.lastSync?.toISOString()
        }
      }
    };

    console.log('[AppAutoSync] ✅ Daten gesammelt:', {
      tanks: tanks.length,
      inventory: inventory.length,
      calendar: calendar.length,
      todos: todos.length,
      protocols: protocols.length,
      rezepturen: rezepturen.length
    });

    return appData;
  }

  // ==========================================================================
  // GITHUB OPERATIONS
  // ==========================================================================

  /**
   * Upload zu GitHub (Single File: docs/app-data.json)
   */
  private async uploadToGitHub(appData: AppData): Promise<void> {
    if (!this.githubService) {
      throw new Error('GitHub Service nicht initialisiert');
    }

    console.log('[AppAutoSync] 📤 Upload zu GitHub...');

    const content = JSON.stringify(appData, null, 2);
    const sizeKB = (content.length / 1024).toFixed(2);
    
    try {
      // Upload als Single File
      await this.githubService.uploadFile({
        path: 'docs/app-data.json',
        content: content,
        message: `Auto-Sync: ${appData.computerName} @ ${new Date().toLocaleTimeString('de-DE')}`
      });

      console.log(`[AppAutoSync] ✅ Upload erfolgreich (${sizeKB} KB)`);
    } catch (error) {
      console.error('[AppAutoSync] ❌ Upload fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Download von GitHub (via API statt Raw URL - Firewall-kompatibel)
   */
  private async downloadFromGitHub(): Promise<AppData> {
    if (!this.githubService || !this.config) {
      throw new Error('GitHub Service nicht initialisiert');
    }

    console.log('[AppAutoSync] 📥 Download von GitHub...');

    // WICHTIG: Verwende GitHub API statt raw.githubusercontent.com (Firewall-freundlich!)
    const apiUrl = `https://api.github.com/repos/${this.config.githubUsername}/${this.config.githubRepository}/contents/docs/app-data.json?ref=pages-clean`;
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${this.config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub Download fehlgeschlagen: ${response.status} ${response.statusText}`);
      }

      const fileData = await response.json();
      
      // GitHub API gibt Base64-encodierten Content zurück
      const decodedContent = typeof window !== 'undefined' && typeof atob !== 'undefined'
        ? decodeURIComponent(escape(atob(fileData.content)))
        : typeof Buffer !== 'undefined'
          ? Buffer.from(fileData.content, 'base64').toString('utf-8')
          : atob(fileData.content);
      
      const appData: AppData = JSON.parse(decodedContent);
      
      console.log('[AppAutoSync] ✅ Download erfolgreich:', {
        from: appData.computerName,
        lastUpdate: appData.lastUpdate,
        tanks: appData.tanks?.length || 0,
        calendar: appData.calendar?.length || 0
      });

      return appData;
    } catch (error) {
      console.error('[AppAutoSync] ❌ Download fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Speichert heruntergeladene Daten lokal
   */
  private async saveLocalData(appData: AppData): Promise<void> {
    console.log('[AppAutoSync] 💾 Speichere Daten lokal...');

    await Promise.all([
      hybridStorage.set('tankDefinitions', appData.tanks || []),
      hybridStorage.set('inventoryItems', appData.inventory || []),
      hybridStorage.set('calendarEvents', appData.calendar || []),
      hybridStorage.set('todos', appData.todos || []),
      hybridStorage.set('mazerationProtocols', appData.mazerationProtocols || []),
      hybridStorage.set('rezepturen', appData.rezepturen || []),
      hybridStorage.set('appSettings', appData.settings || {}),
      hybridStorage.set('lastSyncFrom', appData.computerName),
      hybridStorage.set('lastSyncTimestamp', appData.lastUpdate)
    ]);

    console.log('[AppAutoSync] ✅ Daten gespeichert');
  }

  // ==========================================================================
  // AUTO SYNC
  // ==========================================================================

  /**
   * Startet automatische Synchronisation
   */
  private startAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    if (!this.config?.enabled || !this.githubService) return;

    // Sofort synchronisieren
    this.performSync();

    // Dann regelmäßig (Intervall in Millisekunden)
    const intervalMs = this.config.interval * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.performSync();
    }, intervalMs);

    console.log(`[AppAutoSync] ✅ Auto-Sync gestartet (alle ${this.config.interval} Min.)`);
  }

  /**
   * Synchronisation durchführen (Upload + Conflict Check)
   */
  private async performSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[AppAutoSync] ⏳ Sync bereits aktiv, überspringe...');
      return;
    }

    this.isSyncing = true;
    this.syncStatus = 'syncing';

    try {
      // 1. Lokale Daten sammeln
      const localData = await this.collectLocalData();

      // 2. Remote-Daten holen (für Conflict-Check)
      let remoteData: AppData | null = null;
      try {
        remoteData = await this.downloadFromGitHub();
      } catch {
        // Erste Sync, keine Remote-Daten vorhanden
        console.log('[AppAutoSync] ℹ️ Keine Remote-Daten, erstelle Initial-Sync');
      }

      // 3. Conflict-Detection
      if (remoteData && this.hasConflict(localData, remoteData)) {
        console.warn('[AppAutoSync] ⚠️ Konflikt erkannt!');
        this.syncStatus = 'conflict';
        
        const conflict: SyncConflict = {
          timestamp: new Date().toISOString(),
          localVersion: {
            computerName: localData.computerName,
            lastUpdate: localData.lastUpdate
          },
          remoteVersion: {
            computerName: remoteData.computerName,
            lastUpdate: remoteData.lastUpdate
          },
          resolution: 'pending'
        };
        
        // Speichere Konflikt für UI
        await this.saveConflict(conflict);
        
        // Auto-Resolve: Last-Write-Wins
        await this.handleConflict(localData, remoteData);
      } else {
        // 4. Kein Konflikt → Upload
        await this.uploadToGitHub(localData);
        this.lastSync = new Date();
        this.syncStatus = 'synced';
        
        await hybridStorage.set('lastAppSync', this.lastSync.toISOString());
        
        console.log(`[AppAutoSync] ✅ Sync erfolgreich: ${this.lastSync.toLocaleTimeString('de-DE')}`);
      }

    } catch (error) {
      console.error('[AppAutoSync] ❌ Sync fehlgeschlagen:', error);
      this.syncStatus = 'error';
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Stoppt automatische Synchronisation
   */
  stopAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.syncStatus = 'idle';
      console.log('[AppAutoSync] ⏸️ Auto-Sync gestoppt');
    }
  }

  /**
   * Manuelle Synchronisation (User-triggered)
   */
  async syncNow(): Promise<SyncResult> {
    // MUTEX CHECK: Verhindere parallele Syncs
    if (this.isSyncing) {
      console.log('[AppAutoSync] ⏳ Sync bereits aktiv, bitte warten...');
      return {
        success: false,
        direction: 'upload',
        timestamp: new Date().toISOString(),
        dataSize: 0,
        duration: 0,
        error: 'Sync bereits aktiv'
      };
    }
    
    console.log('[AppAutoSync] 🔄 Manuelle Synchronisation gestartet...');
    
    const startTime = Date.now();
    
    try {
      await this.performSync();
      
      return {
        success: this.syncStatus === 'synced',
        direction: 'upload',
        timestamp: new Date().toISOString(),
        dataSize: 0, // TODO: Calculate
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        direction: 'upload',
        timestamp: new Date().toISOString(),
        dataSize: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ==========================================================================
  // CONFLICT HANDLING
  // ==========================================================================

  /**
   * Prüft ob Konflikt vorliegt
   */
  private hasConflict(local: AppData, remote: AppData): boolean {
    // Kein Konflikt wenn vom gleichen Rechner
    if (remote.computerName === local.computerName) {
      return false;
    }

    // Konflikt wenn Remote neuer als letzter Sync
    const localTime = new Date(local.lastUpdate).getTime();
    const remoteTime = new Date(remote.lastUpdate).getTime();
    const lastSyncTime = this.lastSync?.getTime() || 0;

    return remoteTime > lastSyncTime && remoteTime > localTime;
  }

  /**
   * Behandelt Konflikt (Last-Write-Wins)
   */
  private async handleConflict(local: AppData, remote: AppData): Promise<void> {
    console.warn('[AppAutoSync] ⚠️ Konflikt-Resolution: Last-Write-Wins');

    const localTime = new Date(local.lastUpdate).getTime();
    const remoteTime = new Date(remote.lastUpdate).getTime();

    if (remoteTime > localTime) {
      // Remote ist neuer → Überschreibe lokale Daten
      console.log('[AppAutoSync] 📥 Remote-Daten sind neuer, übernehme...');
      await this.saveLocalData(remote);
      this.lastSync = new Date(remote.lastUpdate);
      this.syncStatus = 'synced';
      
      // Benachrichtige User
      this.notifyUser({
        type: 'warning',
        title: 'Daten synchronisiert',
        message: `Neuere Daten von ${remote.computerName} wurden übernommen.`
      });
    } else {
      // Lokal ist neuer → Upload
      console.log('[AppAutoSync] 📤 Lokale Daten sind neuer, lade hoch...');
      await this.uploadToGitHub(local);
      this.lastSync = new Date();
      this.syncStatus = 'synced';
    }
  }

  /**
   * Speichert Konflikt für UI-Anzeige
   */
  private async saveConflict(conflict: SyncConflict): Promise<void> {
    const conflicts = (await hybridStorage.get('syncConflicts')) || [];
    conflicts.push(conflict);
    
    // Nur letzte 10 Konflikte behalten
    if (conflicts.length > 10) {
      conflicts.shift();
    }
    
    await hybridStorage.set('syncConflicts', conflicts);
  }

  // ==========================================================================
  // GETTERS & STATUS
  // ==========================================================================

  /**
   * Gibt aktuellen Sync-Status zurück
   */
  getStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Gibt Info über letzten Sync zurück
   */
  async getSyncInfo(): Promise<{
    lastSync: Date | null;
    lastSyncFrom: string | null;
    isEnabled: boolean;
    interval: number;
    status: SyncStatus;
  }> {
    const lastSyncFrom = await hybridStorage.get('lastSyncFrom');
    
    return {
      lastSync: this.lastSync,
      lastSyncFrom,
      isEnabled: this.config?.enabled || false,
      interval: this.config?.interval || 60,
      status: this.syncStatus
    };
  }

  /**
   * Gibt Konflikte zurück
   */
  async getConflicts(): Promise<SyncConflict[]> {
    return (await hybridStorage.get('syncConflicts')) || [];
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Holt Computer-Namen
   */
  private getComputerName(): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.COMPUTERNAME || process.env.HOSTNAME || 'unknown';
    }
    return 'browser';
  }

  /**
   * Holt User-Namen
   */
  private getUserName(): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.USERNAME || process.env.USER || 'unknown';
    }
    return 'unknown';
  }

  /**
   * User-Benachrichtigung
   */
  private notifyUser(notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }): void {
    // Electron Notification (falls verfügbar)
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.showNotification?.(notification);
    }
    
    // Browser Notification (Fallback)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon.ico'
      });
    }
  }

  /**
   * Public API für Rezepturen
   */
  
  /**
   * Lädt alle Daten (public wrapper)
   */
  public async getData(): Promise<AppData> {
    return await this.collectLocalData();
  }

  /**
   * Speichert alle Daten (public wrapper)
   */
  public async setData(data: AppData): Promise<void> {
    await this.saveLocalData(data);
  }
}

// Singleton-Instanz
let appAutoSyncInstance: AppAutoSync | null = null;

/**
 * Holt Singleton-Instanz
 */
export function getAppAutoSync(): AppAutoSync {
  if (!appAutoSyncInstance) {
    appAutoSyncInstance = new AppAutoSync();
  }
  return appAutoSyncInstance;
}

/**
 * Helper-Funktionen für Rezepturen
 */

/**
 * Lädt alle Rezepturen
 */
export async function ladeRezepturen(): Promise<any[]> {
  const sync = getAppAutoSync();
  const data = await sync.getData();
  return data.rezepturen || [];
}

/**
 * Speichert Rezepturen
 */
export async function speichereRezepturen(rezepturen: any[]): Promise<void> {
  const sync = getAppAutoSync();
  const data = await sync.getData();
  data.rezepturen = rezepturen;
  await sync.setData(data);
}

/**
 * Lädt alle Lagerbestände (Inventory Items)
 */
export async function ladeAlleLagerbestaende(): Promise<any[]> {
  const sync = getAppAutoSync();
  const data = await sync.getData();
  return data.inventory || [];
}

