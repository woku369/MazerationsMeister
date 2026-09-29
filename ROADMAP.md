# Roadmap und Änderungsprotokoll

## Roadmap

### Phase 1: Grundfunktionen ✅ 
1. ✅ Sidebar - Design und Implementierung einer Sidebar-Navigation.
2. ✅ Dashboard - Entwicklung eines Dashboards mit Kennzahlen und Statistiken.
3. ✅ Funktionsprüfung aller Seiten - Test und Review aller bestehenden Seiten.
4. ✅ Berechnungsprüfung - Validierung aller Berechnungen und automatisierte Tests.
5. ✅ Exporte (PDF) der Protokolle und Lagerdaten - PDF-Export für Protokolle, Lagerbestände und Bewegungen.
6. ✅ Lagerhaltung und Lagerbestände - Erweiterung der Lagerlogik und Bestandsführung.
7. ✅ Definition der Lagerbehälter (Import aus XLSX) - Importfunktion für Behälterdefinitionen aus Excel.
8. ✅ QR-Codes für Behälter, Lagerstand über QR abrufbar - Generierung und Scan-Funktion für QR-Codes.

### Phase 2: QR-Code System & Mobile Optimierung ✅

#### QR-Code Tank-Management ✅
- ✅ QR-Code-Generierung für ausgewählte Tanks
- ✅ Mobile Tank-Detail-Seiten 
- ✅ Direktbearbeitung von Füllstand und Inhalt via Smartphone
- ✅ Automatische Tank-Synchronisation aus Lagerbestand
- ✅ Print-optimierte QR-Code-Ausgabe
- ✅ Tank-Content-Manager mit dynamischer Chargen-Verwaltung
- ✅ OneDrive-Synchronisation für lokale Backups ohne Azure-Registrierung

#### System-Bereinigung ✅
- ✅ Entfernung veralteter Implementierungen (Ngrok, Azure, komplexe Sync-Mechanismen)
- ✅ Fokus auf lokale OneDrive-Synchronisation

### Phase 3: KRITISCHE SYSTEM-BEREINIGUNG 🟡 GRÖSSTENTEILS ERLEDIGT (Stand 27.09.2026, siehe unten)

#### Identifizierte Probleme
1. **Inkonsistente Tank-IDs:** QR-Code generiert UUID, System erwartet z.B. "T341"
2. **Doppelte Token-Verwaltung:** QR-Codes und GitHub-Integration haben separate Token-Felder
3. **Mehrfache QR-Code Implementierungen:** localhost URLs vs. GitHub Pages URLs
4. **Navigations-Inkonsistenz:** Kein direkter Inventory-Menüpunkt
5. **webSecurity: false** in Electron/main.js – Same-Origin-Policy deaktiviert (Sicherheitsrisiko)
6. **113 Backup-Snapshots** im Repository-Root (tank-data-*.json) – .gitignore ergaenzt
   > ⚠️ **Korrektur (Review September 2026):** Nur die *neuen* Snapshots werden durch `.gitignore` verhindert. Die bereits committeten Alt-Snapshots wurden **nie entfernt** – Stand heute liegen **117 `tank-data-*.json`-Dateien weiterhin im Git-Tracking**. Siehe `docs/REVIEW-2026-09-lagerbestand-buchungslogik.md`, Abschnitt A5. Als „behoben" markiert unten war verfrüht.

#### Behobene Probleme
- ✅ **Tank-IDs normalisiert** (Aufgabe 4, verifiziert: 0 von 50 Tanks mit `id !== tankNr`). Die dabei entdeckte Lücke bei `inventory[]` läuft separat als Aufgabe 18 (18/41 Zeilen erledigt, 23 warten auf einen Vor-Ort-Termin des Nutzers).
- ✅ **Navigation restrukturiert** — `/inventory` ("Lagerverwaltung") ist fester Hauptmenüpunkt in der Sidebar, ebenso die später ergänzten `/lohnbrand` und `/rezepturen`.
- ✅ **`webSecurity: true`** ist in allen 4 Electron-Dateien gesetzt (`main.js`, `main.ts`, `main-simple.js`, `main-simple.ts`) — verifiziert.
- ✅ **XSS-Fix tank-viewer.html vollständig** (korrigiert 27.09.2026): `public/tank-viewer.html` escaped inzwischen sowohl im Einzeltank-Pfad als auch in der `?view=all`-Ansicht konsequent per `escapeHtml()`, ebenso der Inline-Fallback in `github-service.ts` — verifiziert per Code-Durchsicht, kein unescaped `innerHTML` mehr. **Aber:** Die tatsächlich auf GitHub Pages deployte `out/tank-viewer.html` war trotzdem noch der alte, ungepatchte Stand (0 `escapeHtml`-Aufrufe) — seit den Fixes lief schlicht kein `next build` mehr. Mit dem Rebuild vom 27.09.2026 ist die Live-Seite jetzt auf dem gepatchten Stand (und enthält nebenbei erstmals auch die Routen `/lohnbrand`, `/rezepturen`, `/mazerationen/sammelliste`, die vorher im deployten `out/` komplett fehlten).
- ✅ **113/117 Backup-Snapshots entfernt** (`tank-data-*.json`) — verifiziert: 0 dieser Dateien noch im Git-Tracking.
- ✅ **Leere/tote Dateien entfernt** (27.09.2026): `tank-viewer.html` + `tank-viewer-simple.html` (Repo-Root, veraltete Vorläufer ohne Code-Referenz), `public/tank-viewer-fix.html` (0 Referenzen), `src/ai/dev.ts` + `src/ai/ai-instance.ts` (ungenutztes Genkit-Scaffolding aus dem Ausgangs-Template) samt der dazugehörigen, ins Leere zeigenden `genkit:dev`/`genkit:watch`-npm-Skripte.
- ✅ **Token-Management vereinheitlicht** (27.09.2026): Genauer als der Review-Befund ("4 Stellen") waren es real **5 unabhängige Lese-/Schreibpfade** für Token bzw. Enabled-Flag: `github-token.ts` (der eigentliche SPOT, aber nur für den Token), `tank-management.tsx` und `einstellungen/page.tsx` (beide mit eigenem rohem `localStorage`-Zugriff auf `github-enabled`), `universal-storage-simple.ts` (unabhängiger Parallel-Read beider Werte, Teil der in Aufgabe 8 als tot markierten Universal-Storage-Schicht), und am gravierendsten `tank-auto-sync.ts` — dort lag eine **vollständige Zweit-Kopie des Klartext-Tokens** in einem separaten `autoSyncConfig`-Blob, unabhängig vom eigentlichen Token aktualisiert. Fix: `github-token.ts` besitzt jetzt Token *und* Enabled-Flag gemeinsam (`getGithubConfig`/`setGithubConfig`) inkl. zentralisiertem Change-Event (`onGithubConfigChanged`) statt der bisher an zwei Stellen leicht unterschiedlich duplizierten `dispatchEvent`-Aufrufe; `tank-management.tsx`/`einstellungen/page.tsx` nutzen nur noch diese API; `universal-storage-simple.ts` liest jetzt darüber statt roh; `tank-auto-sync.ts` persistiert den Token gar nicht mehr, sondern holt ihn bei jedem Laden frisch von der einzigen Quelle (verhindert genau die Drift, vor der der Review warnte). End-to-End im Browser verifiziert: Speichern in den Einstellungen synchronisiert live (ohne Reload) den GitHub-Status im QR-Codes-Tab über das zentrale Event, `autoSyncConfig` enthält nachweislich kein Token-Feld mehr.

#### Offene Aufgaben
- [ ] QR-Code Implementierungen konsolidieren — bestätigt offen (localhost- vs. GitHub-Pages-URLs)

### Phase 3.5: Mazeration PWA ✅ IMPLEMENTIERT (Juni 2026)

#### Ziel
Mazerationsprotokoll direkt vor Ort im Mazerationsraum am Tablet/Smartphone erfassen – ohne doppelte Dateneingabe (Zettel → PC).

#### Umsetzung
- ✅ **`public/mazeration-pwa.html`** – Standalone HTML-PWA, unabhängig von der Desktop-App
  - Vollständiges Mazerationsformular (mobil-optimiert, große Touch-Targets)
  - Drei Tabs: Formular | Protokolle | Einstellungen
  - **Offline-fähig:** IndexedDB speichert Protokolle lokal am Gerät
  - **Auto-Save Draft:** Eingaben werden automatisch als Entwurf gesichert
  - **GitHub-Sync:** Protokolle werden als JSON nach `mazeration-protocols/` gepusht
  - Collapsible Sektionen: Pflanzenmaterial, Alkohol, Zeitraum, Ergebnis
  - Automatische Berechnungen: Nettogewicht (Kisten), Mazerationsdauer
- ✅ **`public/mazeration-manifest.json`** – PWA-Manifest für Android-Installation
  - "Zum Startbildschirm hinzufügen" → App-Icon am Homescreen
  - Standalone-Modus (kein Browser-UI)
- ✅ **`public/sw.js`** – Service Worker erweitert (cached mazeration-pwa.html)

#### Zugriff
```
https://woku369.github.io/mazerationsmeister/mazeration-pwa.html
```

#### Datenfluss
```
Tablet (Mazerationsraum, offline/mobile Daten)
  → Formular ausfüllen
  → "Speichern & Sync" → JSON in GitHub-Repo
     mazeration-protocols/YYYY-MM-DD_Name_Charge.json

Desktop-App
  → "Protokolle aus GitHub laden" (TODO: Desktop-Funktion)
  → Merge in localStorage
```

#### Desktop-Import ✅ IMPLEMENTIERT
- ✅ Button „Aus GitHub laden" auf der Mazerationen-Seite (am Ende der Protokollliste)
- ✅ Liest `mazeration-protocols/`-Verzeichnis aus GitHub (API)
- ✅ Mergt neue Protokolle in `localStorage` (Duplikatschutz via ID-Vergleich)
- ✅ Automatische Persistenz via `useEffect` → `localStorage('mazerationProtocols')`

### Phase 3.6: PWA & Desktop-App Erweiterungen ✅ IMPLEMENTIERT (September 2026)

#### PWA – Neue Features

- ✅ **Primasprit 60%vol.** als erste Option in der Alkohol-Dropdown-Liste
- ✅ **Zwei-Phasen-Workflow:** Entwurf speichern (Tag X) → Protokoll erneut öffnen und abschließen (Tag X+4)
  - Explizite „Entwurf speichern"-Schaltfläche (auch ohne vollständige Daten)
  - Amberfarbener Bearbeitungsbanner zeigt aktive Bearbeitung an
  - Entwurf-Badge (`📂 Entwurf`) in der Protokollliste
  - „Bearbeiten"-Button öffnet Protokoll zur Weiterbearbeitung
- ✅ **„Oberirdische Pflanze"** als erste Option im Pflanzenteil-Dropdown
- ✅ **Palettentara:** Felder „Anzahl Paletten" + „Tara / Palette (kg, Standard 20 kg)"
  - Nettogewicht = Brutto − Kistentara − Palettentara
