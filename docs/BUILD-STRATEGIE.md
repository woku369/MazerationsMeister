# Build-Strategie & Aufräumplan

Stand: 27.09.2026. Diese Datei beantwortet vier Fragen, die historisch gewachsen unklar geworden sind:
1. Welcher Build-Befehl ist für welchen Zweck der *gültige*?
2. Wie entstehen EXE / portable EXE, und welche Ordner brauche ich dafür?
3. Was ist Altlast und kann weg?
4. Wie sollte versioniert werden, und wo landen versionierte Builds eindeutig unterscheidbar?

Alles hier ist durch Lesen des tatsächlichen Codes (package.json, electron/, scripts/, .github/workflows/) und der GitHub-Actions-Historie verifiziert, nicht geraten.

## 1. Die drei echten Zielformen der App

| Zielform | Wie sie läuft | Wer sie baut |
|---|---|---|
| **Web / GitHub Pages** | Statischer Export (`next build` mit `output: 'export'` in `next.config.ts`) wird als reine HTML/JS/CSS-Seite ausgeliefert | **Automatisch** durch `.github/workflows/deploy.yml` bei jedem Push nach `fresh-main` |
| **Windows Portable EXE** | Electron-Fenster lädt `http://localhost:9003`, bedient von einem selbstgeschriebenen Node-HTTP-Server (`electron/main.js`), der Dateien direkt aus dem mitgelieferten `out/`-Ordner ausliefert | `npm run electron-build` (electron-builder) |
| **Lokale Entwicklung** | `next dev` mit Hot-Reload | `npm run dev` |

## 2. ✅ Erledigt (27.09.2026): `out/` aus dem Git-Tracking entfernt

`.gitignore` enthielt bis 27.09.2026 den Kommentar *"/out/ wird für GitHub Pages gebraucht, NICHT komplett ignorieren"* — das war die Arbeitsannahme, unter der auch in dieser Session mehrfach `out/` manuell neu gebaut und committet wurde (z.B. für den XSS-Fix am 26./27.09.2026).

**Das stimmte so nicht mehr**, verifiziert über die GitHub-Actions-Historie (60+ Runs, alle `success`): `.github/workflows/deploy.yml` baut bei jedem Push nach `fresh-main` selbst frisch mit `npm run build` und lädt genau dieses frische Ergebnis über `actions/upload-pages-artifact` + `actions/deploy-pages` hoch — der committete `out/`-Ordner spielte für die live geschaltete Seite nie eine Rolle.

**Umgesetzt** (Commit `31578af`, außerhalb dieser Session): `out/` komplett aus dem Git-Tracking entfernt und in `.gitignore` vollständig ignoriert. Im selben Zug wurde auch `distDir: 'out'` aus `next.config.ts` entfernt — vorher hatte sich `next dev` genau deshalb seinen Entwicklungs-Cache in denselben Ordner geschrieben wie der Produktions-Export, was die wiederholte "out/-Verschmutzung" in dieser Session verursacht hat. Damit ist dieses Problem strukturell beendet, nicht nur einmalig aufgeräumt.

Passend dazu (Commit `9d48d9b`, "Electron-Build repariert – App startet und lädt korrekt"): `out/` wird jetzt als `extraResources` von electron-builder aus dem lokalen Dateisystem kopiert (`process.resourcesPath` statt des vorher falschen `app.getAppPath()` in `electron/main.js`/`main.ts`) statt über `build.files` ins Electron-Bundle eingepackt zu werden — dabei kam auch das unten in Abschnitt 4 vermerkte unklare `.next`-Bundling raus, weil es schlicht nicht gebraucht wurde. Vom Nutzer selbst lokal als funktionierender Windows-Build bestätigt.

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
| `npm run electron-build` (electron-builder) | ✅ **empfohlener** Packaging-Weg, **funktionierend bestätigt (27.09.2026)** | Einzige config-gesteuerte, deklarative Lösung. Hatte bis 27.09.2026 einen echten Laufzeitfehler (`staticPath` zeigte über `app.getAppPath()` ins Leere statt zu `process.resourcesPath`) — behoben, Nutzer hat lokal einen lauffähigen Windows-Build bestätigt. |
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
| committeter `out/`-Ordner im Repo | ✅ **erledigt** | Siehe Abschnitt 2 — aus dem Git-Tracking entfernt (27.09.2026) |
| `.next`-Bundling in electron-builder (`build.files`/`extraFiles`) | ✅ **erledigt** | War tatsächlich unnötig (siehe Abschnitt 2) — im selben Fix entfernt, der auch den `staticPath`-Laufzeitfehler behoben hat |

