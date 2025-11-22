# MazerationsMeister - Roadmap

**Stand:** 22. November 2025  
**Version:** 1.2.3 (Google Calendar Integration + Dashboard Statistics)

## ✅ Was ist fertig (v1.2.3)

### **Dashboard-Widgets (NEU in v1.2.3)**
- **Google Calendar Widget** mit OAuth 2.0 Integration
  - Monatliche Kalenderansicht mit Terminen
  - Monats-Navigation (‹ / ›)
  - Klick auf Tag erstellt neuen Termin
  - Event-Verwaltung: Erstellen, Bearbeiten, Löschen
  - .ics-Download für Termine
  - Native Electron OAuth über IPC (kein Browser-Popup-Blocking)
  - Client-ID hardcodiert für sofortige Nutzung
- **ToDo/Projektliste Widget** zur Aufgabenverwaltung
- **Lagerstatistik-Widget** (NEU 22.11.2025)
  - 5 Übersichtskarten: Sorten, Mazerat, Destillat, Sprit, Gesamt-LA
  - Gestapelter Balken in Mazerat-Karte (Sortenverteilung mit Tooltip)
  - Kategorie-Normalisierung (M/D/Dest/Sbl → Mazerat/Destillat/Sprit)
  - Sprit als separate Kategorie (Ausgangsstoff, nicht Endprodukt)
  - Detailtabelle mit allen Kategorien
  - Bar Chart mit gestapelten Mazerat-Balken (verschiedene Grüntöne pro Sorte)
  - Automatische Datenaktualisierung aus Lagerverwaltung

## ✅ Was ist fertig (v1.1.0 - v1.2.2)

- Mazeration-Protokolle
- Lagerverwaltung mit Chargen & Transaktionen
- Tank-Management mit QR-Codes
- **Container-Indexierung** (57 Container: B-1 bis B-25, Fass-1 bis Fass-6, T-Tanks, etc.)
- **QR-Code Batch-Druck mit eindeutigen IDs** (FIX 4.1 ✅)
- **QR-Code System korrigiert** - Jeder Container hat eindeutige URL (nicht mehr nur "tank=B")
- **TODO-Liste mit GitHub-Synchronisation** (FIX 3.1 ✅)
- **GitHub-Integration zentralisiert** (FIX 2.1 ✅ - nur noch in Einstellungen)
- Rezeptur-System (Excel-Style Editor)
- PDF-Exporte (Protokolle, Lagerstände)
- **Hybrid Storage System** - GitHub als zentrales Sync-Werkzeug
- **App-Größe optimiert** (294 MB portable)

## 🐛 Bug-Fixes (Oktober - November 2025)

### **FIX 5.11: Container-ID Logik & Git-synchronisierte Backups** ✅ ERLEDIGT (18.11.2025)
- **Problem 1**: Falsche Container-IDs durch fehlerhafte Sync-Logik
  - **Symptome**: "Fass-1" wurde zu "Fass-1-1", "B-3" zu "B-3-1" in Gebindeverwaltung
  - **Root Cause**: `tank-sync.ts` erkannte nur `T 341` als eindeutig (Pattern `/^T\s?\d+/i`)
  - Nummerierte Container wie "Fass-1", "B-3", "IBC-12" wurden als **generisch** behandelt
  - Bei jedem Sync: "Fass-1" + 3 Produkte → "Fass-1-1", "Fass-1-2", "Fass-1-3" erstellt
- **Problem 2**: Container wurden bei XLSX-Import überschrieben
  - Manuell angelegte Container (z.B. T 344 mit QR-Code) verloren Daten
  - `bezeichnung`, `volumenLiter`, `movements`, `notes` gingen verloren
  - Nur ID und Inhalt blieben erhalten
- **Problem 3**: Keine Backup-Möglichkeit bei Datenverlusten
- **Problem 4**: Backups nur lokal verfügbar (nicht über GitHub-Sync zwischen Rechnern)
- **User-Konzept**: 
  - Jedes physische Gebinde ist **eindeutig** mit QR-Code
  - Leere Gebinde bleiben sichtbar (Kapazitätsplanung)
  - Gebinde nur löschen wenn verschickt und nicht retour
