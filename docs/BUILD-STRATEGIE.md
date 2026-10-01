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

### Windows Portable EXE — Alternativwege entfernt (01.10.2026)
Nutzer bestätigte: `npm run electron-build` ist der tatsächlich verwendete Weg. Die drei Alternativen (`build-portable`-npm-Skript, `scripts/build-fast.js`, `scripts/build-portable.js`) wurden daraufhin ersatzlos gelöscht - siehe Abschnitt 4/6.

## 4. Inventar: was ist gültig, was ist Altlast

| Datei/Skript | Status | Begründung |
|---|---|---|
| `npm run dev`, `dev:turbo` | ✅ gültig | Aktive Entwicklung |
| `npm run build` | ✅ gültig | Einzige Quelle für den statischen Export, von Actions UND allen Electron-Skripten verwendet |
| `npm run electron-build` (electron-builder) | ✅ **empfohlener** Packaging-Weg, **funktionierend bestätigt (27.09.2026)** | Einzige config-gesteuerte, deklarative Lösung. Hatte bis 27.09.2026 einen echten Laufzeitfehler (`staticPath` zeigte über `app.getAppPath()` ins Leere statt zu `process.resourcesPath`) — behoben, Nutzer hat lokal einen lauffähigen Windows-Build bestätigt. |
| `.github/workflows/deploy.yml` | ✅ **erledigt (01.10.2026)** | Trigger-Liste auf `[fresh-main]` reduziert — `main` und `main-pages` existierten nicht mehr. |
| `npm run build-portable` (electron-packager, in package.json) | ❌ **gelöscht (01.10.2026)** | War redundant zu `electron-build`, anderes Tool |
| `scripts/build-fast.js` | ❌ **gelöscht (01.10.2026)** | War dritte Packaging-Variante |
| `scripts/build-portable.js` | ❌ **gelöscht (01.10.2026)** | War vierte Packaging-Variante, nicht mal als npm-Skript verdrahtet |
| `scripts/build-optimized.js` | ❌ **gelöscht (01.10.2026)** | War 0 Bytes, leer |
| `scripts/build-optimized-full.js` | ❌ **gelöscht (01.10.2026)** | War 0 Bytes, leer |
| `scripts/build-static.js` | ❌ **gelöscht (01.10.2026)** | War 0 Bytes, leer |
| `scripts/fix-export.js` | ❌ **gelöscht (01.10.2026)** | War 0 Bytes, leer |
| `server.js` + `start.bat` | ❌ **gelöscht (01.10.2026)** | Alter Next.js-SSR-Server-Ansatz, unvereinbar mit `output: 'export'` + Electron-eigenem Static-Server |
| `electron/main.js` + `main.ts` | ✅ gültig | Über `package.json`-Feld `"main"` tatsächlich verwendet, korrekte Routing-Logik für den Multi-Page-Export (prüft `pfad/index.html`, dann `pfad.html`, dann SPA-Fallback). Seit Aufgabe 40 (siehe ROADMAP.md) mit korrekt eingehängtem `preload.js` für die sichere `window.electronAPI`-Bridge. |
| `electron/main-simple.js` + `main-simple.ts` | ❌ **gelöscht (01.10.2026)** | War verwaist, wurde von nichts referenziert |
| `nsis`-Konfiguration in `package.json` | ❌ **gelöscht (01.10.2026)** | War inkonsistent: `win.target` listet nur `"portable"`, NSIS wurde nie tatsächlich gebaut |
| committeter `out/`-Ordner im Repo | ✅ **erledigt** | Siehe Abschnitt 2 — aus dem Git-Tracking entfernt (27.09.2026) |
| `.next`-Bundling in electron-builder (`build.files`/`extraFiles`) | ✅ **erledigt** | War tatsächlich unnötig (siehe Abschnitt 2) — im selben Fix entfernt, der auch den `staticPath`-Laufzeitfehler behoben hat |

## 5. Versionierung — ✅ umgesetzt (Aufgabe 46, 01.10.2026)

Ursprünglicher Befund (bis 01.10.2026 zutreffend): `package.json` stand seit dem Scaffold unverändert auf `0.1.0`, nirgends im laufenden Programm angezeigt — `header.tsx` zeigte stattdessen einen hart codierten, unabhängigen String (`"Mazerations-Meister V 1.0"`). Kein Git-Tag im Repository.

**Tatsächlich umgesetzt, leicht abweichend von der unten ursprünglich skizzierten Empfehlung:**
- `package.json`s `version` ist jetzt `0.2.0` (erster echter Bump) und bleibt die Quelle der Wahrheit für die *semantische* Version — weitere Bumps bewusst manuell/nach Bedarf (nicht automatisch pro Commit, sonst wäre Major/Minor bedeutungslos).
- Statt `npm version`/Git-Tags übernimmt `scripts/generate-build-info.js` die **Build-Nummer** automatisch über `git rev-list --count HEAD` — kein manueller Schritt pro Release nötig, kein Risiko, ihn zu vergessen. Läuft über `next.config.ts` vor jedem `next dev`/`next build` (und damit auch vor `electron-build`, siehe Abschnitt 3) und schreibt `src/build-info.json` (Version, Build-Nummer, Git-Commit, Zeitstempel).
- `header.tsx` zeigt jetzt `Mazerations-Meister v{version}` mit Build-Nummer; die Einstellungen-Seite zeigt zusätzlich eine vollständige Fußzeile (Version, Build, Commit, Zeitstempel).
- **Noch nicht umgesetzt** (siehe nächster Abschnitt): Git-Tags pro Release, versionierter Unterordner in `dist/`.

