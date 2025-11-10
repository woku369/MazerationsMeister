/**
 * Sync Local Data to GitHub Pages
 * Lädt lokale Daten aus mazerations-storage.json und schreibt sie nach docs/app-data.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const APPDATA_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'MazerationsMeister');
const STORAGE_FILE = path.join(APPDATA_PATH, 'mazerations-storage.json');
const DOCS_APP_DATA = path.join(__dirname, '..', 'docs', 'app-data.json');

console.log('🔄 Sync Local Data → GitHub Pages');
console.log('='.repeat(50));

// 1) Lade lokale Storage-Daten
if (!fs.existsSync(STORAGE_FILE)) {
  console.error('❌ Storage-Datei nicht gefunden:', STORAGE_FILE);
  process.exit(1);
}

console.log('📂 Lade lokale Daten:', STORAGE_FILE);
const storageData = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));

// 2) Erstelle app-data.json Format
const appData = {
  version: '1.0.0',
  lastUpdate: new Date().toISOString(),
  computerName: os.hostname(),
  userName: os.userInfo().username,
  tanks: storageData.tankDefinitions || [],
  inventory: storageData.inventoryItems || [],
  calendar: storageData.calendarEvents || [],
  todos: storageData.todoItems || [],
  protocols: storageData.mazerationProtocols || []
};

console.log('\n📊 Daten-Übersicht:');
console.log(`   Tanks: ${appData.tanks.length}`);
console.log(`   Inventory: ${appData.inventory.length}`);
console.log(`   Kalender: ${appData.calendar.length}`);
console.log(`   TODOs: ${appData.todos.length}`);
console.log(`   Protokolle: ${appData.protocols.length}`);

// 3) Speichere nach docs/app-data.json
console.log('\n💾 Schreibe nach:', DOCS_APP_DATA);
fs.writeFileSync(DOCS_APP_DATA, JSON.stringify(appData, null, 2));

console.log('✅ app-data.json aktualisiert!');
console.log('\n🔍 Erste 3 Inventory-Items (zur Prüfung):');
appData.inventory.slice(0, 3).forEach(item => {
  console.log(`   - ${item.produktName} → ${item.tankNr} (${item.currentQuantityLiters}L)`);
});

console.log('\n' + '='.repeat(50));
console.log('✅ Sync abgeschlossen!');
console.log('📌 Nächster Schritt: git add docs/app-data.json && git commit && git push');
