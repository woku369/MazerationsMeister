/**
 * Restore Inventory Data from Backup
 * Stellt die inventoryData aus dem Backup wieder her
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'mazerationsmeister');
const storageFile = path.join(appDataPath, 'mazerations-storage.json');
const backupFile = path.join(__dirname, 'FINAL_BACKUP_2025-09-23_07-45.json');

console.log('\n🔄 Inventory Data Wiederherstellung\n');
console.log('='.repeat(60));

try {
  // Load current storage
  const current = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
  console.log(`\n📥 Aktuell: ${current.inventoryData?.length || 0} Inventory Items`);
  
  // Load backup
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  console.log(`📦 Backup: ${backup.inventory?.length || 0} Inventory Items`);
  
  if (!backup.inventory || backup.inventory.length === 0) {
    console.log('\n⚠️  Backup hat keine Inventory-Daten!');
    process.exit(0);
  }
  
  // Restore inventory data
  current.inventoryData = backup.inventory;
  
  // Save
  const backupPath = storageFile + '.before-inventory-restore';
  fs.writeFileSync(backupPath, JSON.stringify(current, null, 2));
  console.log(`\n💾 Backup erstellt: ${path.basename(backupPath)}`);
  
  fs.writeFileSync(storageFile, JSON.stringify(current, null, 2));
  console.log(`✅ ${current.inventoryData.length} Inventory Items wiederhergestellt!`);
  
  // Stats
  const tankUsage = {};
  current.inventoryData.forEach(item => {
    const tankNr = item.tankNr || item.tank || 'UNBEKANNT';
    if (!tankUsage[tankNr]) tankUsage[tankNr] = 0;
    tankUsage[tankNr]++;
  });
  
  console.log('\n📊 Wiederhergestellte Items nach Tank:\n');
  Object.keys(tankUsage).sort().forEach(tankNr => {
    console.log(`  ${tankNr.padEnd(12)} - ${tankUsage[tankNr]} Items`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Inventory-Daten erfolgreich wiederhergestellt!');
  console.log('🔄 Bitte App neu starten!\n');
  
} catch (error) {
  console.error('\n❌ Fehler:', error.message);
  process.exit(1);
}
