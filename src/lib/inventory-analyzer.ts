/**
 * Debug-Tool für Inventar-Analyse
 * Zeigt detaillierte Informationen über Inventar-Daten und Container-Erstellung
 */

import { hybridStorage } from './hybrid-storage';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';

export async function analyzeInventoryData() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 INVENTAR-ANALYSE GESTARTET');
  console.log('═══════════════════════════════════════════════════════════');
  
  // 1. Lade Inventar-Daten
  const inventoryItems: StoredInventoryItem[] = (await hybridStorage.get('inventoryItems')) || [];
  console.log(`\n📦 Total Inventar-Einträge: ${inventoryItems.length}`);
  
  if (inventoryItems.length === 0) {
    console.error('❌ KEINE INVENTAR-DATEN GEFUNDEN!');
    console.log('💡 Bitte Import in Lagerverwaltung durchführen!');
    return {
      totalItems: 0,
      containers: {},
      summary: 'Keine Daten'
    };
  }
  
  // 2. Gruppiere nach tankNr
  const byTankNr = new Map<string, StoredInventoryItem[]>();
  const emptyTankNr: StoredInventoryItem[] = [];
  
  inventoryItems.forEach(item => {
    if (!item.tankNr || !item.tankNr.trim()) {
      emptyTankNr.push(item);
      return;
    }
    
    const tankNr = item.tankNr.trim();
    if (!byTankNr.has(tankNr)) {
      byTankNr.set(tankNr, []);
    }
    byTankNr.get(tankNr)!.push(item);
  });
  
  console.log(`\n🔢 Einträge OHNE tankNr: ${emptyTankNr.length}`);
  if (emptyTankNr.length > 0) {
    console.log('⚠️ Diese Einträge werden NICHT zu Containern:');
    emptyTankNr.slice(0, 5).forEach(item => {
      console.log(`   - ${item.produktName}: ${item.currentQuantityLiters}L`);
    });
    if (emptyTankNr.length > 5) {
      console.log(`   ... und ${emptyTankNr.length - 5} weitere`);
    }
  }
  
  // 3. Analysiere Container-Erstellung
  console.log(`\n🏭 Container-Erstellung (nach tankNr gruppiert):`);
  console.log('═══════════════════════════════════════════════════════════');
  
  const containerStats = {
    uniqueTanks: 0,
    nonUniqueContainers: 0,
    totalVolume: 0,
    byType: {} as Record<string, number>
  };
  
  byTankNr.forEach((items, tankNr) => {
    const isUnique = tankNr.match(/^T\s?\d+/i);
    const totalVolume = items.reduce((sum, item) => sum + (item.currentQuantityLiters || 0), 0);
    
    if (isUnique) {
      // Eindeutiger Tank - 1 Container
      containerStats.uniqueTanks++;
      containerStats.totalVolume += totalVolume;
      
      console.log(`\n🏭 Tank ${tankNr}:`);
      console.log(`   → 1 Container (aggregiert)`);
      console.log(`   → ${items.length} Inventar-Einträge`);
      console.log(`   → ${totalVolume}L total`);
      items.forEach(item => {
        console.log(`      - ${item.produktName}: ${item.currentQuantityLiters}L (Charge: ${item.chargenNummer || 'N/A'})`);
      });
    } else {
      // Nicht-eindeutig - Separate Container
      containerStats.nonUniqueContainers += items.length;
      containerStats.totalVolume += totalVolume;
      
      console.log(`\n📦 Behältnisgruppe "${tankNr}":`);
      console.log(`   → ${items.length} separate Container (${tankNr}-1 bis ${tankNr}-${items.length})`);
      items.forEach((item, idx) => {
        console.log(`      ${tankNr}-${idx + 1}: ${item.produktName}, ${item.currentQuantityLiters}L`);
      });
      
      if (!containerStats.byType[tankNr]) {
        containerStats.byType[tankNr] = 0;
      }
      containerStats.byType[tankNr] += items.length;
    }
  });
  
  // 4. Zusammenfassung
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 ZUSAMMENFASSUNG:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📦 Total Inventar-Einträge: ${inventoryItems.length}`);
  console.log(`❌ Ohne tankNr (ignoriert): ${emptyTankNr.length}`);
  console.log(`✅ Mit tankNr (verarbeitet): ${inventoryItems.length - emptyTankNr.length}`);
  console.log(`\n🏭 Eindeutige Tanks (T xxx): ${containerStats.uniqueTanks} Container`);
  console.log(`📦 Nicht-eindeutige Behälter: ${containerStats.nonUniqueContainers} Container`);
  console.log(`\n🔢 TOTAL CONTAINER: ${containerStats.uniqueTanks + containerStats.nonUniqueContainers}`);
  console.log(`💧 Total Volumen: ${containerStats.totalVolume.toLocaleString('de-DE')}L`);
  
  if (Object.keys(containerStats.byType).length > 0) {
    console.log(`\n📋 Verteilung nach Typ:`);
    Object.entries(containerStats.byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} Container`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
  
  return {
    totalItems: inventoryItems.length,
    withTankNr: inventoryItems.length - emptyTankNr.length,
    withoutTankNr: emptyTankNr.length,
    expectedContainers: containerStats.uniqueTanks + containerStats.nonUniqueContainers,
    uniqueTanks: containerStats.uniqueTanks,
    nonUniqueContainers: containerStats.nonUniqueContainers,
    totalVolume: containerStats.totalVolume,
    containersByType: containerStats.byType,
    itemsWithoutTankNr: emptyTankNr.slice(0, 10).map(i => ({
      produkt: i.produktName,
      menge: i.currentQuantityLiters
    }))
  };
}

// Für direkten Aufruf in Console
if (typeof window !== 'undefined') {
  (window as any).analyzeInventory = analyzeInventoryData;
}
