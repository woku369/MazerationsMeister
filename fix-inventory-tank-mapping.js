/**
 * FIX: Inventory Tank Mapping
 * Mappt alte Tank-Bezeichnungen auf neue Container-IDs
 * 
 * Problem: Inventory Items haben alte Namen (B, Fass, Fl)
 * Lösung: Mappen auf neue IDs (B-1, Fass-4, etc.)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'mazerationsmeister');
const storageFile = path.join(appDataPath, 'mazerations-storage.json');

console.log('\n🔄 Inventory Tank Mapping Fix\n');
console.log('='.repeat(60));

try {
  // Load storage
  const data = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
  const tanks = data.tankDefinitions || [];
  const inventory = data.inventoryData || [];
  
  console.log(`\n📊 Aktuell:`);
  console.log(`  - ${tanks.length} Container`);
  console.log(`  - ${inventory.length} Inventory Items`);
  
  // Erstelle Mapping: Alte Kategorie → Liste neuer IDs
  const categoryMapping = {};
  tanks.forEach(tank => {
    const category = tank.tankNr; // "B", "Fass", "Fl", "T 341" etc.
    if (!categoryMapping[category]) {
      categoryMapping[category] = [];
    }
    categoryMapping[category].push(tank.id);
  });
  
  console.log('\n📋 Verfügbare Container nach Kategorie:\n');
  Object.keys(categoryMapping).sort().forEach(cat => {
    const containers = categoryMapping[cat];
    if (containers.length <= 3) {
      console.log(`  ${cat.padEnd(12)} → ${containers.join(', ')}`);
    } else {
      console.log(`  ${cat.padEnd(12)} → ${containers.slice(0, 3).join(', ')} ... (${containers.length} total)`);
    }
  });
  
  // Mappe Inventory Items auf Container
  let mappedCount = 0;
  let unmappedCount = 0;
  const unmappedItems = [];
  
  console.log('\n🔄 Mappe Inventory Items auf Container...\n');
  
  inventory.forEach((item, idx) => {
    const oldTankNr = item.tankNr || item.tank;
    
    if (!oldTankNr) {
      console.log(`  ⚠️  Item ${idx + 1}: Kein tankNr gefunden`);
      unmappedCount++;
      unmappedItems.push(`Item ${idx + 1}: Kein tankNr`);
      return;
    }
    
    // Prüfe ob es bereits eine neue ID ist (z.B. "B-1")
    if (tanks.find(t => t.id === oldTankNr)) {
      console.log(`  ✅ Item ${idx + 1}: ${oldTankNr} bereits korrekt`);
      item.tankNr = oldTankNr;
      mappedCount++;
      return;
    }
    
    // Finde Container für diese Kategorie
    const availableContainers = categoryMapping[oldTankNr];
    
    if (!availableContainers || availableContainers.length === 0) {
      console.log(`  ❌ Item ${idx + 1}: Keine Container für "${oldTankNr}" gefunden`);
      unmappedCount++;
      unmappedItems.push(`Item ${idx + 1}: ${oldTankNr}`);
      return;
    }
    
    // Strategie: Verteile Items gleichmäßig auf Container
    // Zähle wie viele Items bereits jedem Container zugeordnet sind
    const containerUsage = {};
    availableContainers.forEach(id => containerUsage[id] = 0);
    
    inventory.forEach(otherItem => {
      const otherTank = otherItem.tankNr || otherItem.tank;
      if (availableContainers.includes(otherTank)) {
        containerUsage[otherTank]++;
      }
    });
    
    // Wähle Container mit wenigsten Items
    const sortedContainers = availableContainers.sort((a, b) => 
      containerUsage[a] - containerUsage[b]
    );
    const newTankId = sortedContainers[0];
    
    console.log(`  🔄 Item ${idx + 1}: "${oldTankNr}" → "${newTankId}"`);
    item.tankNr = newTankId;
    mappedCount++;
  });
  
  // Stats
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Ergebnis:`);
  console.log(`  ✅ Erfolgreich gemappt: ${mappedCount}`);
  console.log(`  ❌ Nicht gemappt: ${unmappedCount}`);
  
  if (unmappedItems.length > 0) {
    console.log('\n⚠️  Nicht gemappte Items:');
    unmappedItems.forEach(item => console.log(`  - ${item}`));
  }
  
  // Backup erstellen
  const backupPath = storageFile + '.before-tank-mapping';
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Backup erstellt: ${path.basename(backupPath)}`);
  
  // Speichern
  fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));
  console.log(`✅ Änderungen gespeichert!`);
  
  // Zeige neue Verteilung
  console.log('\n📦 Neue Container-Zuordnungen:\n');
  const newDistribution = {};
  inventory.forEach(item => {
    const tank = item.tankNr;
    if (!newDistribution[tank]) {
      newDistribution[tank] = 0;
    }
    newDistribution[tank]++;
  });
  
  Object.keys(newDistribution).sort().forEach(tank => {
    console.log(`  ${tank.padEnd(12)} - ${newDistribution[tank]} Items`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Inventory Tank Mapping abgeschlossen!');
  console.log('🔄 Bitte App neu starten!\n');
  
} catch (error) {
  console.error('\n❌ Fehler:', error.message);
  console.error(error.stack);
  process.exit(1);
}
