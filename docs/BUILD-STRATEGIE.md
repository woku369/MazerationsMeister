# Build-Strategie & Aufräumplan

Stand: 27.09.2026. Diese Datei beantwortet drei Fragen, die historisch gewachsen unklar geworden sind:
1. Welcher Build-Befehl ist für welchen Zweck der *gültige*?
2. Wie entstehen EXE / portable EXE, und welche Ordner brauche ich dafür?
3. Was ist Altlast und kann weg?

Alles hier ist durch Lesen des tatsächlichen Codes (package.json, electron/, scripts/, .github/workflows/) und der GitHub-Actions-Historie verifiziert, nicht geraten.

## 1. Die drei echten Zielformen der App

| Zielform | Wie sie läuft | Wer sie baut |
|---|---|---|
| **Web / GitHub Pages** | Statischer Export (`next build` mit `output: 'export'` in `next.config.ts`) wird als reine HTML/JS/CSS-Seite ausgeliefert | **Automatisch** durch `.github/workflows/deploy.yml` bei jedem Push nach `fresh-main` |
| **Windows Portable EXE** | Electron-Fenster lädt `http://localhost:9003`, bedient von einem selbstgeschriebenen Node-HTTP-Server (`electron/main.js`), der Dateien direkt aus dem mitgelieferten `out/`-Ordner ausliefert | `npm run electron-build` (electron-builder) |
| **Lokale Entwicklung** | `next dev` mit Hot-Reload | `npm run dev` |

## 2. ⚠️ Wichtigster Befund: GitHub Pages braucht das committete `out/` NICHT

`.gitignore` enthält aktuell den Kommentar *"/out/ wird für GitHub Pages gebraucht, NICHT komplett ignorieren"* — das war die Arbeitsannahme, unter der auch in dieser Session mehrfach `out/` manuell neu gebaut und committet wurde (z.B. für den XSS-Fix am 26./27.09.2026).

**Das stimmt so nicht mehr.** Verifiziert über die GitHub-Actions-Historie (60+ Runs, alle `success`): `.github/workflows/deploy.yml` baut bei jedem Push nach `fresh-main` selbst frisch mit `npm run build` und lädt genau dieses frische Ergebnis über `actions/upload-pages-artifact` + `actions/deploy-pages` hoch. Das ist die moderne, Actions-basierte Pages-Bereitstellung (Repo-Einstellung *Settings → Pages → Source: GitHub Actions*) — **der committete `out/`-Ordner im Repo spielt für die tatsächlich live geschaltete Seite keine Rolle.**

Auch für die Electron-Pakete gilt das: Jedes Build-Skript (`electron-build`, `build-portable`, `scripts/build-fast.js`) ruft selbst zuerst `npm run build` auf, bevor gepackt wird — keines davon verlässt sich auf einen vorab committeten `out/`-Stand.

**Konsequenz:** `out/` sollte gar nicht mehr committet werden. Das war auch die Ursache für die wiederholte "out/-Verschmutzung" in dieser Session (jeder `next dev`-Aufruf schreibt seinen Dev-Cache in denselben Ordner, da `distDir: 'out'` in `next.config.ts` gesetzt ist — dev und Produktions-Export teilen sich den Ordner).

→ Siehe Abschnitt 5, Schritt 1 für den konkreten Aufräumschritt (noch nicht ausgeführt, nur dokumentiert).

## 3. Gültige Build-Befehle (nach Zweck)

### Entwicklung
```
npm run dev          # Next dev-Server, Port 9003 (Standard)
npm run dev:turbo    # Dasselbe mit Turbopack (schnellerer Rebuild, experimentell)
npm run typecheck    # tsc --noEmit
npm run test         # vitest
```

### Web-Deployment (GitHub Pages)
Passiert automatisch bei Push nach `fresh-main`. Manuell/lokal nachvollziehen:
```
npm run build        # next build → schreibt statischen Export nach out/
```
Kein weiterer Schritt nötig — nicht committen, nicht manuell hochladen.

