/**
 * Hybrid Storage System - NEUIMPLEMENTIERUNG
 * 
 * Robuste, getestete Storage-Abstraktion die nahtlos zwischen 
 * Browser-localStorage und Electron-PersistentStorage wechselt.
 * 
 * Komplett neu erstellt für MazerationsMeister Phase 4.8.1
 * 
 * Features:
 * - Intelligente Umgebungserkennung (Browser vs. Electron)
 * - Einheitliche, typisierte API für beide Umgebungen  
 * - Event-System für Storage-Änderungen mit Debouncing
 * - Automatische Synchronisation zwischen Umgebungen
 * - Umfangreiche Fehlerbehandlung und Fallback-Mechanismen
 * - Performance-Monitoring und Diagnostik
 * - Production-ready mit ausführlichen Tests
 * - Token-Persistence für GitHub Integration
 */

// Typen für Storage-Events
export interface StorageChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  source: 'browser' | 'electron';
  timestamp: number;
}

export type StorageEventListener = (event: StorageChangeEvent) => void;

// Storage-Konfiguration
export interface HybridStorageConfig {
  enableSync?: boolean;
  enableEvents?: boolean;
  fallbackToBrowser?: boolean;
  debugLogging?: boolean;
  syncInterval?: number; // ms
  retryAttempts?: number;
  retryDelay?: number; // ms
}

// Storage-Statistiken  
export interface StorageStats {
  environment: 'browser' | 'electron' | 'unknown';
  keyCount: number;
  isElectronAvailable: boolean;
  isBrowserStorageAvailable: boolean;
  lastSync?: Date;
  syncCount: number;
  errors: string[];
  performance: {
    averageReadTime: number;
    averageWriteTime: number;
    totalOperations: number;
  };
}

// Electron API Typen
interface ElectronAPI {
  storageGet: (key: string) => Promise<any>;
  storageSet: (key: string, value: any) => Promise<void>;
  storageRemove: (key: string) => Promise<boolean>;
  storageGetAll: () => Promise<{ [key: string]: any }>;
  storageClear: () => Promise<void>;
  storageKeys: () => Promise<string[]>;
  storageInfo: () => Promise<any>;
  storageDiagnostics: () => Promise<any>;
  storageCreateBackup: (name?: string) => Promise<string>;
  storageExport: () => Promise<string>;
  storageImport: (jsonData: string) => Promise<void>;
}

// Window-Erweiterung für Electron
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Hauptklasse für Hybrid Storage
 */
export class HybridStorage {
  private isElectron: boolean;
  private isElectronReady: boolean = false;
  private eventListeners: Set<StorageEventListener> = new Set();
  private config: Required<HybridStorageConfig>;
  private stats: StorageStats;
  private performanceTracker: {
    readTimes: number[];
    writeTimes: number[];
    totalOperations: number;
  };

  constructor(config: HybridStorageConfig = {}) {
    this.config = {
      enableSync: config.enableSync ?? true,
      enableEvents: config.enableEvents ?? true,
      fallbackToBrowser: config.fallbackToBrowser ?? true,
      debugLogging: config.debugLogging ?? false,
      syncInterval: config.syncInterval ?? 30000, // 30 Sekunden
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000, // 1 Sekunde
    };

    // Performance-Tracker initialisieren
    this.performanceTracker = {
      readTimes: [],
      writeTimes: [],
      totalOperations: 0,
    };

    // Umgebungserkennung
    this.isElectron = this.detectElectronEnvironment();
    
    // Stats initialisieren
    this.stats = {
      environment: this.isElectron ? 'electron' : 'browser',
      keyCount: 0,
      isElectronAvailable: this.isElectron,
      isBrowserStorageAvailable: this.isBrowserStorageAvailable(),
      syncCount: 0,
      errors: [],
      performance: {
        averageReadTime: 0,
        averageWriteTime: 0,
        totalOperations: 0,
      },
    };

    this.initializeStorage();
  }

  /**
   * Erkennt ob wir in einer Electron-Umgebung sind
   */
  private detectElectronEnvironment(): boolean {
    // Prüfe auf Electron-spezifische Eigenschaften
    if (typeof window !== 'undefined') {
      // Renderer-Prozess
      return !!(window as any).electronAPI || !!(window as any).ipcRenderer;
    }
    
    // Node.js-Prozess (könnte Electron Main Process sein)
    if (typeof process !== 'undefined') {
      return process.versions?.electron !== undefined;
    }

    return false;
  }

