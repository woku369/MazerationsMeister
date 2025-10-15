/**
 * Automatische Tank-Daten Synchronisation zu GitHub Pages
 * Lädt Tank-Daten automatisch bei Änderungen hoch
 */

import { GitHubService, TankDataGitHubSync } from './github-service';
import { hybridStorage } from './hybrid-storage';

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
        this.startAutoSync();
        
        console.log(`✅ Tank Auto-Sync aktiviert (alle ${config.interval} Minuten)`);
        return true;
      }

      return true;
    } catch (error) {
      console.error('❌ Auto-Sync Initialisierung fehlgeschlagen:', error);
      return false;
    }
  }

  /**
   * Startet automatische Synchronisation
   */
  private startAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    if (!this.config?.enabled || !this.githubSync) return;

    // Sofort synchronisieren
    this.syncNow();

    // Dann regelmäßig
    this.intervalId = setInterval(() => {
      this.syncNow();
    }, this.config.interval * 60 * 1000);
  }

  /**
   * Stoppt automatische Synchronisation
   */
  stopAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 Tank Auto-Sync gestoppt');
  }

  /**
   * Synchronisiert Tank-Daten sofort
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

      // Lade aktuelle Tank-Daten aus Hybrid Storage (primär) und localStorage (fallback)
      let tankDefinitionsData = await hybridStorage.get('tankDefinitions');
      let inventoryItemsData = await hybridStorage.get('inventoryItems');
      
      // Fallback: Prüfe localStorage wenn Hybrid Storage leer ist
      if (!tankDefinitionsData && typeof window !== 'undefined') {
        const localTankData = localStorage.getItem('tankDefinitions');
        if (localTankData) {
          tankDefinitionsData = JSON.parse(localTankData);
          // Migriere zu Hybrid Storage
          await hybridStorage.set('tankDefinitions', tankDefinitionsData);
          console.log('🔄 Tank-Definitionen von localStorage zu Hybrid Storage migriert');
        }
      }
      
      if (!inventoryItemsData && typeof window !== 'undefined') {
        const localInventoryData = localStorage.getItem('inventoryItems');
        if (localInventoryData) {
          inventoryItemsData = JSON.parse(localInventoryData);
          // Migriere zu Hybrid Storage
          await hybridStorage.set('inventoryItems', inventoryItemsData);
          console.log('🔄 Inventory-Daten von localStorage zu Hybrid Storage migriert');
        }
      }
      
      if (!tankDefinitionsData || !inventoryItemsData) {
        console.warn('⚠️ Keine Tank-Daten gefunden zum Synchronisieren');
        console.log('🔍 Debug: tankDefinitions in Hybrid Storage:', tankDefinitionsData ? 'EXISTS' : 'MISSING');
        console.log('🔍 Debug: inventoryItems in Hybrid Storage:', inventoryItemsData ? 'EXISTS' : 'MISSING');
        return false;
      }

      const tankDefinitions = tankDefinitionsData;
      const inventoryItems = inventoryItemsData;
      
      console.log('✅ Tank-Daten aus Hybrid Storage geladen:', {
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
        // Speichere auch backup URL falls vorhanden
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
   * Lädt Konfiguration aus Storage
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
   * Gibt die letzte Backup-URL zurück
   */
  getLatestBackupUrl(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tank-backup-url') || localStorage.getItem('latestBackupUrl') || localStorage.getItem('lastBackupUrl');
  }

  /**
   * Generiert GitHub Pages URL für Tank (mit Backup-URL falls verfügbar)
   */
  getTankUrl(tankId: string): string | null {
    if (!this.githubSync || !this.config) return null;
    
    // Verwende die letzte Backup-URL wenn verfügbar
    const backupUrl = this.getLatestBackupUrl();
    
    if (backupUrl) {
      console.log(`🔗 Using backup URL for Tank ${tankId} QR code: ${backupUrl}`);
      // Basis URL für tank-viewer mit dataUrl Parameter
      const baseUrl = `https://woku369.github.io/MazerationsMeister`;
      return `${baseUrl}/tank-viewer.html?tank=${tankId}&dataUrl=${encodeURIComponent(backupUrl)}`;
    } else {
      console.log(`⚠️ No backup URL found, using fallback tank-data.json for Tank ${tankId}`);
      // Fallback zur normalen tank-data.json
      return this.githubSync.getTankUrl(tankId);
    }
  }

  /**
   * Lädt statische QR-System Dateien hoch
   */
  async uploadStaticFiles(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.enabled || !this.githubSync) {
      return { success: false, message: 'GitHub Service nicht konfiguriert' };
    }

    try {
      console.log('📤 Upload statischer QR-System Dateien gestartet...');
      const result = await this.githubSync.uploadStaticFiles();
      return result;
    } catch (error: any) {
      console.error('❌ Upload fehlgeschlagen:', error);
      return { 
        success: false, 
        message: `Upload fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}` 
      };
    }
  }

  /**
   * Status-Informationen
   */
  getStatus(): {
    enabled: boolean;
    lastSync: Date | null;
    nextSync: Date | null;
    config: AutoSyncConfig | null;
  } {
    const nextSync = this.lastSync && this.config?.interval 
      ? new Date(this.lastSync.getTime() + (this.config.interval * 60 * 1000))
      : null;

    return {
      enabled: this.config?.enabled || false,
      lastSync: this.lastSync,
      nextSync,
      config: this.config
    };
  }

  /**
   * Konfiguration aktualisieren
   */
  async updateConfig(newConfig: Partial<AutoSyncConfig>): Promise<boolean> {
    if (!this.config) return false;

    const updatedConfig = { ...this.config, ...newConfig };
    return this.initialize(updatedConfig);
  }
}

// Singleton Instance
let autoSyncInstance: TankAutoSync | null = null;

export function getTankAutoSync(): TankAutoSync {
  if (!autoSyncInstance) {
    autoSyncInstance = new TankAutoSync();
  }
  return autoSyncInstance;
}