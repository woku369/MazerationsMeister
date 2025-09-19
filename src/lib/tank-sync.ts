import type { TankDefinition } from '@/schemas/tankSchema';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';

/**
 * Synchronisiert Tank-Definitionen mit dem aktuellen Inventar
 * Neue Tank-Nummern aus dem Inventar werden automatisch zu den Tank-Definitionen hinzugefügt
 */
export function syncTankDefinitionsWithInventory(): void {
  if (typeof window === 'undefined') return;

  const storedInventory = localStorage.getItem('inventoryItems');
  const storedTanks = localStorage.getItem('tankDefinitions');
  
  console.log('🔍 Tank-Sync Debug: Inventory Data:', storedInventory ? 'EXISTS' : 'MISSING');
  console.log('🔍 Tank-Sync Debug: Current inventory length:', storedInventory ? JSON.parse(storedInventory).length : 0);
  
  if (!storedInventory) {
    console.warn('⚠️ Tank-Sync: Keine Inventory-Daten gefunden!');
    return;
  }

  const inventoryItems: StoredInventoryItem[] = JSON.parse(storedInventory);
  const currentTanks: TankDefinition[] = storedTanks ? JSON.parse(storedTanks) : [];
  
  // Sammle alle eindeutigen Tank-Nummern aus dem Inventar
  const uniqueTankNrs = new Set<string>();
  inventoryItems.forEach(item => {
    if (item.tankNr && item.tankNr.trim()) {
      uniqueTankNrs.add(item.tankNr.trim());
    }
  });

  const existingTankNrs = new Set(currentTanks.map(tank => tank.tankNr));
  let hasChanges = false;

  // Füge neue Tanks hinzu, die im Inventar gefunden wurden
  uniqueTankNrs.forEach(tankNr => {
    if (!existingTankNrs.has(tankNr)) {
      const newTank: TankDefinition = {
        id: 'tank-' + Math.random().toString(36).substr(2, 9),
        tankNr: tankNr,
        bezeichnung: `Auto-erkannt: ${tankNr}`,
        volumenLiter: 5000, // Standardkapazität 5.000L, kann manuell angepasst werden
      };
      currentTanks.push(newTank);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    localStorage.setItem('tankDefinitions', JSON.stringify(currentTanks));
    console.log('✅ Tank-Sync: Tank-Definitionen gespeichert:', currentTanks.length, 'Tanks');
    console.log('🔍 Tank-Sync Debug: Inventory noch vorhanden?', localStorage.getItem('inventoryItems') ? 'JA' : 'NEIN');
    
    // Event für andere Komponenten aussenden
    window.dispatchEvent(new CustomEvent('tankDefinitionsUpdated', {
      detail: { tanks: currentTanks }
    }));
  } else {
    console.log('ℹ️ Tank-Sync: Keine Änderungen nötig');
  }
}

/**
 * Holt alle verfügbaren Tank-Definitionen
 */
export function getTankDefinitions(): TankDefinition[] {
  if (typeof window === 'undefined') return [];
  
  const storedTanks = localStorage.getItem('tankDefinitions');
  return storedTanks ? JSON.parse(storedTanks) : [];
}

/**
 * Findet eine Tank-Definition anhand der Tank-Nummer
 */
export function getTankByNumber(tankNr: string): TankDefinition | null {
  const tanks = getTankDefinitions();
  return tanks.find(tank => tank.tankNr === tankNr) || null;
}