## 5. Versionierung — aktueller Zustand: praktisch nicht vorhanden

Geprüft, nicht angenommen:
- `package.json` steht auf `"version": "0.1.0"` — trotz 20+ dokumentierter, teils größerer Ausbaustufen (Aufgabe 1–21 in dieser Roadmap) nie erhöht.
- Diese Versionsnummer wird **nirgends im laufenden Programm angezeigt** — kein Code liest `package.json`s `version`-Feld zur Laufzeit aus.
- Stattdessen steht in `src/components/layout/header.tsx` (Zeile 65) ein **hart codierter, unabhängiger String**: `"Mazerations-Meister V 1.0"`. Der stimmt weder mit `package.json` (0.1.0) noch mit dem tatsächlichen Funktionsumfang überein und wird bei jeder neuen Funktion nicht mitgepflegt.
- Die einzige Stelle, an der `package.json`s Version überhaupt eine Rolle spielt, ist das Platzhalter-Makro `${version}` in den `artifactName`-Vorlagen der electron-builder-Konfiguration (z.B. `MazerationsMeister-Portable-${version}.exe`) — nützt aber nichts, solange die Zahl nie erhöht wird.
- Die drei electron-packager-Alternativskripte (`build-portable`-npm-Skript, `scripts/build-fast.js`, `scripts/build-portable.js`) verwenden **gar keine Versions-Platzhalter** — sie erzeugen immer denselben Dateinamen (`MazerationsMeister.exe` bzw. `MazerationsMeister-Optimized.exe`) und überschreiben sich bei jedem Lauf selbst. Das ist ein weiterer Grund, sich (siehe Abschnitt 4) auf electron-builder als einzigen Weg festzulegen.
- Es existiert **kein einziger Git-Tag** im Repository.

### Empfohlene Versionierungsstrategie

1. **`package.json`s `version`-Feld wird die einzige Quelle der Wahrheit** (Semantic Versioning `MAJOR.MINOR.PATCH`):
   - `PATCH` (0.1.**1**) — Bugfixes, Datenkorrekturen ohne neue Funktion (z.B. Aufgabe 18)
   - `MINOR` (0.**2**.0) — neue Funktionen ohne Breaking Change (z.B. Aufgabe 15 Lohnbrand, Aufgabe 17 Rezepturen)
   - `MAJOR` (**1**.0.0) — grundlegende Änderungen an Datenformaten/Architektur, oder schlicht der Punkt, an dem die App als produktionsreif erklärt wird
2. **Bei jedem Release-relevanten Commit** `npm version patch|minor|major` verwenden (bumpt `package.json` und erzeugt automatisch einen passenden Git-Commit) statt die Zahl von Hand zu editieren.
3. **Git-Tag pro Release** (`git tag v0.2.0 && git push --tags`) — macht jeden Auslieferungsstand im Verlauf eindeutig wiederfindbar, unabhängig vom Build-Ordner.
4. **`header.tsx`s hartcodierten String durch die echte Version ersetzen** — z.B. per `import pkg from '../../../package.json'` (Next.js kann JSON importieren) statt eines von Hand gepflegten Texts. Kleiner, risikoarmer Fix, aber bewusst noch nicht umgesetzt (siehe Hinweis unten).
5. **Web-Export (GitHub Pages) braucht keine eigene Versionsnummer im Dateinamen** — dort gibt es ohnehin nur einen aktuellen Stand, der Git-Commit-Hash reicht als Referenz.

### Eindeutiger, versionierter Build-Ordner (für die portable EXE)

Aktuell landet jeder Build undifferenziert in `dist/` (electron-builder) bzw. wird dort von den Packager-Skripten sogar aktiv vorher gelöscht ("Bereinige alten Build..."). Es gibt keine Historie lauffähiger Vorgänger-Builds.

