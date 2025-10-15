/**
 * Automatische Tank-Daten Synchronisation zu GitHub Pages
 * HYBRID STORAGE VERSION - Lädt Tank-Daten automatisch bei Änderungen hoch
 */

import { GitHubService, TankDataGitHubSync } from './github-service';
import { hybridStorage } from './hybrid-storage';
import { TankDataMigration } from './tank-data-migration';
import { TankDebugUtility } from './tank-debug-utility';

export interface AutoSyncConfig {
  enabled: boolean;
  interval: number; // Minuten
  githubToken: string;
  githubUsername: string;
  githubRepository: string;
}

export class TankAutoSync {
  private config: AutoSyncConfig | null = null;
  private githubSync: TankDataGitHubSync | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSync: Date | null = null;
  private isUploading: boolean = false; // MUTEX für parallele Uploads

  constructor() {
    this.loadConfig();
  }

  /**
   * Initialisiert Auto-Sync mit Konfiguration
   */
  async initialize(config: AutoSyncConfig): Promise<boolean> {
    try {
      this.config = config;
      // Speichere Konfiguration im Hybrid Storage
      // 🔧 MIGRATION: Erzwinge pages-clean Branch (fresh-main ist deprecated)
      const configWithCorrectBranch = {
        ...config,
        branch: 'pages-clean'
      };
      await hybridStorage.set('autoSyncConfig', configWithCorrectBranch);

      if (config.enabled && config.githubToken) {
        const githubService = new GitHubService({
          username: config.githubUsername,
          repository: config.githubRepository,
          token: config.githubToken,
          branch: 'pages-clean'
        });

        // Test GitHub Verbindung
        const connectionOk = await githubService.testConnection();
        if (!connectionOk) {
          console.error('❌ GitHub Verbindung fehlgeschlagen');
          return false;
        }

        this.githubSync = new TankDataGitHubSync(githubService);

        // Starte periodische Synchronisation
        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => {
          this.syncNow();
        }, config.interval * 60 * 1000); // Minuten zu Millisekunden

        console.log(`✅ Tank Auto-Sync aktiviert (alle ${config.interval} Minuten)`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Fehler bei Auto-Sync Initialisierung:', error);
      return false;
    }
  }

  /**
   * Synchronisiert Tank-Daten sofort mit Hybrid Storage Support
   */
  async syncNow(): Promise<boolean> {
    if (!this.config?.enabled || !this.githubSync) {
      console.log('ℹ️ Auto-Sync nicht konfiguriert oder deaktiviert');
      return false;
    }

    // MUTEX: Verhindere parallele Uploads
    if (this.isUploading) {
      console.log('⏳ Upload bereits aktiv, warte auf Abschluss...');
      return false;
    }

    try {
      this.isUploading = true; // LOCK
      console.log('🔄 Starte manuelle Tank-Synchronisation...');

      // Verwende Migration Utility um Daten zu laden
      let tankData = await TankDataMigration.loadTankData();
      
      if (!tankData) {
        console.warn('⚠️ Keine Tank-Daten gefunden zum Synchronisieren');
        console.log('🔍 Debug: Starte vollständige Diagnose...');
        
        // Vollständige Diagnose und automatische Reparatur
        const diagnosis = await TankDebugUtility.diagnoseTankData();
        console.log('📊 Tank-Daten Diagnose:', diagnosis);
        
        // Versuche automatische Reparatur
        const repaired = await TankDebugUtility.autoFixTankData();
        if (repaired) {
          console.log('✅ Tank-Daten wurden repariert, versuche erneut zu laden...');
          tankData = await TankDataMigration.loadTankData();
        }
        
        if (!tankData) {
          console.error('❌ Auch nach Reparaturversuch keine Tank-Daten verfügbar');
          return false;
        }
      }

      const { tankDefinitions, inventoryItems } = tankData;
      
      console.log('✅ Tank-Daten geladen:', {
        tanks: tankDefinitions.length,
        inventory: inventoryItems.length
      });

      // Synchronisiere zu GitHub
      const result = await this.githubSync.syncTankData(
        tankDefinitions,
        inventoryItems
      );

      if (result.success) {
        this.lastSync = new Date();
        // Speichere LastSync im Hybrid Storage
        await hybridStorage.set('lastGitHubSync', this.lastSync.toISOString());
        if (result.backupUrl) {
          await hybridStorage.set('tank-backup-url', result.backupUrl);
          await hybridStorage.set('tank-auto-sync-status', 'active');
        }
        console.log(`✅ Tank-Daten erfolgreich synchronisiert: ${this.lastSync.toLocaleString()}`);
      }

      return result.success;

    } catch (error) {
      console.error('❌ Tank-Synchronisation fehlgeschlagen:', error);
      return false;
    } finally {
      this.isUploading = false; // UNLOCK
    }
  }

  /**
   * Lädt Konfiguration aus Hybrid Storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const config = await hybridStorage.get('autoSyncConfig');
      if (config) {
        this.config = config;
      }
      
      const lastSyncStr = await hybridStorage.get('lastGitHubSync');
      if (lastSyncStr) {
        this.lastSync = new Date(lastSyncStr);
      }

      if (this.config?.enabled) {
        console.log(`📡 Auto-Sync Konfiguration geladen (alle ${this.config.interval} Minuten)`);
      }
    } catch (error) {
      console.log('ℹ️ Keine Auto-Sync Konfiguration gefunden');
    }
  }

  /**
   * Holt aktuelle Backup-URL
   */
  async getLatestBackupUrl(): Promise<string | null> {
    try {
      return (await hybridStorage.get('tank-backup-url')) || 
             (await hybridStorage.get('latestBackupUrl')) || 
             (await hybridStorage.get('lastBackupUrl')) || null;
    } catch {
      return null;
    }
  }

  /**
   * Generiert Tank-URL für QR-Code
   */
  getTankUrl(tankId: string): string | null {
    const baseUrl = 'https://woku369.github.io/MazerationsMeister';
    return `${baseUrl}/tank-offline.html?id=${encodeURIComponent(tankId)}`;
  }

  /**
   * Upload statischer QR-Dateien zu GitHub
   */
  async uploadStaticFiles(): Promise<{ success: boolean; message?: string }> {
    try {
      if (!this.githubSync) {
        return { success: false, message: 'GitHub-Sync nicht initialisiert' };
      }

      console.log('📤 Lade statische QR-Dateien zu GitHub...');
      
      // Verwende die githubSync Instanz für statische Uploads
      const result = await this.githubSync.uploadStaticFiles();
      
      return {
        success: result.success,
        message: result.success ? 'Statische Dateien erfolgreich hochgeladen' : result.message
      };
    } catch (error: any) {
      console.error('❌ Fehler beim Upload statischer Dateien:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Gibt aktuellen Status zurück
   */
  getStatus(): {
    enabled: boolean;
    lastSync: Date | null;
    uploading: boolean;
    config: AutoSyncConfig | null;
  } {
    return {
      enabled: this.config?.enabled || false,
      lastSync: this.lastSync,
      uploading: this.isUploading,
      config: this.config
    };
  }

  /**
   * Stoppt Auto-Sync
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 Tank Auto-Sync gestoppt');
  }
}

// Singleton für einfachen Zugriff
let tankAutoSyncInstance: TankAutoSync | null = null;

export function getTankAutoSync(): TankAutoSync {
  if (!tankAutoSyncInstance) {
    tankAutoSyncInstance = new TankAutoSync();
  }
  return tankAutoSyncInstance;
}