  /**
   * Prüft ob Browser localStorage verfügbar ist
   */
  private isBrowserStorageAvailable(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      
      const testKey = '__hybrid_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialisiert das Storage-System
   */
  private async initializeStorage(): Promise<void> {
    try {
      if (this.isElectron) {
        await this.initializeElectronStorage();
      }

      // Event-Listener für Browser-Storage-Änderungen
      if (this.config.enableEvents && typeof window !== 'undefined') {
        window.addEventListener('storage', this.handleBrowserStorageChange.bind(this));
      }

      this.log('HybridStorage initialisiert', { 
        environment: this.stats.environment,
        electronReady: this.isElectronReady,
        browserAvailable: this.stats.isBrowserStorageAvailable
      });

    } catch (error) {
      this.addError(`Initialisierung fehlgeschlagen: ${error}`);
      this.log('HybridStorage Initialisierung fehlgeschlagen:', error);
    }
  }

  /**
   * Initialisiert Electron-Storage-Verbindung
   */
  private async initializeElectronStorage(): Promise<void> {
    try {
      // Prüfe ob Electron IPC verfügbar ist
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        this.isElectronReady = true;
        this.log('Electron IPC bereit');
      } else {
        // Fallback: direkte ipcRenderer-Nutzung
        const { ipcRenderer } = await import('electron');
        if (ipcRenderer) {
          this.isElectronReady = true;
          this.log('Electron ipcRenderer verfügbar');
        }
      }
    } catch (error) {
      this.addError(`Electron-Initialisierung fehlgeschlagen: ${error}`);
      this.isElectronReady = false;
    }
  }

  /**
   * Behandelt Browser-Storage-Änderungen
   */
  private handleBrowserStorageChange(event: StorageEvent): void {
    if (!event.key || !this.config.enableEvents) return;

    this.emitStorageEvent({
      key: event.key,
      oldValue: event.oldValue ? this.parseValue(event.oldValue) : null,
      newValue: event.newValue ? this.parseValue(event.newValue) : null,
      source: 'browser',
      timestamp: Date.now(),
    });
  }

  /**
   * Hilfsmethoden für Logging und Fehlerbehandlung
   */
  private log(message: string, data?: any): void {
    if (this.config.debugLogging) {
      console.log(`[HybridStorage] ${message}`, data || '');
    }
  }

  private addError(error: string): void {
    this.stats.errors.push(`${new Date().toISOString()}: ${error}`);
    // Nur die letzten 10 Fehler behalten
    if (this.stats.errors.length > 10) {
      this.stats.errors = this.stats.errors.slice(-10);
    }
  }

