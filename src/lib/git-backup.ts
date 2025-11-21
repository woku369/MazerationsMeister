/**
 * Git-synchronisierte Backup-Funktionen für Container-Definitionen
 * Version 1.2.2 - FIX 5.11d
 * 
 * Speichert Backups sowohl lokal (hybridStorage) als auch im Git-Repository (backups/)
 * Damit sind Backups auf allen Rechnern über GitHub verfügbar
 */

import type { TankDefinition } from '@/schemas/tankSchema';

/**
 * Erstellt ein Backup sowohl lokal als auch im Git-Repository
 */
export async function createGitBackup(tanks: TankDefinition[]): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `tankDefinitions_backup_${timestamp}.json`;
    
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.2.2',
      containerCount: tanks.length,
      containers: tanks
    };
    
    const backupJson = JSON.stringify(backupData, null, 2);
    
    // 1. Lokales Backup (wie bisher - für schnellen Zugriff)
    const { hybridStorage } = await import('./hybrid-storage');
    const backupKey = `tankDefinitions_backup_${timestamp}`;
    await hybridStorage.set(backupKey, backupData);
    console.log(`💾 Lokales Backup erstellt: ${backupKey} (${tanks.length} Container)`);
    
    // 2. Git-Repository Backup (für GitHub-Sync)
    await saveToGitBackup(filename, backupJson);
    
    // 3. Alte Backups aufräumen (beides: lokal + Git)
    await cleanupOldBackups();
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Git-Backups:', error);
  }
}

/**
 * Speichert Backup-Datei im Git-Repository (backups/ Verzeichnis)
 */
async function saveToGitBackup(filename: string, content: string): Promise<void> {
  try {
    // Verwende File System Access API (wenn verfügbar) oder Download-Fallback
    if ('showSaveFilePicker' in window) {
      // Moderne Browser mit File System Access API
      // Hinweis: Benötigt User-Interaktion, daher nur als Fallback
      console.log(`📁 Git-Backup bereit: ${filename}`);
    }
    
    // Für Electron: Nutze Node.js fs via IPC
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.saveGitBackup?.(filename, content);
      console.log(`✅ Git-Backup gespeichert: backups/${filename}`);
    } else {
      // Browser-Fallback: Trigger Download
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      console.log(`📥 Git-Backup als Download bereitgestellt: ${filename}`);
    }
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Git-Backups:', error);
  }
}

/**
 * Räumt alte Backups auf (lokal + Git)
 * Behält die letzten 10 Backups
 */
async function cleanupOldBackups(): Promise<void> {
  try {
    // 1. Lokale Backups aufräumen
    const { hybridStorage } = await import('./hybrid-storage');
    const allKeys = await hybridStorage.keys();
    const backupKeys = allKeys.filter(k => k.startsWith('tankDefinitions_backup_')).sort().reverse();
    
    if (backupKeys.length > 10) {
      for (const oldKey of backupKeys.slice(10)) {
        await hybridStorage.remove(oldKey);
        console.log(`🗑️ Altes lokales Backup gelöscht: ${oldKey}`);
      }
    }
    
    // 2. Git-Backups aufräumen (nur in Electron)
    if ((window as any).electronAPI?.cleanupGitBackups) {
      await (window as any).electronAPI.cleanupGitBackups(10);
      console.log(`🗑️ Alte Git-Backups aufgeräumt (max. 10 behalten)`);
    }
  } catch (error) {
    console.error('❌ Fehler beim Aufräumen der Backups:', error);
  }
}

/**
 * Lädt verfügbare Git-Backups (für Restore-Funktion)
 */
export async function listGitBackups(): Promise<Array<{
  filename: string;
  timestamp: string;
  containerCount: number;
  source: 'local' | 'git';
}>> {
  const backups: Array<{
    filename: string;
    timestamp: string;
    containerCount: number;
    source: 'local' | 'git';
  }> = [];
  
  try {
    // 1. Lokale Backups
    const { hybridStorage } = await import('./hybrid-storage');
    const allKeys = await hybridStorage.keys();
    const backupKeys = allKeys.filter(k => k.startsWith('tankDefinitions_backup_')).sort().reverse();
    
    for (const key of backupKeys) {
      const data = await hybridStorage.get(key);
      if (data && data.timestamp) {
        backups.push({
          filename: key,
          timestamp: data.timestamp,
          containerCount: data.containerCount || 0,
          source: 'local'
        });
      }
    }
    
    // 2. Git-Backups (nur in Electron)
    if ((window as any).electronAPI?.listGitBackups) {
      const gitBackups = await (window as any).electronAPI.listGitBackups();
      backups.push(...gitBackups.map((b: any) => ({ ...b, source: 'git' as const })));
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Auflisten der Backups:', error);
  }
  
  return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Stellt ein Backup wieder her (aus lokal oder Git)
 */
export async function restoreGitBackup(filename: string, source: 'local' | 'git'): Promise<TankDefinition[]> {
  try {
    let backupData: any;
    
    if (source === 'local') {
      const { hybridStorage } = await import('./hybrid-storage');
      backupData = await hybridStorage.get(filename);
    } else {
      // Git-Backup laden (nur in Electron)
      if ((window as any).electronAPI?.loadGitBackup) {
        backupData = await (window as any).electronAPI.loadGitBackup(filename);
      }
    }
    
    if (!backupData || !backupData.containers) {
      throw new Error('Backup-Daten ungültig');
    }
    
    console.log(`✅ Backup wiederhergestellt: ${filename} (${backupData.containerCount} Container)`);
    return backupData.containers;
    
  } catch (error) {
    console.error('❌ Fehler beim Wiederherstellen des Backups:', error);
    throw error;
  }
}
