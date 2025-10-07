# Data-Sync Bug Fixes - 7. Oktober 2025

## Problem
Die Daten-Synchronisation zwischen zwei Rechnern startete **automatisch beim App-Start**, was zu folgenden Problemen führte:
- Auto-Sync lief ungewollt im Hintergrund
- "Sync bereits aktiv" Fehler bei manuellen Upload/Download
- Rechner 2 überschrieb GitHub-Daten mit leeren Daten (0 Tanks statt 50)
- User konnte Auto-Sync nicht kontrollieren

## Root Cause Analysis

### Bug 1: Auto-Start in `loadConfig()`
**Datei:** `src/lib/app-auto-sync.ts` (Zeile 60)

```typescript
// VORHER - FALSCH:
if (savedConfig.enabled && savedConfig.githubToken) {
  await this.initialize(savedConfig);  // ← Startet Auto-Sync beim App-Start!
}

// NACHHER - RICHTIG:
this.config = savedConfig;
console.log('[AppAutoSync] 📋 Config geladen (Auto-Start deaktiviert)');
// Nur Config laden, KEIN Auto-Start!
```

**Problem:** Wenn `enabled: true` gespeichert war, startete Auto-Sync automatisch beim App-Start.

---

### Bug 2: GitHub Service nur bei `enabled: true` initialisiert
**Datei:** `src/lib/app-auto-sync.ts` (Zeile 83)

```typescript
// VORHER - FALSCH:
if (config.enabled && config.githubToken) {
  this.githubService = new GitHubService({...}); // ← Nur bei enabled=true!
}

// NACHHER - RICHTIG:
if (config.githubToken) {
  this.githubService = new GitHubService({...}); // ← IMMER initialisieren!
  
  if (config.enabled) {
    this.startAutoSync(); // ← Auto-Sync nur hier starten!
  } else {
    console.log('[AppAutoSync] ℹ️ Auto-Sync deaktiviert (nur manuelle Sync)');
  }
}
```

**Problem:** Bei `enabled: false` wurde GitHub Service nicht initialisiert → Upload/Download schlugen fehl mit "GitHub Service nicht initialisiert".

---

### Bug 3: `handleInitialSync()` aktivierte Auto-Sync
**Datei:** `src/components/settings/data-sync-settings.tsx` (Zeile 112)

```typescript
// VORHER - FALSCH:
await appSync.initialize({
  enabled: true,  // ← Startet Auto-Sync!
  ...
});

// NACHHER - RICHTIG:
await appSync.initialize({
  enabled: false, // ← Nur GitHub Service, KEIN Auto-Sync!
  ...
});
```

**Problem:** Beim manuellen Upload/Download wurde Auto-Sync aktiviert, obwohl User nur einmalig synchronisieren wollte.

---

### Bug 4: Überflüssiges `branch` Property
**Datei:** `src/lib/app-auto-sync.ts` (Zeile 299)

```typescript
// VORHER - FALSCH (TypeScript Fehler):
await this.githubService.uploadFile({
  path: 'docs/app-data.json',
  content: content,
  message: '...',
  branch: 'pages-clean'  // ← Property existiert nicht in GitHubFile Interface!
});

// NACHHER - RICHTIG:
await this.githubService.uploadFile({
  path: 'docs/app-data.json',
  content: content,
  message: '...'
  // Branch wird bereits im GitHubService Constructor gesetzt!
});
```

**Problem:** TypeScript Compiler-Fehler, da `GitHubFile` Interface kein `branch` Property hat.

---

## Solution Summary

### Fixes implementiert:
1. ✅ **loadConfig()**: Lädt nur Config, startet NICHT Auto-Sync
2. ✅ **initialize()**: GitHub Service IMMER initialisieren (für Upload/Download), Auto-Sync nur bei `enabled: true`
3. ✅ **handleInitialSync()**: Setzt `enabled: false` für manuelle Sync-Operationen
4. ✅ **uploadFile()**: Überflüssiges `branch` Property entfernt