- **Lösung Teil 1 - Eindeutigkeits-Erkennung** (FIX 5.11a):
  - Pattern erweitert: `/^(.+?)-(\d+)$/` erkennt ALLE nummerierten Behälter
  - "Fass-1", "B-3", "IBC-12", "Fl-5" werden als eindeutig behandelt
  - Mehrere Produkte im selben Behälter erlaubt (ein Container, mehrere Items)
- **Lösung Teil 2 - Container-Merge** (FIX 5.11b):
  - Container werden nicht mehr ersetzt, sondern **intelligent gemerged**
  - **Behalten**: `bezeichnung`, `volumenLiter`, `containerType`, `notes`, `movements`
  - **Aktualisieren**: `currentContent`, `status` (aus Inventar)
  - Manuell angelegte Container behalten QR-Codes und Beschreibungen
- **Lösung Teil 3 - Auto-Backup-System** (FIX 5.11c):
  - Automatisches Backup bei jeder Container-Änderung
  - Format: `tankDefinitions_backup_2025-11-18T14-30-45` mit Timestamp
  - Backup enthält: Datum, Version, Anzahl, alle Container-Daten
  - Letzte 10 Backups werden behalten, ältere automatisch gelöscht
  - **Neuer Button**: "📦 Backup wiederherstellen" in Gebindeverwaltung
  - Auswahl aus Liste mit Datum/Zeit, Wiederherstellung per Nummer
- **Lösung Teil 4 - Git-Synchronisierung** (FIX 5.11d):
  - **User-Anforderung**: "das arbeiten auf zumindest 2 rechnern geplant ist"
  - Backups werden **doppelt** gespeichert:
    - **Lokal** in hybridStorage (schneller Zugriff, wie bisher)
    - **Git-Repository** in `backups/` Verzeichnis (GitHub-Sync)
  - Neue Datei: `src/lib/git-backup.ts` mit Git-Backup-Funktionen
  - Electron IPC-Handler für Dateisystem-Zugriff:
    - `save-git-backup`: Speichert JSON in backups/ Verzeichnis
    - `list-git-backups`: Listet verfügbare Git-Backups
    - `load-git-backup`: Lädt spezifisches Backup aus Git
    - `cleanup-git-backups`: Räumt alte Git-Backups auf (max. 10)
  - Backup-Restore zeigt **beide Quellen** an:
    - 💾 Lokale Backups (sofort verfügbar)
    - 🌐 Git-Backups (von allen Rechnern)
  - Automatisches Cleanup für beide Speicherorte
  - Browser-Fallback: Download-Trigger wenn File System Access nicht verfügbar
- **Formular-Verbesserungen**:
  - "Bezeichnung/Nummer" → **"Container-ID"** (eindeutiger)
  - "Beschreibung" → **"Beschreibung (optional)"** (z.B. "blaues PE-Fass, XY GmbH")
  - Placeholder aktualisiert: "z.B. Fass-1" statt "z.B. Fass #1"
  - Hilfetext verbessert: "Eindeutige Container-ID (z.B. Fass-1, B-1...)"
- **Ergebnis**:
  - ✅ "Fass-1" bleibt "Fass-1" (keine Suffixe mehr)
  - ✅ Manuell angelegte Container überleben XLSX-Imports
  - ✅ QR-Codes bleiben erhalten
  - ✅ Notizen, Historie, Beschreibungen bleiben erhalten
### **FEATURE 6.1: Google Calendar Integration** ✅ ERLEDIGT (21.11.2025)
- **Dashboard-Widget**: Vollständige Google Calendar Integration
- **OAuth 2.0**: Native Electron-Integration über IPC (kein Browser-Popup!)
  - IPC-Handler `google-oauth-login` in electron/main.ts
  - Modal BrowserWindow für OAuth-Flow
  - URL-Überwachung via `will-redirect` und `did-navigate`
  - Automatisches Fenster-Schließen nach erfolgreicher Authentifizierung
- **Kalender-Monatsansicht**:
  - 7-Tage-Woche (Mo-So) mit deutschem Format
  - Aktueller Tag hervorgehoben (blau)
  - Kleine Punkte unter Tagen mit Terminen (bis zu 3 sichtbar)
  - Monats-Navigation mit ‹ / › Buttons
  - Monatsname und Jahr als Header (z.B. "November 2025")