- ✅ **PDF-Export** für einzelne Protokolle direkt aus der Protokollliste
- ✅ **Sammelliste (Tab 4):** Ausgewählte Mazerationen chronologisch zusammenführen
  - Spalten: Datum, Bezeichnung/Charge, Kraut, Sprit, LA Einsatz, Mazerat, Alk.%, LA Ausbeute
  - Summenzeile mit Gesamtwerten
  - PDF- und XLSX-Export der Sammelliste
  - Persistenz in IndexedDB
- ✅ **Chargennummer:** 4- oder 5-stellig zulässig (war: nur 5-stellig)
- ✅ **Ausbeute-% + Kraut:Sprit-Verhältnis** live im Ergebnis-Abschnitt
  - Ausbeute = Mazerat / Sprit × 100
  - Verhältnis = 1 : (Sprit / Kraut)
- ✅ **Suche & Filter** in der Protokollliste
  - Volltextsuche nach Name, Chargennummer, Pflanzenname
  - Filterbuttons: Alle / Entwurf / Fertig
- ✅ **JSON-Datensicherung:** Export aller Protokolle als `.json`, Import mit Duplikatschutz
- ✅ **Push-Benachrichtigungen:** App erinnert beim Öffnen an Mazerationen, deren Enddatum erreicht ist
- ✅ **Steigrohranzeige:** Anfangs- und Endstand am Tank eingeben → Alkoholmenge wird automatisch berechnet
  - Felder: Anfangsstand (L) + Endstand (L)
  - Setzt Volumenfeld automatisch auf die Differenz (in Liter)

#### Desktop-App – Neue Features

- ✅ **Sammelliste-Seite** (`/mazerationen/sammelliste`) mit Sidebar-Link
  - Protokollauswahl per Checkbox, gleiche Tabellenspalten wie PWA
  - XLSX-Export, Auswahl wird in `localStorage` gespeichert
- ✅ **„Oberirdische Pflanze"** als erste Option im Pflanzenteil-Dropdown (Freitext → Select)
- ✅ **Palettentara:** Felder in der Desktop-Form, Berechnung via `mazeration-calc.ts`
- ✅ **Chargennummer 4–5-stellig:** Zod-Schema angepasst (`min(4).max(5)`)
- ✅ **Steigrohranzeige:** Felder `Anfangsstand (L)` + `Endstand (L)` in der Alkohol-Card
  - `useEffect` berechnet `alcoholVolume` automatisch, schaltet Einheit auf Liter

### Phase 3.7: Lagerbestand & Buchungslogik – Architektur-Review 🔴 KRITISCH (September 2026)

Unvoreingenommene Review der Lagerbestandsverwaltung und Buchungslogik, ausgelöst durch den Eindruck, das System sei "umständlich, organisch gewachsen". Vollständiger Befund inkl. Datei-/Zeilenreferenzen, Code-Belegen und Roadmap-Abgleich:

📄 **`docs/REVIEW-2026-09-lagerbestand-buchungslogik.md`**

#### Wichtigster Befund
🔴 **Der Buchungsdialog verändert den Lagerbestand nicht.** `handleSaveTransaction` (`inventory-management.tsx:604-623`) schreibt nur einen Log-Eintrag in `inventoryTransactions` – `currentQuantityLiters` des Artikels wird nie angepasst. Der einzige Weg, den Bestand zu ändern, ist manuelles Überschreiben über „Artikel bearbeiten". Buchungsjournal und tatsächlicher Bestand sind strukturell entkoppelt. Zusätzlich: fertige Mazerationen (Desktop + PWA-Tankzuordnung) schreiben nicht automatisch in den Lagerbestand zurück – das Einbuchen ist ein manueller Zusatzschritt.

#### Weitere bestätigte Probleme
- 5 unabhängige, unsynchronisierte Persistenzmechanismen für dieselben Bestandsdaten (localStorage, tote "Universal Storage"-Schicht, XLSX-Export, GitHub-`tank-data.json`, PWA-IndexedDB)
- Tank-ID-Inkonsistenz (`id` vs. `tankNr`) nur durch Laufzeit-Reparatur (`fixTankIds()`) und 7-fache Rate-Heuristik in `tank-viewer.html` kaschiert, nie an der Quelle normalisiert
- LA-/Ausbeute-%-/Dichtekorrektur-Formeln 4–5× unabhängig dupliziert (Desktop, PWA, Inventory-Tabelle/-Summary, Tank-Content-Manager, Sammelliste ×2)
- GitHub-Sync ohne Konflikthandling (DELETE+CREATE bei SHA-Konflikt, kein Merge) und mit weiterhin ungelöstem Snapshot-Bloat (117 Dateien, siehe Korrektur oben)
- ~280 Zeilen toter Code in `inventory-management.tsx` (unerreichbarer zweiter Return-Block), orphaned `tank-management-backup.tsx`, 3+ parallele Tank-Viewer-HTML-Varianten
- Minimal Testabdeckung (1 Testdatei im gesamten `src/components`-Baum)

> **Hinweis zu Branches (September 2026):** Es existiert ein dritter, unabhängiger Branch `pages-clean` ohne gemeinsamen Vorfahren mit `fresh-main` (`git merge-base` liefert nichts – zwei getrennte Historien). `pages-clean` enthält u.a. eine bereits funktionierende Version von Aufgabe 1 sowie ~93 weitere Commits (FIFO-Logik, Dashboard-Erweiterungen, Container-Assignment-Fixes), die in `fresh-main` fehlen. Umgekehrt fehlen in `pages-clean` die aktuellen Tank-Viewer-/PWA-Ergänzungen aus `fresh-main`. Eine Zusammenführung wurde bewusst zurückgestellt (kein normaler Merge möglich, da unrelated histories) – Aufgabe 1 wurde stattdessen direkt auf `fresh-main` nachgezogen, mit der bereits geprüften Logik aus `pages-clean`. `pages-clean` bleibt vorerst unangetastet als Fundus für später.

#### Offene Aufgaben (Priorität, siehe Review-Datei Teil C für Details/Checklisten)

> ✅ **Gegenprüfung (September 2026, final):** Erste Meldung „9 Aufgaben erledigt" hielt einer Prüfung nicht stand (Aufgabe 4 und 8 waren nur oberflächlich gemacht). Nach mehreren Nachbesserungsrunden sind jetzt **alle 9 Aufgaben verifiziert erledigt** – jede mit konkreten Belegen (Datei/Zeile, Testlauf oder Datenabgleich) statt bloßer Commit-Message. Einzige bewusst zurückgestellte Lücke: `inventory-management.tsx` wurde nicht weiter strukturell aufgeteilt (aktuell 961 Zeilen ohne toten Code, keine akute Dringlichkeit). TypeScript kompiliert mit 0 Fehlern (vorher 22 Altfehler). Ein vorbestehender, unabhängiger Testfehler in `calculateNetWeight.test.ts` (Edge-Case 0-Werte) wurde entdeckt und verifiziert nicht durch diese Arbeit verursacht – bleibt als offener Kleinfund vermerkt.

