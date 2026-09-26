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

### Phase 3: KRITISCHE SYSTEM-BEREINIGUNG 🔴 OFFEN

#### Identifizierte Probleme
1. **Inkonsistente Tank-IDs:** QR-Code generiert UUID, System erwartet z.B. "T341"
2. **Doppelte Token-Verwaltung:** QR-Codes und GitHub-Integration haben separate Token-Felder
3. **Mehrfache QR-Code Implementierungen:** localhost URLs vs. GitHub Pages URLs
4. **Navigations-Inkonsistenz:** Kein direkter Inventory-Menüpunkt
5. **webSecurity: false** in Electron/main.js – Same-Origin-Policy deaktiviert (Sicherheitsrisiko)
6. **113 Backup-Snapshots** im Repository-Root (tank-data-*.json) – .gitignore ergaenzt
   > ⚠️ **Korrektur (Review September 2026):** Nur die *neuen* Snapshots werden durch `.gitignore` verhindert. Die bereits committeten Alt-Snapshots wurden **nie entfernt** – Stand heute liegen **117 `tank-data-*.json`-Dateien weiterhin im Git-Tracking**. Siehe `docs/REVIEW-2026-09-lagerbestand-buchungslogik.md`, Abschnitt A5. Als „behoben" markiert unten war verfrüht.

#### Behobene Probleme (September 2025 – Juni 2026)
- ⚠️ `.gitignore` um `tank-data-[0-9]*.json` erweitert (neue Snapshots landen nicht mehr im Repo) — **Repo-Bloat selbst besteht weiter**, siehe Korrektur oben und Aufgabe 6 in der Review
- ✅ Leere Platzhalterdateien identifiziert (electron/main-*.js, src/lib/ngrok-*.ts usw.) — Dateien sind weiterhin vorhanden, nur identifiziert, nicht gelöscht (siehe Aufgabe 8 in der Review)

#### Offene Aufgaben
- [ ] Tank-IDs auf einheitliches Format normalisieren — bestätigt offen, nur Workarounds vorhanden (Review A3 / Aufgabe 4)
- [ ] Token-Management vereinheitlichen (Single Point of Truth) — bestätigt offen, 4 unabhängige Lese-/Schreibstellen (Review Teil B)
- [ ] QR-Code Implementierungen konsolidieren
- [ ] Navigation restrukturieren (Inventory als Hauptmenüpunkt)
- [ ] `webSecurity: true` setzen in electron/main.js — bestätigt offen, betrifft 4 Electron-Dateien (Review A7 / Aufgabe 8)
- [ ] XSS-Fix in tank-viewer.html Fallback (tankId per textContent statt innerHTML)
   > ⚠️ **Korrektur (Review September 2026):** Für den ursprünglichen Einzeltank-Pfad wurde das korrekt gefixt. Die neue `?view=all`-Ansicht (September 2026) hat denselben Fehlertyp erneut eingeführt (unescaped `innerHTML`), ebenso der Inline-Fallback in `github-service.ts`. Der Fix war ein Einzelfall-Patch, keine systemische Regel — siehe Review A6 / Aufgabe 7.
- [ ] Leere Dateien entfernen — bestätigt weiterhin offen

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
  - ⚠️ **Offen (23 Zeilen):** `B` (21) und `K` (2) — mehrere Gebinde mit identischem `produktName` je Gruppe (`Marc d SWS`×5, `Zitronenmelisse`×5, `Pfefferminze`×3, `Salbei`×3, `Sauvignon Bl`×3, `Thymian`×2 in B; `VL Zirbe`×2 in K). Anzahl Inventar-Zeilen und Anzahl Tanks mit diesem Inhalt stimmen je Produkt exakt überein (keine Dateninkonsistenz), aber die *Zuordnung zum konkreten Behälter* ist ohne physische Bestätigung reine Vermutung — bei zollrelevanten Daten bewusst nicht geraten. Anfrage an den Nutzer für die Behälter↔Chargennummer-Zuordnung gestellt (27.09.2026), noch ausstehend.
- [x] ✅ **Aufgabe 19 – LA-Bilanz bei Mazerationen live sichtbar machen (NEU, Nutzer-Feedback 26.09.2026):** Eingesetzte LA / Ausbeute LA / Verlust LA wurden bereits korrekt berechnet (`calculateLADetails`), aber nirgends live angezeigt — nur in PDF/XLSX-Einzelprotokoll-Exporten vergraben, in der Sammelliste fehlte eine eigene Verlust-Spalte samt Summe komplett. Praxisbeispiel des Nutzers (500L Sprit @60% → 480L Mazerat @53% = 45,6 LA Verlust) end-to-end verifiziert. Neuer "Reinalkohol-Bilanz"-Block im Desktop-Formular, live-Anzeige in der PWA, neue "LA Verlust"-Spalte + Summenzeile in Sammelliste (Desktop + PWA, Tabelle/PDF/XLSX) — damit ist auch der kumulierte Verlust über einen Zeitraum nachvollziehbar, nicht nur pro Charge.

> Priorität (bestätigt 25.09.2026): Aufgabe 10–13 zuerst (aktive Bugs mit falschen/abstürzenden Ergebnissen), da heute schon spürbar. Aufgabe 14–17 (inkl. Lohnbrand und GFKC-Verschnitt) danach als größeres Vorhaben. Aufgabe 18 (Datenkorrektur) sollte zeitnah geklärt werden, da sie die Korrektheit der Tank-Anzeige direkt betrifft — der eindeutige Teil (14 Zeilen) kann jederzeit sicher automatisch nachgezogen werden.

### Phase 4: Produktionsreife Implementierung 🚧

#### 1. QR-Code Druckfunktion 🔴 AKTUELL
- Tank-Auswahl per Checkbox, Multi-Tank-Auswahl, Print-Preview, PDF-Export

#### 2. GitHub-Integration fertigstellen 🔴
- Token-Management über Einstellungen, automatische Backup-Commits, Versionsverlauf

#### 3. Mobile Tank-Scan Offline-Funktionalität 🔴 KERNFUNKTION
- Vollständige Tank-Info auch ohne Netzwerk, Cross-Network Zugriff

#### 4. Anleitungen-Sektion aktualisieren
- Neue QR-Code-Workflows, GitHub-Integration, Mobile-First Hinweise

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
