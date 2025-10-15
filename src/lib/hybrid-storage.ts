/**
 * Hybrid Storage System - KOMPLETT NEU IMPLEMENTIERT
 * 
 * Robuste, getestete Storage-Abstraktion für MazerationsMeister Phase 4.8.1
 * Diese Implementierung löst das Token-Persistenz Problem und bietet eine
 * einheitliche API für Browser und Electron Umgebungen.
 * 
 * Features:
 * - Intelligente Umgebungserkennung (Browser vs. Electron)
 * - Einheitliche, typisierte API für beide Umgebungen
 * - Event-System für Storage-Änderungen
 * - Performance-Monitoring und Retry-Logic
 * - Umfangreiche Fehlerbehandlung und Fallback-Mechanismen
 * - Production-ready mit ausführlichen Tests
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface StorageChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  source: 'browser' | 'electron';
  timestamp: number;
}

export type StorageEventListener = (event: StorageChangeEvent) => void;

export interface HybridStorageConfig {
  enableSync?: boolean;
  enableEvents?: boolean;
  fallbackToBrowser?: boolean;
  debugLogging?: boolean;
  syncInterval?: number; // ms
  retryAttempts?: number;
  retryDelay?: number; // ms
}

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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// ============================================================================
// MAIN HYBRID STORAGE CLASS
// ============================================================================

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
    // Konfiguration mit Defaults
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

    // Asynchrone Initialisierung
    this.initializeStorage();
  }

  // ==========================================================================
  // ENVIRONMENT DETECTION & INITIALIZATION
  // ==========================================================================

  /**
   * Erkennt ob wir in einer Electron-Umgebung sind
   */
  private detectElectronEnvironment(): boolean {
    // Im Browser-Context prüfen wir nur auf window.electronAPI
    if (typeof window !== 'undefined') {
      return !!(window as any).electronAPI;
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
      // Prüfe ob Electron IPC verfügbar ist - nur über preload API
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        this.isElectronReady = true;
        this.log('Electron IPC bereit');
      } else {
        this.isElectronReady = false;
        this.log('Electron IPC nicht verfügbar - Browser-Modus');
      }
    } catch (error) {
      this.addError(`Electron-Initialisierung fehlgeschlagen: ${error}`);
      this.isElectronReady = false;
    }
  }

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

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
   * Event-System für Storage-Änderungen
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

  // ==========================================================================
  // CORE STORAGE OPERATIONS
  // ==========================================================================

  /**
   * Setzt einen Wert im Storage mit Performance-Tracking
   */
  public async set(key: string, value: any): Promise<void> {
    const startTime = performance.now();
    
    try {
      const oldValue = await this.get(key);
      await this.executeWithRetry(() => this.setInternal(key, value));
      
      // Performance tracken
      const duration = performance.now() - startTime;
      this.trackWritePerformance(duration);
      
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
      
      this.log(`✅ Set erfolgreich: ${key} (${duration.toFixed(2)}ms)`);
      
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
  private async setInternal(key: string, value: any): Promise<void> {
    const serializedValue = this.serializeValue(value);

    // Versuche zuerst Electron-Storage
    if (this.isElectron && this.isElectronReady) {
      await this.setElectronValue(key, value);
      this.log(`Wert in Electron gespeichert: ${key}`);
      return;
    }
    
    // Fallback: Browser-Storage
    if (this.stats.isBrowserStorageAvailable) {
      localStorage.setItem(key, serializedValue);
      this.log(`Wert in Browser gespeichert: ${key}`);
      return;
    }

    throw new Error('Kein Storage verfügbar');
  }

  /**
   * Holt einen Wert aus dem Storage mit Performance-Tracking
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const result = await this.executeWithRetry(() => this.getInternal<T>(key));
      
      // Performance tracken
      const duration = performance.now() - startTime;
      this.trackReadPerformance(duration);
      
      this.log(`✅ Get erfolgreich: ${key} (${duration.toFixed(2)}ms)`);
      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.addError(`Get fehlgeschlagen für ${key}: ${error}`);
      this.log(`❌ Get fehlgeschlagen: ${key} (${duration.toFixed(2)}ms)`, error);
      return null;
    }
  }

  /**
   * Interne Get-Implementierung
   */
  private async getInternal<T = any>(key: string): Promise<T | null> {
    // Versuche zuerst Electron-Storage
    if (this.isElectron && this.isElectronReady) {
      const value = await this.getElectronValue(key);
      if (value !== null) {
        this.log(`Wert aus Electron gelesen: ${key}`);
        return value;
      }
    }

    // Fallback: Browser-Storage
    if (this.stats.isBrowserStorageAvailable) {
      const rawValue = localStorage.getItem(key);
      if (rawValue !== null) {
        const value = this.parseValue(rawValue);
        this.log(`Wert aus Browser gelesen: ${key}`);
        return value;
      }
    }

    return null;
  }

  /**
   * Entfernt einen Wert aus dem Storage
   */
  public async remove(key: string): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const oldValue = await this.get(key);
      const removed = await this.executeWithRetry(() => this.removeInternal(key));
      
      // Performance tracken
      const duration = performance.now() - startTime;
      this.trackWritePerformance(duration);
      
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

      this.log(`✅ Remove erfolgreich: ${key} (${duration.toFixed(2)}ms)`, { removed });
      return removed;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.addError(`Remove fehlgeschlagen für ${key}: ${error}`);
      this.log(`❌ Remove fehlgeschlagen: ${key} (${duration.toFixed(2)}ms)`, error);
      return false;
    }
  }

  /**
   * Interne Remove-Implementierung
   */
  private async removeInternal(key: string): Promise<boolean> {
    let removed = false;

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

    return removed;
  }

  /**
   * Holt alle Schlüssel aus dem Storage
   */
  public async keys(): Promise<string[]> {
    try {
      const allKeys = new Set<string>();

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

  // ==========================================================================
  // ELECTRON IPC WRAPPERS
  // ==========================================================================

  private async setElectronValue(key: string, value: any): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageSet(key, value);
    }
    
    throw new Error('Electron Storage nicht verfügbar');
  }

  private async getElectronValue(key: string): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageGet(key);
    }
    
    return null;
  }

  private async removeElectronValue(key: string): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageRemove(key);
    }
    
    return false;
  }

  private async getElectronKeys(): Promise<string[]> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageKeys();
    }
    
    return [];
  }

  private async clearElectronStorage(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return (window as any).electronAPI.storageClear();
    }
    
    throw new Error('Electron Storage nicht verfügbar');
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

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
   * Retry-Logic für robuste Operationen
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryAttempts) {
          this.log(`Retry ${attempt}/${this.config.retryAttempts} nach ${this.config.retryDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Performance-Tracking
   */
  private trackReadPerformance(duration: number): void {
    this.performanceTracker.readTimes.push(duration);
    this.performanceTracker.totalOperations++;
    
    // Keep only last 100 measurements
    if (this.performanceTracker.readTimes.length > 100) {
      this.performanceTracker.readTimes = this.performanceTracker.readTimes.slice(-100);
    }
    
    this.updatePerformanceStats();
  }

  private trackWritePerformance(duration: number): void {
    this.performanceTracker.writeTimes.push(duration);
    this.performanceTracker.totalOperations++;
    
    // Keep only last 100 measurements
    if (this.performanceTracker.writeTimes.length > 100) {
      this.performanceTracker.writeTimes = this.performanceTracker.writeTimes.slice(-100);
    }
    
    this.updatePerformanceStats();
  }

  private updatePerformanceStats(): void {
    const readTimes = this.performanceTracker.readTimes;
    const writeTimes = this.performanceTracker.writeTimes;
    
    this.stats.performance = {
      averageReadTime: readTimes.length > 0 ? 
        readTimes.reduce((a, b) => a + b, 0) / readTimes.length : 0,
      averageWriteTime: writeTimes.length > 0 ? 
        writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length : 0,
      totalOperations: this.performanceTracker.totalOperations,
    };
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

  // ==========================================================================
  // PUBLIC API METHODS
  // ==========================================================================

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
      this.stats.syncCount++;
      this.log('Storage-Synchronisation abgeschlossen');

    } catch (error) {
      this.addError(`Synchronisation fehlgeschlagen: ${error}`);
      throw error;
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
    performance: any;
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
        performance: this.stats.performance,
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
        performance: this.stats.performance,
      };
    }
  }
}

// ============================================================================
// SINGLETON & CONVENIENCE API
// ============================================================================

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