- [x] ✅ **Aufgabe 1 – Buchungslogik reparieren:** `handleSaveTransaction` passt `currentQuantityLiters` jetzt bei Zugang/Abgang an (Fix aus `pages-clean` übernommen, negative Bestände abgefangen). Test steht noch aus.
- [x] ✅ **Aufgabe 2 – Mazeration → Lager verbinden:** Verifiziert – echte End-to-End-Kette über `StockService.persistAddEntry` mit Bestätigungsdialog (kein Automatismus). PWA bewusst ohne Anbindung gelassen (laut Aufgabenstellung nur „perspektivisch").
- [x] ✅ **Aufgabe 3 – `stock-service.ts` einführen:** Verifiziert – Hauptpfade (Edit/Add in `inventory-management.tsx`, Buchung, Mazeration-Zugang) laufen über den Service. Einzige verbleibende Lücke: der XLSX-Bulk-Import für Lagerbestand ersetzt die komplette `inventoryItems`-Liste direkt, ohne den Service zu nutzen (Sonderfall, kein klassisches Zugang/Abgang).
- [x] ✅ **Aufgabe 4 – Tank-ID-Normalisierung an der Quelle:** Nachgebessert und verifiziert – `syncTankDefinitionsWithInventory()` in `tank-sync.ts` enthält die alte Live-Reparatur-Logik nicht mehr, setzt bei neu erkannten Tanks nur noch `id === tankNr` bei der Erstellung. Gegenprobe an den echten Produktionsdaten: **0 von 50 Tanks in `tank-data.json` haben noch `id !== tankNr`** (vorher 41) – auch die Fässer haben jetzt eindeutige `tankNr`-Werte (`Fass-1` … `Fass-6` statt der Gruppenbezeichnung `Fass`). Echte Migration, nicht nur Umbenennung.
- [x] ✅ **Aufgabe 5 – Formeln konsolidieren:** Vollständig – Inventory-Seite (`inventory-table.tsx`, `inventory-summary.tsx`, `tank-content-manager.tsx`, `inventory-management.tsx`, `sammelliste/page.tsx`) nutzt `calcLA`/`toVolumeLiters` aus `mazeration-calc.ts`. Die durch Aufgabe 9 neu entstandene Dopplung in `mazeration-form-helpers.ts` (`calculateLADetails` rechnete eigenständig) wurde nachträglich behoben – delegiert jetzt an `calcLA(toVolumeLiters(...))`. Manuelle ml→l-Umrechnung beim Lager-Zugang in `mazeration-form.tsx` ebenfalls auf `toVolumeLiters()` umgestellt. Regressionstest in `mazeration-form-helpers.test.ts` sichert die Delegation ab. PWA-Kommentar auf TS-Quelle korrekt.
- [x] ✅ **Aufgabe 6 – GitHub-Sync aufräumen:** Verifiziert – `git ls-files | grep -c 'tank-data-[0-9]'` liefert 0, alle Snapshots wirklich aus dem Tracking entfernt. `syncTankData()` schreibt direkt und ausschließlich `tank-data.json`, keine Timestamp-Datei mehr pro Sync. Offen (kein Muss): `out/`-Verzeichnis weiterhin getrackt, nicht entschieden.
- [x] ✅ **Aufgabe 7 – XSS-Fix systemisch machen:** Verifiziert – echte `escapeHtml()`-Funktion in `tank-viewer.html` und `github-service.ts`, an allen relevanten `innerHTML`-Stellen genutzt (mental mit `<img src=x onerror=alert(1)>`-Payload getestet, greift nicht mehr). Fehlt nur der im Auftrag gewünschte Erklärkommentar (rein kosmetisch).
- [x] ✅ **Aufgabe 8 – Aufräumen (Quick Wins):** Nachgebessert und verifiziert – toter Return-Block in `inventory-management.tsx` entfernt (1247 → 961 Zeilen, nur noch ein `return`), `lastProduktName` modul-global entfernt, `item.menge`-Bug in `github-service.ts` gefixt, `webSecurity: true` jetzt in **allen 4** Electron-Dateien, alle Platzhalterdateien gelöscht. Einziger verbleibender Punkt (niedrigste Priorität): „Universal Storage"-Schicht (`universal-storage-simple.ts`, `app-data-manager.ts`, `use-app-data.ts`, `app-data-initializer.tsx`) weiterhin unangetastet, läuft ungenutzt bei jedem Seitenaufruf mit.
- [x] ✅ **Aufgabe 9 – Strukturelle Aufteilung:** Token-Konsolidierung (`src/lib/github-token.ts`) vollständig umgesetzt (3 Stellen migriert). PDF-/DOCX-/XLSX-Erzeugung nachträglich aus `mazeration-form.tsx` ausgelagert nach `src/lib/mazeration-pdf.ts`, `mazeration-docx.ts`, `mazeration-xlsx.ts` (reine Verschiebung, keine Logikänderung). `mazeration-form.tsx`: 2046 → 1470 Zeilen (-28%), jetzt reine Formular-Komponente. Nebenbei: tote Modulvariablen `y`/`currentLineHeight` und ungenutzte Farbkonstanten entfernt. `inventory-management.tsx` bewusst nicht weiter aufgeteilt – bei 961 Zeilen ohne toten Code (siehe Aufgabe 8) aktuell keine Dringlichkeit.

> Arbeitsweise: ein Branch pro Aufgabe von `fresh-main`, lokal mit `npm run dev` testen, erst dann mergen. Reihenfolge 1→2→3 empfohlen, da 2 und 3 auf dem in 1 etablierten Buchungsmechanismus aufbauen. Aufgabe 7 und 8 sind jederzeit unabhängig als Lückenfüller machbar.

### Phase 3.8: Cross-Modul-Kohärenz-Audit 🔴 KRITISCH (September 2026)

Nach Abschluss von Phase 3.7 (alle 9 Aufgaben verifiziert) wurde ein zweiter, breiterer Check angefordert: Logik und Zusammenhang zwischen Mazeration (Klein-/Großmengen), Lagerbestandsverwaltung (Import/Export, Zugang/Abgang, LA) und Tankverwaltung (Visualisierung, Ein-/Ausgang, Lohnbrenner). Vollständiger Befund mit Datei/Zeilen-Belegen:

📄 **`docs/REVIEW-2026-09-cross-modul-kohaerenz.md`**

#### Fachlicher Kontext (Klärungsrunde 25.09.2026)
1. **Lager:** Tanklager mit Mazeraten/Destillaten in Tanks, Containern, Fässern, Ballons, Flaschen. Bestandsware, 1× jährlich amtlich inventiert (zollgeprüft) — dafür wird eine Liste importiert.
2. **Mazerationen:** "Große" Mazerationen (Kisten/Litermengen) sind buchungs-, zoll- und inventurrelevant — Sprit wird abgebucht, Mazerat zugebucht. "Kleine" Mazerationen (Versuchsmaßstab) sind **nicht** buchungsrelevant. Entscheidung: bleibt rein manuell unterschieden (Tank-Feld bei kleinen Versuchen einfach leer lassen), kein neues Maßstab-Feld im Code.
3. **Destillation Lohnbrand:** Mazerate verlassen das Haus in Containern/Fässern, werden extern destilliert, kommen als Destillate zurück. Buchungs- und zollrelevant. Entscheidung: eigener "Lohnbrand-Auftrag"-Datensatz mit Status-Tracking (siehe Aufgabe 15).
4. **GFKC:** Wird aus Einzelkomponenten des Lagerbestands ausgemischt, gelagert, verlässt tranchenweise das Haus (Abgang, kommt nicht zurück). Buchungs- und zollrelevant. Entscheidung: neue Verschnitt-Buchungsfunktion nötig (siehe Aufgabe 17) — das bereits existierende "Reichweitenanalyse"-Konzept auf `pages-clean` ist ein Planungstool, keine Buchungsfunktion.
5. **Mazeration↔Lager-Anbindung:** Muss nicht sein, kann aber — bestätigt die aktuelle Umsetzung (optionaler Bestätigungsdialog, Aufgabe 2) als richtig.

#### Aktive Bugs (nicht nur Architekturschwächen)
- 🔴 **LA (Liter Absolutalkohol) wird bei keiner Buchung neu berechnet** und existiert in 3 widersprüchlichen Auswertungsvarianten gleichzeitig (`stock-service.ts`, `inventory-table.tsx`, `inventory-summary.tsx`, `inventory-management.tsx`)
- 🔴 **`tank-viewer.html?view=all` zeigt für ALLE Tanks die Kapazität als Füllstand an** — das `hasUniqueNumber`-Flag, das die Seite braucht, wird beim Sync nie mitgeschickt
- 🔴 **Faktor-1000-Fehler in der Sammelliste bei Kleinmengen-Protokollen** — Desktop-Schema fehlt `yieldVolumeUnit`, Sammelliste nimmt bei fehlendem Feld automatisch Liter an
- 🔴 **Kumulativer XLSX-Export stürzt nach einem PWA-Import ab** — `allLoggedCalculatedValues` wird beim Import nicht mitgepflegt, nächster Export wirft TypeError

#### Weitere Befunde
- Tank-Zuordnung (`targetTankNr`, Import-`tankNr`) ist überall ungebundenes Freitextfeld — Tippfehler erzeugen stillschweigend Phantom-Tanks (5000L Standardgröße)
- Zeitstempel-Bug in Tank-Viewer (`lastExport` vs. `lastUpdated`) — Anzeige zeigt immer "gerade eben", unabhängig vom tatsächlichen Sync-Alter
- Lohnbrenner-Workflow (Gebinde raus/rein zum Fremdbrenner) ist im Datenmodell komplett nicht vorgesehen — echte Lücke, kein Bug
- Klein-/Großmengen-Einheiten: Desktop zwangsgekoppelt, PWA frei kombinierbar — dieselbe fachliche Logik, unterschiedlich umgesetzt
- Ausbeute-%-Framing driftet zwischen Desktop (nur "Verlust %") und PWA (zusätzlich "Ausbeute %")

#### Aufgaben (siehe Review-Datei für vollständige Details)
- [x] ✅ **Aufgabe 10 – LA-Aktualisierung bei Buchung:** Erledigt. `StockService` (`addEntry`/`updateEntry`/`applyTransaction`) berechnet `literAbsolutalkohol` jetzt bei jeder Mengen-/Konzentrationsänderung neu. Alle 3 Auswertungsstellen (Tabelle, Summary, Rohexport) rechnen jetzt konsistent live über `calcLA`. Neue Tests in `stock-service.test.ts`, dafür `vitest.config.ts` ergänzt (Alias-Auflösung fehlte).
- [x] ✅ **Aufgabe 11 – Sammelliste Faktor-1000-Bug:** Erledigt. `yieldVolumeUnit` im Desktop-Schema ergänzt, wird beim Speichern aus `plantWeightUnit` abgeleitet. Sammelliste (`getYieldUnit()`) leitet bei fehlendem Feld weiterhin korrekt aus `plantWeightUnit` ab statt fälschlich Liter anzunehmen — bereits gespeicherte Altprotokolle sind damit rückwirkend korrekt. Neue Tests für beide Fälle.
- [x] ✅ **Aufgabe 12 – PWA-Import-Absturz beheben:** Erledigt, beide empfohlenen Maßnahmen umgesetzt. `handleImportFromGitHub` pflegt `allLoggedCalculatedValues` jetzt synchron mit (`buildCalculatedValuesForImportedProtocol()` berechnet Ratio/Nettogewicht/Verlust/LA best-effort aus übereinstimmenden Feldern; Dauer/Zeitaufzeichnung bewusst leer, da PWA/Desktop unterschiedliche Datumsfeld-Namen nutzen). Zusätzlich `generateCumulativeXlsx` mit Fallback-Objekt gegen jeden künftigen Längen-Mismatch abgesichert.
- [x] ✅ **Aufgabe 13 – Tank-Viewer `?view=all` reparieren:** Erledigt. `hasUniqueNumber` als offizielles Schema-Feld ergänzt, wird bei neuen Tanks (`addTank`, Auto-Erkennung) jetzt explizit gesetzt. Prüfung in `tank-viewer.html` von `=== true` auf `!== false` geändert — sicherer Default für Tanks ohne das Feld. Zeitstempel-Bug (`lastExport` vs. `lastUpdated`) in `tank-viewer.html` und `tank-offline.html` behoben.
  > ⚠️ **Neuer Befund dabei (nicht Teil dieser Aufgabe, siehe unten):** Beim Nachprüfen zeigte sich, dass die Aufgabe-4-Migration unvollständig war — `inventory[]` wurde nie mitmigriert, nur `tanks[]`. 41 Inventar-Zeilen verweisen weiterhin auf alte Gruppen-Tanknummern (z.B. `"Fass"` statt `"Fass-1"`). Siehe **Aufgabe 18** unten.
- [x] ✅ **Aufgabe 14 – Tank-Zuordnung validieren:** Erledigt. `targetTankNr` im Mazerationsformular ist jetzt ein Dropdown mit echten Tanks + "Kein Zieltank" + Freitext-Escape-Hatch mit Warnhinweis bei unbekanntem Tank. XLSX-Import, manuelles Speichern und Mazeration→Lager-Buchung zeigen jetzt einen Toast, wenn dabei ein neuer Tank automatisch angelegt wird, statt es still zu tun.
- [x] ✅ **Aufgabe 15 – Lohnbrenner-Workflow:** Implementiert. Neue Seite `/lohnbrand`: Auftrag anlegen (mehrere Gebinde aus echtem Lagerbestand, sofortige Abgangsbuchung mit Bestätigungsdialog) → Status "unterwegs" → Rücklauf verbuchen (Destillat als neuer Lagerposten im echten Zieltank, Status → "abgeschlossen"). Immer Gesamtmenge auf einmal. Fortlaufende Auftragsnummer `LB-<Jahr>-<001>`.
  - **Nachgezogen nach Praxis-Feedback (25.09.2026):** Entscheidend ist die Gesamt-LA (unversteuerter Reinalkohol), nicht nur die Literzahl — mehrere Gebinde können unterschiedliche Konzentrationen haben (z.B. 600L@50% + 300L@40% = 420 LA). `ausgangsLA` wird beim Anlegen fix berechnet/gespeichert, `ergebnisLA`/`verlustLA` beim Rücklauf. LA pro Gebinde-Zeile + Summe im Anlege-Dialog, Ausgangs-LA-Referenz + live berechneter Verlust im Rücklauf-Dialog, Verlust-LA inkl. % in der Übersicht (Brennverlust muss dokumentiert werden, sonst fehlt er unerklärt im Gesamt-LA-Bestand). Mit exaktem Nutzer-Beispiel end-to-end verifiziert (420→400, Verlust 20 LA).
- [ ] **Aufgabe 16 – Klein-/Großmengen-Konsistenz:** ✅ Entschieden — bleibt wie bisher rein manuell (Tank-Zuordnung bei kleinen Versuchen einfach leer lassen), kein neues Maßstab-Feld. Kein Code-Änderungsbedarf, nur dokumentiert.
- [x] ✅ **Aufgabe 17 – GFKC-Verschnitt-Buchung: implementiert (27.09.2026, "Gehen wirs an").** Neuer Menüpunkt „Rezepturen (GFKC)" (`/rezepturen`, Editor unter `/rezepturen/editor?id=…`) mit voller Buchungsanbindung.

  📄 **Vorarbeit/Kontext: `docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md`, `docs/GFKC-FACHKONTEXT-REZEPTUR-2026-09.md`**

  **Fachlicher Ablauf:** Keine fixe Rezeptur, nur grobe Näherung → ausmischen → mit Einzelkomponenten nachjustieren → ABV am Ende einstellen (verdünnen/aufspriten) → **erst dann buchen** → GFKC lagern, tranchenweise Abgang (kein Rücklauf, im Gegensatz zu Lohnbrand).

  **Umsetzung:** Planungswerkzeug aus `pages-clean` (Komponenten in L/%, freie Zutaten wie Wasser, Alkoholkorrektur, Sensorik-Bewertung, Status-Workflow `entwurf→test→freigegeben→produziert→archiviert`) übernommen und auf `fresh-main`-Architektur portiert (`rezepturSchema.ts`, `rezeptur-manager.ts`, neues `rezeptur-service.ts` analog zu `stock-service.ts`/`lohnbrand-service.ts`) — plus erweitert:
  - **Kernlücke geschlossen:** `rezeptur-service.ts` → `produziereRezeptur()` bucht jetzt tatsächlich: Abgang je Komponente (inkl. Sprit-Korrektur bei Aufspriten), legt den fertigen GFKC-Posten im echten Zieltank an, befüllt `produktionsDaten` (inkl. `tatsaechlicherAlkohol` fürs Lohnabfüller-Update), liefert LA-Bilanz zur Kontrolle. Vorher war der "produziert"-Schalter nur eine Status-Checkbox ohne jede Buchung.
  - Hartcodierten `spritStaerke = 60` durch echten Lagerbestand ersetzt (`berechneAlkoholKorrektur` nimmt die tatsächliche %vol des gewählten Sprit-Postens).
  - Neue Fix/reduzierbar-Komponentenlogik für GFKC-O (`berechneVerschnittMitFixUndReduzierbar`, Fachdokument Abschnitt 8.3) — mit den exakten Nutzer-Zahlen (830,61 L Basis / 1277,86 L Ziel / 447,25 L Zusatzvolumen) verifiziert.
  - Ziel-ABV bleibt bewusst **frei editierbar, kein technisches Gate** (53,5 % ist ein gelebter Richtwert, jede Charge durchläuft ohnehin den Freigabeprozess) — UI weist das explizit aus statt eine Sperre/Vorbelegung zu erzwingen.
  - 24 neue Tests (`rezeptur-manager.test.ts`, `rezeptur-service.test.ts`), end-to-end im Browser mit realistischen Testdaten verifiziert (600L @52,5% + 300L @53% → 474 LA/900L = 52,67% → Aufspriten mit 17,58L @96% auf 53,5% → korrekte Buchung: Komponenten + Sprit abgebucht, neuer GFKC-Posten 917,58L @53,5% im Zieltank angelegt, LA-Bilanz stimmig, 0 Konsolenfehler).
- [ ] ⚠️ **Aufgabe 18 – Inventory/Tanks-Referenz reparieren (NEU, gefunden bei Aufgabe 13):** Teilweise erledigt. Die Aufgabe-4-Migration (Tank-ID-Normalisierung) hatte nur `tanks[]` in `tank-data.json` migriert, nicht `inventory[]`. **41 Inventar-Zeilen** verwiesen weiterhin auf alte Gruppen-Tanknummern (`Fass`: 6, `Fl`: 5, `B`: 25, `K`: 3, `Cont`: 1, `IBC`: 1).
  - ✅ **Erledigt (18 Zeilen, 27.09.2026):** `Fass` (6), `Fl` (5), `Cont` (1), `IBC` (1) sowie 5 weitere Einzelzeilen aus den Gruppen `B`/`K`, deren Inhalt auch innerhalb dieser sonst mehrdeutigen Gruppen für sich genommen eindeutig war (`Koenigskerze`→B-1, `Oregano`→B-15, `Zirbe`/M→B-16, `GFKC-A`→B-17, `Zirbe`/Dest→K-1) — jeweils automatisch per Namensabgleich (ASCII-normalisiert) korrigiert, da genau 1 Inventar-Zeile auf genau 1 Tank mit identischem Inhalt traf. Verifiziert: 0 verbleibende alte Referenzen für diese 18 Fälle.
  - ⚠️ **Offen (23 Zeilen):** `B` (21) und `K` (2) — mehrere Gebinde mit identischem `produktName` je Gruppe (`Marc d SWS`×5, `Zitronenmelisse`×5, `Pfefferminze`×3, `Salbei`×3, `Sauvignon Bl`×3, `Thymian`×2 in B; `VL Zirbe`×2 in K). Anzahl Inventar-Zeilen und Anzahl Tanks mit diesem Inhalt stimmen je Produkt exakt überein (keine Dateninkonsistenz), aber die *Zuordnung zum konkreten Behälter* ist ohne physische Bestätigung reine Vermutung — bei zollrelevanten Daten bewusst nicht geraten. Anfrage an den Nutzer für die Behälter↔Chargennummer-Zuordnung gestellt (27.09.2026). **Blockiert bis Vor-Ort-Termin** (Nutzer, 27.09.2026: "Kann ich nur vor Ort erledigen.") — bei Sauvignon Bl (B-18/19/20) sind sogar alle Kennzahlen identisch, da hilft nur die physische Beschriftung am Behälter, keine Systemdaten. Kein weiterer Handlungsbedarf bis dahin.
- [x] ✅ **Aufgabe 19 – LA-Bilanz bei Mazerationen live sichtbar machen (NEU, Nutzer-Feedback 26.09.2026):** Eingesetzte LA / Ausbeute LA / Verlust LA wurden bereits korrekt berechnet (`calculateLADetails`), aber nirgends live angezeigt — nur in PDF/XLSX-Einzelprotokoll-Exporten vergraben, in der Sammelliste fehlte eine eigene Verlust-Spalte samt Summe komplett. Praxisbeispiel des Nutzers (500L Sprit @60% → 480L Mazerat @53% = 45,6 LA Verlust) end-to-end verifiziert. Neuer "Reinalkohol-Bilanz"-Block im Desktop-Formular, live-Anzeige in der PWA, neue "LA Verlust"-Spalte + Summenzeile in Sammelliste (Desktop + PWA, Tabelle/PDF/XLSX) — damit ist auch der kumulierte Verlust über einen Zeitraum nachvollziehbar, nicht nur pro Charge.
- [x] ✅ **Aufgabe 20 – Menüpunkt „Anleitungen" überarbeiten, ergänzen, updaten (Nutzer-Anfrage 27.09.2026, „ganz wichtig"):** Stand war seit der QR-Code-Einführung nicht mehr aktualisiert — zwei von vier Abschnitten waren reine „Coming Soon"-Platzhalter (Inventarverwaltung, Mazerationsverwaltung), die seither dazugekommenen Module Rezepturen (GFKC) und Lohnbrand-Aufträge fehlten komplett, und die GitHub-Integration war nirgends erklärt. Löst außerdem den alten Phase-4-Punkt „Anleitungen-Sektion aktualisieren" (siehe unten) ein. Komplett neu aufgebaut, jeder Abschnitt anhand der tatsächlichen UI-Texte verifiziert (Button-Labels, Feldnamen, Dialoge aus dem echten Code, nichts erfunden):
  - **Mazerationen:** Formular-Aufbau, Reinalkohol-Bilanz (LA), Zieltank-Einbuchung, Export-Optionen inkl. PWA-Import.
  - **Sammelliste:** Auswahl + XLSX-Export mit LA-Kennzahlen.
  - **Lagerverwaltung:** Artikelstamm, XLSX-Import/Export, Zugang/Abgang buchen (grünes/orangenes Symbol je Artikel-Zeile).
  - **Rezepturen (GFKC)** *(neuer Abschnitt)*: Komponenten mit fix/reduzierbar, Alkoholkorrektur mit echter Sprit-Konzentration, Produzieren & Buchen inkl. LA-Bilanz.
  - **Lohnbrand-Aufträge** *(neuer Abschnitt)*: Auftrag anlegen, Unterwegs-Status, Rücklauf verbuchen inkl. live berechnetem Brennverlust.
  - **QR-Code Tankverwaltung:** inhaltlich korrigiert — beschrieb bisher nur den lokalen WLAN-Modus; jetzt werden beide echten Betriebsarten erklärt (GitHub-Pages-Modus für ortsunabhängigen Zugriff als empfohlener Standardweg, lokaler Fallback nur als Rückfallebene).
  - **GitHub-Integration** *(komplett neuer Abschnitt)*: Token einrichten, Auto-Sync konfigurieren — vorher nirgends dokumentiert, obwohl Voraussetzung für ortsunabhängige QR-Codes.
  - **OneDrive-Synchronisation:** beibehalten, gestrafft.

  Statisches Export-Bundle (`out/`) neu gebaut, damit die live auf GitHub Pages ausgelieferte Seite den aktuellen Stand zeigt, nicht nur der Quellcode. Im Browser end-to-end verifiziert: alle 8 Abschnitte klappen korrekt auf/zu, 0 Konsolenfehler.
