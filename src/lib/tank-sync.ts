import type { TankDefinition } from '@/schemas/tankSchema';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';

/**
 * Synchronisiert Tank-Definitionen mit dem aktuellen Inventar
 * Neue Tank-Nummern aus dem Inventar werden automatisch zu den Tank-Definitionen hinzugefügt.
 *
 * Gibt die neu angelegten Tanks zurück, damit der Aufrufer den Nutzer warnen kann
 * (z.B. bei einem Tippfehler in der importierten Tanknummer entsteht sonst
 * unbemerkt ein 5000L-Phantomtank, siehe docs/REVIEW-2026-09-cross-modul-kohaerenz.md, Befund B1/D1).
 */
export function syncTankDefinitionsWithInventory(): TankDefinition[] {
  if (typeof window === 'undefined') return [];

  const storedInventory = localStorage.getItem('inventoryItems');
  const storedTanks = localStorage.getItem('tankDefinitions');

  console.log('🔍 Tank-Sync Debug: Inventory Data:', storedInventory ? 'EXISTS' : 'MISSING');
  console.log('🔍 Tank-Sync Debug: Current inventory length:', storedInventory ? JSON.parse(storedInventory).length : 0);

  if (!storedInventory) {
    console.warn('⚠️ Tank-Sync: Keine Inventory-Daten gefunden!');
    return [];
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
  const newlyCreated: TankDefinition[] = [];

  // Füge neue Tanks hinzu, die im Inventar gefunden wurden (id === tankNr per Invariante)
  uniqueTankNrs.forEach(tankNr => {
    if (!existingTankNrs.has(tankNr)) {
      const newTank: TankDefinition = {
        id: tankNr,
        tankNr: tankNr,
        bezeichnung: `Auto-erkannt: ${tankNr}`,
        volumenLiter: 5000,
        hasUniqueNumber: true, // Füllstand kommt aus dem Inventar, kein eigener currentContent
      };
      currentTanks.push(newTank);
      newlyCreated.push(newTank);
    }
  });

  if (newlyCreated.length > 0) {
    localStorage.setItem('tankDefinitions', JSON.stringify(currentTanks));
    console.log('✅ Tank-Sync: Neue Tanks hinzugefügt:', currentTanks.length);
    window.dispatchEvent(new CustomEvent('tankDefinitionsUpdated', {
      detail: { tanks: currentTanks }
    }));
  }

  return newlyCreated;
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

