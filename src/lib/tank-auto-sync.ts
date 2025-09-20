/**
 * Automatische Tank-Daten Synchronisation zu GitHub Pages
 * Lädt Tank-Daten automatisch bei Änderungen hoch
 */

import { GitHubService, TankDataGitHubSync } from './github-service';
import { universalStorage } from './universal-storage-simple';

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

  constructor() {
    this.loadConfig();
  }

  /**
   * Initialisiert Auto-Sync mit Konfiguration
   */
  async initialize(config: AutoSyncConfig): Promise<boolean> {
    try {
      this.config = config;
      // Speichere Konfiguration in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('autoSyncConfig', JSON.stringify(config));
      }

      if (config.enabled && config.githubToken) {
        const githubService = new GitHubService({
          username: config.githubUsername,
          repository: config.githubRepository,
          token: config.githubToken,
          branch: 'main-pages'
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

    try {
      console.log('🔄 Starte manuelle Tank-Synchronisation...');

      // Lade aktuelle Tank-Daten über universalStorage
      const data = universalStorage.getData();
      if (!data?.tankDefinitions || !data?.inventoryItems) {
        console.warn('⚠️ Keine Tank-Daten gefunden zum Synchronisieren');
        return false;
      }

      // Synchronisiere zu GitHub
      const success = await this.githubSync.syncTankData(
        data.tankDefinitions,
        data.inventoryItems
      );

      if (success) {
        this.lastSync = new Date();
        // Speichere LastSync in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastGitHubSync', this.lastSync.toISOString());
        }
        console.log(`✅ Tank-Daten erfolgreich synchronisiert: ${this.lastSync.toLocaleString()}`);
      }

      return success;

    } catch (error) {
      console.error('❌ Tank-Synchronisation fehlgeschlagen:', error);
      return false;
    }
  }

  /**
   * Lädt Konfiguration aus Storage
   */
  private async loadConfig(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const configStr = localStorage.getItem('autoSyncConfig');
        if (configStr) {
          this.config = JSON.parse(configStr);
        }
        
        const lastSyncStr = localStorage.getItem('lastGitHubSync');
        if (lastSyncStr) {
          this.lastSync = new Date(lastSyncStr);
        }

        if (this.config?.enabled) {
          console.log(`📡 Auto-Sync Konfiguration geladen (alle ${this.config.interval} Minuten)`);
        }
      }
    } catch (error) {
      console.log('ℹ️ Keine Auto-Sync Konfiguration gefunden');
    }
  }

  /**
   * Generiert GitHub Pages URL für Tank
   */
  getTankUrl(tankId: string): string | null {
    if (!this.githubSync || !this.config) return null;
    return this.githubSync.getTankUrl(tankId);
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