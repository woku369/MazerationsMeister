/**
 * GitHub Auto-Sync Hook
 * Automatische Synchronisation von Tank-Daten zu GitHub bei Änderungen
 */

import { GitHubService, TankDataGitHubSync } from './github-service';

// GitHub-Konfiguration (Token muss vom User konfiguriert werden)
const GITHUB_CONFIG = {
  username: 'woku369',
  repository: 'MazerationsMeister',
  token: '', // Wird über Einstellungen konfiguriert
  branch: 'main'
};

// Singleton für GitHub-Service
let githubService: GitHubService | null = null;
let tankDataSync: TankDataGitHubSync | null = null;

/**
 * Initialisiert den GitHub-Service mit Token
 */
export function initializeGitHubSync(token: string): boolean {
  try {
    githubService = new GitHubService({
      ...GITHUB_CONFIG,
      token
    });
    tankDataSync = new TankDataGitHubSync(githubService);
    
    console.log('✅ GitHub-Sync initialisiert für:', GITHUB_CONFIG.username + '/' + GITHUB_CONFIG.repository);
    return true;
  } catch (error) {
    console.error('❌ GitHub-Sync Initialisierung fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Prüft, ob GitHub-Sync konfiguriert ist
 */
export function isGitHubSyncEnabled(): boolean {
  return githubService !== null && tankDataSync !== null;
}

/**
 * Testet die GitHub-Verbindung
 */
export async function testGitHubConnection(): Promise<boolean> {
  if (!githubService) {
    console.warn('GitHub-Service nicht initialisiert');
    return false;
  }
  
  return await githubService.testConnection();
}

/**
 * Synchronisiert Tank-Daten automatisch zu GitHub
 * Wird bei jeder Datenänderung aufgerufen
 */
export async function autoSyncTankData(): Promise<boolean> {
  if (!isGitHubSyncEnabled()) {
    console.log('ℹ️ GitHub-Sync nicht aktiviert, überspringe Auto-Sync');
    return false;
  }

  try {
    // Lade aktuelle Daten aus localStorage
    const tanks = JSON.parse(localStorage.getItem('tanks') || '[]');
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');

    if (tanks.length === 0) {
      console.log('ℹ️ Keine Tank-Daten zum Synchronisieren vorhanden');
      return false;
    }

    console.log('🔄 Starte automatische GitHub-Synchronisation...');
    const success = await tankDataSync!.syncTankData(tanks, inventory);
    
    if (success) {
      console.log('✅ Automatische GitHub-Synchronisation erfolgreich');
      
      // Speichere Zeitstempel der letzten Sync
      localStorage.setItem('lastGitHubSync', new Date().toISOString());
    } else {
      console.error('❌ Automatische GitHub-Synchronisation fehlgeschlagen');
    }

    return success;

  } catch (error) {
    console.error('❌ Auto-Sync Fehler:', error);
    return false;
  }
}

/**
 * Generiert GitHub Pages URL für einen Tank
 */
export function getGitHubTankUrl(tankId: string): string | null {
  if (!tankDataSync) {
    return null;
  }
  
  return tankDataSync.getTankUrl(tankId);
}

/**
 * Holt den Zeitstempel der letzten Synchronisation
 */
export function getLastSyncTime(): Date | null {
  const lastSync = localStorage.getItem('lastGitHubSync');
  return lastSync ? new Date(lastSync) : null;
}

/**
 * Hook für localStorage-Änderungen (automatische Synchronisation)
 */
class LocalStorageWatcher {
  private originalSetItem: typeof localStorage.setItem;
  private syncTimeout: any = null; // Changed from NodeJS.Timeout to any

  constructor() {
    this.originalSetItem = localStorage.setItem.bind(localStorage);
    this.setupWatcher();
  }

  private setupWatcher() {
    // Überschreibe localStorage.setItem
    localStorage.setItem = (key: string, value: string) => {
      // Führe ursprüngliche Funktion aus
      this.originalSetItem(key, value);
      
      // Prüfe, ob es relevante Daten sind
      if (key === 'tanks' || key === 'inventory') {
        this.scheduleSync();
      }
    };
  }

  private scheduleSync() {
    // Debounce: Warte 2 Sekunden nach der letzten Änderung
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(async () => {
      if (isGitHubSyncEnabled()) {
        console.log('🔄 Datenänderung erkannt, starte Auto-Sync...');
        await autoSyncTankData();
      }
    }, 2000);
  }

  restore() {
    localStorage.setItem = this.originalSetItem;
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
  }
}

// Auto-Watcher für Browser/Electron-Umgebung
let storageWatcher: LocalStorageWatcher | null = null;

/**
 * Startet automatische Überwachung von localStorage-Änderungen
 */
export function startAutoSync() {
  // Temporarily disabled for build issues
  console.log('🎯 Auto-Sync Watcher would start here (temporarily disabled)');
  /*
  if (typeof window !== 'undefined' && !storageWatcher) {
    storageWatcher = new LocalStorageWatcher();
    console.log('🎯 Auto-Sync Watcher gestartet');
  }
  */
}

/**
 * Stoppt automatische Überwachung
 */
export function stopAutoSync() {
  if (storageWatcher) {
    storageWatcher.restore();
    storageWatcher = null;
    console.log('⏹️ Auto-Sync Watcher gestoppt');
  }
}

// GitHub-Service Funktionen für Tank-Management
export {
  GitHubService,
  TankDataGitHubSync
} from './github-service';