### Eindeutiger, versionierter Build-Ordner (für die portable EXE)

Aktuell landet jeder Build undifferenziert in `dist/` (electron-builder) bzw. wird dort von den Packager-Skripten sogar aktiv vorher gelöscht ("Bereinige alten Build..."). Es gibt keine Historie lauffähiger Vorgänger-Builds.

**Empfehlung:** `artifactName` in der electron-builder-Konfiguration um ein Versions-Unterverzeichnis erweitern:
```jsonc
"artifactName": "${version}/MazerationsMeister-Portable-${version}.exe"
```
Ergebnis: `dist/0.2.0/MazerationsMeister-Portable-0.2.0.exe`, `dist/0.3.0/...` usw. — jede Version bekommt ihren eigenen, eindeutig benannten Unterordner, ältere Builds werden nicht mehr stillschweigend überschrieben. `dist/` bleibt wie bisher nicht Teil des Git-Trackings (nur lokale Build-Ablage); alte Versionsordner bei Bedarf von Hand aufräumen (z.B. nur die letzten 2–3 Versionen behalten).

> ⚠️ **Nicht umgesetzt, nur dokumentiert:** Ob electron-builder Unterverzeichnisse in `artifactName` tatsächlich wie erwartet anlegt, ließe sich nur durch einen echten Windows-Build verifizieren — das ist in dieser (Linux-)Umgebung nicht möglich. Vor dem nächsten echten Portable-Build einmal testweise ausprobieren, bevor darauf verlassen wird.

## 6. Aufräumplan — ✅ vollständig ausgeführt (01.10.2026)

Nutzer bestätigte auf Nachfrage „welches Build-Script wird verwendet, können die anderen weg?" → `electron-build`, Rest aufräumen.

1. ✅ **Erledigt (27.09.2026):** `out/` aus dem Git-Tracking genommen, `.gitignore` bereinigt, `distDir: 'out'` aus `next.config.ts` entfernt. Zusätzlich (nicht ursprünglich in diesem Plan, aber im selben Zug gefunden und behoben): `staticPath`-Laufzeitfehler in `electron/main.js`/`main.ts` (zeigte über `app.getAppPath()` ins Leere), `out/` läuft jetzt korrekt als `extraResources`. Lokaler Windows-Build vom Nutzer bestätigt funktionierend.
2. ✅ **Erledigt (01.10.2026):** Die 4 leeren Skripte gelöscht (`build-optimized.js`, `build-optimized-full.js`, `build-static.js`, `fix-export.js`).
3. ✅ **Erledigt (01.10.2026):** `server.js` + `start.bat` gelöscht.
4. ✅ **Erledigt (01.10.2026):** `electron/main-simple.ts/js` gelöscht.
5. ✅ **Erledigt (01.10.2026):** Nutzer bestätigte `electron-build` als tatsächlich verwendeten Weg — `build-portable`-npm-Skript, `scripts/build-fast.js` und `scripts/build-portable.js` gelöscht.
6. ✅ **Erledigt (01.10.2026):** `nsis`-Konfigurationsblock (inkl. des nie aktiven `artifactName: "...-Setup-....exe"`) aus `package.json` entfernt.
7. ✅ **Erledigt (01.10.2026):** `.github/workflows/deploy.yml` Trigger-Liste auf `[fresh-main]` reduziert.
8. ✅ **Erledigt (27.09.2026):** `.next`-Bundling in der electron-builder-Konfiguration entfernt — war tatsächlich unnötig, siehe Schritt 1.
9. ✅ **Größtenteils erledigt (Aufgabe 46, 01.10.2026):** `header.tsx` zeigt die echte Version + Build-Nummer, `package.json` auf `0.2.0` angehoben (siehe Abschnitt 5 für die genaue, vom ursprünglichen Plan leicht abweichende Umsetzung über `src/build-info.json`). **Noch offen, bewusst nicht umgesetzt:** Git-Tag pro Release, `artifactName` um `${version}/`-Unterordner erweitern (siehe Hinweis unten zur fehlenden Testbarkeit in dieser Umgebung).

Alle Schritte sind in dieser Session ausgeführt, typecheck- und testverifiziert (`tsc --noEmit`, 137/137 Vitest-Tests), aber **nicht mit einem echten Windows-Build von `npm run electron-build` nachgeprüft** — das ist in dieser (Linux-)Umgebung nicht möglich. Vor dem nächsten echten Build einmal durchlaufen lassen und bestätigen.
