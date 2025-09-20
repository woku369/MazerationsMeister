/**
 * 🗄️ APP-DATEN-MANAGER (UNIVERSAL)
 * Persistenter Speicher für alle Echtdaten - Browser UND Electron!
 * 
 * Browser: localStorage
 * Electron: JSON-Dateien im User-Verzeichnis
 * 
 * Automatisches Laden beim App-Start, sofortige Speicherung bei Änderungen
 */

// Re-export der universellen Speicher-API (vereinfacht)
export {
  initializeApp,
  saveTanks,
  saveInventory,
  saveProtocols,
  saveTasks,
  getTanks,
  getInventory,
  getProtocols,
  getAppDataStatus,
  universalStorage as appDataManager
} from './universal-storage-simple';

// Re-export der Interfaces
export type { AppData } from './universal-storage-simple';

// Legacy-Support für bestehenden Code
export async function createAppBackup(): Promise<string> {
  const { universalStorage } = await import('./universal-storage-simple');
  return await universalStorage.createBackup();
}

export async function restoreAppData(): Promise<boolean> {
  // TODO: Implement restore functionality
  console.warn('⚠️ Restore-Funktionalität noch nicht implementiert');
  return false;
}

export function clearAppData(): void {
  console.warn('⚠️ Clear-Funktionalität für Entwicklung - vorsichtig verwenden!');
}