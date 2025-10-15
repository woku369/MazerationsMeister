/**
 * Storage Debug CLI Tool
 * Analysiert und repariert Storage-Probleme 
 */

import { hybridStorage } from './hybrid-storage';

export class StorageDebugCLI {
  /**
   * Vollständige Storage-Analyse
   */
  static async analyzeStorage() {
    console.log('🔍 === STORAGE DEBUG ANALYSE ===');
    
    try {
      // 1. Grundlegende Diagnose
      console.log('\n📊 1. HYBRID STORAGE DIAGNOSE:');
      const diagnosis = await hybridStorage.diagnose();
      console.log(JSON.stringify(diagnosis, null, 2));
      
      // 2. Alle Keys auflisten
      console.log('\n🔑 2. ALLE GESPEICHERTEN SCHLÜSSEL:');
      const allKeys = await this.getAllKeys();
      console.log(`Anzahl Schlüssel: ${allKeys.length}`);
      allKeys.forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}`);
      });
      
      // 3. Tank-relevante Daten prüfen
      console.log('\n🏭 3. TANK-RELEVANTE DATEN:');
      const tankDefinitions = await hybridStorage.get('tankDefinitions');
      const inventoryItems = await hybridStorage.get('inventoryItems');
      
      console.log(`Tank-Definitionen: ${tankDefinitions ? tankDefinitions.length : 'NULL'} Einträge`);
      console.log(`Inventory-Items: ${inventoryItems ? inventoryItems.length : 'NULL'} Einträge`);
      
      if (tankDefinitions) {
        console.log('Tank-IDs:', tankDefinitions.map((t: any) => t.id));
      }
      
      // 4. Electron Storage direkt prüfen
      console.log('\n💾 4. ELECTRON STORAGE (falls verfügbar):');
      await this.checkElectronStorage();
      
      // 5. localStorage Backup prüfen
      console.log('\n📱 5. LOCALSTORAGE BACKUP:');
      this.checkLocalStorage();
      
      return { diagnosis, allKeys, tankDefinitions, inventoryItems };
      
    } catch (error: any) {
      console.error('❌ Fehler bei Storage-Analyse:', error);
      throw error;
    }
  }
  
  /**
   * Alle Storage-Keys sammeln
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      
      // Hybrid Storage Keys
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (!keys.includes(key)) keys.push(key);
        });
      }
      
      // Electron Storage Keys (falls verfügbar)
      if (typeof window !== 'undefined' && (window as any).electronAPI?.storage) {
        try {
          const electronKeys = await (window as any).electronAPI.storage.getAllKeys();
          if (electronKeys) {
            electronKeys.forEach((key: string) => {
              if (!keys.includes(key)) keys.push(key);
            });
          }
        } catch (e) {
          console.log('Electron Storage nicht verfügbar:', e);
        }
      }
      
      return keys.sort();
    } catch (error: any) {
      console.error('Fehler beim Sammeln der Keys:', error);
      return [];
    }
  }
  
  /**
   * Electron Storage direkt prüfen
   */
  static async checkElectronStorage() {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.storage) {
      try {
        const electronAPI = (window as any).electronAPI;
        
        console.log('✅ Electron Storage verfügbar');
        
        // Alle Electron Keys
        const electronKeys = await electronAPI.storage.getAllKeys();
        console.log(`Electron Keys (${electronKeys?.length || 0}):`, electronKeys);
        
        // Tank-Daten in Electron
        const electronTanks = await electronAPI.storage.get('tankDefinitions');
        const electronInventory = await electronAPI.storage.get('inventoryItems');
        
        console.log('Electron Tank-Definitionen:', electronTanks ? electronTanks.length : 'NULL');
        console.log('Electron Inventory-Items:', electronInventory ? electronInventory.length : 'NULL');
        
      } catch (error: any) {
        console.log('❌ Electron Storage Fehler:', error.message);
      }
    } else {
      console.log('⚠️ Electron Storage nicht verfügbar (Browser-Modus?)');
    }
  }
  
  /**
   * localStorage direkt prüfen
   */
  static checkLocalStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      console.log('✅ localStorage verfügbar');
      
      // Tank-relevante localStorage Keys
      const tankKeys = Object.keys(localStorage).filter(key => 
        key.includes('tank') || key.includes('inventory') || key.includes('mazeration')
      );
      
      console.log(`localStorage Tank-Keys (${tankKeys.length}):`, tankKeys);
      
      tankKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              console.log(`  ${key}: ${parsed.length} Einträge`);
            } else {
              console.log(`  ${key}: ${typeof parsed} (${Object.keys(parsed).length} Properties)`);
            }
          } catch {
            console.log(`  ${key}: String (${value.length} Zeichen)`);
          }
        }
      });
    } else {
      console.log('❌ localStorage nicht verfügbar');
    }
  }
  
  /**
   * Storage-Reparatur versuchen
   */
  static async repairStorage() {
    console.log('\n🔧 === STORAGE REPARATUR ===');
    
    try {
      // 1. Tank-Daten aus localStorage zu Hybrid migrieren
      if (typeof window !== 'undefined' && window.localStorage) {
        const tankDefs = localStorage.getItem('tankDefinitions');
        const invItems = localStorage.getItem('inventoryItems');
        
        if (tankDefs) {
          const parsed = JSON.parse(tankDefs);
          await hybridStorage.set('tankDefinitions', parsed);
          console.log(`✅ ${parsed.length} Tank-Definitionen migriert`);
        }
        
        if (invItems) {
          const parsed = JSON.parse(invItems);
          await hybridStorage.set('inventoryItems', parsed);
          console.log(`✅ ${parsed.length} Inventory-Items migriert`);
        }
      }
      
      // 2. Verifikation
      console.log('\n🔍 Verifikation nach Reparatur:');
      const tanks = await hybridStorage.get('tankDefinitions');
      const inventory = await hybridStorage.get('inventoryItems');
      
      console.log(`Tank-Definitionen: ${tanks ? tanks.length : 0}`);
      console.log(`Inventory-Items: ${inventory ? inventory.length : 0}`);
      
      return { tanks, inventory };
      
    } catch (error: any) {
      console.error('❌ Reparatur fehlgeschlagen:', error);
      throw error;
    }
  }
  
  /**
   * Storage bereinigen (überflüssige Keys entfernen)
   */
  static async cleanupStorage() {
    console.log('\n🧹 === STORAGE BEREINIGUNG ===');
    
    try {
      const allKeys = await this.getAllKeys();
      
      // Blacklist für überflüssige Keys
      const unnecessaryKeys = allKeys.filter(key => 
        key.startsWith('_') ||                    // Private Keys
        key.includes('temp') ||                   // Temporäre Keys
        key.includes('test') ||                   // Test-Keys
        key.includes('debug') ||                  // Debug-Keys
        key.match(/^.{50,}$/) ||                 // Sehr lange Keys (wahrscheinlich Müll)
        key.includes('backup-') && key.includes('2024') // Alte Backups
      );
      
      console.log(`Gefundene unnötige Keys (${unnecessaryKeys.length}):`, unnecessaryKeys);
      
      // Bereinigung durchführen
      for (const key of unnecessaryKeys) {
        try {
          await hybridStorage.remove(key);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(key);
          }
          console.log(`🗑️ Entfernt: ${key}`);
        } catch (error: any) {
          console.log(`⚠️ Konnte nicht entfernen: ${key} - ${error.message}`);
        }
      }
      
      console.log(`✅ Storage bereinigt: ${unnecessaryKeys.length} Keys entfernt`);
      return unnecessaryKeys.length;
      
    } catch (error: any) {
      console.error('❌ Bereinigung fehlgeschlagen:', error);
      throw error;
    }
  }
}