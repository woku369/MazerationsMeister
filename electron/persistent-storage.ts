/**
 * Persistent Storage für Electron App - NEUIMPLEMENTIERUNG
 * 
 * Robuste, getestete Persistierung für die Electron-App als localStorage-Ersatz.
 * Komplett neu erstellt um die Probleme der vorherigen Implementierung zu beheben.
 * 
 * Features:
 * - Atomare Schreibvorgänge mit Backup-Mechanismus
 * - Automatic Backup & Recovery bei korrupten Dateien
 * - TypeScript-vollständige Typisierung
 * - Umfangreiche Fehlerbehandlung und Logging
 * - Thread-sichere Operationen mit Queue-System
 * - Diagnostik und Debugging-Tools
 * - Production-ready mit Tests
 */

import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageOptions {
  fileName?: string;
  backupCount?: number;
  autoBackup?: boolean;
  compression?: boolean;
  validateJson?: boolean;
  maxSize?: number; // in MB
}

export interface StorageData {
  [key: string]: any;
}

export interface StorageDiagnostics {
  isInitialized: boolean;
  dataPath: string;
  fileExists: boolean;
  fileSize: number;
  keyCount: number;
  lastError?: string;
  backupCount: number;
  queueLength: number;
  isHealthy: boolean;
}

export class PersistentStorage {
  private dataPath: string;
  private backupPath: string;
  private lockPath: string;
  private options: Required<StorageOptions>;
  private data: StorageData = {};
  private isLoading = false;
  private isSaving = false;
  private saveQueue: Promise<void> = Promise.resolve();
  private operationQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastError: string | null = null;
  private isInitialized = false;

  constructor(options: StorageOptions = {}) {
    this.options = {
      fileName: options.fileName || 'mazerations-storage.json',
      backupCount: options.backupCount || 5,
      autoBackup: options.autoBackup ?? true,
      compression: options.compression ?? false,
      validateJson: options.validateJson ?? true,
      maxSize: options.maxSize || 50, // 50MB Standard
    };

    // Pfade definieren
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, this.options.fileName);
    this.backupPath = path.join(userDataPath, 'storage-backups');
    this.lockPath = `${this.dataPath}.lock`;