- **Event-Management**:
  - Klick auf Tag → Dialog mit vorausgefülltem Datum (9:00-10:00 Uhr)
  - Event-Liste mit nächsten 5 Terminen unter Kalender
  - Event-Details: Titel, Datum/Zeit, Ort, Beschreibung
  - Aktions-Buttons: Bearbeiten, Löschen, .ics-Download
  - Automatisches Neuladen bei Monatswechsel
- **Client-ID hardcodiert**: `1004514561626-ak5fear0b788324hrchjbv6hkhdiobam.apps.googleusercontent.com`
- **Technisch**:
  - `src/lib/google-calendar.ts`: API-Wrapper mit Electron-IPC-Unterstützung
  - `electron/preload.js`: IPC-Bridge `invoke()` für OAuth
  - Google Identity Services für Token-Management
  - COOP-Problem umgangen durch native BrowserWindow
- **UX-Verbesserungen**:
  - Keine Popup-Blocker-Probleme (Modal-Fenster statt window.open)
  - Sofortige Authentifizierung ohne Konfiguration
  - Deutsche Datumsformatierung (date-fns/locale/de)
  - Mobile-responsive Grid-Layout

### **FIX 5.10: Container-Befüllung Dialog (Violetter Button)** ✅ ERLEDIGT (17.11.2025)
  - ✅ Backup-Wiederherstellung mit 10 Versionen
  - ✅ **Backups über GitHub auf allen Rechnern verfügbar** (FIX 5.11d)
  - ✅ Dual-Storage-System (lokal + Git) für maximale Sicherheit
- **Technisch**: 
  - Pattern-Matching für nummerierte IDs erweitert
  - Merge-Logik statt Replace für Container-Updates
  - Backup-Rotation mit Timestamp-basierten Keys
  - Hilfsfunktion `getAllStorageKeys()` für Cross-Storage Backup-Liste
  - Git-Backup-System mit Electron IPC-Handlers
  - `backups/` Verzeichnis mit README und .gitkeep für Git-Tracking
  - Browser-Fallback mit Download-Trigger

### **FIX 5.10: Container-Befüllung Dialog (Violetter Button)** ✅ ERLEDIGT (17.11.2025)
- **Problem**: Violetter "In Container füllen" Button öffnete keinen Dialog
- **Symptome**: 
  - Handler wurde ausgeführt, State aktualisiert (isOpen=true, item gesetzt)
  - AssignContainerDialog-Komponente wurde nie gerendert
  - Keine Console-Logs aus der Dialog-Komponente
- **Root Cause**: **Strukturfehler in inventory-management.tsx**
  - Komponente hatte **zwei return-Statements** (Zeile 928 und 1173)
  - Erstes return führte immer aus, zweites war **toter Code**
  - AssignContainerDialog war **nach dem zweiten return** platziert (Zeile 1481+)
  - **338 Zeilen toten Code** durch versehentliche Duplikation
- **Debug-Prozess**:
  - Console-Logs auf allen Ebenen: Handler ✓, Parent-Render ✓, Module-Load ✓
  - Component-Render fehlte komplett → Komponente nie aufgerufen
  - Test-Dialog (rotes Overlay) bestätigte: Code in toter Zone
  - Bewegung vor erstes return → **"das fenster ist jetzt da!"** (User-Zitat)
- **Lösung**:
  - AssignContainerDialog von Zeile 1481+ nach Zeile 1170 verschoben (vor erstes return)
  - Zweites return-Statement gelöscht
  - 338 Zeilen duplizierten Code entfernt
- **Ergebnis**: 
  - Dialog öffnet korrekt bei Button-Klick
  - 62 Container werden zur Auswahl angezeigt
  - Produkt-Zuordnung funktioniert einwandfrei
- **Technisch**: React stoppt Ausführung bei erstem return, alles danach ist unreachable code