**Empfehlung:** `artifactName` in der electron-builder-Konfiguration um ein Versions-Unterverzeichnis erweitern:
```jsonc
"artifactName": "${version}/MazerationsMeister-Portable-${version}.exe"
```
Ergebnis: `dist/0.2.0/MazerationsMeister-Portable-0.2.0.exe`, `dist/0.3.0/...` usw. — jede Version bekommt ihren eigenen, eindeutig benannten Unterordner, ältere Builds werden nicht mehr stillschweigend überschrieben. `dist/` bleibt wie bisher nicht Teil des Git-Trackings (nur lokale Build-Ablage); alte Versionsordner bei Bedarf von Hand aufräumen (z.B. nur die letzten 2–3 Versionen behalten).

> ⚠️ **Nicht umgesetzt, nur dokumentiert:** Ob electron-builder Unterverzeichnisse in `artifactName` tatsächlich wie erwartet anlegt, ließe sich nur durch einen echten Windows-Build verifizieren — das ist in dieser (Linux-)Umgebung nicht möglich. Vor dem nächsten echten Portable-Build einmal testweise ausprobieren, bevor darauf verlassen wird.

## 6. Aufräumplan (dokumentiert, **noch nicht ausgeführt**)

Reihenfolge nach Risiko, niedrigstes zuerst:

1. ✅ **Erledigt (27.09.2026):** `out/` aus dem Git-Tracking genommen, `.gitignore` bereinigt, `distDir: 'out'` aus `next.config.ts` entfernt. Zusätzlich (nicht ursprünglich in diesem Plan, aber im selben Zug gefunden und behoben): `staticPath`-Laufzeitfehler in `electron/main.js`/`main.ts` (zeigte über `app.getAppPath()` ins Leere), `out/` läuft jetzt korrekt als `extraResources`. Lokaler Windows-Build vom Nutzer bestätigt funktionierend.
2. **Die 4 leeren Skripte löschen** (`build-optimized.js`, `build-optimized-full.js`, `build-static.js`, `fix-export.js`). Risiko: keins, sie tun nichts.
3. **`server.js` + `start.bat` löschen**, sofern niemand sie noch manuell benutzt (kurz nachfragen/testen, ob `start.bat` überhaupt noch jemand ausführt). Risiko: gering, vermutlich bereits nicht mehr funktionsfähig.
4. **`electron/main-simple.ts/js` löschen.** Risiko: keins (verwaist, keine Referenz).
5. **Auf einen Packaging-Weg festlegen** (Empfehlung: `electron-build`/electron-builder behalten — **funktioniert nachweislich**, siehe Abschnitt 4), danach `build-portable`-npm-Skript, `scripts/build-fast.js` und `scripts/build-portable.js` löschen. Risiko: gering, die frühere Unsicherheit ("funktioniert electron-builder überhaupt?") ist ausgeräumt.
6. **`nsis`-Konfigurationsblock** in `package.json` entweder entfernen oder bewusst aktivieren (`"nsis"` zu `win.target` hinzufügen, falls ein Setup-Installer neben der portablen Version gewünscht ist).
7. **`.github/workflows/deploy.yml`** Trigger-Liste auf `[fresh-main]` reduzieren (die anderen beiden Branch-Namen existieren nicht mehr).
8. ✅ **Erledigt (27.09.2026):** `.next`-Bundling in der electron-builder-Konfiguration entfernt — war tatsächlich unnötig, siehe Schritt 1.
9. **Versionierung einführen:** `header.tsx`s hartcodierten „V 1.0"-String durch die echte `package.json`-Version ersetzen, erste bewusste `npm version minor` (→ 0.2.0) für den aktuellen Stand setzen, Git-Tag dafür anlegen, `artifactName` um `${version}/`-Unterordner erweitern (mit Testbuild verifizieren). Risiko: gering (reine Anzeige- und Namensänderung), aber erst sinnvoll, sobald Schritt 5 (ein einziger Packaging-Weg) geklärt ist.

Jeder Schritt ist einzeln und risikoarm genug, um separat committet zu werden.
