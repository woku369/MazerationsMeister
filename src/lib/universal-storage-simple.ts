/**
 * 🗄️ UNIVERSELLES SPEICHER-SYSTEM (SIMPLIFIED)
 * Browser UND Electron verwenden beide localStorage
 * 
 * Einfacher, zuverlässiger Ansatz ohne Dateisystem-Komplexität
 */

export interface AppData {
  // Tank-System
  tankDefinitions: any[];
  inventoryItems: any[];
  
  // Mazerationen
  mazerationProtocols: any[];
  taraPerCrateKg: number;
  
  // Einstellungen
  dataPath: string;
  oneDrivePath: string;
  oneDriveConfig: any;
  githubToken: string;
  githubEnabled: boolean;
  inventoryCategories: string[];
  
  // Dashboard
  dashboardTasks: any[];
  
  // Sync-Status
  lastGitHubSync: string;
  pendingExport: string | null;
  pendingExportTimestamp: string | null;
  
  // Metadaten
  lastBackup: string;
  dataVersion: string;
}

class UniversalStorageManager {
  private static instance: UniversalStorageManager;
  private data: AppData;
  private isInitialized = false;
  private isElectron = false;
  
  private constructor() {
    this.data = this.getDefaultData();
    this.detectEnvironment();
  }
  
  static getInstance(): UniversalStorageManager {
    if (!UniversalStorageManager.instance) {
      UniversalStorageManager.instance = new UniversalStorageManager();
    }
    return UniversalStorageManager.instance;
  }
  
  /**
   * 🔍 UMGEBUNGS-ERKENNUNG: Browser vs Electron
   */
  private detectEnvironment(): void {
    this.isElectron = typeof window !== 'undefined' && 
                     typeof window.process === 'object' && 
                     window.process.type === 'renderer';
    
    console.log(`🔍 Umgebung erkannt: ${this.isElectron ? 'Electron' : 'Browser'} - localStorage-Speicher`);
  }
  
  /**
   * 🚀 APP-START: Lädt alle Daten aus localStorage
   */
  async initializeAppData(): Promise<AppData> {
    if (this.isInitialized) {
      return this.data;
    }
    
    console.log('🗄️ Universeller Speicher-Manager: Lade persistente Echtdaten...');
    
    try {
      // Daten aus localStorage laden (funktioniert in Browser und Electron)
      this.loadFromLocalStorage();
      
      this.isInitialized = true;
      
      console.log('✅ App-Daten erfolgreich geladen:', {
        environment: this.isElectron ? 'Electron' : 'Browser',
        storage: 'localStorage',
        tanks: this.data.tankDefinitions.length,
        inventory: this.data.inventoryItems.length,
        protocols: this.data.mazerationProtocols.length,
        tasks: this.data.dashboardTasks.length
      });
      
      // Automatisches Backup erstellen
      await this.createBackup();
      
      return this.data;
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der App-Daten:', error);
      return this.data;
    }
  }
  
  /**
   * 🌐 DATEN AUS LOCALSTORAGE LADEN
   */
  private loadFromLocalStorage(): void {
    try {
      // Tank-System
      this.data.tankDefinitions = this.loadFromStorage('tankDefinitions', []);
      this.data.inventoryItems = this.loadFromStorage('inventoryItems', []);
      
      // Mazerationen
      this.data.mazerationProtocols = this.loadFromStorage('mazerationProtocols', []);
      this.data.taraPerCrateKg = parseFloat(localStorage.getItem('taraPerCrateKg') || '0') || 0;
      
      // Einstellungen
      this.data.dataPath = localStorage.getItem('dataPath') || '';
      this.data.oneDrivePath = localStorage.getItem('oneDrivePath') || '';
      this.data.oneDriveConfig = this.loadFromStorage('oneDriveConfig', null);
      this.data.githubToken = localStorage.getItem('github-token') || '';
      this.data.githubEnabled = localStorage.getItem('github-enabled') === 'true';
      this.data.inventoryCategories = this.loadFromStorage('inventoryCategories', [
        'Spirituosen', 'Früchte', 'Gewürze', 'Zusätze', 'Behälter'
      ]);
      
      // Dashboard
      this.data.dashboardTasks = this.loadFromStorage('dashboardTasks', []);
      
      // Sync-Status
      this.data.lastGitHubSync = localStorage.getItem('lastGitHubSync') || '';
      this.data.pendingExport = localStorage.getItem('pendingExport');
      this.data.pendingExportTimestamp = localStorage.getItem('pendingExportTimestamp');
      
      // Metadaten
      this.data.lastBackup = localStorage.getItem('appDataLastBackup') || '';
      this.data.dataVersion = '1.0.0';
      
    } catch (error) {
      console.error('❌ Fehler beim Laden aus localStorage:', error);
    }
  }
  
  /**
   * 💾 SOFORT-SPEICHERUNG: Universal localStorage
   */
  async saveData(key: keyof AppData, value: any): Promise<void> {
    (this.data as any)[key] = value;
    
    try {
      this.saveToLocalStorage(key, value);
      
      console.log(`✅ ${key} gespeichert (localStorage):`, value);
      
      // Trigger für externe Systeme
      this.triggerDataChange(key);
      
    } catch (error) {
      console.error(`❌ Fehler beim Speichern ${key}:`, error);
    }
  }
  