### **FIX 5.9: Master QR Icon-System + Mazerat/Destillat-Badges** ✅ ERLEDIGT
- **Problem**: Icons zu generisch, Typ-Kennzeichnung (Mazerat/Destillat) fehlte
- **User-Quote**: "passendere icons... als die einheitlichen Fabrik-icons"
- **User-Quote**: "nun fehlt mir die vorher noch vorhandene unterscheidung Mazerat / Destillat"
- **Lösung**: 
  - **7 Icon-Kategorien** mit pattern-basierter Erkennung:
    - 🏭 T-Tanks (Industrielle Edelstahl-Tanks 500-5000L)
    - 🛢️ Fässer (Holz/Edelstahl-Fässer 100-300L)
    - ⚗️ Ballons (Bauchige Glasgefäße 25-100L, Labor-Kolben)
    - 🍶 Flaschen (Stehende schlanke Flaschen 1-10L)
    - 🧴 Kanister (Kubische Kunststoff-Kanister 5-25L)
    - 🧊 IBC/Container (Kubische Container 1000L)
  - **Mazerat-Badge**: 🌿 Mazerat (grün, inline)
  - **Destillat-Badge**: 💧 Destillat (orange, inline)
- **Icon-Korrekturen**:
  - v4: IBC/Container korrigiert (📦 → 🧊) - User: "falsch! IBC nutzen das kubische icon"
  - v5: Flaschen repariert (� → 🍶) - Emoji-Encoding-Fehler
- **Technisch**: Pattern Detection `/^T\s?\d+/`, `startsWith('Fass-')`, fallback auf containerType
- **Ergebnis**: Jeder Container-Typ visuell eindeutig, Mazerat/Destillat inline erkennbar

### **FIX 5.8: Alkoholgehalt & LA-Berechnung** ✅ ERLEDIGT
- **Problem**: Endless loading loop, "Cannot read properties of null"
- **Ursache**: Variable-Scope-Fehler (filledTanks/inventory nicht in sortTanks() erreichbar)
- **Lösung**: 
  - Scope-Fix mit `currentFilledTanks` und `currentInventory`
  - **Alkoholgehalt**: Gewichtetes Mittel `Σ(vol_i × alk_i) / Σ(vol_i)`
  - **L.A. (Liter Absolutalkohol)**: `Σ(vol_i × alk_i / 100)`
- **Display**: 🌡️ Alkoholgehalt: 42.50% vol | 💧 L.A.: 127.85L
- **Ergebnis**: Korrekte Durchschnittsberechnung, keine Scope-Fehler

### **FIX 5.7: Intelligentes Icon-Mapping** ✅ ERLEDIGT
- **Anforderung**: "wenn schon, dann ordentlich... passendere icons?"
- **Lösung**: Pattern-basierte Icon-Auswahl statt statischer Fabrik-Icons
- **Implementierung**: 
  ```javascript
  if (/^T\s?\d+/.test(tankId)) icon = '🏭';        // T-Tanks
  else if (tankId.startsWith('Fass-')) icon = '🛢️'; // Fässer
  else if (tankId.startsWith('B-')) icon = '⚗️';    // Ballons
  // ... 4 weitere Kategorien
  ```
- **Fallback**: `typeIcons[tank.containerType]` wenn ID-Pattern nicht matcht
- **Ergebnis**: 7 verschiedene Icons für 7 Container-Typen