### Windows Portable EXE — **empfohlener Weg**
```
npm run electron-build
```
Das ist `next build && tsc electron && electron-builder`, gesteuert über den `"build"`-Block in `package.json` (electron-builder-Konfiguration). Ergebnis landet in `dist/` als `MazerationsMeister-Portable-<version>.exe`.

**Benötigte Ordner laut `build.files`/`extraResources`:** `out/` (frisch gebaut, wird embedded), `electron/`, `public/`, `.next/` (siehe Anmerkung unten), `package.json`, Config-Dateien. Alles wird von electron-builder selbst eingesammelt — es muss nichts manuell kopiert werden.

> ⚠️ Die `build`-Konfiguration bündelt zusätzlich `.next/**/*` (Zeile `extraFiles`/`files`). Da die Electron-App laut `electron/main.js` ausschließlich einen eigenen statischen Server über `out/` fährt (kein Next-Server läuft zur Laufzeit), ist unklar, wozu `.next/` im Paket noch gebraucht wird — vermutlich Altlast aus einer früheren Architektur. Nicht risikofrei entfernbar ohne Testbuild, deshalb hier nur vermerkt, nicht geändert.

### Windows Portable EXE — **doppelt vorhandene Alternativwege (Altlast, siehe Abschnitt 4)**
- `npm run build-portable` (package.json) → nutzt **electron-packager** (anderes Tool als oben!)
- `node scripts/build-fast.js` (`npm run build-fast`) → nutzt ebenfalls electron-packager, mit eigener Ignore-Liste, nennt sich "OPTIMIZED"
- `node scripts/build-portable.js` (kein npm-Alias, nur direkt aufrufbar) → dritte electron-packager-Variante, nennt sich "Full-Featured"

Drei verschiedene Pakete, drei verschiedene Tools/Konfigurationen, für denselben Zweck. Das ist der Kern des "Build-Chaos".

## 4. Inventar: was ist gültig, was ist Altlast

| Datei/Skript | Status | Begründung |
|---|---|---|
| `npm run dev`, `dev:turbo` | ✅ gültig | Aktive Entwicklung |
| `npm run build` | ✅ gültig | Einzige Quelle für den statischen Export, von Actions UND allen Electron-Skripten verwendet |
| `npm run electron-build` (electron-builder) | ✅ **empfohlener** Packaging-Weg | Einzige config-gesteuerte, deklarative Lösung |
| `.github/workflows/deploy.yml` | ✅ gültig, aber **stellenweise veraltet** | Trigger-Liste `[main, main-pages, fresh-main]` — die Branches `main` und `main-pages` existieren nicht mehr, nur `fresh-main` ist real. Ungefährlich (Push nach nicht-existenten Branches passiert nie), aber verwirrend beim Lesen. |
| `npm run build-portable` (electron-packager, in package.json) | ⚠️ Altlast/Duplikat | Redundant zu `electron-build`, anderes Tool |
| `scripts/build-fast.js` | ⚠️ Altlast/Duplikat | Dritte Packaging-Variante |
| `scripts/build-portable.js` | ⚠️ Altlast/Duplikat | Vierte Packaging-Variante, nicht mal als npm-Skript verdrahtet |
| `scripts/build-optimized.js` | ❌ **tot** | 0 Bytes, leer |
| `scripts/build-optimized-full.js` | ❌ **tot** | 0 Bytes, leer |
| `scripts/build-static.js` | ❌ **tot** | 0 Bytes, leer |
| `scripts/fix-export.js` | ❌ **tot** | 0 Bytes, leer |
| `server.js` + `start.bat` | ❌ **vermutlich tot/inkompatibel** | Startet einen echten Next.js-SSR-Server (`next({dev:false})`) — das funktioniert nicht sinnvoll zusammen mit `output: 'export'` in `next.config.ts` (Export-Modus liefert keinen lauffähigen Server-Build). Referenziert außerdem noch die alte, riskante `/tank/[id]`-Route. Wirkt wie ein Überbleibsel aus der Zeit vor der Umstellung auf statischen Export + Electron-eigenen Server. |
| `electron/main.js` + `main.ts` | ✅ gültig | Über `package.json`-Feld `"main"` tatsächlich verwendet, korrekte Routing-Logik für den Multi-Page-Export (prüft `pfad/index.html`, dann `pfad.html`, dann SPA-Fallback) |
| `electron/main-simple.js` + `main-simple.ts` | ⚠️ **verwaist** | Wird von nichts referenziert (`package.json`s `"main"` zeigt auf `main.js`, kein Build-Skript nutzt es). Routing-Logik ist zudem simpler/fehlerhafter (wirft bei jeder Route sofort auf `index.html` zurück, statt erst `pfad/index.html` zu prüfen — würde bei echtem Einsatz clientseitiges Routing brechen). |
| `nsis`-Konfiguration in `package.json` | ⚠️ **inkonsistent** | Vorhanden inkl. eigenem `artifactName: "...-Setup-....exe"`, aber `win.target` listet nur `"portable"` — NSIS wird also nie tatsächlich gebaut. Entweder gewollt entfernen oder `"nsis"` wieder in `win.target` aufnehmen. |
| committeter `out/`-Ordner im Repo | ⚠️ **überflüssig** | Siehe Abschnitt 2 — für keinen der beiden Deployment-Wege tatsächlich nötig |