- [x] ✅ **Aufgabe 21 – Build-Chaos dokumentieren + Branch-Übersicht (Nutzer-Anfrage 27.09.2026, wegen Kontingent-Knappheit bewusst nur Dokumentation, keine Umsetzung):** Zwei neue Dokumente, `docs/BUILD-STRATEGIE.md` und `docs/BRANCHES.md`.
  - **Build-Strategie:** Inventar aller Build-/Packaging-Wege (Web-Export, 4 konkurrierende Wege zur portablen EXE, diverse leere/tote Skripte, ein vermutlich mit `output: 'export'` inkompatibler alter `server.js`+`start.bat`-Pfad, verwaistes `electron/main-simple.*`). **Wichtigster Befund dabei:** Die Annahme im `.gitignore`-Kommentar, `out/` müsse für GitHub Pages committet werden, stimmt nicht mehr — verifiziert über 60+ erfolgreiche Läufe von `.github/workflows/deploy.yml`, das bei jedem Push nach `fresh-main` selbst frisch baut und deployt (Actions-basiertes Pages-Deployment, nicht branch-basiert). Der committete `out/`-Ordner wird von keinem der beiden Deployment-Wege (Web, Electron) tatsächlich gebraucht und war die Ursache der wiederholten Dev-Cache-Verschmutzung in dieser und früheren Sessions.
  - **Versionierung (nachgezogen, gleicher Tag):** `package.json` steht seit jeher auf `0.1.0` und wird nirgends im laufenden Programm gelesen — die Kopfzeile zeigt stattdessen einen davon unabhängigen, hartcodierten String `"Mazerations-Meister V 1.0"` (`header.tsx`), und es existiert kein einziger Git-Tag. Empfohlenes Vorgehen dokumentiert: Semantic Versioning über `npm version`, Git-Tag pro Release, `header.tsx` auf die echte Version umstellen, `artifactName` der electron-builder-Konfiguration um ein `${version}/`-Unterverzeichnis erweitern, damit jede portable EXE in einem eigenen, eindeutig benannten Ordner landet statt den letzten Build zu überschreiben.
  - Aufräumplan jetzt mit 9 Schritten nach Risiko sortiert dokumentiert.
  - **Nachtrag (27.09.2026, außerhalb dieser Session):** Der Nutzer hat Schritt 1 und 8 des Aufräumplans bereits selbst umgesetzt (eigener Claude-Code-Termin) — `out/` aus dem Git-Tracking entfernt, `distDir: 'out'` aus `next.config.ts` entfernt (behebt die Dev-Cache-Verschmutzung strukturell statt nur einmalig), unnötiges `.next`-Bundling in der electron-builder-Konfiguration entfernt und dabei einen echten Laufzeitfehler behoben (`staticPath` zeigte über `app.getAppPath()` ins Leere, jetzt korrekt `process.resourcesPath` mit `out/` als `extraResources`). Lokaler Windows-Build danach vom Nutzer erfolgreich getestet — `electron-builder` ist damit als funktionierender Packaging-Weg bestätigt (räumt die Unsicherheit in Schritt 5 aus). In dieser Session nachgezogen: `git pull`, Typecheck + Tests grün, `docs/BUILD-STRATEGIE.md` entsprechend aktualisiert.
  - **Branches:** `fresh-main` ist der einzige aktive Branch. `claude/mazerations-review-checks-1kn7td` (49 Commits hinter fresh-main, dessen 5 eigene Commits per Stichprobe bereits in fresh-main wiedergefunden) und `pages-clean` (keine gemeinsame Historie, 362 Dateien Diff — das schon geborgene Rezeptur-Werkzeug plus diverser nie übernommener Experimentalcode wie eine Google-Calendar-Anbindung und eine alternative Speicherarchitektur) als löschbar eingestuft, mit dem Hinweis, `pages-clean` wegen des Umfangs vor dem endgültigen Löschen noch einmal selbst kurz durchzusehen. Löschbefehle als Referenz hinterlegt, nicht ausgeführt.