### **FIX 5.6: Wahlweise Sortierung** ✅ ERLEDIGT
- **Anforderung**: "geht das auch noch wahlweise nach produkt?"
- **Lösung**: 2 Buttons (📦 Nach Gebindegröße | 🏷️ Nach Produkt)
- **Implementierung**: `window.sortTanks(mode)` + renderTanksGrid()
- **Button-Verhalten**: Aktiver Button blau (#2196f3), inaktiv grau (#9e9e9e)
- **Ergebnis**: User kann zwischen Kapazitäts- und Produkt-Sortierung wechseln

### **FIX 5.5: Automatische Tank-ID Migration** ✅ ERLEDIGT
- **Problem**: XLSX-Import erforderte manuelle Terminal-Workflow (Scripts, Git-Commands)
- **User-Szenario**: Jährlicher Inventur-Import (Zollamtliche Alkoholfeststellung) auf Remote-Computer ohne VS Code
- **User-Quote**: "ich muss dann immer wieder zu vs code zurück? kann man das anders lösen?"
- **Lösung**: Automatische Migration direkt in der App (inventory-management.tsx)
- **Funktion**: `autoMigrateTankIds()` - 100 Zeilen TypeScript
- **Strategie**: Least-filled-Tank-Verteilung (intelligente Zuordnung)
- **Workflow NEU**:
  1. XLSX importieren
  2. App erkennt generische IDs ("Fass", "B", etc.)
  3. Migration läuft automatisch
  4. Toast: "✅ 41 Items automatisch korrigiert"
- **Technisch**: Pattern Detection `/^(.+)-(\d+)$/`, Round-Robin-Assignment, hybridStorage auto-save
- **Status**: Code implementiert, hybridStorage funktioniert, GitHub-Sync folgt

### **FIX 5.4: Master QR GitHub-Sync** ✅ ERLEDIGT
- **Problem**: Migrierte Tank-IDs nur lokal, Master QR zeigte alte Daten von GitHub Pages
- **Lösung**: `scripts/sync-to-github.js` - Sync local storage → docs/app-data.json
- **Workflow**: Node-Script → Git commit → Push → GitHub Pages Deployment
- **Ergebnis**: Master QR zeigt korrekte individuelle Container (Fass-1, B-12, etc.)
- **Nächster Schritt**: Automatisierung via app-auto-sync.ts (Teil von FIX 5.5)

### **FIX 5.3: Master QR Sortierung** ✅ ERLEDIGT
- **Anforderung**: Sortierung nach Kapazität (groß → klein), dann nach Produktname
- **Lösung**: 2-stufige Sort-Funktion in `tank-viewer-secure.html`
- **Primär**: Füllmenge DESC (T-Tanks 5000L → Ballons 25L)
- **Sekundär**: Produktname ASC (Baldrian, Königskerze, Salbei, ...)
- **Ergebnis**: Große Tanks erscheinen zuerst, alphabetisch bei gleicher Kapazität

### **FIX 5.2: Container-Aggregation behoben** ✅ KRITISCH BEHOBEN
- **Problem**: Fass-1, Fass-2, Fass-3 wurden als "Fass" aggregiert (847% Füllstand!)
- **Ursache**: Inventory-Items hatten generische `tankNr: "Fass"` statt eindeutige IDs
- **Filter-Bug**: `item.tankNr === tank.tankNr` (generic) statt `item.tankNr === tank.id` (unique)
- **Lösung 1**: Migration-Script `scripts/migrate-tank-ids.js` (41 Items konvertiert)
- **Lösung 2**: Filter-Logik korrigiert (tank.id hat Priorität)
- **Lösung 3**: Backup erstellt (`mazerations-storage.backup-*.json`)
- **Ergebnis**: Jeder Container zeigt nur seinen eigenen Inhalt
- **Test**: PowerShell-Verifizierung → Königskerze in Fass-1, T 1536, Fl-1, B-1 ✅

### **FIX 5.1: Master QR "Keine Tank-Nummer angegeben"** ✅ ERLEDIGT
- **Problem**: Master QR (`?view=all`) zeigte Alert statt Container-Liste
- **Ursache**: `if (!tankNr)` check VOR `if (viewMode === 'all')` check
- **Lösung**: View-Mode-Check FIRST, tankNr nur für Einzelansicht erforderlich
- **Code**: Early return bei `viewMode === 'all'` (kein tankNr nötig)
- **Ergebnis**: Master QR lädt Container-Übersicht korrekt

### **FIX 4.1: QR-Code ID-Zuordnung** ✅ KRITISCH BEHOBEN
- **Problem**: Alle 25 B-Tanks hatten gleiche URL "tank=B" → QR-Viewer zeigte 651.4L aggregiert
- **Lösung**: QR-Codes verwenden jetzt `tank.id` (eindeutig) statt `tank.tankNr` (Kategorie)
- **Stellen**: 6 Korrekturen (generateQRCode, Batch-Gen, Print-HTML, PDF-Download, Dialog, Batch-Display)
- **Ergebnis**: Jeder Container hat eindeutige URL (B-1, B-25, Fass-4, etc.)

### **FIX 3.1: TODO-Liste Persistenz** ✅ TEILWEISE BEHOBEN
- **Problem**: TODO-Liste ging nach Neustart verloren
- **Lösung**: Nutzt hybridStorage → automatischer Upload zu GitHub
- **Workflow**: Lokal → hybridStorage → app-auto-sync → GitHub Pages → andere Rechner
- **Status**: In Code implementiert, muss in finaler EXE getestet werden

### **FIX 2.1: GitHub-Integration redundant** ✅ ERLEDIGT
- **Problem**: GitHub-Token in Gebindeverwaltung UND Einstellungen
- **Lösung**: GitHub-Integration nur noch zentral in Einstellungen (~150 Zeilen entfernt)
- **Ergebnis**: Keine Duplikate mehr, klarere UX

### **FIX 1.9: Umfüllen & Verschicken** ❌ ZURÜCKGESTELLT
- **Problem**: Bidirektionales Transfer-System zeigt keine Tanks zur Auswahl
- **Status**: Dokumentiert in `docs/CONTAINER_TRANSFER_REFACTORING.md`
- **Workaround**: Lila Button in Lagerverwaltung funktioniert weiterhin perfekt!
- **Plan**: 5-Phasen Refactoring nach Production-Testing

## 📚 Neue Dokumentation

- **`docs/GITHUB_SYNC_DOKUMENTATION.md`** - Komplette Sync-Übersicht
  - Was wird synchronisiert (Gebinde, Inventar, TODOs, Kalender, Protokolle)
  - Was NICHT synchronisiert wird (GitHub-Token, lokale Einstellungen)
  - Workflow-Diagramme, Konflikt-Behandlung, Troubleshooting
  - Ersteinrichtung für mehrere Rechner

- **`docs/CONTAINER_TRANSFER_REFACTORING.md`** - FIX 1.9 Strategie
  - 5-Phasen Refactoring-Plan
  - Debug-Strategien
  - Alternative Ansätze

- **`FIXES_SUMMARY.md`** - Alle Bug-Fixes dokumentiert
### **0. Reichweitenanalyse** 📋 OFFEN - Hohe Priorität (geplant Q1 2026)
**Status:** 📋 Konzept erstellt (22.11.2025)  
**Dokumentation:** [docs/REICHWEITENANALYSE_KONZEPT.md](docs/REICHWEITENANALYSE_KONZEPT.md)

**Ziel:** Prognose der Reichweite von Mazeraten, Destillaten und GFKC-Vorräten bei geplanter Jahresproduktion.

**Kernfunktionen:**
- Eingabe: Musterrezeptur, Jahresabsatz, GFKC-Lagerbestände (intern + Lohnabfüller)
- Berechnung: Gesamtreichweite in Tagen/Jahren
- Engpass-Erkennung: Welche Zutaten werden zuerst knapp?
- Komponenten-Details: Tabelle mit Reichweite pro Zutat
- Verbrauchsprognose: Chart mit zeitlicher Entwicklung
- Empfehlungen: Welche Komponenten nachproduzieren?
- **Multi-Rezeptur-Support:** Mehrere Produkte parallel (GFKC, GFKC-A, GFKC-K)
- **Produktionsauftrag-Simulation:** Verfügbarkeit prüfen + Reichweiten-Impact

**UI-Features:**
- Neue Seite `/reichweite`
- 3-Spalten-Layout: Konfiguration | Vorräte | Ergebnisse
- Fortschrittsbalken (Grün/Gelb/Orange/Rot)
- Interaktives Verbrauchsdiagramm (recharts)
- Status-Indikatoren (✅⚠️🔴) für Komponenten
- **Umfassende Export-Funktionen:** PDF, Excel (XLSX), CSV, E-Mail

**Implementierungsphasen:**
- [ ] Phase 1: Grundfunktionalität (4-6h) - Berechnung + Eingabe
- [ ] Phase 2: Datenintegration (2-3h) - Lager + Rezepte anbinden
- [ ] Phase 3: Visualisierung (3-4h) - Charts + Fortschrittsbalken
- [ ] Phase 4: Multi-Rezeptur + Was-wäre-wenn (4-6h)
- [ ] Phase 5: Export & Reporting (3-4h) - PDF/Excel/CSV/E-Mail
- [ ] Phase 6: Produktionsauftrag-Simulation (3-4h) - Vereinfacht, ohne Anbauplanung

**Geschätzte Gesamtdauer:** 21-29 Stunden (MVP: 13-17h ohne Phase 4+6)

**Scope-Entscheidungen:**
- ✅ Reichweitenberechnung + Visualisierung
- ✅ Multi-Rezeptur-System (evolutionär)
- ✅ Produktionsauftrag-Simulation (vereinfacht)
- ✅ Umfassende Export-Funktionen
- ❌ KEINE Anbauplanung (zu komplex, Datenoverkill vermieden)
- ❌ KEINE Kalender-Integration für Pflanzungen

**Erweiterungsideen (Zukunft):**
- Automatische Bestellvorschläge
- Lohnabfüller-Portal (direkter Zugriff)
- KI-Prognose (historische Daten, Saisonalität)
- Mobile Benachrichtigungen bei kritischen Wertennden

**Erweiterungsideen (Zukunft):**
- Automatische Bestellvorschläge
- Produktionskalender (optimaler Zeitpunkt)
- Lohnabfüller-Portal (direkter Zugriff)
- KI-Prognose (historische Daten, Saisonalität)
- Mobile Benachrichtigungen bei kritischen Werten
- Kostenrechnung & Break-Even-Analyse

### **1. Production Testing** (Höchste Priorität - JETZT!)
- ✅ QR-Codes mit eindeutigen IDs testen (FIX 4.1)
- ✅ TODO-Liste Persistenz in EXE testen (FIX 3.1)
- ⏳ Stress-Tests (500+ Gebinde, 1000+ Einträge)
- ⏳ Browser-Kompatibilität (Safari, Firefox, Mobile)
- ⏳ Offline-Szenarien testen
- ⏳ Performance-Profiling
- ⏳ Beta-Test mit Brennereien
- **Alle Bugs finden & dokumentieren**
- **Bug-Fixes komplett abschließen**

### **2. Impressum erstellen** (Rechtlich erforderlich!)
- Betreiber/Kontakt gemäß §5 TMG
- Haftungsausschluss, Datenschutzhinweis
- Web: /impressum Seite
- Desktop: Hilfe → Impressum Dialog

### **3. Versionsgeschichte dokumentieren** (Mittel)
- CHANGELOG.md im "Keep a Changelog" Format
- Alle Features seit Projektbeginn
- Breaking Changes dokumentieren

### **4. Gebindeverwaltung erweitern** (nach Bugfixes!)
- Behälter-Status: Leer, Belegt, Außer Haus, Leihgabe
- Bemerkungsfeld für Leihgaben
- Tracking von Außer-Haus-Gebinden
- Historie pro Gebinde
- **Backend ~60% fertig** (Status-Schema, Historie-Tracking vorhanden)
- **UI fehlt komplett** (Detail-Ansicht, Status-Dropdown, Filter)

### **5. XLSX Export für Rezepturen** (Niedrig)
- Export von Rezepturen
- Import-Funktion für Bulk-Updates
- User-Request aus ursprünglicher Roadmap

##  Q1 2026 - Erweiterte Features

### **6. Benachrichtigungssystem**
- Mazerat-Fertigstellung Erinnerungen
- Lagerstands-Warnungen bei Mindestmenge
- Integration mit Google Calendar (optional)

### **7. Analytics & Reporting**
- Füllstand-Historie und Trends
- Verbrauchsanalysen
- Produktionsberichte

##  Technische Notizen

**Branch:** pages-clean (Production)  
**Build:** node scripts/build-ultra-minimal.js (läuft gerade)  
**Storage:** hybridStorage (Electron IPC + localStorage)  
**Sync:** GitHub Pages als zentrales Werkzeug (nicht OneDrive!)  
**App-Größe:** 294 MB portable (196 MB exe)  
**Container:** 57 mit eindeutigen IDs (B-1 bis B-25, Fass-1 bis Fass-6, T-Tanks)

## 🎯 Nächste Schritte

1. **EXE Build abschließen** (läuft gerade)
2. **QR-Code Fix testen** - Jeder Container hat eindeutige URL
3. **TODO-Liste Persistenz testen** - Bleibt nach Neustart erhalten
4. **GitHub-Sync testen** - Zwischen 2 Rechnern synchronisieren
5. **Production Testing starten** - Alle Features im realen Einsatz prüfen

---
**Quelle:** docs/ROADMAP.md (letzte Aktualisierung: 11.11.2025)  
**Letzte Änderungen:** FIX 5.9 (Icon-System + Badges), FIX 5.8 (Alkoholgehalt/LA), FIX 5.7 (Icon-Mapping)