### Workflow nach Fix:

#### Rechner 1 (Büro) - Upload:
```
1. App starten
   → [AppAutoSync] 📋 Config geladen (Auto-Start deaktiviert)
   
2. Einstellungen → Daten-Synchronisation → GitHub konfigurieren
   
3. "Von diesem Rechner hochladen" klicken
   → [AppAutoSync] ✅ GitHub Service initialisiert
   → [AppAutoSync] ℹ️ Auto-Sync deaktiviert (nur manuelle Sync)
   → [AppAutoSync] ✅ Upload erfolgreich (33.58 KB)
   
4. ✅ 50 Tanks + 50 Inventory Items auf GitHub
```

#### Rechner 2 (Home-Office) - Download:
```
1. App starten
   → [AppAutoSync] 📋 Config geladen (Auto-Start deaktiviert)
   
2. Einstellungen → Daten-Synchronisation → GitHub konfigurieren
   
3. "Vom Server herunterladen" klicken
   → [AppAutoSync] ✅ GitHub Service initialisiert
   → [AppAutoSync] ℹ️ Auto-Sync deaktiviert (nur manuelle Sync)
   → [AppAutoSync] ✅ Download erfolgreich: {tanks: 50}
   
4. ✅ 50 Tanks in Tank-Overview sichtbar
```

#### Auto-Sync (Optional):
```
5. Beide Rechner: Auto-Sync manuell aktivieren
   → [AppAutoSync] ✅ Auto-Sync aktiviert (alle 60 Minuten)
   
6. Automatische Synchronisation läuft alle 60 Minuten
```

---

## Test Results

### Rechner 1 (Upload):
```
✅ Config geladen (Auto-Start deaktiviert)
✅ GitHub Service initialisiert
✅ Auto-Sync deaktiviert (nur manuelle Sync)
✅ Upload erfolgreich (33.58 KB)
✅ 50 Tanks + 50 Inventory Items
```

### Rechner 2 (Download):
```
✅ Config geladen (Auto-Start deaktiviert)
✅ GitHub Service initialisiert
✅ Auto-Sync deaktiviert (nur manuelle Sync)
✅ Download erfolgreich: {tanks: 50}
✅ Daten lokal gespeichert
✅ 50 Tanks in UI sichtbar
```

### Keine Fehler mehr:
- ❌ "Auto-Sync gestartet" (ungewollt)
- ❌ "Sync bereits aktiv"
- ❌ "GitHub Service nicht initialisiert"
- ❌ Upload mit 0 Tanks überschreibt GitHub

---

## Files Changed

1. `src/lib/app-auto-sync.ts`
   - loadConfig(): Kein Auto-Start
   - initialize(): GitHub Service immer initialisieren, Auto-Sync nur bei enabled=true
   - uploadFile(): branch Property entfernt

2. `src/components/settings/data-sync-settings.tsx`
   - handleInitialSync(): enabled: false statt true

3. Build:
   - dist-ultra/MazerationsMeister-win32-x64/ (230 MB)
   - Getestet auf Rechner 1 (Electron) + Rechner 2 (EXE)

---

## Known Issues (To Fix)

1. **Doppelte GitHub-Konfiguration:**
   - "GitHub Integration" (für QR-Codes)
   - "Daten-Synchronisation" (für App-Data)
   - → User muss zweimal konfigurieren (verwirrend)
   - → TODO: Zentrale GitHub-Config

2. **Auto-Sync Status nicht visuell klar:**
   - Toggle fehlt grün/rot Indikator
   - → TODO: Badge mit "AN" (grün) / "AUS" (rot)

3. **Error-Handling:**
   - "Sync bereits aktiv" als Fehler angezeigt
   - → TODO: Button während Sync disablen

---

## Date: 7. Oktober 2025
## Author: GitHub Copilot + Wolfgang
## Version: 1.5.0 → 1.5.1 (Bug Fix Release)