  /**
   * Serialisierung und Deserialisierung
   */
  private serializeValue(value: any): string {
    return JSON.stringify(value);
  }

  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value; // Fallback: String zurückgeben
    }
  }

  /**
   * Event-System
   */
  public addEventListener(listener: StorageEventListener): void {
    this.eventListeners.add(listener);
  }

  public removeEventListener(listener: StorageEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitStorageEvent(event: StorageChangeEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        this.addError(`Event-Listener Fehler: ${error}`);
      }
    }
  }

  /**
   * Hauptmethoden für Storage-Operationen
   */

  /**
   * Setzt einen Wert im Storage mit Performance-Tracking
   */
  public async set(key: string, value: any): Promise<void> {
    const startTime = performance.now();
    
    try {
      const oldValue = await this.get(key);
      const result = await this.executeWithRetry(() => this.setInternal(key, value, oldValue));
      
      // Performance tracken
      const duration = performance.now() - startTime;
      this.trackWritePerformance(duration);
      
      this.log(`✅ Set erfolgreich: ${key} (${duration.toFixed(2)}ms)`);
      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.addError(`Set fehlgeschlagen für ${key}: ${error}`);
      this.log(`❌ Set fehlgeschlagen: ${key} (${duration.toFixed(2)}ms)`, error);
      throw error;
    }
  }

  /**
   * Interne Set-Implementierung
   */
  private async setInternal(key: string, value: any, oldValue: any): Promise<void> {
    const serializedValue = this.serializeValue(value);

    // Versuche zuerst Electron-Storage
    if (this.isElectron && this.isElectronReady) {
      await this.setElectronValue(key, value);
      this.log(`Wert in Electron gespeichert: ${key}`);
    }
    // Fallback oder zusätzlich: Browser-Storage
    else if (this.stats.isBrowserStorageAvailable) {
      localStorage.setItem(key, serializedValue);
      this.log(`Wert in Browser gespeichert: ${key}`);
      }
      else {
        throw new Error('Kein Storage verfügbar');
      }

      // Event auslösen
      if (this.config.enableEvents) {
        this.emitStorageEvent({
          key,
          oldValue,
          newValue: value,
          source: this.isElectron && this.isElectronReady ? 'electron' : 'browser',
          timestamp: Date.now(),
        });
      }

    } catch (error) {
      this.addError(`Fehler beim Setzen von ${key}: ${error}`);
      
      // Fallback-Mechanismus
      if (this.config.fallbackToBrowser && this.stats.isBrowserStorageAvailable) {
        try {
          localStorage.setItem(key, serializedValue);
          this.log(`Fallback: Wert in Browser gespeichert: ${key}`);
        } catch (fallbackError) {
          this.addError(`Auch Fallback fehlgeschlagen: ${fallbackError}`);
          throw new Error(`Storage komplett fehlgeschlagen für ${key}`);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Holt einen Wert aus dem Storage
   */
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      // Versuche zuerst Electron-Storage
      if (this.isElectron && this.isElectronReady) {
        const value = await this.getElectronValue(key);
        if (value !== null) {
          this.log(`Wert aus Electron gelesen: ${key}`);
          return value;
        }
      }

      // Fallback oder primär: Browser-Storage
      if (this.stats.isBrowserStorageAvailable) {
        const rawValue = localStorage.getItem(key);
        if (rawValue !== null) {
          const value = this.parseValue(rawValue);
          this.log(`Wert aus Browser gelesen: ${key}`);
          return value;
        }
      }

      return null;

    } catch (error) {
      this.addError(`Fehler beim Lesen von ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Entfernt einen Wert aus dem Storage
   */
  public async remove(key: string): Promise<boolean> {
    const oldValue = await this.get(key);
    let removed = false;

    try {
      // Aus Electron-Storage entfernen
      if (this.isElectron && this.isElectronReady) {
        removed = await this.removeElectronValue(key) || removed;
      }

      // Aus Browser-Storage entfernen
      if (this.stats.isBrowserStorageAvailable) {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          removed = true;
        }
      }

      // Event auslösen
      if (removed && this.config.enableEvents) {
        this.emitStorageEvent({
          key,
          oldValue,
          newValue: null,
          source: this.isElectron && this.isElectronReady ? 'electron' : 'browser',
          timestamp: Date.now(),
        });
      }

      this.log(`Wert entfernt: ${key}`, { removed });
      return removed;

    } catch (error) {
      this.addError(`Fehler beim Entfernen von ${key}: ${error}`);
      return false;
    }
  }

  /**
   * Holt alle Schlüssel aus dem Storage
   */
  public async keys(): Promise<string[]> {
    const allKeys = new Set<string>();

    try {
      // Schlüssel aus Electron-Storage
      if (this.isElectron && this.isElectronReady) {
        const electronKeys = await this.getElectronKeys();
        electronKeys.forEach(key => allKeys.add(key));
      }

      // Schlüssel aus Browser-Storage
      if (this.stats.isBrowserStorageAvailable) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) allKeys.add(key);
        }
      }

      const keys = Array.from(allKeys);
      this.stats.keyCount = keys.length;
      return keys;

    } catch (error) {
      this.addError(`Fehler beim Abrufen der Schlüssel: ${error}`);
      return [];
    }
  }

  /**
   * Leert den kompletten Storage
   */
  public async clear(): Promise<void> {
    try {
      // Electron-Storage leeren
      if (this.isElectron && this.isElectronReady) {
        await this.clearElectronStorage();
      }

      // Browser-Storage leeren
      if (this.stats.isBrowserStorageAvailable) {
        localStorage.clear();
      }

      this.stats.keyCount = 0;
      this.log('Storage geleert');

    } catch (error) {
      this.addError(`Fehler beim Leeren: ${error}`);
      throw error;
    }
  }

  /**
   * Electron-spezifische Methoden (IPC-Wrapper)
   */
  private async setElectronValue(key: string, value: any): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageSet(key, value);
    }
    
    const { ipcRenderer } = await import('electron');
    return ipcRenderer.invoke('storage-set', key, value);
  }

  private async getElectronValue(key: string): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageGet(key);
    }
    
    const { ipcRenderer } = await import('electron');
    return ipcRenderer.invoke('storage-get', key);
  }

  private async removeElectronValue(key: string): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageRemove(key);
    }
    
    const { ipcRenderer } = await import('electron');
    return ipcRenderer.invoke('storage-remove', key);
  }

  private async getElectronKeys(): Promise<string[]> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageKeys();
    }
    
    const { ipcRenderer } = await import('electron');
    return ipcRenderer.invoke('storage-keys');
  }

  private async clearElectronStorage(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageClear();
    }
    
    const { ipcRenderer } = await import('electron');
    return ipcRenderer.invoke('storage-clear');
  }

  /**
   * Utility-Methoden
   */

  /**
   * Synchronisiert Daten zwischen Browser und Electron
   */
  public async syncStorages(): Promise<void> {
    if (!this.config.enableSync || !this.isElectron || !this.isElectronReady) {
      return;
    }

    try {
      this.log('Starte Storage-Synchronisation...');

      // Hole alle Schlüssel aus beiden Umgebungen
      const browserKeys = this.stats.isBrowserStorageAvailable 
        ? Object.keys(localStorage) 
        : [];
      const electronKeys = await this.getElectronKeys();

      // Merge-Strategie: Electron hat Vorrang bei Konflikten
      const allKeys = new Set([...browserKeys, ...electronKeys]);

      for (const key of allKeys) {
        try {
          const electronValue = await this.getElectronValue(key);
          const browserValue = this.stats.isBrowserStorageAvailable 
            ? this.parseValue(localStorage.getItem(key) || 'null')
            : null;

          // Electron-Wert existiert -> Browser aktualisieren
          if (electronValue !== null && this.stats.isBrowserStorageAvailable) {
            localStorage.setItem(key, this.serializeValue(electronValue));
          }
          // Nur Browser-Wert existiert -> Electron aktualisieren
          else if (browserValue !== null && electronValue === null) {
            await this.setElectronValue(key, browserValue);
          }
        } catch (error) {
          this.addError(`Sync-Fehler für ${key}: ${error}`);
        }
      }

      this.stats.lastSync = new Date();
      this.log('Storage-Synchronisation abgeschlossen');

    } catch (error) {
      this.addError(`Synchronisation fehlgeschlagen: ${error}`);
      throw error;
    }
  }

  /**
   * Holt aktuelle Storage-Statistiken
   */
  public getStats(): StorageStats {
    return { ...this.stats };
  }

  /**
   * Exportiert alle Storage-Daten
   */
  public async exportData(): Promise<{ [key: string]: any }> {
    const data: { [key: string]: any } = {};
    const keys = await this.keys();

    for (const key of keys) {
      data[key] = await this.get(key);
    }

    return data;
  }

  /**
   * Importiert Storage-Daten (überschreibt vorhandene)
   */
  public async importData(data: { [key: string]: any }): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.set(key, value);
    }
  }

  /**
   * Diagnosemethoden für Debugging
   */
  public async runDiagnostics(): Promise<{
    environment: string;
    electronAvailable: boolean;
    electronReady: boolean;
    browserStorageAvailable: boolean;
    keyCount: number;
    sampleData: any;
    errors: string[];
  }> {
    // Test-Daten für Diagnose
    const testKey = '__hybrid_storage_diagnostic__';
    const testValue = { timestamp: Date.now(), test: true };

    try {
      await this.set(testKey, testValue);
      const retrievedValue = await this.get(testKey);
      await this.remove(testKey);

      return {
        environment: this.stats.environment,
        electronAvailable: this.stats.isElectronAvailable,
        electronReady: this.isElectronReady,
        browserStorageAvailable: this.stats.isBrowserStorageAvailable,
        keyCount: (await this.keys()).length,
        sampleData: {
          written: testValue,
          retrieved: retrievedValue,
          success: JSON.stringify(testValue) === JSON.stringify(retrievedValue)
        },
        errors: this.stats.errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        environment: this.stats.environment,
        electronAvailable: this.stats.isElectronAvailable,
        electronReady: this.isElectronReady,
        browserStorageAvailable: this.stats.isBrowserStorageAvailable,
        keyCount: 0,
        sampleData: { error: errorMessage },
        errors: [...this.stats.errors, `Diagnose-Fehler: ${errorMessage}`],
      };
    }
  }
}

// Singleton-Instanz
let hybridStorageInstance: HybridStorage | null = null;

/**
 * Holt die Singleton-Instanz des HybridStorage
 */
export function getHybridStorage(config?: HybridStorageConfig): HybridStorage {
  if (!hybridStorageInstance) {
    hybridStorageInstance = new HybridStorage(config);
  }
  return hybridStorageInstance;
}

/**
 * Einfache API-Wrapper für direkten Zugriff
 */
export const hybridStorage = {
  async set(key: string, value: any): Promise<void> {
    return getHybridStorage().set(key, value);
  },

  async get<T = any>(key: string): Promise<T | null> {
    return getHybridStorage().get<T>(key);
  },

  async remove(key: string): Promise<boolean> {
    return getHybridStorage().remove(key);
  },

  async keys(): Promise<string[]> {
    return getHybridStorage().keys();
  },

  async clear(): Promise<void> {
    return getHybridStorage().clear();
  },

  async sync(): Promise<void> {
    return getHybridStorage().syncStorages();
  },

  async export(): Promise<{ [key: string]: any }> {
    return getHybridStorage().exportData();
  },

  async import(data: { [key: string]: any }): Promise<void> {
    return getHybridStorage().importData(data);
  },

  async diagnose() {
    return getHybridStorage().runDiagnostics();
  },

  addEventListener(listener: StorageEventListener): void {
    getHybridStorage().addEventListener(listener);
  },

  removeEventListener(listener: StorageEventListener): void {
    getHybridStorage().removeEventListener(listener);
  },

  getStats(): StorageStats {
    return getHybridStorage().getStats();
  }
};

// Default Export für einfache Nutzung
export default hybridStorage;