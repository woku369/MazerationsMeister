const fs = require('fs');
const path = require('path');

const appDataPath = path.join(process.env.APPDATA, 'mazerationsmeister', 'mazerations-storage.json');
const currentData = JSON.parse(fs.readFileSync(appDataPath, 'utf-8'));
const currentTanks = currentData.tankDefinitions || [];

console.log('=== AKTUELLE CONTAINER (sortiert) ===');
console.log(`Total: ${currentTanks.length}\n`);

const sorted = currentTanks.map(t => t.id).sort();
sorted.forEach(id => console.log(id));

console.log('\n=== Nach Kategorie ===');
const byCategory = {};
currentTanks.forEach(t => {
  const cat = t.tankNr;
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(t.id);
});

Object.keys(byCategory).sort().forEach(cat => {
  console.log(`${cat}: ${byCategory[cat].length} Container`);
  console.log(`  ${byCategory[cat].join(', ')}`);
});