## 5. Aufräumplan (dokumentiert, **noch nicht ausgeführt**)

Reihenfolge nach Risiko, niedrigstes zuerst:

1. **`out/` aus dem Git-Tracking nehmen** (`git rm -r --cached out/`, `.gitignore`-Kommentar korrigieren, `out/` komplett ignorieren statt nur die Cache-Unterordner). Risiko: keins — beide Deployment-Wege bauen ohnehin frisch. Vorteil: beendet die wiederkehrende Dev-Cache-Verschmutzung endgültig und verkleinert jeden künftigen Commit-Diff drastisch.
2. **Die 4 leeren Skripte löschen** (`build-optimized.js`, `build-optimized-full.js`, `build-static.js`, `fix-export.js`). Risiko: keins, sie tun nichts.
3. **`server.js` + `start.bat` löschen**, sofern niemand sie noch manuell benutzt (kurz nachfragen/testen, ob `start.bat` überhaupt noch jemand ausführt). Risiko: gering, vermutlich bereits nicht mehr funktionsfähig.
4. **`electron/main-simple.ts/js` löschen.** Risiko: keins (verwaist, keine Referenz).
5. **Auf einen Packaging-Weg festlegen** (Empfehlung: `electron-build`/electron-builder behalten), danach `build-portable`-npm-Skript, `scripts/build-fast.js` und `scripts/build-portable.js` löschen. Risiko: mittel — vorher einmal testen, ob electron-builder tatsächlich ein lauffähiges Portable erzeugt (falls die drei Alternativen aus gutem Grund existieren, z.B. weil electron-builder mal nicht funktioniert hat, das zuerst klären).
6. **`nsis`-Konfigurationsblock** in `package.json` entweder entfernen oder bewusst aktivieren (`"nsis"` zu `win.target` hinzufügen, falls ein Setup-Installer neben der portablen Version gewünscht ist).
7. **`.github/workflows/deploy.yml`** Trigger-Liste auf `[fresh-main]` reduzieren (die anderen beiden Branch-Namen existieren nicht mehr).
8. **`.next`-Bundling in der electron-builder-Konfiguration** hinterfragen — vermutlich entfernbar, aber nur mit Testbuild verifizieren.

Jeder Schritt ist einzeln und risikoarm genug, um separat committet zu werden.
