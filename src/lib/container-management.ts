/**
 * 🏭 DYNAMISCHES BEHÄLTER-MANAGEMENT
 * Automatische Nummerierung, Status-Tracking, Bewegungs-Historie
 */

import type { TankDefinition, ContainerType, ContainerStatus, ContainerMovement } from '@/schemas/tankSchema';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';

/**
 * Generiert die nächste verfügbare Container-Nummer
 * z.B. "Container 1", "Container 2", "Fass 1", etc.
 */
export function getNextContainerNumber(containerType: ContainerType, existingTanks: TankDefinition[]): string {
  const typeNames: Record<ContainerType, string> = {
    'tank': 'Tank',
    'bottle': 'Flasche',
    'barrel': 'Fass',
    'ibc': 'IBC',
    'balloon': 'Ballon',
    'other': 'Behälter'
  };
  
  const prefix = typeNames[containerType];
  
  // Finde alle existierenden Nummern für diesen Typ
  const existingNumbers = existingTanks
    .filter(t => t.containerType === containerType && t.tankNr.startsWith(prefix))
    .map(t => {
      const match = t.tankNr.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    });
  
  // Nächste verfügbare Nummer
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  
  return `${prefix} ${nextNumber}`;
}

/**
 * Erstellt einen neuen dynamischen Container
 */
export function createDynamicContainer(
  containerType: ContainerType,
  volumenLiter: number,
  bezeichnung: string,
  existingTanks: TankDefinition[]
): TankDefinition {
  const tankNr = getNextContainerNumber(containerType, existingTanks);
  
  return {
    id: crypto.randomUUID(),
    tankNr,
    bezeichnung,
    volumenLiter,
    containerType,
    hasUniqueNumber: false, // Dynamische Container haben keine feste Nummer
    status: 'empty',
    movements: [],
    notes: ''
  };
}

/**
 * Fügt eine Bewegung zur Historie hinzu
 */
export function addContainerMovement(
  container: TankDefinition,
  movement: Omit<ContainerMovement, 'timestamp'>
): TankDefinition {
  const newMovement: ContainerMovement = {
    ...movement,
    timestamp: new Date().toISOString()
  };
  
  return {
    ...container,
    movements: [...(container.movements || []), newMovement]
  };
}

/**
 * Befüllt einen Container aus einem Quell-Tank
 * Erstellt automatisch Lagerbewegungen
 */
export async function fillContainerFromTank(
  targetContainer: TankDefinition,
  sourceTankNr: string,
  amount: number,
  productName: string,
  inventoryItems: StoredInventoryItem[]
): Promise<{
  updatedContainer: TankDefinition;
  inventoryUpdates: {
    source: StoredInventoryItem;
    target: StoredInventoryItem;
  };
}> {
  // Finde Inventar-Item im Quell-Tank
  const sourceItem = inventoryItems.find(item => item.tankNr === sourceTankNr);
  if (!sourceItem) {
    throw new Error(`Kein Produkt in Tank ${sourceTankNr} gefunden`);
  }
  
  if (sourceItem.currentQuantityLiters < amount) {
    throw new Error(`Nicht genug Menge in Tank ${sourceTankNr} verfügbar (${sourceItem.currentQuantityLiters}L)`);
  }
  
  // Container befüllen
  const updatedContainer = addContainerMovement(targetContainer, {
    type: 'fill',
    note: `${amount}L ${productName} aus ${sourceTankNr} eingefüllt`,
    fromTank: sourceTankNr,
    amount,
    product: productName
  });
  
  updatedContainer.status = 'filled';
  updatedContainer.currentContent = sourceItem.id;
  
  // Erstelle Inventar-Updates
  const sourceUpdate: StoredInventoryItem = {
    ...sourceItem,
    currentQuantityLiters: sourceItem.currentQuantityLiters - amount,
    literAbsolutalkohol: (sourceItem.currentQuantityLiters - amount) * (sourceItem.alcoholVolProzent / 100),
    lastInventoryDate: new Date()
  };
  
  // Erstelle neues Inventar-Item für Ziel-Container
  const targetUpdate: StoredInventoryItem = {
    ...sourceItem, // Kopiere alle Eigenschaften vom Quell-Produkt
    id: crypto.randomUUID(),
    tankNr: targetContainer.tankNr,
    currentQuantityLiters: amount,
    literAbsolutalkohol: amount * (sourceItem.alcoholVolProzent / 100),
    lastInventoryDate: new Date(),
    bemerkungen: `Befüllt aus ${sourceTankNr} am ${new Date().toLocaleDateString('de-DE')}`
  };
  
  return {
    updatedContainer,
    inventoryUpdates: {
      source: sourceUpdate,
      target: targetUpdate
    }
  };
}

/**
 * Markiert einen Container als versandt
 */
export function shipContainer(
  container: TankDefinition,
  destination: string
): TankDefinition {
  const updated = addContainerMovement(container, {
    type: 'ship',
    note: `Versandt an ${destination}`
  });
  
  return {
    ...updated,
    status: 'shipped'
  };
}

/**
 * Markiert einen Container als retour
 */
export function returnContainer(
  container: TankDefinition,
  newProduct?: string,
  newAmount?: number
): TankDefinition {
  let note = 'Retour erhalten';
  if (newProduct && newAmount) {
    note += ` - Jetzt: ${newAmount}L ${newProduct}`;
  }
  
  const updated = addContainerMovement(container, {
    type: 'return',
    note,
    product: newProduct,
    amount: newAmount
  });
  
  return {
    ...updated,
    status: 'returned'
  };
}

/**
 * Leert einen Container
 */
export function emptyContainer(
  container: TankDefinition
): TankDefinition {
  const updated = addContainerMovement(container, {
    type: 'empty',
    note: 'Container geleert'
  });
  
  return {
    ...updated,
    status: 'empty',
    currentContent: undefined
  };
}

/**
 * Holt die aktuelle Bewegungs-Historie formatiert
 */
export function getFormattedMovementHistory(container: TankDefinition): string[] {
  if (!container.movements || container.movements.length === 0) {
    return ['Keine Bewegungen vorhanden'];
  }
  
  return container.movements.map(m => {
    const date = new Date(m.timestamp).toLocaleString('de-DE');
    const typeEmoji = {
      fill: '📥',
      ship: '🚚',
      return: '🔙',
      empty: '🗑️',
      note: '📝'
    }[m.type];
    
    return `${typeEmoji} ${date}: ${m.note}`;
  });
}

/**
 * Status-Badges für UI
 */
export function getContainerStatusBadge(status?: ContainerStatus): {
  label: string;
  color: string;
  emoji: string;
} {
  switch (status) {
    case 'empty':
      return { label: 'Leer', color: 'bg-gray-100 text-gray-800', emoji: '⚪' };
    case 'filled':
      return { label: 'Befüllt', color: 'bg-green-100 text-green-800', emoji: '✅' };
    case 'shipped':
      return { label: 'Versandt', color: 'bg-blue-100 text-blue-800', emoji: '🚚' };
    case 'returned':
      return { label: 'Retour', color: 'bg-purple-100 text-purple-800', emoji: '🔙' };
    default:
      return { label: 'Unbekannt', color: 'bg-gray-100 text-gray-800', emoji: '❓' };
  }
}
