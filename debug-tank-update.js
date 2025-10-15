/**
 * Debug: Tank Update Testing
 * Prüft ob Tank-Updates korrekt gespeichert und geladen werden
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'mazerationsmeister');
const storageFile = path.join(appDataPath, 'mazerations-storage.json');

console.log('\n🔍 Tank Update Debug\n');
console.log('='.repeat(60));

try {
  const data = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
  const tanks = data.tankDefinitions || [];
  
  console.log(`\n📊 Anzahl Container: ${tanks.length}\n`);
  
  // Finde Fass-4
  const fass4 = tanks.find(t => t.id === 'Fass-4');
  
  if (fass4) {
    console.log('🔍 Fass-4 gefunden:');
    console.log(`  ID: ${fass4.id}`);
    console.log(`  Tank-Nr: ${fass4.tankNr}`);
    console.log(`  Kapazität: ${fass4.volumenLiter} L`);
    console.log(`  Beschreibung: ${fass4.bezeichnung || 'N/A'}`);
    console.log(`  Typ: ${fass4.containerType || 'N/A'}`);
  } else {
    console.log('❌ Fass-4 nicht gefunden!');
  }
  
  // Liste alle Fass-Container
  console.log('\n📦 Alle Fass-Container:\n');
  const fassContainers = tanks.filter(t => t.id && t.id.startsWith('Fass-'));
  fassContainers.forEach(tank => {
    console.log(`  ${tank.id.padEnd(10)} - ${tank.volumenLiter}L`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Um Kapazität zu ändern:');
  console.log('1. Öffne Gebindeverwaltung');
  console.log('2. Klicke auf Fass-4');
  console.log('3. Ändere Kapazität auf 200L');
  console.log('4. Speichern');
  console.log('5. App komplett schließen (CTRL+Q)');
  console.log('6. App neu starten');
  console.log('7. Prüfe ob Fass-4 noch 200L hat\n');
  
  console.log('📝 Aktueller Wert: ' + (fass4 ? fass4.volumenLiter + 'L' : 'Nicht gefunden!'));
  console.log('\n');
  
} catch (error) {
  console.error('❌ Fehler:', error.message);
}
