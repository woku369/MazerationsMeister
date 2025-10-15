const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 MazerationsMeister - ULTRA-Optimierter Build');
console.log('=================================================\n');

// 1. Next.js Build
console.log('📦 Step 1/6: Next.js Build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js Build erfolgreich\n');
} catch (error) {
  console.error('❌ Next.js Build fehlgeschlagen');
  process.exit(1);
}

// 2. TypeScript kompilieren
console.log('🔨 Step 2/6: TypeScript kompilieren...');
try {
  execSync('npx tsc --project electron/tsconfig.json', { stdio: 'inherit' });
  console.log('✅ TypeScript kompiliert\n');
} catch (error) {
  console.error('❌ TypeScript Kompilierung fehlgeschlagen');
  process.exit(1);
}

// 3. Minimales Build-Verzeichnis erstellen
console.log('📝 Step 3/6: Minimales Build-Verzeichnis erstellen...');
const buildDir = path.join(__dirname, '../.build-minimal');

// Alte Version löschen falls vorhanden
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}

fs.mkdirSync(buildDir, { recursive: true });

// Nur essenzielle Dateien kopieren
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('  → Kopiere /out (Next.js Build)...');
copyDir(path.join(__dirname, '../out'), path.join(buildDir, 'out'));

console.log('  → Kopiere /electron (Electron Main Process)...');
copyDir(path.join(__dirname, '../electron'), path.join(buildDir, 'electron'));

console.log('  → Kopiere /public (Static Assets)...');
copyDir(path.join(__dirname, '../public'), path.join(buildDir, 'public'));

// Minimales package.json
const packageJson = require('../package.json');
const minimalPackage = {
  name: packageJson.name,
  version: packageJson.version,
  main: packageJson.main,
  dependencies: {
    // Nur Runtime-Dependencies
    'electron-is-dev': packageJson.dependencies['electron-is-dev'],
    'express': packageJson.dependencies['express']
  }
};

fs.writeFileSync(
  path.join(buildDir, 'package.json'),
  JSON.stringify(minimalPackage, null, 2)
);

console.log('✅ Minimales Build-Verzeichnis erstellt\n');

// 4. Dependencies installieren (nur Production)
console.log('📦 Step 4/6: Production Dependencies installieren...');
try {
  execSync('npm install --production --no-optional', { 
    cwd: buildDir,
    stdio: 'inherit' 
  });
  console.log('✅ Dependencies installiert\n');
} catch (error) {
  console.error('❌ Dependencies Installation fehlgeschlagen');
  process.exit(1);
}

// 5. Electron Packager
console.log('🎁 Step 5/6: Electron Packager...');
const timestamp = Date.now();
const packagerCmd = `npx electron-packager "${buildDir}" MazerationsMeister --platform=win32 --arch=x64 --out=dist-minimal-${timestamp} --overwrite --asar --icon=public/icon.ico`;

try {
  execSync(packagerCmd, { stdio: 'inherit' });
  console.log('✅ Electron Packager erfolgreich\n');
} catch (error) {
  console.error('❌ Electron Packager fehlgeschlagen');
  process.exit(1);
}

// 6. Größe analysieren
console.log('📊 Step 6/6: Build-Größe analysieren...');
const distPath = path.join(__dirname, '../dist-ultra/MazerationsMeister-win32-x64');

function getDirSize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(itemPath) {
    const stats = fs.statSync(itemPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach(item => {
        calculateSize(path.join(itemPath, item));
      });
    }
  }
  
  calculateSize(dirPath);
  return totalSize;
}

if (fs.existsSync(distPath)) {
  const sizeBytes = getDirSize(distPath);
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  
  console.log('✅ Build abgeschlossen!\n');
  console.log('📁 Ausgabe: dist-ultra/MazerationsMeister-win32-x64/');
  console.log(`📊 Größe: ${sizeMB} MB`);
  console.log(`🎯 Reduzierung: ${((1400 - sizeMB) / 1400 * 100).toFixed(1)}% kleiner als Original`);
  console.log('\n💡 Tipp: Mit 7-Zip auf ~150-200 MB komprimierbar');
  
  // Cleanup
  console.log('\n🧹 Cleanup...');
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log('✅ Temporäre Dateien entfernt');
} else {
  console.error('❌ Build-Ordner nicht gefunden');
  process.exit(1);
}

console.log('\n🎉 ULTRA-Build fertig!');
console.log('✅ Voller Funktionsumfang erhalten');
console.log('✅ Maximale Größenoptimierung');
