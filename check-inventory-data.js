/**
 * Check Inventory Data vs Tank Definitions
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'mazerationsmeister');
const storageFile = path.join(appDataPath, 'mazerations-storage.json');

console.log('\n📊 Inventory vs Tanks Analyse\n');
console.log('='.repeat(60));

try {
  const data = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
  const tanks = data.tankDefinitions || [];
  const inventory = data.inventoryData || [];
  
  console.log(`\n✅ Tanks: ${tanks.length}`);
  console.log(`✅ Inventory Items: ${inventory.length}\n`);
  
  // Inventory Items nach Tank gruppieren
  const tankUsage = {};
  inventory.forEach(item => {
    const tankNr = item.tankNr || item.tank || 'UNBEKANNT';
    if (!tankUsage[tankNr]) {
      tankUsage[tankNr] = [];
    }
    tankUsage[tankNr].push(item);
  });
  
  console.log('📦 Inventory Items nach Tank:\n');
  Object.keys(tankUsage).sort().forEach(tankNr => {
    const items = tankUsage[tankNr];
    const totalLiter = items.reduce((sum, item) => sum + (item.menge || 0), 0);
    console.log(`  ${tankNr.padEnd(12)} - ${items.length} Items, ${totalLiter.toFixed(1)}L gesamt`);
  });
  
  // Prüfe ob Tank-IDs mit Inventory übereinstimmen
  console.log('\n\n🔍 Tank vs Inventory Matching:\n');
  const unmatchedTanks = [];
  const matchedTanks = [];
  
  tanks.forEach(tank => {
    const hasItems = tankUsage[tank.tankNr] || tankUsage[tank.id];
    if (hasItems) {
      matchedTanks.push(tank.id);
    } else {
      unmatchedTanks.push(tank.id);
    }
  });
  
  console.log(`✅ Tanks mit Inventory: ${matchedTanks.length}`);
  console.log(`⚠️  Tanks OHNE Inventory: ${unmatchedTanks.length}`);
  
  if (unmatchedTanks.length > 0 && unmatchedTanks.length <= 20) {
    console.log('\n⚠️  Leere Tanks:');
    unmatchedTanks.forEach(id => console.log(`  - ${id}`));
  }
  
  // Sample Inventory Items
  console.log('\n\n📋 Beispiel Inventory Items (erste 5):\n');
  inventory.slice(0, 5).forEach((item, idx) => {
    console.log(`${idx + 1}. Tank: ${item.tankNr || item.tank || 'N/A'}`);
    console.log(`   Produkt: ${item.produkt || item.beschreibung || 'N/A'}`);
    console.log(`   Menge: ${item.menge || 0}L`);
    console.log(`   Alkohol: ${item.alkoholgehalt || 'N/A'}% vol`);
    console.log('');
  });
  
} catch (error) {
  console.error('❌ Fehler:', error.message);
}
