/**
 * Produktionsplanung - Gebinde-Empfehlungen mit optimierter FIFO-Logik
 * 
 * Empfiehlt aus welchen Gebinden Komponenten entnommen werden sollen.
 * 
 * NEUE REGELN:
 * 1. GESPERRT: Ballons (B-*) und Flaschen (Fl-*) werden NICHT verwendet
 * 2. BEVORZUGT: Tanks (T-*), Container (C-*), IBC (IBC-*), Fässer (Fass-*)
 * 3. CHARGENREIN: Bevorzuge Entnahme aus EINEM Gebinde statt mehreren
 * 
 * Sortierung:
 * 1. Priorität: Gebinde mit exakt passender Menge (± 5%)
 * 2. Priorität: Gebinde die alleine ausreichen (chargenreine Entnahme)
 * 3. Priorität: Kleinste Gebinde zuerst (komplettes Leeren bevorzugt)
 */

import { InventoryItem, ContainerRecommendation } from './range-calculator';

/**
 * Generiert Gebinde-Empfehlungen für eine Komponente
 */
export function generateContainerRecommendations(
  componentName: string,
  requiredQuantity: number,
  inventory: InventoryItem[]
): ContainerRecommendation[] {
  
  // Alle Gebinde mit dieser Komponente finden
  const availableContainers = inventory.filter(item => 
    item.produktName?.toLowerCase() === componentName.toLowerCase() &&
    item.currentQuantityLiters > 0
  );

  if (availableContainers.length === 0) {
    return [];
  }

  // ✅ NEUE REGEL: Ballons (B-*) und Flaschen (Fl-*) sind IMMER GESPERRT
  // Bevorzuge: Tanks (T-*), Container (C-*), IBC (IBC-*), Fässer (Fass-*)
  let containers = availableContainers.filter(item => {
    const id = (item.tankNr || item.id || '').toLowerCase();
    const isBallon = id.startsWith('b-') || id.includes('ballon');
    const isFlasche = id.startsWith('fl-') || id.includes('flasche');
    
    // Ausschließen: Ballons und Flaschen sind gesperrt
    return !isBallon && !isFlasche;
  });

  // ✅ OPTIMIERTE SORTIERUNG: Chargenreine Entnahme bevorzugen
  // 1. Priorität: Gebinde die EXAKT die benötigte Menge haben (± 5%)
  // 2. Priorität: Gebinde die ALLEINE ausreichen (chargenrein möglich)
  // 3. Priorität: Kleinste Gebinde zuerst (komplettes Leeren bevorzugt)
  containers.sort((a, b) => {
    const aQuantity = a.currentQuantityLiters;
    const bQuantity = b.currentQuantityLiters;
    
    // Prüfe ob Menge exakt passt (± 5% Toleranz)
    const aExactMatch = Math.abs(aQuantity - requiredQuantity) / requiredQuantity < 0.05;
    const bExactMatch = Math.abs(bQuantity - requiredQuantity) / requiredQuantity < 0.05;
    
    if (aExactMatch && !bExactMatch) return -1; // a passt perfekt → a zuerst
    if (!aExactMatch && bExactMatch) return 1;  // b passt perfekt → b zuerst
    
    // Prüfe ob Menge komplett ausreicht (chargenrein möglich)
    const aCanFulfill = aQuantity >= requiredQuantity;
    const bCanFulfill = bQuantity >= requiredQuantity;
    
    if (aCanFulfill && !bCanFulfill) return -1; // a reicht alleine → a zuerst
    if (!aCanFulfill && bCanFulfill) return 1;  // b reicht alleine → b zuerst
    
    // Beide erfüllen oder beide nicht → kleinste zuerst (komplettes Leeren bevorzugt)
    return aQuantity - bQuantity;
  });

  // Gebinde auswählen bis requiredQuantity erreicht
  const recommendations: ContainerRecommendation[] = [];
  let remaining = requiredQuantity;

  for (const container of containers) {
    if (remaining <= 0) break;

    const available = container.currentQuantityLiters;
    const toTake = Math.min(available, remaining);
    const isFull = toTake >= available;

    recommendations.push({
      containerId: container.tankNr || container.id || 'Unbekannt',
      containerType: getContainerType(container.tankNr || container.id || ''),
      quantityToTake: Math.round(toTake * 100) / 100,
      remainingAfter: Math.round((available - toTake) * 100) / 100,
      isFull,
      currentQuantity: Math.round(available * 100) / 100,
    });

    remaining -= toTake;
  }

  return recommendations;
}

/**
 * Ermittelt Container-Typ anhand der ID
 */
function getContainerType(containerId: string): string {
  const id = containerId.toLowerCase();
  
  if (/^t\s?\d+/.test(id)) return 'Tank';
  if (id.startsWith('fass-')) return 'Fass';
  if (id.startsWith('b-')) return 'Ballon';
  if (id.startsWith('fl-')) return 'Flasche';
  if (id.startsWith('kan-')) return 'Kanister';
  if (id.startsWith('ibc-')) return 'IBC-Container';
  
  return 'Gebinde';
}

/**
 * Berechnet Gesamtmenge einer Komponente über alle Gebinde
 */
export function getTotalQuantity(
  componentName: string,
  inventory: InventoryItem[],
  excludeContainerIds?: string[]
): number {
  return inventory
    .filter(item => 
      item.produktName?.toLowerCase() === componentName.toLowerCase() &&
      (!excludeContainerIds || !excludeContainerIds.includes(item.id))
    )
    .reduce((sum, item) => sum + (item.currentQuantityLiters || 0), 0);
}
