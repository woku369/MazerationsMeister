/**
 * Tank Data Migration Utility
 * Migriert Tank-Daten von localStorage zu Hybrid Storage
 */

import { hybridStorage } from './hybrid-storage';

export class TankDataMigration {
  /**
   * Migriert Tank-Daten von localStorage zu Hybrid Storage
   */
  static async migrateTankDataToHybridStorage(): Promise<void> {
    try {
      console.log('🔄 Starte Tank-Daten Migration zu Hybrid Storage...');
      
      // Prüfe ob tankDefinitions in localStorage existiert
      if (typeof window !== 'undefined') {
        const tankDefinitionsData = localStorage.getItem('tankDefinitions');
        const inventoryItemsData = localStorage.getItem('inventoryItems');
        
        if (tankDefinitionsData) {
          const tankDefinitions = JSON.parse(tankDefinitionsData);
          await hybridStorage.set('tankDefinitions', tankDefinitions);
          console.log('✅ Tank-Definitionen zu Hybrid Storage migriert');
        }
        
        if (inventoryItemsData) {
          const inventoryItems = JSON.parse(inventoryItemsData);
          await hybridStorage.set('inventoryItems', inventoryItems);
          console.log('✅ Inventory-Daten zu Hybrid Storage migriert');
        }
        
        // GitHub-Token auch migrieren falls vorhanden
        const githubToken = localStorage.getItem('github-token');
        if (githubToken) {
          await hybridStorage.set('github-token', githubToken);
          console.log('✅ GitHub-Token zu Hybrid Storage migriert');
        }
        
        console.log('✅ Tank-Daten Migration abgeschlossen');
      }
    } catch (error) {
      console.error('❌ Fehler bei Tank-Daten Migration:', error);
    }
  }
  
  /**
   * Lädt Tank-Daten aus Hybrid Storage (mit localStorage Fallback)
   */
  static async loadTankData(): Promise<{ tankDefinitions: any[], inventoryItems: any[] } | null> {
    try {
      // Versuche zuerst aus Hybrid Storage zu laden
      let tankDefinitions = await hybridStorage.get('tankDefinitions');
      let inventoryItems = await hybridStorage.get('inventoryItems');
      
      // Fallback zu localStorage wenn Hybrid Storage leer ist
      if (!tankDefinitions && typeof window !== 'undefined') {
        const localTankData = localStorage.getItem('tankDefinitions');
        if (localTankData) {
          tankDefinitions = JSON.parse(localTankData);
          // Migriere gleichzeitig
          await hybridStorage.set('tankDefinitions', tankDefinitions);
        }
      }
      
      if (!inventoryItems && typeof window !== 'undefined') {
        const localInventoryData = localStorage.getItem('inventoryItems');
        if (localInventoryData) {
          inventoryItems = JSON.parse(localInventoryData);
          // Migriere gleichzeitig
          await hybridStorage.set('inventoryItems', inventoryItems);
        }
      }
      
      if (tankDefinitions && inventoryItems) {
        return { tankDefinitions, inventoryItems };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Fehler beim Laden der Tank-Daten:', error);
      return null;
    }
  }
}