  /**
   * 🌐 IN LOCALSTORAGE SPEICHERN
   */
  private saveToLocalStorage(key: keyof AppData, value: any): void {
    try {
      const storageKey = this.getStorageKey(key);
      
      if (typeof value === 'object' && value !== null) {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } else {
        localStorage.setItem(storageKey, String(value));
      }
      
    } catch (error) {
      console.error(`❌ Fehler beim Speichern in localStorage ${key}:`, error);
    }
  }
  
  /**
   * 📖 DATEN LESEN: Universeller Zugriff
   */
  getData(): AppData {
    return { ...this.data };
  }
  
  /**
   * 💿 BACKUP-SYSTEM: localStorage-Backup
   */
  async createBackup(): Promise<string> {
    try {
      const backup = {
        ...this.data,
        backupTimestamp: new Date().toISOString(),
        backupVersion: '1.0.0',
        environment: this.isElectron ? 'Electron' : 'Browser'
      };
      
      const backupString = JSON.stringify(backup, null, 2);
      
      // Immer localStorage (auch in Electron)
      localStorage.setItem('appDataBackup', backupString);
      localStorage.setItem('appDataLastBackup', backup.backupTimestamp);
      
      this.data.lastBackup = backup.backupTimestamp;
      
      console.log('💿 Backup erstellt:', backup.backupTimestamp);
      return backupString;
      
    } catch (error) {
      console.error('❌ Backup-Fehler:', error);
      throw error;
    }
  }
  
  // === HILFSMETHODEN ===
  
  private loadFromStorage(key: string, defaultValue: any): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`⚠️ Fehler beim Laden ${key}, verwende Default-Wert:`, error);
      return defaultValue;
    }
  }
  
  private getStorageKey(key: keyof AppData): string {
    const keyMapping: Record<string, string> = {
      tankDefinitions: 'tankDefinitions',
      inventoryItems: 'inventoryItems',
      mazerationProtocols: 'mazerationProtocols',
      taraPerCrateKg: 'taraPerCrateKg',
      dataPath: 'dataPath',
      oneDrivePath: 'oneDrivePath',
      oneDriveConfig: 'oneDriveConfig',
      githubToken: 'github-token',
      githubEnabled: 'github-enabled',
      inventoryCategories: 'inventoryCategories',
      dashboardTasks: 'dashboardTasks',
      lastGitHubSync: 'lastGitHubSync',
      pendingExport: 'pendingExport',
      pendingExportTimestamp: 'pendingExportTimestamp'
    };
    
    return keyMapping[key] || key;
  }
  
  private getDefaultData(): AppData {
    return {
      tankDefinitions: [],
      inventoryItems: [],
      mazerationProtocols: [],
      taraPerCrateKg: 0,
      dataPath: '',
      oneDrivePath: '',
      oneDriveConfig: null,
      githubToken: '',
      githubEnabled: false,
      inventoryCategories: ['Spirituosen', 'Früchte', 'Gewürze', 'Zusätze', 'Behälter'],
      dashboardTasks: [],
      lastGitHubSync: '',
      pendingExport: null,
      pendingExportTimestamp: null,
      lastBackup: '',
      dataVersion: '1.0.0'
    };
  }
  
  private triggerDataChange(key: keyof AppData): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('appDataChanged', { 
        detail: { key, value: (this.data as any)[key] } 
      }));
    }
  }
  
  /**
   * 📊 DEBUG-INFO
   */
  getDataStatus(): any {
    return {
      initialized: this.isInitialized,
      environment: this.isElectron ? 'Electron' : 'Browser',
      storage: 'localStorage',
      dataSize: JSON.stringify(this.data).length,
      lastBackup: this.data.lastBackup,
      tankCount: this.data.tankDefinitions.length,
      inventoryCount: this.data.inventoryItems.length,
      protocolCount: this.data.mazerationProtocols.length,
      taskCount: this.data.dashboardTasks.length
    };
  }
}

// === ÖFFENTLICHE API ===

export const universalStorage = UniversalStorageManager.getInstance();

// App-Start Funktion
export async function initializeApp(): Promise<AppData> {
  return await universalStorage.initializeAppData();
}

// Quick-Save Funktionen
export async function saveTanks(tanks: any[]): Promise<void> {
  await universalStorage.saveData('tankDefinitions', tanks);
}

export async function saveInventory(inventory: any[]): Promise<void> {
  await universalStorage.saveData('inventoryItems', inventory);
}

export async function saveProtocols(protocols: any[]): Promise<void> {
  await universalStorage.saveData('mazerationProtocols', protocols);
}

export async function saveTasks(tasks: any[]): Promise<void> {
  await universalStorage.saveData('dashboardTasks', tasks);
}

// Quick-Read Funktionen
export function getTanks(): any[] {
  return universalStorage.getData().tankDefinitions;
}

export function getInventory(): any[] {
  return universalStorage.getData().inventoryItems;
}

export function getProtocols(): any[] {
  return universalStorage.getData().mazerationProtocols;
}

// Debug
export function getAppDataStatus(): any {
  return universalStorage.getDataStatus();
}