/**
 * UI vs Storage Discrepancy Checker
 * Vergleicht Storage-Daten mit UI-Display-Logik
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Electron Storage Path
const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'mazerationsmeister');
const storageFile = path.join(appDataPath, 'mazerations-storage.json');

console.log('\n🔍 UI vs Storage Analyse\n');
console.log('=' .repeat(60));

try {
  // Load Storage
  const data = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
  const tanks = data.tankDefinitions || [];
  
  console.log(`\n✅ Storage geladen: ${tanks.length} Container gefunden\n`);
  
  // Analyse: Welche Container könnten in UI gefiltert werden?
  const categories = {
    hasInventoryRef: [],
    noInventoryRef: [],
    empty: [],
    withFillLevel: [],
    unique: [],
    numbered: []
  };
  
  tanks.forEach(tank => {
    // Inventory Reference
    if (tank.inventoryItemIds && tank.inventoryItemIds.length > 0) {
      categories.hasInventoryRef.push(tank.id);
    } else {
      categories.noInventoryRef.push(tank.id);
    }
    
    // Fill Level Status
    if (!tank.inventoryItemIds || tank.inventoryItemIds.length === 0) {
      categories.empty.push(tank.id);
    } else {
      categories.withFillLevel.push(tank.id);
    }
    
    // Tank Number Type
    if (tank.hasUniqueNumber) {
      categories.unique.push(tank.id);
    } else {
      categories.numbered.push(tank.id);
    }
  });
  
  console.log('📊 Container-Kategorien:\n');
  console.log(`  Mit Inventory-Referenz: ${categories.hasInventoryRef.length}`);
  console.log(`  Ohne Inventory-Referenz: ${categories.noInventoryRef.length}`);
  console.log(`  Leer (keine Items): ${categories.empty.length}`);
  console.log(`  Mit Füllstand: ${categories.withFillLevel.length}`);
  console.log(`  Unique Numbers (T-Tanks): ${categories.unique.length}`);
  console.log(`  Numbered (B-1, Fass-2): ${categories.numbered.length}`);
  
  console.log('\n🔍 Leere Container (könnten gefiltert sein):\n');
  categories.empty.forEach(id => {
    const tank = tanks.find(t => t.id === id);
    console.log(`  - ${id.padEnd(12)} (${tank.tankNr})`);
  });
  
  console.log('\n🔍 Container ohne Inventory-Referenz:\n');
  categories.noInventoryRef.forEach(id => {
    const tank = tanks.find(t => t.id === id);
    const hasItems = tank.inventoryItemIds && tank.inventoryItemIds.length > 0;
    console.log(`  - ${id.padEnd(12)} (${tank.tankNr}) - Items: ${hasItems ? tank.inventoryItemIds.length : 0}`);
  });
  
  // Detaillierte Liste ALLER Container
  console.log('\n📋 VOLLSTÄNDIGE Container-Liste (sortiert):\n');
  const sorted = [...tanks].sort((a, b) => {
    const aNum = parseInt(a.id.match(/\d+/)?.[0]) || 0;
    const bNum = parseInt(b.id.match(/\d+/)?.[0]) || 0;
    return a.id.localeCompare(b.id) || aNum - bNum;
  });
  
  sorted.forEach((tank, idx) => {
    const hasItems = tank.inventoryItemIds && tank.inventoryItemIds.length > 0;
    const itemCount = hasItems ? tank.inventoryItemIds.length : 0;
    const status = hasItems ? '✅' : '⚠️ LEER';
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${tank.id.padEnd(12)} ${status.padEnd(10)} Items: ${itemCount}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Gesamt: ${tanks.length} Container im Storage`);
  console.log(`⚠️  UI zeigt: 50 Container`);
  console.log(`❌ Fehlend: ${tanks.length - 50} Container`);
  console.log('\n💡 Vermutung: Leere Container werden in UI gefiltert!\n');
  
} catch (error) {
  console.error('❌ Fehler:', error.message);
}