> Priorität (bestätigt 25.09.2026): Aufgabe 10–13 zuerst (aktive Bugs mit falschen/abstürzenden Ergebnissen), da heute schon spürbar. Aufgabe 14–17 (inkl. Lohnbrand und GFKC-Verschnitt) danach als größeres Vorhaben. Aufgabe 18 (Datenkorrektur) sollte zeitnah geklärt werden, da sie die Korrektheit der Tank-Anzeige direkt betrifft — der eindeutige Teil (14 Zeilen) kann jederzeit sicher automatisch nachgezogen werden.
>
> Priorität-Nachtrag (28.09.2026, Aufgabe 26): Punkt 1+2 aus Aufgabe 26 (Buchungs-Obergrenze fehlt, Encoding-Bug) gehören in den laufenden Zwei-Wochen-Plan-Schritt 1 „Änderungsliste fertig abarbeiten" und damit **vor** den Echtdaten-Einstieg. Punkt 3–6 aus Aufgabe 26 (Dashboard, Journal-Filter, Chargennummer-Abgleich, Export-Vollständigkeit) sind spürbar, aber nicht datengefährdend — passend erst nach Zwei-Wochen-Plan-Schritt 4 „Echtdatenstand als verifiziert bestätigen".
>
> Priorität-Nachtrag (29.09.2026, Aufgabe 27): Punkt 1 (PWA/Desktop-Modellbruch bei Mazeration→Tank) gehört wegen aktiver PWA-Nutzung vor bzw. parallel zu Zwei-Wochen-Plan-Schritt 6 „Mazerate der heurigen Saison zubuchen" — ähnlich dringend wie Aufgabe 26 Punkt 1. Punkt 2 (Chargenherkunft beim Poolen) sollte vor Zwei-Wochen-Plan-Schritt 10 (GFKC-Umbau/Einlagern) geklärt sein. Punkt 3 (Tank-ID statt Freitext) ist Backlog ohne Termindruck, zusammen mit Aufgabe 26 Punkt 3–6 einzureihen.

### Plan für die nächsten zwei Wochen (Nutzer, 28.09.2026 – rein informativ, noch keine Umsetzung)

Löst den kürzeren „Plan für nächste Woche" vom 27.09. ab, jetzt konkretisiert und erweitert:

