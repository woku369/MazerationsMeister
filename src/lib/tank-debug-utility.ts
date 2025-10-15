/**
 * Tank Debug Utility
 * Diagnostiziert und repariert Tank-Daten Storage-Probleme
 */

import { hybridStorage } from './hybrid-storage';

export class TankDebugUtility {
  /**
   * Vollständige Diagnose der Tank-Daten
   */
  static async diagnoseTankData(): Promise<{
    localStorage: any;
    hybridStorage: any;
    electronStorage: any;
    recommendations: string[];
  }> {
    console.log('🔍 Starte vollständige Tank-Daten Diagnose...');
    
    const result = {
      localStorage: {},
      hybridStorage: {},
      electronStorage: {},
      recommendations: [] as string[]
    };

    try {
      // 1. localStorage prüfen
      if (typeof window !== 'undefined' && window.localStorage) {
        console.log('📱 Prüfe localStorage...');
        result.localStorage = {
          tankDefinitions: this.safeParse(localStorage.getItem('tankDefinitions')),
          inventoryItems: this.safeParse(localStorage.getItem('inventoryItems')),
          githubToken: localStorage.getItem('github-token') ? '***EXISTS***' : null,
          keys: Object.keys(localStorage).filter(k => k.includes('tank') || k.includes('inventory'))
        };
      }

      // 2. Hybrid Storage prüfen
      console.log('🔄 Prüfe Hybrid Storage...');
      result.hybridStorage = {
        tankDefinitions: await hybridStorage.get('tankDefinitions'),
        inventoryItems: await hybridStorage.get('inventoryItems'),
        githubToken: await hybridStorage.get('github-token') ? '***EXISTS***' : null,
        autoSyncConfig: await hybridStorage.get('autoSyncConfig')
      };

      // 3. Electron Storage prüfen (falls verfügbar)
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        console.log('💾 Prüfe Electron Storage...');
        try {
          const electronAPI = (window as any).electronAPI;
          if (electronAPI.storage) {
            result.electronStorage = {
              available: true,
              tankDefinitions: await electronAPI.storage.get('tankDefinitions'),
              inventoryItems: await electronAPI.storage.get('inventoryItems')
            };
          }
        } catch (e: any) {
          result.electronStorage = { available: false, error: e.message };
        }
      }

      // 4. Empfehlungen generieren
      result.recommendations = this.generateRecommendations(result);

      console.log('📊 Diagnose abgeschlossen:', result);
      return result;

    } catch (error) {
      console.error('❌ Fehler bei Tank-Daten Diagnose:', error);
      throw error;
    }
  }

  /**
   * Automatische Reparatur der Tank-Daten
   */
  static async autoFixTankData(): Promise<boolean> {
    console.log('🔧 Starte automatische Tank-Daten Reparatur...');
    
    try {
      const diagnosis = await this.diagnoseTankData();
      let fixed = false;

      // Reparatur-Strategie 1: localStorage → Hybrid Storage
      if (diagnosis.localStorage.tankDefinitions && !diagnosis.hybridStorage.tankDefinitions) {
        console.log('🔄 Migriere tankDefinitions von localStorage zu Hybrid Storage...');
        await hybridStorage.set('tankDefinitions', diagnosis.localStorage.tankDefinitions);
        fixed = true;
      }

      if (diagnosis.localStorage.inventoryItems && !diagnosis.hybridStorage.inventoryItems) {
        console.log('🔄 Migriere inventoryItems von localStorage zu Hybrid Storage...');
        await hybridStorage.set('inventoryItems', diagnosis.localStorage.inventoryItems);
        fixed = true;
      }

      // Reparatur-Strategie 2: Electron Storage → Hybrid Storage
      if (diagnosis.electronStorage.tankDefinitions && !diagnosis.hybridStorage.tankDefinitions) {
        console.log('🔄 Migriere tankDefinitions von Electron zu Hybrid Storage...');
        await hybridStorage.set('tankDefinitions', diagnosis.electronStorage.tankDefinitions);
        fixed = true;
      }

      if (diagnosis.electronStorage.inventoryItems && !diagnosis.hybridStorage.inventoryItems) {
        console.log('🔄 Migriere inventoryItems von Electron zu Hybrid Storage...');
        await hybridStorage.set('inventoryItems', diagnosis.electronStorage.inventoryItems);
        fixed = true;
      }

      // Reparatur-Strategie 3: Fallback-Daten erstellen
      if (!diagnosis.hybridStorage.tankDefinitions && !diagnosis.localStorage.tankDefinitions) {
        console.log('🆘 Keine Tank-Daten gefunden, erstelle Fallback...');
        await hybridStorage.set('tankDefinitions', []);
        fixed = true;
      }

      if (!diagnosis.hybridStorage.inventoryItems && !diagnosis.localStorage.inventoryItems) {
        console.log('🆘 Keine Inventory-Daten gefunden, erstelle Fallback...');
        await hybridStorage.set('inventoryItems', []);
        fixed = true;
      }

      if (fixed) {
        console.log('✅ Tank-Daten erfolgreich repariert!');
        // Erneute Diagnose zur Bestätigung
        const verification = await this.diagnoseTankData();
        console.log('🔍 Verifikation nach Reparatur:', verification);
      } else {
        console.log('ℹ️ Keine Reparatur erforderlich');
      }

      return fixed;

    } catch (error) {
      console.error('❌ Fehler bei automatischer Tank-Daten Reparatur:', error);
      return false;
    }
  }

  /**
   * Sicheres JSON Parsing
   */
  private static safeParse(jsonString: string | null): any {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }

  /**
   * Generiert Empfehlungen basierend auf Diagnose
   */
  private static generateRecommendations(diagnosis: any): string[] {
    const recommendations = [];

    if (diagnosis.localStorage.tankDefinitions && !diagnosis.hybridStorage.tankDefinitions) {
      recommendations.push('Migration von localStorage zu Hybrid Storage erforderlich');
    }

    if (!diagnosis.localStorage.tankDefinitions && !diagnosis.hybridStorage.tankDefinitions && !diagnosis.electronStorage.tankDefinitions) {
      recommendations.push('Keine Tank-Daten gefunden - Erstinitialisierung erforderlich');
    }

    if (diagnosis.hybridStorage.tankDefinitions && diagnosis.hybridStorage.inventoryItems) {
      recommendations.push('Tank-Daten sind verfügbar und synchronisierbar');
    }

    return recommendations;
  }

  /**
   * Erstellt Test-Daten für Synchronisation
   */
  static async createTestData(): Promise<void> {
    console.log('🧪 Erstelle Test-Tank-Daten...');
    
    const testTankDefinitions = [
      {
        id: 'TEST-001',
        name: 'Test Tank Alpha',
        capacity: 1000,
        type: 'Maischebottich',
        location: 'Testraum A'
      }
    ];

    const testInventoryItems = [
      {
        id: 'INV-TEST-001',
        tankId: 'TEST-001',
        content: 'Test-Maische',
        amount: 500,
        timestamp: new Date().toISOString()
      }
    ];

    await hybridStorage.set('tankDefinitions', testTankDefinitions);
    await hybridStorage.set('inventoryItems', testInventoryItems);

    console.log('✅ Test-Daten erstellt');
  }
}