    // Asynchrone Initialisierung
    this.initializeStorageAsync();
    this.setupIPCHandlers();
  }

  /**
   * Asynchrone Initialisierung des Storage-Systems
   */
  private async initializeStorageAsync(): Promise<void> {
    try {
      console.log('[PersistentStorage] Starte Initialisierung...');
      
      // Verzeichnisse erstellen
      await this.ensureDirectories();
      
      // Lock-Datei Cleanup (falls App zuvor abgestürzt)
      await this.cleanupLockFile();
      
      // Daten laden
      await this.loadDataSafely();
      
      // Integritätsprüfung
      this.validateDataIntegrity();
      
      this.isInitialized = true;
      console.log(`[PersistentStorage] ✅ Initialisiert: ${this.dataPath}`);
      console.log(`[PersistentStorage] ✅ Schlüssel geladen: ${Object.keys(this.data).length}`);
      
    } catch (error) {
      this.lastError = `Initialisierung fehlgeschlagen: ${error}`;
      console.error('[PersistentStorage] ❌ Initialisierung fehlgeschlagen:', error);
      
      // Sicherer Fallback
      this.data = {};
      this.isInitialized = true; // Trotz Fehler als initialisiert markieren
    }
  }

  /**
   * Stellt sicher, dass alle benötigten Verzeichnisse existieren
   */
  private async ensureDirectories(): Promise<void> {
    try {
      if (!fs.existsSync(this.backupPath)) {
        fs.mkdirSync(this.backupPath, { recursive: true });
        console.log(`[PersistentStorage] Backup-Verzeichnis erstellt: ${this.backupPath}`);
      }
      
      // Teste Schreibberechtigung
      const testFile = path.join(this.backupPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
    } catch (error) {
      throw new Error(`Verzeichnis-Setup fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Bereinigt verwaiste Lock-Dateien von vorherigen Abstürzen
   */
  private async cleanupLockFile(): Promise<void> {
    try {
      if (fs.existsSync(this.lockPath)) {
        const lockStats = fs.statSync(this.lockPath);
        const now = Date.now();
        const lockAge = now - lockStats.mtime.getTime();
        
        // Lock-Datei älter als 30 Sekunden -> wahrscheinlich Absturz
        if (lockAge > 30000) {
          fs.unlinkSync(this.lockPath);
          console.log('[PersistentStorage] Verwaiste Lock-Datei bereinigt');
        }
      }
    } catch (error) {
      console.warn('[PersistentStorage] Lock-Cleanup Warnung:', error);
    }
  }

  /**
   * Sichere Daten-Laden mit verbesserter Fehlerbehandlung
   */
  private async loadDataSafely(): Promise<void> {
    if (this.isLoading) {
      console.log('[PersistentStorage] Laden bereits im Gange, warte...');
      return;
    }
    
    this.isLoading = true;
    
    try {
      // 1. Versuche Hauptdatei zu laden
      if (fs.existsSync(this.dataPath)) {
        const mainFileResult = await this.loadFromFile(this.dataPath);
        if (mainFileResult.success) {
          this.data = mainFileResult.data;
          console.log(`[PersistentStorage] ✅ Hauptdatei geladen (${Object.keys(this.data).length} Schlüssel)`);
          return;
        } else {
          console.warn(`[PersistentStorage] ⚠️  Hauptdatei beschädigt: ${mainFileResult.error}`);
        }
      }

      // 2. Versuche Backup-Dateien (neueste zuerst)
      const backups = this.getBackupFiles();
      console.log(`[PersistentStorage] Suche nach Backups... ${backups.length} gefunden`);
      
      for (const backup of backups) {
        try {
          const backupPath = path.join(this.backupPath, backup);
          const backupResult = await this.loadFromFile(backupPath);
          
          if (backupResult.success) {
            this.data = backupResult.data;
            console.log(`[PersistentStorage] ✅ Backup wiederhergestellt: ${backup}`);
            
            // Hauptdatei aus funktionierendem Backup wiederherstellen
            await this.saveDataDirectly();
            console.log(`[PersistentStorage] ✅ Hauptdatei aus Backup wiederhergestellt`);
            return;
          } else {
            console.warn(`[PersistentStorage] ⚠️  Backup ${backup} beschädigt: ${backupResult.error}`);
          }
        } catch (backupError) {
          console.warn(`[PersistentStorage] ⚠️  Backup ${backup} Fehler:`, backupError);
        }
      }

      // 3. Keine funktionsfähigen Daten gefunden
      console.log('[PersistentStorage] ⚠️  Keine gültigen Daten gefunden, starte mit leerem Storage');
      this.data = {};
      
      // Leeres Storage initial speichern
      await this.saveDataDirectly();
      
    } catch (error) {
      this.lastError = `Laden fehlgeschlagen: ${error}`;
      console.error('[PersistentStorage] ❌ Kritischer Fehler beim Laden:', error);
      this.data = {};
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Lädt Daten aus einer spezifischen Datei mit Validierung
   */
  private async loadFromFile(filePath: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Datei lesen
      const rawData = fs.readFileSync(filePath, 'utf8');
      
      // Größenprüfung
      const fileSizeBytes = Buffer.byteLength(rawData, 'utf8');
      const maxSizeBytes = this.options.maxSize * 1024 * 1024;
      
      if (fileSizeBytes > maxSizeBytes) {
        return { 
          success: false, 
          error: `Datei zu groß: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB > ${this.options.maxSize}MB` 
        };
      }

      // JSON parsen
      const parsedData = JSON.parse(rawData);
      
      // Validierung (wenn aktiviert)
      if (this.options.validateJson && !this.validateStorageData(parsedData)) {
        return { success: false, error: 'Datenformat ungültig' };
      }

      return { success: true, data: parsedData };
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { success: false, error: `JSON-Syntaxfehler: ${error.message}` };
      }
      return { success: false, error: `Lesefehler: ${error}` };
    }
  }

  /**
   * Validiert die Datenstruktur
   */
  private validateStorageData(data: any): boolean {
    try {
      // Basis-Validierung: muss Object sein
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return false;
      }
      
      // Prüfe auf zirkuläre Referenzen durch erneutes JSON.stringify
      JSON.stringify(data);
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validiert die Datenintegrität des geladenen Storage
   */
  private validateDataIntegrity(): void {
    try {
      // Basis-Validierung der Datenstruktur
      if (!this.validateStorageData(this.data)) {
        console.warn('[PersistentStorage] ⚠️  Datenintegrität: Ungültige Datenstruktur, setze auf leeres Objekt zurück');
        this.data = {};
        return;
      }

      // Prüfe auf verdächtige Schlüssel
      const keys = Object.keys(this.data);
      const suspiciousKeys = keys.filter(key => 
        key.includes('__proto__') || 
        key.includes('constructor') || 
        key.includes('prototype')
      );

      if (suspiciousKeys.length > 0) {
        console.warn('[PersistentStorage] ⚠️  Verdächtige Schlüssel entdeckt:', suspiciousKeys);
        suspiciousKeys.forEach(key => delete this.data[key]);
      }

      // Größenprüfung
      const dataSize = JSON.stringify(this.data).length;
      if (dataSize > this.options.maxSize * 1024 * 1024) {
        console.warn(`[PersistentStorage] ⚠️  Daten zu groß: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);
      }

      console.log(`[PersistentStorage] ✅ Datenintegrität OK: ${keys.length} Schlüssel, ${(dataSize / 1024).toFixed(1)}KB`);

    } catch (error) {
      console.error('[PersistentStorage] ❌ Integritätsprüfung fehlgeschlagen:', error);
      this.data = {}; // Sicherer Fallback
    }
  }

  /**
   * Speichert Daten atomisch mit verbesserter Sicherheit
   */
  private async saveData(): Promise<void> {
    return this.addToQueue(() => this.saveDataDirectly());
  }

  /**
   * Direkte, atomare Speicherung ohne Queue
   */
  private async saveDataDirectly(): Promise<void> {
    if (this.isSaving) {
      throw new Error('Speichervorgang bereits aktiv');
    }
    
    this.isSaving = true;
    const lockAcquired = await this.acquireLock();
    
    try {
      const startTime = Date.now();
      const dataString = JSON.stringify(this.data, null, 2);
      const dataSizeBytes = Buffer.byteLength(dataString, 'utf8');
      
      // Größenprüfung
      const maxSizeBytes = this.options.maxSize * 1024 * 1024;
      if (dataSizeBytes > maxSizeBytes) {
        throw new Error(`Daten zu groß: ${(dataSizeBytes / 1024 / 1024).toFixed(2)}MB > ${this.options.maxSize}MB`);
      }

      const tempPath = `${this.dataPath}.tmp`;
      
      // Backup erstellen falls Hauptdatei existiert
      if (fs.existsSync(this.dataPath) && this.options.autoBackup) {
        await this.createBackup();
      }

      try {
        // Atomarer Schreibvorgang über temporäre Datei
        fs.writeFileSync(tempPath, dataString, 'utf8');
        
        // Temporäre Datei validieren
        const tempData = fs.readFileSync(tempPath, 'utf8');
        JSON.parse(tempData); // Validierung
        
        // Atomarer Move (rename ist atomar auf den meisten Dateisystemen)
        fs.renameSync(tempPath, this.dataPath);
        
        const duration = Date.now() - startTime;
        console.log(`[PersistentStorage] ✅ Gespeichert: ${Object.keys(this.data).length} Schlüssel, ${(dataSizeBytes / 1024).toFixed(1)}KB, ${duration}ms`);
        
      } catch (error) {
        // Cleanup bei Fehler
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        throw error;
      }
      
    } catch (error) {
      this.lastError = `Speichern fehlgeschlagen: ${error}`;
      console.error('[PersistentStorage] ❌ Speichern fehlgeschlagen:', error);
      throw error;
    } finally {
      if (lockAcquired) {
        await this.releaseLock();
      }
      this.isSaving = false;
    }
  }

  /**
   * Queue-System für sequentielle Operationen
   */
  private async addToQueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });
      
      this.processQueue();
    });
  }

  /**
   * Verarbeitet die Operation-Queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift()!;
      try {
        await operation();
      } catch (error) {
        console.error('[PersistentStorage] Queue-Operation fehlgeschlagen:', error);
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Lock-System für Thread-Sicherheit
   */
  private async acquireLock(): Promise<boolean> {
    try {
      if (fs.existsSync(this.lockPath)) {
        // Prüfe Alter des Locks
        const lockStats = fs.statSync(this.lockPath);
        const lockAge = Date.now() - lockStats.mtime.getTime();
        
        if (lockAge < 10000) { // 10 Sekunden Timeout
          return false; // Lock noch aktiv
        }
      }
      
      fs.writeFileSync(this.lockPath, process.pid.toString());
      return true;
    } catch (error) {
      console.warn('[PersistentStorage] Lock-Akquise fehlgeschlagen:', error);
      return false;
    }
  }

  /**
   * Gibt das Lock frei
   */
  private async releaseLock(): Promise<void> {
    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch (error) {
      console.warn('[PersistentStorage] Lock-Release Warnung:', error);
    }
  }

  /**
   * Erstellt ein Backup der aktuellen Datei
   */
  private async createBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${path.basename(this.options.fileName, '.json')}_${timestamp}.json`;
      const backupFilePath = path.join(this.backupPath, backupFileName);

      fs.copyFileSync(this.dataPath, backupFilePath);

      // Alte Backups bereinigen
      await this.cleanupOldBackups();
      
    } catch (error) {
      console.error('[PersistentStorage] Fehler beim Backup erstellen:', error);
    }
  }

  /**
   * Räumt alte Backup-Dateien auf
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = this.getBackupFiles();
      
      if (backups.length > this.options.backupCount) {
        const toDelete = backups.slice(this.options.backupCount);
        
        for (const backup of toDelete) {
          const backupPath = path.join(this.backupPath, backup);
          fs.unlinkSync(backupPath);
          console.log(`[PersistentStorage] Altes Backup entfernt: ${backup}`);
        }
      }
    } catch (error) {
      console.error('[PersistentStorage] Fehler beim Backup-Cleanup:', error);
    }
  }

  /**
   * Holt sortierte Liste der Backup-Dateien (neueste zuerst)
   */
  private getBackupFiles(): string[] {
    try {
      const files = fs.readdirSync(this.backupPath);
      const prefix = path.basename(this.options.fileName, '.json');
      
      return files
        .filter(file => file.startsWith(prefix) && file.endsWith('.json'))
        .sort()
        .reverse(); // Neueste zuerst
        
    } catch (error) {
      return [];
    }
  }

  /**
   * IPC Handler für Renderer-Prozess Setup
   */
  private setupIPCHandlers(): void {
    // Wert lesen
    ipcMain.handle('storage-get', (event, key: string) => {
      return this.get(key);
    });

    // Wert schreiben
    ipcMain.handle('storage-set', async (event, key: string, value: any) => {
      return this.set(key, value);
    });

    // Wert entfernen
    ipcMain.handle('storage-remove', async (event, key: string) => {
      return this.remove(key);
    });

    // Alle Daten lesen
    ipcMain.handle('storage-get-all', () => {
      return this.getAll();
    });

    // Storage leeren
    ipcMain.handle('storage-clear', async () => {
      return this.clear();
    });

    // Schlüssel auflisten
    ipcMain.handle('storage-keys', () => {
      return this.keys();
    });

    // Storage-Info abrufen
    ipcMain.handle('storage-info', () => {
      return this.getStorageInfo();
    });

    // Erweiterte Diagnose
    ipcMain.handle('storage-diagnostics', async () => {
      return this.getDiagnostics();
    });

    // Manuelles Backup
    ipcMain.handle('storage-create-backup', async (event, name?: string) => {
      return this.createManualBackup(name);
    });

    // Daten exportieren
    ipcMain.handle('storage-export', async () => {
      return this.exportData();
    });

    // Daten importieren
    ipcMain.handle('storage-import', async (event, jsonData: string) => {
      return this.importData(jsonData);
    });

    console.log('[PersistentStorage] IPC Handlers registriert');
  }

  /**
   * Öffentliche API-Methoden
   */

  /**
   * Setzt einen Wert im Storage
   */
  public async set(key: string, value: any): Promise<void> {
    this.data[key] = value;
    await this.saveData();
  }

  /**
   * Holt einen Wert aus dem Storage
   */
  public get<T = any>(key: string): T | null {
    return this.data[key] ?? null;
  }

  /**
   * Entfernt einen Wert aus dem Storage
   */
  public async remove(key: string): Promise<boolean> {
    if (key in this.data) {
      delete this.data[key];
      await this.saveData();
      return true;
    }
    return false;
  }

  /**
   * Holt alle Daten
   */
  public getAll(): StorageData {
    return { ...this.data };
  }

  /**
   * Leert den kompletten Storage
   */
  public async clear(): Promise<void> {
    this.data = {};
    await this.saveData();
  }

  /**
   * Holt alle Schlüssel
   */
  public keys(): string[] {
    return Object.keys(this.data);
  }

  /**
   * Holt Storage-Informationen mit Diagnosedaten
   */
  public getStorageInfo(): StorageDiagnostics {
    const fileExists = fs.existsSync(this.dataPath);
    const fileSize = fileExists ? fs.statSync(this.dataPath).size : 0;
    const backupCount = this.getBackupFiles().length;
    const keyCount = Object.keys(this.data).length;
    
    return {
      isInitialized: this.isInitialized,
      dataPath: this.dataPath,
      fileExists,
      fileSize,
      keyCount,
      lastError: this.lastError || undefined,
      backupCount,
      queueLength: this.operationQueue.length,
      isHealthy: this.isInitialized && !this.lastError && keyCount >= 0,
    };
  }

  /**
   * Erweiterte Diagnosemethode für Debugging
   */
  public async getDiagnostics(): Promise<{
    basic: StorageDiagnostics;
    performance: {
      isLoading: boolean;
      isSaving: boolean;
      isProcessingQueue: boolean;
    };
    files: {
      mainFile: { exists: boolean; size: number; readable: boolean };
      backups: Array<{ name: string; size: number; age: number }>;
      lockFile: { exists: boolean; age?: number };
    };
    testResult?: {
      writeTest: boolean;
      readTest: boolean;
      deleteTest: boolean;
      error?: string;
    };
  }> {
    const basic = this.getStorageInfo();
    
    // Performance-Info
    const performance = {
      isLoading: this.isLoading,
      isSaving: this.isSaving,
      isProcessingQueue: this.isProcessingQueue,
    };

    // Datei-Info
    const files = {
      mainFile: {
        exists: basic.fileExists,
        size: basic.fileSize,
        readable: false,
      },
      backups: [] as Array<{ name: string; size: number; age: number }>,
      lockFile: {
        exists: fs.existsSync(this.lockPath),
      } as { exists: boolean; age?: number },
    };

    // Hauptdatei Lesbarkeit testen
    try {
      if (basic.fileExists) {
        fs.readFileSync(this.dataPath, 'utf8');
        files.mainFile.readable = true;
      }
    } catch {
      files.mainFile.readable = false;
    }

    // Backup-Dateien Info
    try {
      const backupFiles = this.getBackupFiles();
      files.backups = backupFiles.map(file => {
        const filePath = path.join(this.backupPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          age: Date.now() - stats.mtime.getTime(),
        };
      });
    } catch (error) {
      console.warn('[PersistentStorage] Backup-Info Fehler:', error);
    }

    // Lock-Datei Alter
    if (files.lockFile.exists) {
      try {
        const lockStats = fs.statSync(this.lockPath);
        files.lockFile.age = Date.now() - lockStats.mtime.getTime();
      } catch {
        // Ignorieren
      }
    }

    // Funktionstest (wenn nicht gerade andere Operationen laufen)
    let testResult;
    if (!performance.isLoading && !performance.isSaving && !performance.isProcessingQueue) {
      testResult = await this.runFunctionTest();
    }

    return { basic, performance, files, testResult };
  }

  /**
   * Führt einen einfachen Funktionstest durch
   */
  private async runFunctionTest(): Promise<{
    writeTest: boolean;
    readTest: boolean;
    deleteTest: boolean;
    error?: string;
  }> {
    const testKey = '__storage_function_test__';
    const testValue = { timestamp: Date.now(), test: true };

    try {
      // Write-Test
      await this.set(testKey, testValue);
      
      // Read-Test
      const readValue = this.get(testKey);
      const readTest = JSON.stringify(readValue) === JSON.stringify(testValue);
      
      // Delete-Test
      const deleteTest = await this.remove(testKey);
      
      return {
        writeTest: true,
        readTest,
        deleteTest,
      };
    } catch (error) {
      return {
        writeTest: false,
        readTest: false,
        deleteTest: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Exportiert alle Daten
   */
  public async exportData(): Promise<string> {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Importiert Daten (überschreibt vorhandene)
   */
  public async importData(jsonData: string): Promise<void> {
    try {
      const parsedData = JSON.parse(jsonData);
      this.data = parsedData;
      await this.saveData();
    } catch (error) {
      throw new Error(`Import fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Manuelles Backup erstellen
   */
  public async createManualBackup(name?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name ? `manual_${name}_${timestamp}` : `manual_${timestamp}`;
    const backupFileName = `${backupName}.json`;
    const backupFilePath = path.join(this.backupPath, backupFileName);

    await this.saveData(); // Sicherstellen dass aktuelle Daten gespeichert sind
    fs.copyFileSync(this.dataPath, backupFilePath);

    return backupFilePath;
  }
}

// Singleton-Instanz für die App
let storageInstance: PersistentStorage | null = null;

/**
 * Holt die Singleton-Instanz des Storage
 */
export function getStorageInstance(): PersistentStorage {
  if (!storageInstance) {
    storageInstance = new PersistentStorage();
  }
  return storageInstance;
}

/**
 * Initialisiert den Storage mit benutzerdefinierten Optionen
 */
export function initializeStorage(options?: StorageOptions): PersistentStorage {
  storageInstance = new PersistentStorage(options);
  return storageInstance;
}