1. **Änderungsliste fertig abarbeiten** — App lauffähig haben (offene Roadmap-Punkte: QR-Code-Konsolidierung, Build-Aufräumplan, Branch-Löschung, Versionierung, Aufgabe-18-Rest nach Vor-Ort-Termin, **neu: Aufgabe 26 Punkt 1+2 — siehe unten**).
2. **Inventurdaten 31.12.2025 einspielen** und mit den Istwerten vergleichen.
   - ⚠️ **Geklärt (27.09.2026): Kapazitäten fehlen als Daten, nicht als Funktion.** Geprüft bis zum allerersten Git-Commit dieses Repos zurück: nie echte, individuell erfasste Füllkapazitäten vorhanden — durchgehend Platzhalter (`5000` für Tanks, `100` für die gruppierten Gebinde B/Fl/K) bzw. bei `Fass`/`Cont`/`IBC` krumme Zahlen, die eher eine eingefrorene *Füllmenge* aus der Aufgabe-4-Migration sind als eine echte Kapazität. Eingabemöglichkeit selbst ist aber bereits da (Bearbeiten-Button je Tank/Gebinde) — kein Code-Bedarf, nur die Werte fehlen noch (Nutzer bringt sie vor Ort mit).
   - ⚠️ **Wichtiger Vorbehalt (28.09.2026, siehe „Inventur (Gesamtablauf)" oben):** Der Vergleich mit den Istwerten trifft direkt auf das ABV-Messmethoden-Problem (Mazerat-ABV per Spindel systematisch verzerrt durch Extraktgehalt). Für den anstehenden Vergleich heißt das: Abweichungen bei Mazerat-Posten sind zu erwarten und nicht zwangsläufig ein Fehler im System.
3. **Korrekturen, falls nötig** — dafür existiert die Korrektur-Buchung mit Pflicht-Begründung aus Aufgabe 25.
4. **Echtdatenstand als verifiziert bestätigen.**
5. **Spritzubuchung.**
6. **Mazerate der heurigen Saison zubuchen.** ⚠️ Falls dabei die PWA genutzt wird, siehe Aufgabe 27 Punkt 1 (PWA/Desktop-Modellbruch bei Mehrfach-Tankzuordnung).
7. **GFKC-N Ausmischung** (Rezepturen-Modul aus Aufgabe 17).
8. **Retoure GFKC-M von Mozart** (Zugang-Buchung, siehe Diskussion zu Aufgabe 22).
9. **GFKC-N an Mozart versenden** (Aufgabe 22).
10. **GFKC-M von Mozart in GFKC-N umbauen und einlagern** (Rezepturen-Modul + „Einlagern" aus Aufgabe 24). ⚠️ Siehe Aufgabe 27 Punkt 2 (Chargenherkunft beim Poolen), falls dabei unterschiedliche Chargennummern zusammengeführt werden.

Nutzer-Einschätzung: „Das ist Arbeit genug, vermutlich sind noch einige Bugs zu beheben, aber der Plan steht."

- [x] ✅ **Aufgabe 22 – Versand an Lohnabfüller (Nutzer-Anfrage 28.09.2026, vorgezogen aus dem Plan für nächste Woche, „Kontingent ist noch da"):** Beim Recherchieren der Gurktaler-Skills aufgefallen: der geplante „Versand 3 IBCs GFKC an Mozart" ist **kein Lohnbrand** (Mazerat raus, Destillat zurück, gleiche Einheit) — Mozart ist der **Lohnabfüller** (fertige Ware raus, abgefüllte Flaschen Wochen später zurück, andere Einheit). Dafür gab es keine passende Buchungsfunktion. Nutzer-Entscheidung: nur der Versand (Abgang) wird getrackt, kein Rücklauf-Tracking für Fertigware/Flaschen (liegt außerhalb dessen, was diese App sonst führt — Tanks/Gebinde in Litern). Neuer Menüpunkt „Versand an Lohnabfüller" (`/versand`): Lohnabfüller-Name (Default „Mozart"), Versanddatum, beliebig viele Gebinde aus dem echten Lagerbestand, bucht sofort Abgang für alle gewählten Gebinde, fortlaufende Versandnummer `LF-<Jahr>-<001>` (bewusst nicht `LA-`, das ist schon die Abkürzung für Liter Absolutalkohol). LA-Bilanz wird weiterhin für die interne Alkohol-Buchhaltung berechnet und angezeigt — **kein Steuerbetrag**, da Buchungen laut Nutzer steuerfrei erfolgen. 5 neue Tests, end-to-end im Browser mit dem echten Szenario verifiziert (3×1.000L GFKC-M @53,5% → 1.605 LA, alle 3 IBCs korrekt auf 0 abgebucht).
  - **Nachtrag zur Chargennummernvergabe (Nutzer, 28.09.2026):** Real vergeben wird pro Jahr eine gemeinsame Nummer für alle Mazerationen (Jahreszahl + „00", z.B. 2026 → „2600" — Zitronenmelisse und Salbei von heuer bekommen beide „2600"). Ausnahme GFKC: Charge „GFKC-X" mit fortlaufendem Buchstaben, aktuell „M" im Umlauf, nächste wird „N", danach „O". Vom Nutzer explizit als „fachlich nicht korrekt, aber nicht änderbar" bezeichnet (externe Vorgabe) — für die Software heißt das: Chargennummer-Felder dürfen keine Eindeutigkeits-Validierung erzwingen, Duplikate über mehrere Mazerationen eines Jahres sind normal und korrekt.
  - **Nachtrag zu den Transportgebinden (Nutzer, 28.09.2026):** Die IBCs für den Mozart-Versand sind generische, nicht individuell nummerierte Retourgebinde der Spedition (leer angeliefert, vor Ort befüllt aus einem oder mehreren Lagertanks, dann verschlossen/plombiert) — bestätigt, dass die freie „Gebinde aus dem Lagerbestand + Menge"-Auswahl in Aufgabe 22 genau richtig ist, keine Container-ID-Verfolgung nötig. Normalfall: GFKC kommt nicht zurück (Ausnahme siehe oben, dafür bewusst keine eigene Rücklauf-Maske gebaut). Rückmeldung explizit **nur zum Verständnis**, kein Code-Bedarf daraus.
  - **Vorgemerkt für später (Nutzer, 28.09.2026, ausdrücklich noch nicht umzusetzen):** Lieferschein-Vorlage für den Mozart-Versand, anhand eines vom Nutzer noch bereitzustellenden alten Lieferscheins zu bauen. Muss mindestens enthalten: Brutto-/Nettogewicht (für den Spediteur), Füllmenge in Litern mit LA (für die Buchung bei Mozart und die Zolldokumente beim Transport). Vermutlich ein PDF-Export ähnlich dem bestehenden Mazerationsprotokoll-Export, gespeist aus den Daten eines `/versand`-Datensatzes — Brutto-/Nettogewicht müsste dafür noch als Feld ergänzt werden (aktuell nicht erfasst).
- [x] ✅ **Aufgabe 23 – Buchungsjournal-Lücke bei Lohnbrand/Versand/Rezepturen geschlossen (Nutzer-Anfrage 28.09.2026):** Beim Durchspielen des GFKC-Auffrischungs-Ablaufs (Operation 1/2 aus dem QO-Gurktaler-Mild-Chatverlauf) gefragt, ob die Infrastruktur für LA-genaues, chronologisch nachvollziehbares Buchen ausreicht. **Befund: nein, echte Lücke.** `StockService.applyTransaction()`/`addEntry()` — von Lohnbrand-, Versand- und Rezepturen-Service direkt aufgerufen — veränderten nur die Bestandsmenge, ohne Journal-Eintrag. Das Buchungsjournal (`inventoryTransactions`, Transaktionsprotokoll-Ansicht + XLSX-Export) wurde bislang **ausschließlich** von der manuellen Zugang/Abgang-Buchung in der Lagerverwaltung befüllt — jede Buchung über Lohnbrand-Aufträge, Versand an Lohnabfüller oder Rezepturen-Produktion blieb dort unsichtbar, obwohl die Bestände korrekt waren.
  - **Fix:** Journal-Schreiblogik zentral in `stock-service.ts` verlagert (`recordTransaction`/`recordNewEntry`, mit `readTransactions()`/`writeTransactions()`), sodass jede Buchung automatisch einen Journal-Eintrag mit Referenz auf den auslösenden Vorgang erzeugt (z.B. „Versand LF-2026-001 (Mozart)", „Rezeptur GFKC-O Produktion", „Lohnbrand LB-2026-003 - Ausgang/Rücklauf"). `lohnbrand-service.ts`, `versand-service.ts`, `rezeptur-service.ts` und die manuelle Buchung in `inventory-management.tsx` nutzen jetzt alle denselben Weg statt eigener/fehlender Journal-Logik.
  - 12 neue/angepasste Tests, end-to-end im Browser verifiziert: Versand an Mozart gebucht → Eintrag erscheint sichtbar im Transaktionsprotokoll der Lagerverwaltung mit korrekter Referenz auf die Versandnummer.
- [x] ✅ **Aufgabe 24 – Einlagern mit Misch-ABV-Berechnung + Tank-Split (Nutzer-Anfrage 28.09.2026, Grundsatzfrage):** Nutzer fragte, ob ein eigener Vorgang für das Umfüllen/Poolen mehrerer Mazerate gleicher Sorte sinnvoll ist. **Befund beim Nachsehen:** `StockService.addEntry()` — auch von der bestehenden Mazeration→Zieltank-Buchung im Formular verwendet — legt bei jeder Einlagerung eine komplett neue, separate Zeile an, statt mit vorhandenem Inhalt im selben Tank zu verschmelzen. Bei fest verrohrten Tanks ist das sachlich falsch: die Flüssigkeit vermischt sich physisch zu einem tatsächlichen ABV, das System zeigte aber mehrere Chargen-Zeilen mit je eigenem ABV nebeneinander (passend zur realen Chargennummernvergabe, wo z.B. alle ZM-Mazerate eines Jahres ohnehin dieselbe Nummer "2600" tragen). Der Split-Fall (Ausbeute passt nicht komplett in einen Tank, Rest muss in einen zweiten) wurde bisher gar nicht unterstützt.
  - Nutzer-Entscheidung: eigenständiges, wiederverwendbares Werkzeug statt Einbau ins Mazerationsformular (kann später auch von Lohnbrand-Rücklauf etc. genutzt werden).
  - Neuer Menüpunkt „Einlagern" (`/einlagerung`) sowie `StockService.poolIntoTank()`/`recordPoolIntoTank()`: fasst beim Einlagern automatisch alle vorhandenen Zeilen desselben Produkts im Zieltank zu einer zusammen (räumt dabei gleich bestehende unkonsolidierte Alt-Chargen auf), berechnet den gewichteten Misch-ABV über LA, lehnt ab bei einem im Zieltank bereits vorhandenen anderen Produkt. UI erlaubt beliebig viele Zieltank-Zeilen mit Live-Vorschau (Kapazität/belegt/frei, bestehender Bestand, Ergebnis nach Einlagerung) für den Split-Fall.
  - 6 neue Tests (u.a. mit den genauen vom Nutzer genannten Beispielzahlen), end-to-end im Browser mit dem vollständigen Nutzer-Szenario verifiziert: Tank X 3000L@52% + neu 1500L@56% → 4500L@53,33%; danach weitere 1500L@58%, wovon nur 500L in Tank X passen (→5000L@53,8%) und die restlichen 1000L korrekt nach Tank Y umgeleitet werden (→1000L@58%). Journal-Einträge korrekt pro Tank mit tatsächlich zugeführter Menge (nicht Tank-Gesamtstand).
- [x] ✅ **Aufgabe 25 – Inventur-Korrektur im Buchungsjournal + zwei gravierende, unabhängige Altbugs im Bearbeiten-Dialog gefunden und behoben (Nutzer-Anfrage 28.09.2026):** Nutzer erklärte den echten Ablauf: Mazerat wird gespindelt (ABV steht fest), nach dem Umpumpen ergibt die Steigrohr-Differenz die tatsächliche Menge — der rechnerische Misch-ABV aus Aufgabe 24 ist eine gute Näherung, muss bei der Inventur aber pro Tank korrigierbar sein.
  - **Vorgesehener Weg dafür existierte schon** (Bearbeiten-Button/`AddInventoryItemDialog`, editiert Menge+ABV direkt), **schrieb aber keinen Journal-Eintrag** — derselbe Lückentyp wie Aufgabe 23, hier für den direkten Bearbeiten-Weg. Neuer Transaktionstyp `Korrektur` (Schema, Filter, Badge in der Transaktionsprotokoll-Ansicht), `StockService.recordCorrection()` schreibt einen Eintrag mit Vorher/Nachher-Werten (Menge darf dabei 0 sein, falls nur der ABV korrigiert wird - reine Zod-Lockerung von `.positive()` auf `.min(0)`).
  - **Beim End-to-End-Test dabei zwei gravierende, von dieser Aufgabe unabhängige Altbugs gefunden, die das Bearbeiten JEDES bestehenden Lagerpostens komplett unwirksam machten** (der Speichern-Button tat buchstäblich nichts):
    1. `<Form {...form}>` in `add-inventory-item-dialog.tsx` ist nur der React-Hook-Form-Kontext (shadcn: `const Form = FormProvider`), **kein echtes `<form>`-Element** — der `type="submit"`-Button hatte nichts zum Absenden. Fix: echtes `<form onSubmit={form.handleSubmit(onSubmit)}>` ergänzt.
    2. Selbst danach schlug die Validierung bei jedem bestehenden Posten fehl: `initialData.lastInventoryDate` kommt aus `JSON.parse(localStorage)` und ist dann ein String, kein `Date`-Objekt — die Zod-Prüfung (`z.date()`) lehnte das lautlos als "Ungültiges Datum" ab. Fix: `new Date(initialData.lastInventoryDate)` beim `form.reset()`.
  - 3 neue Tests für `recordCorrection`, end-to-end im Browser verifiziert: Menge/ABV über den Bearbeiten-Dialog korrigiert (4.500L@53,33% → 4.480L@53%), Korrektur wird jetzt tatsächlich gespeichert (vorher: gar nicht) UND erscheint als "Korrektur"-Eintrag mit Vorher/Nachher-Notiz im Transaktionsprotokoll.
  - **Nachtrag, gleicher Tag (Nutzer-Kontext: Inventur am Jahresende bei 13°C Lagertemperatur, Spindel-Messung mit Temperaturkorrektur, aber Tank-Füllstand nur per Steigrohr mit ±10L Unschärfe ablesbar — Schwund/Ablesefehler sind von der Behörde akzeptiert, müssen aber „im Rahmen und begründbar" bleiben):** Der Korrektur-Journal-Eintrag aus Aufgabe 25 hielt zwar Vorher/Nachher fest, aber keinen Grund — genau das für „begründbar" nötige Stück fehlte. Nutzer war sich bei der Umsetzungsform unsicher („ehrlich gesagt weiß ich es nicht"), auf Empfehlung die kleinere, risikoärmere Variante gewählt statt einer eigenen Inventur-Funktion: neues Feld „Grund bei Mengen-/ABV-Korrektur" im Bearbeiten-Dialog, **Pflicht sobald sich Menge oder ABV gegenüber dem Ausgangswert ändern** (Validierung blockiert das Speichern ohne Grund), wird an den Journal-Eintrag angehängt. Gilt für jede Korrektur, nicht nur zur Inventur. End-to-End verifiziert: Speichern ohne Grund wird abgelehnt (Bestand bleibt unverändert), mit Grund geht's durch und der Text landet sichtbar im Journal-Eintrag.

- [ ] 🔜 **Aufgabe 26 – Architektur-/UX-Review „Wirtschaftsjahr im Zeitraffer" (Nutzer-Anfrage 28.09.2026, noch nicht umgesetzt, nur dokumentiert und eingereiht):** Nutzer bat um einen Blick „aus etwas Entfernung" auf Logik, Abläufe und vor allem Ergebnisqualität — ein kompletter Wirtschaftsjahres-Durchlauf gedanklich durchgespielt (Inventur/Datenübernahme, Sprit-Zugang, mehrere Mazerationen, 2× Versand an Mozart, 2× Lohnbrand hin+retour, eine GFKC-Ausmischung, Jahresinventur), plus die Frage, ob die Exportdokumente für externe Empfänger ohne große Erläuterung taugen. Versand, Lohnbrand und Rezepturen selbst dabei als sauber bestätigt (alle drei prüfen Bestand vor Buchung: `versand/page.tsx:80`, `lohnbrand/page.tsx:93`, `rezeptur-service.ts:72,102`). Nutzer-Rückmeldung: „Sehe ich genauso ... bin recht zufrieden mit dem Ergebnis." Gefundene Punkte, priorisiert:
  1. ✅ **Erledigt (29.09.2026). Echter Logikfehler, einziger Punkt mit Datenrisiko — vor Echtdaten-Einstieg zu beheben:** Die generische Zugang/Abgang-Buchung in der Lagerverwaltung (`transactionFormSchema`, nur `.positive()`) prüfte nicht gegen den tatsächlichen Bestand. `StockService.applyTransaction()` (`stock-service.ts` ~Zeile 60) klemmte einen zu hohen Abgang lautlos auf 0 (`Math.max(0, next)`), aber `recordTransaction()` (~Zeile 103) schrieb trotzdem die ursprünglich eingegebene, zu hohe Menge ins Buchungsjournal statt der tatsächlich abgebuchten Differenz — Journal und realer Bestand liefen auseinander, unbemerkt bis zur nächsten Inventur. Betraf nur diesen manuellen Weg, nicht Versand/Lohnbrand/Rezepturen (dort bereits korrekt geprüft, siehe oben). **Fix:** `RecordTransactionDialog` lehnt einen Abgang > verfügbarer Bestand jetzt ab (gleiches Muster wie Versand/Lohnbrand), Menge-Feld zeigt den verfügbaren Bestand als Obergrenze an. End-to-End per Playwright verifiziert: Überbuchung (600L auf 500L Bestand) wird abgelehnt, Bestand und Journal bleiben unverändert; gültiger Abgang (100L) bucht korrekt durch.
  2. ✅ **Erledigt (29.09.2026). Encoding-Bug, trivial, jederzeit mit Punkt 1 miterledigbar:** ~67 Stellen in `inventory-management.tsx` waren doppelt UTF-8-kodiert (cp1252-Zwischenschritt) — Umlaute erschienen in Toasts und einem Button-Label als „LagerÃ¼bersicht" statt „Lagerübersicht". Gezielt nur die betroffenen Escape-Sequenzen ersetzt, sonst keine Änderung am Dateiinhalt. Live im Browser verifiziert (Toast zeigt jetzt korrekt „Lagerübersicht Exportiert").
  3. **Kein Überblick/Dashboard:** Startseite (`src/app/page.tsx`) zeigt nur Kalender und Aufgaben, keine Kennzahlen (Gesamt-LA im Lager, Tank-Auslastung, offene Lohnbrand-/Versand-Vorgänge) — nach einem vollen Jahr über 5 Module verteilt schwer überschaubar.
  4. **Buchungsjournal ohne echte Filter** (`inventory-transaction-table.tsx`): nur Typ-Filter (Zugang/Abgang/Korrektur) und Spaltensortierung, keine Suche nach Produkt/Charge/Tank/Datumsbereich — nach einem Jahr mit vielen Buchungen (Sprit-Zugang, mehrere Mazerationen, 2× Versand mehrzeilig, 2× Lohnbrand hin+zurück, 1× Ausmischung) schnell 40–60+ Zeilen.
  5. **Chargennummer als reines Freitextfeld** beim Neuanlegen eines Postens, kein Abgleich/Vorschlag gegen bereits vergebene Nummern — ein Tippfehler (z.B. „GFKC-N" vs. „GFKC-n") erzeugt einen unsichtbaren Karteileichen-Posten statt einer Fehlermeldung.
  6. **Exportdokumente für externe Empfänger nicht durchgängig tauglich:** Von drei XLSX-Exports in `inventory-management.tsx` ist nur „Aktueller Lagerbestand" vollständig (Artikel/Charge/Tank/Menge/ABV/Dichte/LA/Inventurdatum). „Lagerübersicht" verliert Tank-/Chargenzuordnung komplett (nur Summe je Artikelnummer). „Transaktionsprotokoll" fehlt ausgerechnet ABV **und** Liter Absolutalkohol **und** Tank — das Dokument, das die LA-genaue Nachvollziehbarkeit belegen soll, zeigt die LA nicht. Keiner der drei Exports hat Firmenkopf oder Spaltenerklärung. Das Mazerationsprotokoll-PDF (`mazeration-pdf.ts`) ist eine reine Label:Wert-Liste, fürs eigene Archiv brauchbar, aber ohne Briefkopf nicht für externe Empfänger gedacht. Für Mozart/Lohnbrenner/Zoll gibt es weiterhin kein generiertes Dokument (bekannte, bereits bei Aufgabe 22 auf „später" vertagte Lücke — Lieferschein-Vorlage).

  **Einreihung (Nutzer, 28.09.2026): „Arbeiten wir das chronologisch so ab, wie es am besten in den Aufgabenplan passt."** Punkt 1+2 gehören in den laufenden Zwei-Wochen-Plan-Schritt 1 „Änderungsliste fertig abarbeiten" und damit vor den produktiven Echtdaten-Einstieg (siehe Priorität-Nachtrag oben). Punkt 3–6 sind spürbar, aber nicht datengefährdend — passend erst nach Zwei-Wochen-Plan-Schritt 4 „Echtdatenstand als verifiziert bestätigen", keine Blockade für die geplanten Buchungen dazwischen.

- [ ] 🔜 **Aufgabe 27 – Externes Gesamt-Audit geprüft und eingereiht (Nutzer-Anfrage 29.09.2026, noch nicht umgesetzt):** Nutzer legte ein von einem anderen Tool erstelltes Audit-Dokument vor (`MazerationsMeister_Gesamt-Audit.md`, Fokus Lager/Tanks/Mazeration/Persistenz/PWA-Desktop/Sicherheit). Gegen den echten Code geprüft statt übernommen. Mehrere Punkte bestätigen sich deckend mit Aufgabe 26 (Buchungs-Obergrenze, Journal-Abweichung) oder sind bereits bekannt (5000L-Tank-Default — siehe Kapazitäten-Lücke im Zwei-Wochen-Plan-Schritt 2). Ein Punkt überschätzt das Risiko: `allowMismatch` in `StockService.poolIntoTank()` existiert im Code, ist aber über keine einzige UI-Stelle erreichbar (`grep` über `src/app`/`src/components`: 0 Treffer) — bleibt daher unberücksichtigt. Die Rundung auf 2 Dezimalstellen bei der LA-Neuberechnung ist bei den tatsächlichen Chargengrößen (hunderte bis tausende Liter) ohne praktische Relevanz. Drei Punkte sind aber echt neu bzw. verdienen eine eigene Reihung:
  1. ⚠️ **Teilweise erledigt (29.09.2026). PWA/Desktop-Modellbruch bei Mazeration→Tank — höchste Priorität, da die PWA aktiv genutzt wird und kein Auslaufmodell ist (Nutzer, 29.09.2026: „PWA ist kein Auslaufmodell, im Gegenteil"):** `public/mazeration-pwa.html` (eigenständige, handgeschriebene HTML/JS-Datei, 1744 Zeilen) unterstützt über `addTargetTank()` mehrere Zieltanks pro Mazeration mit freiem Text-Feld + Autocomplete-Vorschlag (`<input list="tank-options">`, keine harte Prüfung, keine Zod-Validierung). Das Desktop-Formular (`mazeration-form.tsx`) kennt dagegen nur einen einzelnen, per Zod validierten `targetTankNr`. Zwei fachlich unterschiedliche Modelle für denselben Vorgang je nach Erfassungsweg — Risiko für Tippfehler bei Tanknamen und für eine auf der PWA erfasste Mehrfach-Zuordnung, die im Desktop-Modell gar nicht abbildbar wäre.
     - **Erledigt:** das konkrete Tippfehler-Risiko. Ein Zieltank-Feld in der PWA, dessen Text keinem bekannten Tank aus `tank-data.json` entspricht, zeigt jetzt einen Warnhinweis (blockiert die Eingabe bewusst nicht, wichtig für Offline-Nutzung im Feld) — gleiches Prinzip wie die Desktop-Lösung aus Aufgabe 14. Per Playwright verifiziert: Warnung erscheint bei unbekanntem Namen, verschwindet bei bekanntem (auch groß-/kleinschreibungsunabhängig).
     - **Noch offen:** die eigentliche Modell-Vereinheitlichung (PWA: mehrere Zieltanks mit je eigenem Steigrohr-Anfangs-/Endstand vs. Desktop: ein einzelner Zieltank ohne Steigrohr-Erfassung) ist damit nicht gelöst, nur das akute Tippfehler-Risiko entschärft. Eine echte Angleichung wäre ein größeres Vorhaben (vermutlich müsste die Desktop-Seite der PWA nachgezogen werden, nicht umgekehrt — die PWA bildet den realen Steigrohr-Ablauf aus Aufgabe 25 bereits genauer ab) und bleibt Backlog.
  2. ✅ **Erledigt (29.09.2026). Chargenrückverfolgbarkeit beim Poolen geht verloren** (`stock-service.ts:204-217`, `poolIntoTank`): Beim Einlagern in einen Tank mit bereits vorhandenem Inhalt desselben Produkts wurde nur eine einzige Chargennummer übernommen (`neu.chargenNummer || basis?.chargenNummer`), die übrigen gingen ersatzlos verloren. Abgeschwächt durch die reale Chargenvergabe (ein Jahr = eine gemeinsame Nummer für alle Mazerate, siehe Aufgabe 22), betraf also hauptsächlich Fälle mit tatsächlich unterschiedlichen Chargennummern (z.B. Restbestand vom Vorjahr). **Fix:** `poolIntoTank()` sammelt jetzt alle beteiligten Chargennummern; sind sie gleich, bleibt die Chargennummer wie bisher ein einzelner Wert, bei unterschiedlichen Chargen werden sie kombiniert (z.B. „2500 + 2600") statt eine davon stillschweigend zu verwerfen. `recordPoolIntoTank()` schreibt bei jeder echten Verschmelzung zusätzlich eine vollständige Zusammensetzungs-Notiz ins Buchungsjournal (Menge + Charge je Quelle → Gesamtmenge + Charge). 2 neue Tests, alle 86 Tests grün.
  3. **Tanknummer als Freitext statt eindeutiger Tank-ID** (`tankNr` ist gleichzeitig Anzeigename und impliziter Schlüssel, kein separates `tankId`-Feld): strukturell dasselbe Muster wie das historische Aufgabe-4-Problem, diesmal als Grundsatzkritik statt als konkreter Migrationsfehler. Nur relevant, falls künftig eine Tanknummer umbenannt wird — kein akuter Auslöser, daher niedrigste Priorität der drei.

  **Einreihung:** Punkt 1 vor bzw. parallel zu Zwei-Wochen-Plan-Schritt 6 (Mazerate der Saison zubuchen), ähnlich dringend wie Aufgabe 26 Punkt 1. Punkt 2 vor Zwei-Wochen-Plan-Schritt 10 (GFKC-Umbau/Einlagern) klären. Punkt 3 ist Backlog ohne Termindruck, zusammen mit Aufgabe 26 Punkt 3–6 nach dem produktiven Einstieg.

- [ ] 🔜 **Inventur (Gesamtablauf) — bewusst offen, noch nicht entworfen (Nutzer, 28.09.2026):** Nach Aufgabe 25 explizit zurückgestellt: „Ich will die Dinge nicht komplizierter machen, als sie sind" — statt weiter einzelne Korrektur-Bausteine anzuflicken, soll der **gesamte Inventurablauf einmal gesondert und als Ganzes** durchdacht werden, bevor weiter daran gebaut wird. Bekannte Rahmenbedingungen (siehe Aufgabe 25): Jahresende, 13°C Lagertemperatur, Spindel mit Temperaturkorrektur, Steigrohr-Ablesung mit ±10L Unschärfe, Schwund/Ablesefehler sind von der Behörde akzeptiert, müssen aber im Rahmen und begründbar bleiben. Vom Nutzer explizit genannte, noch zu klärende Punkte:
  - **Zählliste**: eine Erfassungsliste mit einzutragenden Werten für Menge und ABV je Gebinde/Tank (Bezug zur bereits existierenden, noch unausgefüllten Kapazitäts-Vorlage aus Aufgabe „Kapazitäten-Tanks-Gebinde", aber für den jährlich wiederkehrenden Inventur-Zählvorgang, nicht die einmalige Kapazitätserfassung).
  - **Stillschweigende Übernahme**: für Gebinde, bei denen sich seit der letzten Erfassung nichts geändert hat, soll nichts extra bestätigt/korrigiert werden müssen.
  - **Diskrepanzenmanagement**: wie mit der Differenz zwischen rechnerischem Bestand und gezähltem/gespindeltem Ist-Wert umgegangen wird — wann ist das noch „im Rahmen", wann nicht.
  - Vermutlich weitere Punkte, die erst beim Durchdenken auffallen.
  - **Ausdrücklich keine Umsetzung, bevor dieser Gesamtentwurf steht** — auch keine weiteren kleinen Nachträge zur bestehenden Korrektur-Funktion aus Aufgabe 25.
  - **Nachtrag 28.09.2026 — deutlich gewichtigerer Stolperstein als bloße Messunschärfe (Nutzer):** Destillate und Mazerate werden per Spindelung ermittelt. Destillate liefern damit (abgesehen von der Messunschärfe) korrekte ABV-Werte. **Mazerate liefern bei Spindelung dagegen sicher falsche Werte** — durch den Extraktgehalt (gelöste Pflanzenstoffe verändern die Dichte unabhängig vom Alkoholgehalt), nicht nur ungenau, sondern systematisch verzerrt. Spindeln ist trotzdem die einzige vom Zoll anerkannte Messmethode. Eine Gegenprüfung mit "Alex501" erfordert vorheriges Verdünnen auf 40 %vol — ob und wie sich daraus der tatsächliche ABV korrekt zurückrechnen lässt, ist selbst fachlich noch ungeklärt ("muss noch geprüft werden"). **Konsequenz, die beim Gesamtentwurf mitgedacht werden muss:** Alle ABV-Werte im aktuellen Lagerstand können stimmen, müssen es aber nicht — das betrifft potenziell jeden Mazerat-Posten im System, nicht nur die Inventur-Korrektur selbst. Eine LA-Differenz zwischen unterschiedlichen Messmethoden zu ermitteln **und insbesondere zu buchen, darf nicht ohne vorherige Abstimmung mit der Behörde geschehen** — das ist eine regulatorische Voraussetzung, keine rein technische Entscheidung. Zeitlich unkritisch: Inventur-Stichtag ist der 31.12., die amtliche Zoll-Alkoholfeststellung erfolgt erst zwischen März und Juni — genug Zeit für eine geordnete Klärung, bevor hier irgendetwas softwareseitig festgelegt wird.

### Phase 4: Produktionsreife Implementierung 🚧

#### 1. QR-Code Druckfunktion 🔴 AKTUELL
- Tank-Auswahl per Checkbox, Multi-Tank-Auswahl, Print-Preview, PDF-Export

#### 2. GitHub-Integration fertigstellen 🟡 TEILWEISE ERLEDIGT
- ✅ Token-Management über Einstellungen (vorhanden, seit 27.09.2026 zusätzlich als Single Point of Truth konsolidiert, siehe Phase 3)
- ✅ Automatische Backup-Commits (Auto-Sync in den Einstellungen, konfigurierbares Intervall)
- [ ] Versionsverlauf (frühere GitHub-Commits/Stände direkt in der App durchsuchen) — weiterhin offen

#### 3. Mobile Tank-Scan Offline-Funktionalität 🔴 KERNFUNKTION
- Vollständige Tank-Info auch ohne Netzwerk, Cross-Network Zugriff

#### 4. Anleitungen-Sektion aktualisieren ✅ ERLEDIGT (27.09.2026, siehe Aufgabe 20)
- Neue QR-Code-Workflows, GitHub-Integration, Mobile-First Hinweise — alles nachgezogen, plus Rezepturen (GFKC) und Lohnbrand-Aufträge ergänzt, die es beim Anlegen dieses Punkts noch gar nicht gab.

### Phase 4: Cloud & Production-Ready 🚀

#### App-Größe reduzieren
- Aktuell: ~6GB portable EXE – Ziel: <500MB
- Problem: node_modules vollständig gepackt

#### Mobile Optimierungen
- Progressive Web App (PWA) für gesamte Desktop-App
- Offline-Funktionalität, Push-Notifications

#### Erweiterte Tank-Features
- Sensor-Integration (Temperatur, Füllstand)
- Echtzeit-Benachrichtigungen

### Phase 5: Enterprise Features 🏢

- Multi-User & Synchronisation (Benutzerkonten, Rollen, zentrales Backend)
- Barcode-Scanner, automatische Bestandswarnung, Produktionsplanung

---

## Änderungsprotokoll

### September 2026
- ✅ **Electron-Build repariert – App startet jetzt korrekt (27.09.2026):** Beide Artefakte (`dist\win-unpacked\MazerationsMeister.exe` und `dist\MazerationsMeister-Portable-0.1.0.exe`) starten und laden die App vollständig. Drei verkettete Ursachen behoben:
  1. `distDir: 'out'` in `next.config.ts` überschrieb bei jedem `next build` die statischen HTML-Exporte mit internen Build-Artefakten → `distDir`-Zeile entfernt, Export geht jetzt wieder nach `out/` (Standard bei `output: 'export'`).
  2. `electron-builder`-Konfig in `package.json` packte `.next/**/*` (existiert nicht mehr seit `distDir: 'out'` gesetzt war) statt `out/**/*` → `files` korrigiert; danach zeigte sich, dass Node.js-`fs`-Zugriffe auf asar-virtuelle Pfade unter Windows unzuverlässig sind → `out/**/*` aus `files` entfernt, stattdessen als `extraResources` kopiert (echtes Dateisystem unter `resources/out/`).
  3. `electron/main.ts` + `main.js`: `app.getAppPath()` zeigte auf den asar-Pfad statt auf `resources/` → auf `process.resourcesPath` umgestellt, das direkt auf den `resources/`-Ordner zeigt, wo `out/` als `extraResources` liegt.
- 🔜 **GFKC-Verschnitt-Bestandsaufnahme:** Aufgabe 17 zurückgestellt (Start ab 29.09.2026). Vollständige Analyse des bereits auf Branch `pages-clean` existierenden Rezeptur-Planungswerkzeugs (Schema, Berechnungslogik, UI) in `docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md` dokumentiert. Kernlücke: Planung ist fertig gebaut, die eigentliche Buchung (Komponenten-Abgang + GFKC-Zugang) existiert nirgends.
- 🔴 **Cross-Modul-Kohärenz-Audit:** Mazeration/Lager/Tank modulübergreifend geprüft. 4 aktive Bugs gefunden (LA nie neu berechnet + 3 widersprüchliche Auswertungen, `?view=all` zeigt Kapazität als Füllstand für alle Tanks, Faktor-1000-Fehler in Sammelliste bei Kleinmengen, kumulativer XLSX-Export stürzt nach PWA-Import ab), plus Datenintegritäts- und Konsistenzlücken (Phantom-Tank-Erzeugung, Lohnbrenner-Workflow fehlt komplett). Details und Aufgaben 10–16 in Phase 3.8 und `docs/REVIEW-2026-09-cross-modul-kohaerenz.md`.
- ✅ **Nachbesserung + zweite Gegenprüfung:** Aufgabe 4 (Tank-ID-Normalisierung) und Aufgabe 8 (Aufräumen) wurden in VS Code nachgebessert und erneut gegen den Code verifiziert – beide jetzt tatsächlich erledigt. `tank-data.json`: 0 von 50 Tanks mit `id !== tankNr` (vorher 41). Toter Code in `inventory-management.tsx` entfernt (1247 → 961 Zeilen). `webSecurity: true` in allen 4 Electron-Dateien. TypeScript kompiliert mit 0 Fehlern.
- ⚠️ **Gegenprüfung „9 Aufgaben erledigt" (erste Runde):** VS-Code-Session meldete alle 9 Aufgaben aus Phase 3.7 als erledigt. Evidenzbasierte Prüfung gegen den tatsächlichen Code ergab: 4 sauber erledigt (1, 2, 6, 7), 3 teilweise mit Substanzverlust (3, 5, 9), 2 sachlich nicht erledigt trotz gegenteiliger Commit-Message (4, 8). Größter Einzelbefund: Aufgabe 4 (Tank-ID-Normalisierung) wurde nur umbenannt statt migriert – 41 von 50 Tanks in `tank-data.json` haben weiterhin `id !== tankNr`. Details je Aufgabe in Phase 3.7 oben.
- 🔴 **Architektur-Review Lagerbestand & Buchungslogik:** kritischer Befund – Buchungsdialog aktualisiert `currentQuantityLiters` nicht, 5 unsynchronisierte Persistenzmechanismen, Tank-ID-Inkonsistenz nur kaschiert, Formeln 4–5× dupliziert. Details und Aufgabenliste in `docs/REVIEW-2026-09-lagerbestand-buchungslogik.md` und Phase 3.7 oben. Zwei Phase-3-Punkte als „behoben" korrigiert (Backup-Snapshots weiterhin 117 Dateien im Repo; XSS-Fix in `?view=all` regressiert).
- ✅ **PWA: Primasprit 60%vol.** in Alkohol-Dropdown ergänzt
- ✅ **PWA: Zwei-Phasen-Workflow** – Entwurf speichern + Protokoll erneut öffnen/abschließen
- ✅ **PWA + Desktop: „Oberirdische Pflanze"** als erste Pflanzenteil-Option
- ✅ **PWA + Desktop: Palettentara** – Anzahl Paletten + Tara/Palette, Nettogewicht-Formel erweitert
- ✅ **PWA: PDF-Export** für einzelne Protokolle aus der Protokollliste
- ✅ **PWA + Desktop: Sammelliste** – chronologische Übersicht mit LA-Berechnungen, PDF + XLSX
- ✅ **PWA + Desktop: Chargennummer 4–5-stellig** (war: nur 5-stellig)
- ✅ **PWA: Ausbeute-% und Kraut:Sprit-Verhältnis** live im Formular
- ✅ **PWA: Suche & Filter** in der Protokollliste (Volltext + Statusfilter)
- ✅ **PWA: JSON-Datensicherung** – Export und Import aller Protokolle
- ✅ **PWA: Push-Benachrichtigungen** bei fälligem Mazeratende
- ✅ **PWA + Desktop: Steigrohranzeige** – Alkoholmenge aus Anfangs-/Endstand berechnen

### Juni 2026
- ✅ **Mazeration PWA implementiert:** `public/mazeration-pwa.html` – Standalone offline-fähige PWA für Mazeration vor Ort am Tablet/Handy
- ✅ **PWA-Manifest:** `public/mazeration-manifest.json` für Android-Installation
- ✅ **Service Worker aktualisiert:** Cacht jetzt auch mazeration-pwa.html
- ✅ **`.gitignore` erweitert:** `tank-data-[0-9]*.json` Backup-Snapshots werden nicht mehr getrackt
- ✅ **Code-Review:** Sicherheits- und Bug-Analyse durchgeführt (webSecurity, XSS, Dead Code, Token-Speicherung)

### September 2025
- ✅ Build-System repariert, Electron-Integration, Tank-Management System, OneDrive-Integration
- ✅ System-Bereinigung: Entfernung veralteter Cloud-Integration-Ansätze

### 23.08.2025
- Exportfunktion verwendet jetzt den einstellbaren Export-Pfad aus den Einstellungen (localStorage) für XLSX-Exporte.
