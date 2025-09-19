// OneDrive-Integration ohne Azure-Registrierung
// Nutzt lokalen OneDrive-Ordner für automatische Cloud-Sync

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

class OneDriveLocalSync {
  private oneDrivePath: string;
  
  constructor() {
    // Automatische OneDrive-Pfad-Erkennung
    const userHome = os.homedir();
    this.oneDrivePath = path.join(userHome, 'OneDrive', 'MazerationsMeister');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    const dirs = [
      this.oneDrivePath,
      path.join(this.oneDrivePath, 'tanks'),
      path.join(this.oneDrivePath, 'chargen'),
      path.join(this.oneDrivePath, 'backup')
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.log(`Verzeichnis existiert bereits: ${dir}`);
      }
    }
  }

  // Tank-Daten speichern (automatisch in OneDrive)
  async saveTankData(tankId: string, data: any) {
    const fileName = `tank-${tankId}.json`;
    const filePath = path.join(this.oneDrivePath, 'tanks', fileName);
    
    const tankData = {
      ...data,
      lastUpdated: new Date().toISOString(),
      syncVersion: Date.now()
    };

    try {
      await fs.writeFile(filePath, JSON.stringify(tankData, null, 2), 'utf8');
      console.log(`✅ Tank-Daten gespeichert: ${fileName}`);
      
      // Backup erstellen
      await this.createBackup(tankId, tankData);
      
      return true;
    } catch (error) {
      console.error(`❌ Fehler beim Speichern: ${error}`);
      return false;
    }
  }

  // Tank-Daten laden (aus OneDrive)
  async loadTankData(tankId: string) {
    const fileName = `tank-${tankId}.json`;
    const filePath = path.join(this.oneDrivePath, 'tanks', fileName);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const tankData = JSON.parse(data);
      
      console.log(`✅ Tank-Daten geladen: ${fileName}`);
      return tankData;
    } catch (error) {
      console.log(`⚠️ Tank-Datei nicht gefunden: ${fileName}`);
      return null;
    }
  }

  // Alle Tank-Daten auflisten
  async getAllTanks() {
    const tanksDir = path.join(this.oneDrivePath, 'tanks');
    
    try {
      const files = await fs.readdir(tanksDir);
      const tankFiles = files.filter(file => file.startsWith('tank-') && file.endsWith('.json'));
      
      const tanks = [];
      for (const file of tankFiles) {
        const tankId = file.replace('tank-', '').replace('.json', '');
        const data = await this.loadTankData(tankId);
        if (data) {
          tanks.push({ tankId, ...data });
        }
      }
      
      return tanks;
    } catch (error) {
      console.error('Fehler beim Laden der Tank-Liste:', error);
      return [];
    }
  }

  // Backup erstellen
  private async createBackup(tankId: string, data: any) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tank-${tankId}_${timestamp}.json`;
    const backupPath = path.join(this.oneDrivePath, 'backup', backupFileName);
    
    try {
      await fs.writeFile(backupPath, JSON.stringify(data, null, 2), 'utf8');
      
      // Alte Backups löschen (nur die letzten 10 behalten)
      await this.cleanupOldBackups(tankId);
    } catch (error) {
      console.error('Backup-Fehler:', error);
    }
  }

  // Alte Backups aufräumen
  private async cleanupOldBackups(tankId: string) {
    const backupDir = path.join(this.oneDrivePath, 'backup');
    
    try {
      const files = await fs.readdir(backupDir);
      const tankBackups = files
        .filter(file => file.startsWith(`tank-${tankId}_`))
        .sort()
        .reverse();
      
      // Nur die letzten 10 behalten
      const filesToDelete = tankBackups.slice(10);
      
      for (const file of filesToDelete) {
        await fs.unlink(path.join(backupDir, file));
      }
    } catch (error) {
      console.error('Fehler beim Aufräumen der Backups:', error);
    }
  }

  // Tank-Inhalte aktualisieren (Charge hinzufügen/entfernen)
  async updateTankContents(tankId: string, charges: any[]) {
    const currentData = await this.loadTankData(tankId) || {
      tankId,
      tankNr: tankId.replace('tank-', '').toUpperCase(),
      charges: [],
      gesamtfuellstand: 0
    };

    // Gesamtfüllstand berechnen
    const gesamtfuellstand = charges.reduce((total, charge) => total + (charge.menge || 0), 0);

    const updatedData = {
      ...currentData,
      charges,
      gesamtfuellstand,
      lastUpdated: new Date().toISOString()
    };

    return await this.saveTankData(tankId, updatedData);
  }

  // Charge hinzufügen
  async addCharge(tankId: string, chargeData: any) {
    const currentData = await this.loadTankData(tankId) || { charges: [] };
    const charges = [...(currentData.charges || []), chargeData];
    
    return await this.updateTankContents(tankId, charges);
  }

  // Charge entfernen
  async removeCharge(tankId: string, chargeId: string) {
    const currentData = await this.loadTankData(tankId) || { charges: [] };
    const charges = (currentData.charges || []).filter((c: any) => c.chargeId !== chargeId);
    
    return await this.updateTankContents(tankId, charges);
  }

  // Status prüfen
  async getStatus() {
    try {
      const stats = await fs.stat(this.oneDrivePath);
      const tanks = await this.getAllTanks();
      
      return {
        connected: true,
        path: this.oneDrivePath,
        tanksCount: tanks.length,
        lastSync: stats.mtime
      };
    } catch (error) {
      return {
        connected: false,
        error: String(error),
        path: this.oneDrivePath
      };
    }
  }
}

export default OneDriveLocalSync;
