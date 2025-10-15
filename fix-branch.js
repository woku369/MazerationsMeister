const fs = require('fs');

// Echte Tank-Daten ASCII-safe laden
const tankData = JSON.parse(fs.readFileSync('tank-data.json', 'utf-8'));

// ASCII-safe Konvertierung für GitHub Pages
function toAsciiSafe(text) {
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\x00-\x7F]/g, ''); // Entferne alle Nicht-ASCII Zeichen
}

// Erstelle ASCII-safe Version
const asciiSafeTankData = JSON.parse(JSON.stringify(tankData, (key, value) => {
  if (typeof value === 'string') {
    return toAsciiSafe(value);
  }
  return value;
}));

// Schreibe ASCII-safe Version für GitHub Pages
fs.writeFileSync('tank-data-ascii.json', JSON.stringify(asciiSafeTankData, null, 2));

console.log('✅ ASCII-safe tank-data-ascii.json erstellt');
console.log('📄 Original Tanks:', tankData.tanks.length);
console.log('📄 Original Inventory:', tankData.inventory.length);
console.log('🔤 ASCII-safe konvertiert für GitHub Pages');