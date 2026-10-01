/**
 * Erzeugt src/build-info.json mit Versions- und Build-Angaben, die die App
 * zur Laufzeit anzeigen kann (Nutzer-Anfrage 01.10.2026: "ich erhalte immer
 * nur die 0.1.0" - package.json's Version allein änderte sich nie zwischen
 * Builds, jeder Build sah identisch aus).
 *
 * Läuft bei jedem Start von Next.js (eingebunden in next.config.ts, nicht
 * nur als eigener npm-Schritt) - deckt dadurch gleichermaßen `next dev`,
 * `next build` (und damit electron-build/build-portable/build-fast, die
 * alle vorher next build aufrufen) sowie einen schlichten Checkout ohne
 * vorherigen Lauf ab, ohne an mehreren Stellen im Buildscript verdrahtet
 * werden zu müssen.
 *
 * Die Build-Nummer ist die Anzahl der Git-Commits (`git rev-list --count
 * HEAD`) - wächst automatisch mit jeder echten Codeänderung, ohne eine
 * eigene Zähler-Datei pflegen zu müssen, die man vergessen könnte zu
 * committen oder zu inkrementieren.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeExec(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return fallback;
  }
}

function generateBuildInfo() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
  const buildNumber = Number(safeExec('git rev-list --count HEAD', '0')) || 0;
  const gitCommit = safeExec('git rev-parse --short HEAD', 'unbekannt');

  const buildInfo = {
    version: pkg.version,
    buildNumber,
    gitCommit,
    buildDate: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '..', 'src', 'build-info.json');
  fs.writeFileSync(outPath, JSON.stringify(buildInfo, null, 2) + '\n');
  console.log(`📦 Build-Info: v${buildInfo.version} · Build ${buildInfo.buildNumber} (${buildInfo.gitCommit})`);
  return buildInfo;
}

module.exports = { generateBuildInfo };

// Auch direkt per `node scripts/generate-build-info.js` ausführbar.
if (require.main === module) {
  generateBuildInfo();
}
