import type { TankDefinition, ContainerType } from '@/schemas/tankSchema';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import { hybridStorage } from './hybrid-storage';
import { createGitBackup } from './git-backup';

/**
 * ✅ FIX 5.11c: Automatisches Backup-System für Container-Definitionen
 * ✅ FIX 5.11d: Git-synchronisierte Backups (verfügbar auf allen Rechnern)
 * Erstellt bei jeder Änderung ein Backup mit Timestamp
 */
async function createContainerBackup(tanks: TankDefinition[]): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Neues Git-Backup-System (lokal + Git-Repository)
    await createGitBackup(tanks);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Container-Backups:', error);
  }
}

/**
 * Hilfsfunktion: Alle Storage-Keys auflisten
 */
async function getAllStorageKeys(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    // Nutze hybridStorage.keys() für beide Storage-Typen
    const keys = await hybridStorage.keys();
    return keys;
  } catch {
    // Fallback auf localStorage
    return Object.keys(localStorage);
  }
}

/**
 * Synchronisiert Tank-Definitionen mit dem aktuellen Inventar
 * NEUE STRATEGIE: Inventar ist die Source of Truth, manuelle Container werden hinzugefügt
 */
export async function syncTankDefinitionsWithInventory(): Promise<void> {
  if (typeof window === 'undefined') return;

  const inventoryItems: StoredInventoryItem[] = (await hybridStorage.get('inventoryItems')) || [];
  const currentTanks: TankDefinition[] = (await hybridStorage.get('tankDefinitions')) || [];
  
  console.log('🔍 Tank-Sync: Inventory Items:', inventoryItems?.length || 0);
  console.log('🔍 Tank-Sync: Aktuelle Tanks:', currentTanks?.length || 0);
  
  if (!inventoryItems || inventoryItems.length === 0) {
    console.warn('⚠️ Tank-Sync: Keine Inventory-Daten!');
    return;
  }
  
  // Gruppiere Inventar nach tankNr
  const containerData = new Map<string, {
    items: typeof inventoryItems,
    totalVolume: number,
    products: string[]
  }>();
  
  inventoryItems.forEach(item => {
    if (!item.tankNr || !item.tankNr.trim()) return;
    
    const tankNr = item.tankNr.trim();
    
    if (!containerData.has(tankNr)) {
      containerData.set(tankNr, {
        items: [],
        totalVolume: 0,
        products: []
      });
    }
    
    const data = containerData.get(tankNr)!;
    data.items.push(item);
    data.totalVolume += item.currentQuantityLiters || 0;
    if (item.produktName && !data.products.includes(item.produktName)) {
      data.products.push(item.produktName);
    }
  });
  
  // Erstelle Container aus Inventar
  const inventoryBasedContainers: TankDefinition[] = [];
  
  containerData.forEach((data, tankNr) => {
    // ✅ FIX 5.11: Erkenne ALLE nummerierten Behälter als eindeutig (Fass-1, B-3, IBC-12, T 341, etc.)
    const isUnique = tankNr.match(/^(.+?)-(\d+)$/) || tankNr.match(/^T\s?\d+/i);
    
    if (isUnique) {
      // ✅ FIX 5.11b: Eindeutige Behälter - MERGE mit bestehendem Container (QR-Codes bleiben!)
      // Mehrere Produkte im selben Behälter sind erlaubt und normal!
      const existingTank = currentTanks.find(t => t.id === tankNr);
      
      inventoryBasedContainers.push({
        id: tankNr,
        tankNr: tankNr,
        // ✅ MERGE: Behalte manuelle Felder, aktualisiere nur Inventar-Felder
        bezeichnung: existingTank?.bezeichnung || tankNr,
        volumenLiter: existingTank?.volumenLiter || Math.max(5000, data.totalVolume * 1.2),
        containerType: existingTank?.containerType || 'tank',
        hasUniqueNumber: true,
        notes: existingTank?.notes, // ✅ Behalte Notizen
        movements: existingTank?.movements, // ✅ Behalte Historie
        // Aktualisiere Inventar-bezogene Felder
        status: data.totalVolume > 0 ? 'filled' : 'empty',
        currentContent: data.products.join(', ')
      });
    } else {
      // ✅ FIX 5.11: Nur GENERISCHE Behälter (ohne Nummer) - Pro CHARGE ein Container
      // Beispiel: "Fass" (ohne Nummer) + 5 Einträge → "Fass-1", "Fass-2", "Fass-3", "Fass-4", "Fass-5"
      // WICHTIG: "Fass-1" (MIT Nummer) wird oben als eindeutig behandelt!
      let containerNumber = 1;
      data.items.forEach(item => {
        const containerId = `${tankNr}-${containerNumber}`;
        
        // ✅ FIX 5.11b: MERGE mit bestehendem Container (QR-Codes bleiben!)
        const existingTank = currentTanks.find(t => t.id === containerId);
        
        inventoryBasedContainers.push({
          id: containerId,
          tankNr: tankNr,
          // ✅ MERGE: Behalte manuelle Felder
          bezeichnung: existingTank?.bezeichnung || containerId,
          volumenLiter: existingTank?.volumenLiter || Math.max(100, (item.currentQuantityLiters || 0) * 1.2),
          containerType: existingTank?.containerType || 'other',
          hasUniqueNumber: true,
          notes: existingTank?.notes, // ✅ Behalte Notizen
          movements: existingTank?.movements, // ✅ Behalte Historie
          // Aktualisiere Inventar-bezogene Felder
          currentContent: item.produktName || 'Unbekannt',
          status: (item.currentQuantityLiters || 0) > 0 ? 'filled' : 'empty'
        });
        
        containerNumber++;
      });
    }
  });
  
  console.log(`✅ ${inventoryBasedContainers.length} Container aus Inventar erstellt`);
  
  // Finde ECHTE manuell erstellte Container (nicht im Inventar)
  const inventoryIds = new Set(inventoryBasedContainers.map(c => c.id));
  const trueManualContainers = currentTanks.filter(tank => {
    // Container existiert im Inventar? → wird durch Inventar ersetzt
    if (inventoryIds.has(tank.id)) {
      return false;
    }
    
    // Container existiert NICHT im Inventar
    // Prüfe ob es ein verwaister auto-generierter Container ist
    const isOldAutoGenerated = !!tank.id.match(/^(B|Fass|Fl|IBC|T|C)\s?-?\d+$/i) &&
                                (tank.bezeichnung === tank.id || tank.bezeichnung === tank.tankNr);
    
    if (isOldAutoGenerated) {
      console.log(`🗑️ Lösche verwaisten Container: ${tank.id}`);
      return false;
    }
    
    // ECHT manuell erstellt
    console.log(`🔒 MANUELL beibehalten: ${tank.id} ("${tank.bezeichnung}")`);
    return true;
  });
  
  // Kombiniere: Inventar + manuelle Container
  const updatedTanks = [...inventoryBasedContainers, ...trueManualContainers];
  
  console.log(`📊 Total: ${updatedTanks.length} Container (${inventoryBasedContainers.length} Inventar + ${trueManualContainers.length} manuell)`);
  
  // ✅ FIX 5.11c: Erstelle automatisches Backup VOR dem Speichern
  await createContainerBackup(updatedTanks);
  
  // Speichere
  await hybridStorage.set('tankDefinitions', updatedTanks);
  console.log('✅ Tank-Sync: Gespeichert');
  
  // Sync zu localStorage
  try {
    const tankData = updatedTanks.map(tank => ({
      tankNr: tank.tankNr,
      tankId: tank.tankNr,
      bezeichnung: tank.bezeichnung,
      category: tank.containerType || 'tank',
      volumenLiter: tank.volumenLiter,
      capacity: tank.volumenLiter,
      currentFill: 0,
      sorte: tank.currentContent || '',
      charge: ''
    }));
    
    localStorage.setItem('tank-data', JSON.stringify(tankData));
  } catch (error) {
    console.error('❌ localStorage sync Fehler:', error);
  }
  
  // Event
  window.dispatchEvent(new CustomEvent('tankDefinitionsUpdated', {
    detail: { tanks: updatedTanks }
  }));
}

export async function getTankDefinitions(): Promise<TankDefinition[]> {
  if (typeof window === 'undefined') return [];
  return (await hybridStorage.get('tankDefinitions')) || [];
}

export async function getTankByNumber(tankNr: string): Promise<TankDefinition | null> {
  const tanks = await getTankDefinitions();
  return tanks.find(tank => tank.tankNr === tankNr) || null;
}

export async function fixTankIds(): Promise<void> {
  if (typeof window === 'undefined') return;
  console.log('🔄 RESET: Lösche alle Tank-Definitionen...');
  await hybridStorage.set('tankDefinitions', []);
  await syncTankDefinitionsWithInventory();
}
