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
  
  // KRITISCHE KORREKTUR: Bestehende Tank-IDs zu tankNr korrigieren
  const correctedTanks = currentTanks.map(tank => ({
    ...tank,
    id: tank.tankNr // Setze ID gleich tankNr für Konsistenz
  }));
  
  // Sammle alle eindeutigen Tank-Nummern aus dem Inventar
  const uniqueTankNrs = new Set<string>();
  inventoryItems.forEach(item => {
    if (item.tankNr && item.tankNr.trim()) {
      uniqueTankNrs.add(item.tankNr.trim());
    }
  });

  const existingTankNrs = new Set(correctedTanks.map(tank => tank.tankNr));
  let hasChanges = correctedTanks.length !== currentTanks.length || 
                   correctedTanks.some((tank, i) => tank.id !== currentTanks[i]?.id);

  // Füge neue Tanks hinzu, die im Inventar gefunden wurden
  uniqueTankNrs.forEach(tankNr => {
    if (!existingTankNrs.has(tankNr)) {
      const newTank: TankDefinition = {
        id: tankNr, // Verwende tankNr direkt als ID für Konsistenz
        tankNr: tankNr,
        bezeichnung: `Auto-erkannt: ${tankNr}`,
        volumenLiter: 5000, // Standardkapazität 5.000L, kann manuell angepasst werden
      };
      correctedTanks.push(newTank);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    localStorage.setItem('tankDefinitions', JSON.stringify(correctedTanks));
    console.log('✅ Tank-Sync: Tank-Definitionen korrigiert und gespeichert:', correctedTanks.length, 'Tanks');
    console.log('🔍 Tank-Sync Debug: Korrigierte IDs:', correctedTanks.map(t => `${t.tankNr}(${t.id})`));
    
    // Event für andere Komponenten aussenden
    window.dispatchEvent(new CustomEvent('tankDefinitionsUpdated', {
      detail: { tanks: correctedTanks }
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

/**
 * NOTFALL-KORREKTUR: Bereinigt inkonsistente Tank-IDs in localStorage
 * Sollte einmalig ausgeführt werden um das UUID-Problem zu beheben
 */
export function fixTankIds(): void {
  if (typeof window === 'undefined') return;
  
  const storedTanks = localStorage.getItem('tankDefinitions');
  if (!storedTanks) return;
  
  const tanks: TankDefinition[] = JSON.parse(storedTanks);
  let hasChanges = false;
  
  const fixedTanks = tanks.map(tank => {
    if (tank.id !== tank.tankNr) {
      console.log(`🔧 Korrigiere Tank-ID: ${tank.id} → ${tank.tankNr}`);
      hasChanges = true;
      return { ...tank, id: tank.tankNr };
    }
    return tank;
  });
  
  if (hasChanges) {
    localStorage.setItem('tankDefinitions', JSON.stringify(fixedTanks));
    console.log('✅ Tank-ID Korrektur abgeschlossen');
    
    // Event für andere Komponenten aussenden
    window.dispatchEvent(new CustomEvent('tankDefinitionsUpdated', {
      detail: { tanks: fixedTanks }
    }));
  }
}
