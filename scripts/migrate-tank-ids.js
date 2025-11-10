/**
 * Migration Script: Tank-IDs in Inventory Items korrigieren
 * 
 * PROBLEM:
 * - Alte Inventory-Items haben tankNr: "Fass", "B", "Fl" (generisch)
 * - Sollten haben: tankNr: "Fass-1", "B-1", "Fl-1" (eindeutig)
 * 
 * LÖSUNG:
 * - Lese mazerations-storage.json
 * - Für jedes Inventory-Item mit generischer tankNr:
 *   - Finde passendes Tank-Definition mit eindeutiger ID
 *   - Update tankNr auf Tank-ID
 * - Speichere korrigierte Daten
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const APPDATA_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'MazerationsMeister');
const STORAGE_FILE = path.join(APPDATA_PATH, 'mazerations-storage.json');
const BACKUP_FILE = path.join(APPDATA_PATH, `mazerations-storage.backup-${Date.now()}.json`);

console.log('🔧 Tank-ID Migration Script');
console.log('='.repeat(50));

// 1) Lade Storage
if (!fs.existsSync(STORAGE_FILE)) {
  console.error('❌ Storage-Datei nicht gefunden:', STORAGE_FILE);
  process.exit(1);
}

console.log('📂 Lade Storage:', STORAGE_FILE);
const storageData = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));

const tanks = storageData.tankDefinitions || [];
const inventory = storageData.inventoryItems || [];

console.log(`✅ ${tanks.length} Tanks gefunden`);
console.log(`✅ ${inventory.length} Inventory-Items gefunden`);

// 2) Backup erstellen
console.log('\n💾 Erstelle Backup...');
fs.writeFileSync(BACKUP_FILE, JSON.stringify(storageData, null, 2));
console.log(`✅ Backup erstellt: ${BACKUP_FILE}`);

// 3) Finde Items mit generischer tankNr
const generischeTankNr = new Set();
inventory.forEach(item => {
  if (item.tankNr) {
    // Prüfe ob tankNr generisch ist (ohne Nummer am Ende)
    const hasIndex = /^(.+)-(\d+)$/.test(item.tankNr);
    if (!hasIndex && item.tankNr !== item.tankNr.match(/^[T]\s?\d+/)) {
      // Generische tankNr: "Fass", "B", "Fl", "K", "IBC" etc.
      generischeTankNr.add(item.tankNr);
    }
  }
});

console.log('\n🔍 Generische Tank-Nummern gefunden:', Array.from(generischeTankNr));

// 4) Migriere Items
let migratedCount = 0;
let unchangedCount = 0;
let errorCount = 0;

const migrationLog = [];

inventory.forEach(item => {
  if (!item.tankNr) {
    unchangedCount++;
    return;
  }

  // Prüfe ob bereits eindeutige ID
  const hasIndex = /^(.+)-(\d+)$/.test(item.tankNr);
  if (hasIndex || item.tankNr.match(/^[T]\s?\d+/)) {
    unchangedCount++;
    return;
  }

  // Generische tankNr → Suche passenden Tank
  const baseTankNr = item.tankNr;
  
  // Finde Tanks mit dieser Basis-Nr
  const matchingTanks = tanks.filter(tank => 
    tank.tankNr === baseTankNr || 
    tank.id?.startsWith(baseTankNr + '-')
  );

  if (matchingTanks.length === 0) {
    console.warn(`⚠️  Kein Tank gefunden für Item: ${item.produktName} (tankNr: ${baseTankNr})`);
    errorCount++;
    return;
  }

  // Wenn nur 1 Tank → Automatisch zuweisen
  if (matchingTanks.length === 1) {
    const oldTankNr = item.tankNr;
    item.tankNr = matchingTanks[0].id;
    migratedCount++;
    migrationLog.push({
      produkt: item.produktName,
      alt: oldTankNr,
      neu: item.tankNr
    });
    console.log(`✅ ${item.produktName}: "${oldTankNr}" → "${item.tankNr}"`);
    return;
  }

  // Mehrere Tanks → Heuristik: Erster freier Tank
  // Finde Tank mit geringstem Füllstand
  const tankFills = matchingTanks.map(tank => {
    const tankItems = inventory.filter(i => i.tankNr === tank.id);
    const fill = tankItems.reduce((sum, i) => sum + (parseFloat(i.currentQuantityLiters) || 0), 0);
    return { tank, fill };
  });

  tankFills.sort((a, b) => a.fill - b.fill);
  const targetTank = tankFills[0].tank;

  const oldTankNr = item.tankNr;
  item.tankNr = targetTank.id;
  migratedCount++;
  migrationLog.push({
    produkt: item.produktName,
    alt: oldTankNr,
    neu: item.tankNr,
    heuristik: 'leerstester Tank gewählt'
  });
  console.log(`✅ ${item.produktName}: "${oldTankNr}" → "${item.tankNr}" (${matchingTanks.length} Tanks verfügbar, leerstester gewählt)`);
});

console.log('\n📊 Migration Zusammenfassung:');
console.log(`   ✅ Migriert: ${migratedCount}`);
console.log(`   ℹ️  Unverändert: ${unchangedCount}`);
console.log(`   ⚠️  Fehler: ${errorCount}`);

// 5) Speichere korrigierte Daten
if (migratedCount > 0) {
  console.log('\n💾 Speichere korrigierte Daten...');
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(storageData, null, 2));
  console.log('✅ Daten gespeichert!');

  // Migration Log speichern
  const logFile = path.join(APPDATA_PATH, `migration-log-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify(migrationLog, null, 2));
  console.log(`✅ Migration-Log: ${logFile}`);
} else {
  console.log('\nℹ️  Keine Änderungen notwendig.');
}

console.log('\n' + '='.repeat(50));
console.log('🎉 Migration abgeschlossen!');
console.log(`💾 Backup: ${BACKUP_FILE}`);
