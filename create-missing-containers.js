/**
 * FIX: Create Missing Containers
 * Erstellt die 6 fehlenden Container aus dem alten Backup
 * C 07, T 344, T 347, T 350, T 1544, T 1564
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'mazerationsmeister');
const storageFile = path.join(appDataPath, 'mazerations-storage.json');

console.log('\n📦 Fehlende Container erstellen\n');
console.log('='.repeat(60));

const missingContainers = [
  {
    id: 'C 07',
    tankNr: 'C 07',
    bezeichnung: 'Manuelle Erstellung: C 07',
    volumenLiter: 5000,
    containerType: 'tank',
    hasUniqueNumber: true
  },
  {
    id: 'T 344',
    tankNr: 'T 344',
    bezeichnung: 'Manuelle Erstellung: T 344',
    volumenLiter: 5000,
    containerType: 'tank',
    hasUniqueNumber: true
  },
  {
    id: 'T 347',
    tankNr: 'T 347',
    bezeichnung: 'Manuelle Erstellung: T 347',
    volumenLiter: 5000,
    containerType: 'tank',
    hasUniqueNumber: true
  },
  {
    id: 'T 350',
    tankNr: 'T 350',
    bezeichnung: 'Manuelle Erstellung: T 350',
    volumenLiter: 5000,
    containerType: 'tank',
    hasUniqueNumber: true
  },
  {
    id: 'T 1544',
    tankNr: 'T 1544',
    bezeichnung: 'Manuelle Erstellung: T 1544',
    volumenLiter: 5000,
    containerType: 'tank',
    hasUniqueNumber: true
  },
  {
    id: 'T 1564',
    tankNr: 'T 1564',
    bezeichnung: 'Manuelle Erstellung: T 1564',
    volumenLiter: 5000,
    containerType: 'tank',
    hasUniqueNumber: true
  }
];

try {
  // Load storage
  const data = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
  const tanks = data.tankDefinitions || [];
  
  console.log(`\n📊 Aktuell: ${tanks.length} Container`);
  console.log(`📦 Zu erstellen: ${missingContainers.length} Container\n`);
  
  // Prüfe welche Container bereits existieren
  const existingIds = new Set(tanks.map(t => t.id));
  const containersToAdd = missingContainers.filter(c => !existingIds.has(c.id));
  
  if (containersToAdd.length === 0) {
    console.log('✅ Alle Container bereits vorhanden!');
    process.exit(0);
  }
  
  console.log(`🔄 Erstelle ${containersToAdd.length} fehlende Container:\n`);
  containersToAdd.forEach(c => {
    console.log(`  - ${c.id.padEnd(12)} (${c.volumenLiter}L, ${c.tankNr})`);
  });
  
  // Backup erstellen
  const backupPath = storageFile + '.before-add-containers';
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Backup erstellt: ${path.basename(backupPath)}`);
  
  // Container hinzufügen
  data.tankDefinitions = [...tanks, ...containersToAdd];
  
  // Speichern
  fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ ${containersToAdd.length} Container erfolgreich erstellt!`);
  console.log(`📊 Gesamt: ${data.tankDefinitions.length} Container`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Fehlende Container erstellt!');
  console.log('🔄 Bitte App neu starten!\n');
  
} catch (error) {
  console.error('\n❌ Fehler:', error.message);
  console.error(error.stack);
  process.exit(1);
}
