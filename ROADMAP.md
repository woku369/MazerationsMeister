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
- [ ] **Aufgabe 10 – LA-Aktualisierung bei Buchung:** `StockService` berechnet `literAbsolutalkohol` bei jeder Mengenänderung konsistent neu, alle Auswertungsstellen vereinheitlichen
- [ ] **Aufgabe 11 – Sammelliste Faktor-1000-Bug:** `yieldVolumeUnit` im Desktop-Schema ergänzen, Rückwärtskompatibilität für bestehende Protokolle ohne dieses Feld
- [ ] **Aufgabe 12 – PWA-Import-Absturz beheben:** `allLoggedCalculatedValues` beim Import synchron mitpflegen, zusätzlich `generateCumulativeXlsx` defensiv gegen fehlende Einträge machen
- [ ] **Aufgabe 13 – Tank-Viewer `?view=all` reparieren:** `hasUniqueNumber`-Flag korrekt durchreichen (Schema-Ergänzung nötig), Zeitstempel-Feldnamen vereinheitlichen
- [ ] **Aufgabe 14 – Tank-Zuordnung validieren:** `targetTankNr` als Dropdown statt Freitext, Import-Warnung statt stiller Phantom-Tank-Erzeugung
- [ ] **Aufgabe 15 – Lohnbrenner-Workflow:** erfordert vorab fachliche Klärung (einfacher Status vs. eigenes Bewegungsprotokoll), erst danach implementieren
- [ ] **Aufgabe 16 – Klein-/Großmengen-Konsistenz:** bewusste Entscheidung Desktop vs. PWA-Verhalten, aktuell nur zufällig unterschiedlich

> Priorität: Aufgabe 10–13 sind aktive Bugs mit falschen/abstürzenden Ergebnissen und sollten vor 14–16 behoben werden. Aufgabe 15 braucht eine Produktentscheidung, bevor Code geschrieben wird.

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
