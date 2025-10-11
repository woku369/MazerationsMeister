# MazerationsMeister - Roadmap# MazerationsMeister - Roadmap & Entwicklungsplan



**Stand:** 11. Oktober 2025  **Letzte Aktualisierung:** 11.11.2025  

**Version:** 1.1.0 (Production Ready)  **Version:** 1.6.0 (In Development)  

**Status:** ✅ Komplett funktionsfähig**Status:** 🚧 Rezepturen-System in Entwicklung



------



## 📋 Übersicht## 🚀 Aktuelle Entwicklungsphase



Der MazerationsMeister ist eine professionelle Desktop-Anwendung für Destillerien und Likörhersteller zur Verwaltung von Mazerationsprozessen, Lagerbeständen und Tank-Management.### Phase 5: Rezepturen-System (In Arbeit - November 2025) 🧪



### **Aktuelle Hauptfunktionen:****Feature-Beschreibung:** Vollständiges System zur Verwaltung von Produktrezepturen für die Mischung mehrerer Komponenten zu Endprodukten (z.B. GFKC aus 10-12 Komponenten)

- ✅ **Mazeration-Protokolle** - Vollständige Prozess-Dokumentation mit automatischen Berechnungen

- ✅ **Lagerverwaltung** - Artikel-Stammdaten, Chargen, Transaktionen, Bestandsübersichten**Completed Foundational Work (11.11.2025):**

- ✅ **Tank-Management** - QR-Code-System für mobile Tank-Abfragen- ✅ **Datenmodell mit Zod-Schemas** (`src/schemas/rezepturSchema.ts`)

- ✅ **Rezeptur-System** - Excel-Style Editor für Produkt-Rezepturen (v1.1.0)  - RezepturKomponenteSchema: Komponenten mit Liter/Prozent-Input und Berechnungen

- ✅ **PDF-Exporte** - Protokolle, Lagerstände, Produktions-Checklisten  - SensorikBewertungSchema: Bewertungen 1-10, Notizen, Freigabe-Flag

- ✅ **Hybrid Storage** - localStorage + Electron Persistent Storage  - RezepturSchema: Vollständige Rezeptur mit Komponenten, Ergebnissen, Status-Workflow

  - Status-Enum: entwurf → test → freigegeben → produziert → archiviert

---  - Varianten-Support (Version A, B, C)



## ✅ Abgeschlossene Entwicklung (v0.1.0 - v1.1.0)- ✅ **Business Logic & Calculations** (`src/lib/rezeptur-manager.ts`)

  - berechneKomponente(): Liter↔Prozent Konvertierung, LA-Berechnung

### **Phase 1: Grundfunktionen** (Abgeschlossen)  - berechneRezeptur(): Gewichteter %vol Durchschnitt

- Dashboard mit Kennzahlen und Statistiken  - skaliereRezeptur(): Skalierung von 1L Test → 500L Produktion mit Verfügbarkeitsprüfung

- Lagerhaltung und Bestandsführung  - validiereRezeptur(): Konsistenzprüfung

- PDF-Exporte für Protokolle  - CRUD Operations: erstelle, fuegeHinzu, entferne, aktualisiere

- Sidebar-Navigation und UI-Framework

- ✅ **Main Page - Rezepturen-Übersicht** (`src/app/rezepturen/page.tsx`)

### **Phase 2: QR-Code System** (Abgeschlossen)  - Card-Grid mit Rezeptur-Übersicht

- QR-Code-Generierung für Tanks  - Suche und Status-Filter

- Mobile Tank-Detail-Seiten mit Offline-Funktionalität  - localStorage-Integration

- Automatische Tank-Synchronisation  - Navigation zum Editor

- OneDrive-Backup-Integration (lokal, ohne Azure)

- ✅ **UI-Integration**

### **Phase 3: System-Stabilisierung** (Abgeschlossen - Oktober 2025)  - Sidebar-Menüpunkt "Rezepturen" mit Beaker-Icon

- Hybrid Storage System (localStorage + Electron)  - app-data.ts erweitert mit rezepturen: Rezeptur[]

- Kritische Produktionsfehler behoben  - Navigation positioniert zwischen Gebindeverwaltung und QR-Album

  - Datenpersistenz vollständig funktionsfähig

  - Lagerbewegungen aktualisieren UI korrekt- ✅ **Feature-Dokumentation** (`REZEPTUREN_FEATURE.md`)

  - Chargen-Übersicht UX optimiert (Sticky Actions)  - Vollständige Workflow-Dokumentation

- GitHub Pages Integration (`pages-clean` Branch)  - Datenmodell-Referenz

- Build-System stabilisiert (Portable EXE funktioniert)  - Berechnungslogik-Erklärungen

  - UI-Spezifikationen

### **Phase 4: QR-System Perfektionierung** (Abgeschlossen - 05.10.2025)  - Implementierungs-Roadmap

- Master-QR-Code für Container-Gesamtübersicht

- Grid-Layout mit intelligenter Sortierung**In-Progress Work:**

- Container-Indexierung (Fass-1, B-2, etc.)- 🚧 **Rezeptur-Editor** (`src/app/rezepturen/[id]/page.tsx`)

- Kategorie-Integration (Mazerat/Destillat)  - Excel-Style Komponenten-Tabelle mit Dropdown für Inventory-Items

- QR-Album Verbesserungen  - Liter/Prozent Toggle pro Zeile mit Live-Berechnung

- Datenstruktur-Fixes (904L Bug behoben)  - Anzeige von berechneten Werten (Liter, %, %vol, LA)

  - Add/Remove Komponenten-Buttons

### **Phase 5: Rezeptur-System** ✅ (Abgeschlossen - 11.10.2025)  - Verfügbarkeits-Indikatoren aus Inventory



**Das komplette Rezeptur-System ist fertig!** Siehe [REZEPTUR_MEILENSTEIN.md](./REZEPTUR_MEILENSTEIN.md) für Details.**Pending Features:**

- [ ] **Sensory Evaluation Component**

#### **Implementierte Features:**  - Bewertungsskala 1-10 für verschiedene Kriterien

- ✅ **Rezeptur-Editor** (1439 Zeilen, Excel-Style)  - Notizen und Approval-Flag

  - Inventory-Integration mit Dropdown  - Integration in Rezeptur-Workflow

  - Freie Zutaten (Freitext: Wasser, Zucker, etc.)

  - Editierbarer Alkoholgehalt pro Komponente- [ ] **Scaling & Availability Check**

  - Auto-Berechnung (Liter, %, %vol, LA)  - Skalierungs-Dialog (1L → 500L)

    - Verfügbarkeitsprüfung gegen aktuelles Inventory

- ✅ **Intelligente Mengen-Anzeige**  - Warnungen bei unzureichenden Beständen

  - ≤ 2L: Anzeige in **ml** (Testmischungen)

  - > 2L: Anzeige in **L** (Produktionsmengen)- [ ] **Production Checklist**

  - Deutsche Formatierung (Komma statt Punkt)  - PDF/Excel-Export mit Arbeitsanweisungen

  - Checkliste für manuelle Produktion

- ✅ **Alkohol-Korrektur**  - KEINE automatische Inventory-Buchung (bewusste Design-Entscheidung)

  - Wasser/Sprit-Korrektur bei Abweichungen

  - Gemessener vs. Ziel-Alkoholgehalt- [ ] **XLSX Export**

  - Automatische Mengen-Berechnung  - Export von Rezepturen für externe Bearbeitung

  - Import-Funktion für Bulk-Rezeptur-Updates

- ✅ **Workflow-Status**  - Archivierung und Versionierung

  - 5 Status-Checkboxen (Entwurf → Freigabe → Produktion → Fertig → Archiv)

  - Visuelle Fortschritts-Anzeige**Key Design Decisions:**

- ✅ **NO Automatic Inventory Booking**: Manuelle Workflow-Bestätigung via Checkliste

- ✅ **Produktions-Protokoll**- ✅ **Variants Support**: Rezeptur-Versionen A, B, C für Iterationen

  - Druckbares A4-Protokoll- ✅ **Offline-First**: localStorage mit GitHub-Sync

  - SOLL/IST-Werte mit Abweichungen- ✅ **Single-File Storage**: Integration in app-data.json

  - Summenzeile mit Gesamt-%vol- ✅ **Client-Side Only**: Keine Server-Anforderungen

  - Sensorik-Bereich (karierte Notiz-Box)

**User Requirements:**

- ✅ **Datenmodell & Business Logic**1. "Varianten wären schon brauchbar" → Versionierung implementiert ✅

  - Zod-Schemas für Validierung2. "KEINE automatischen Buchungen" → Manueller Workflow via Checkliste ✅

  - Rezeptur-Manager mit CRUD-Operationen3. "Sensorikbewertungen im System zu haben" → Schema vorhanden, UI pending

  - Persistent Storage via hybridStorage4. "Ein xlsx-export ist nie ganz verkehrt" → Pending implementation



#### **Behobene Bugs:****Workflow:**

- Storage-Problem (Editor → hybridStorage, Liste gefixet)```

- %vol Summenzeile (×100 fehlte)1. Entwurf erstellen (10-12 Komponenten aus Inventory)

- Alkohol-Button disabled Prop2. Test-Batch (1L) mit Berechnungen

- TypeScript Errors (5×)3. Sensory Evaluation nach Test

- Protokoll deutsche Formatierung4. Varianten erstellen (A, B, C)

5. Freigabe bei erfolgreichem Test

---6. Skalierung auf Produktionsmenge (500L)

7. Verfügbarkeitsprüfung

## 🚀 Geplante Entwicklung8. Produktion mit Checkliste (manuell)

9. Archivierung nach Produktion

### **Phase 6: Rezeptur-Erweiterungen** (Geplant)```



#### **XLSX Export für Rezepturen** (Hohe Priorität)---

- Export von Rezepturen für externe Bearbeitung

- Import-Funktion für Bulk-Rezeptur-Updates## ✅ Abgeschlossene Phasen4. ✅ Berechnungsprüfung - Validierung aller Berechnungen und automatisierte Tests.

- User-Request: "Ein xlsx-export ist nie ganz verkehrt"

5. ✅ Exporte (PDF) der P  - PDF-Export mit mehreren QR-Codes

#### **Varianten-Verwaltung** (Mittlere Priorität)

- Rezeptur-Versionen (A, B, C) für Iterationen### Phase 1: Grundfunktionen (Abgeschlossen)  - "Alle auswählen/aufheben" Funktionalität

- Vergleichs-Ansicht zwischen Varianten

- Versionierungs-Historie- ✅ Dashboard mit Kennzahlen und Statistiken  - Print-optimiertes Layout für Etikettendruck



### **Phase 7: Container-ID System** (Hohe Priorität)- ✅ Lagerhaltung und Bestandsführung



**Problem:** Mehrere Produkte pro Behälter-Typ (z.B. 4× "B"-Glasballon)- ✅ Definition der Lagerbehälter (Import aus XLSX)##### SOFORT-MASSNAHMEN-PLAN:nd Lagerdaten - PDF-Export für Protokolle, Lagerstände und Bewegungen.



**Lösung:** Dynamische Container-Nummerierung- ✅ PDF-Exporte für Protokolle und Lagerstände6. ✅ Lagerhaltung und Lagerstände - Erweiterung der Lagerlogik und Bestandsführung.

- Schema: `{Typ}-{Nummer}` (z.B. "B-001", "Fl-012", "Fass-005")

- Migration existierender Container- ✅ Sidebar-Navigation und UI-Framework7. ✅ Definition der Lagerbehälter (Import aus XLSX) - Importfunktion für Behälterdefinitionen aus Excel.

- QR-Codes für eindeutige Container-IDs

8. ✅ QR-Codes für Behälter, Lagerstand über QR abrufbar - Generierung und Scan-Funktion für QR-Codes.

**Erweiterte Funktionen:**

- Behälter-Status: Belegt, Leer, Außer Haus, Leihgabe, Defekt### Phase 2: QR-Code System (Abgeschlossen)

- Bemerkungsfeld (z.B. "Leihgabe von Brennerei X")

- Bulk-Container-Registrierung- ✅ QR-Code-Generierung für Tanks und Container### Phase 2: QR-Code System & Mobile Optimierung ✅

- Außer-Haus-Tracking für Transport

- ✅ Mobile Tank-Detail-Seiten mit PIN-Schutz

### **Phase 8: QR-Code Batch-Druck für Chargen** (Mittlere Priorität)

- ✅ Direktbearbeitung via Smartphone#### QR-Code Tank-Management ✅

**User-Request:** Mehrfachauswahl für QR-Code-Generierung

- ✅ Automatische Tank-Synchronisation- ✅ QR-Code-Generierung für ausgewählte Tanks

**Features:**

- Checkbox-Auswahl in Chargen-Tabelle- ✅ OneDrive-Synchronisation für lokale Backups- ✅ Mobile Tank-Detail-Seiten 

- Multi-Select für QR-Code Generierung

- PDF-Export mit mehreren QR-Codes- ✅ Direktbearbeitung von Füllstand und Inhalt via Smartphone

- Print-optimiertes Etiketten-Layout

- "Alle auswählen/aufheben" Funktionalität### Phase 3: System-Stabilisierung (Abgeschlossen - Oktober 2025)- ✅ Automatische Tank-Synchronisation aus Lagerbestand



### **Phase 9: Performance-Optimierung** (Niedrige Priorität)- ✅ Hybrid Storage System (localStorage + Electron)- ✅ Print-optimierte QR-Code-Ausgabe



#### **App-Größe reduzieren**- ✅ Kritische Produktionsfehler behoben- ✅ Tank-Content-Manager mit dynamischer Chargen-Verwaltung

- Aktuell: ~6GB portable EXE

- Ziel: <1GB  - Datenpersistenz vollständig funktionsfähig- ✅ OneDrive-Synchronisation für lokale Backups ohne Azure-Registrierung

- Webpack Tree-shaking implementieren

- node_modules Cleanup  - Lagerbewegungen aktualisieren UI korrekt

- Asset-Optimierung

  - Chargen-Übersicht UX optimiert (Sticky Actions)#### System-Bereinigung ✅

#### **Build-Performance**

- Build-Zeit von 83s auf <30s reduzieren- ✅ GitHub Pages Integration (`pages-clean` Branch)- ✅ **Entfernung veralteter Implementierungen:** 

- Incremental Builds

- Cache-Strategien- ✅ Build-System stabilisiert (Portable EXE funktioniert)  - Ngrok-Integration entfernt



### **Phase 10: Erweiterte Features** (Niedrige Priorität)  - Cloud-Services-Integration vereinfacht



#### **Single-File Auto-Sync zwischen Rechnern**### Phase 4: QR-System Perfektionierung (Abgeschlossen - 05.10.2025)  - Azure-Abhängigkeiten entfernt

- `docs/app-data.json` für alle App-Daten

- GitHub Auto-Sync (60 Min. Intervall)- ✅ **Master-QR & Container-Übersicht**  - Komplexe Sync-Mechanismen reduziert

- Conflict-Resolution UI

- Multi-Rechner Workflow  - Master-QR-Code für Gesamtübersicht aller Container- ✅ **Fokus auf lokale OneDrive-Synchronisation:**



#### **Google Calendar Integration**  - Grid-Layout mit intelligenter Sortierung  - Automatische Backup-Erstellung

- Automatische Kalender-Erinnerungen

- Mazerat-Fertigstellung Notifications  - Container-Indexierung (Fass-1, B-2, etc.)  - Keine Azure-Registrierung erforderlich

- Event-Titel mit Tank-ID & Produkt

- Push/E-Mail Benachrichtigungen    - Vereinfachte Daten-Synchronisation



#### **Analytics Dashboard**- ✅ **QR-Album Verbesserungen**

- Füllstand-Historie und Trends

- Verbrauchsanalysen pro Tank  - Eindeutige Container-Labels### Phase 3: KRITISCHE SYSTEM-BEREINIGUNG 🔴 DRINGEND

- Optimierungsvorschläge

- Bestandsberichte nach Kategorien  - Produktnamen statt Container-Typ



#### **Progressive Web App (PWA)**  - Kategorie-Integration (Mazerat/Destillat)#### Identifizierte Probleme (September 2025)

- Installierbar auf Smartphone

- Offline-First Funktionalität  - Präzise Volumenangaben (1 Nachkommastelle)1. **Inkonsistente Tank-IDs:** 

- Push-Notifications für Tank-Updates

- Touch-optimierte UI-Elemente     - QR-Code generiert "tank-fwdgp3bqt" 



---- ✅ **Datenstruktur-Fixes**   - System erwartet "T341"



## 📊 Changelog  - Container-Gruppierung nach `container.id`   - tank-offline.html kann Tank nicht finden



### **v1.1.0 (11. Oktober 2025) - Rezeptur-Meilenstein** 🎉  - Index-basierte Inventory-Zuordnung



**Major Features:**  - Füllstandsbalken mit Farbcodierung2. **Doppelte Token-Verwaltung:**

- Rezeptur-System komplett implementiert (1439 Zeilen)

- Excel-Style Editor mit Inventory-Integration  - "Auto-erkannt:" Prefix entfernt   - Einstellungen → QR-Codes → Token-Eingabe

- Intelligente ml/L Anzeige (≤2L=ml, >2L=L)

- Alkohol-Korrektur (Wasser/Sprit 60%vol)   - Einstellungen → GitHub Integration → Token-Eingabe

- Workflow-Status Checkboxen

- Druckbares Produktions-Protokoll (A4, dt. Format)---   - Verwirrende UX, keine Synchronisation

- IST-Werte Übernahme

- Sensorik-Bereich (karierte Notiz-Box)



**Fixes:**## 🚀 Aktuelle Entwicklungsphase3. **Mehrfache QR-Code Implementierungen:**

- Storage-Problem (Editor → hybridStorage, Liste gefixet)

- %vol Summenzeile (×100 fehlte)   - Tank-Verwaltung (unter QR-Codes) → localhost URLs

- Alkohol-Button disabled Prop

- TypeScript Errors (5×)### Phase 5: Production Deployment & Optimierung (In Arbeit)   - Tank-Inhalte → GitHub Pages URLs

- Protokoll deutsche Formatierung

   - Verschiedene Parameter-Schemas

**Build:**

- Erfolgreiche Kompilierung (10.0s)#### 5.1 Performance-Optimierungen (Niedrige Priorität)

- EXE Build: 230.19 MB (83.6% Größen-Reduktion)

- Alle Features funktionsfähig- [ ] **App-Größe reduzieren**4. **Navigations-Inkonsistenz:**



**Commits:**  - Ziel: Von ~6GB auf <1GB   - Kein direkter "Inventory" Menüpunkt

- `ab99e68` - Meilenstein: Rezeptur-System Komplett

- `909138b` - Version 1.1.0  - Webpack Tree-shaking implementieren   - Tank-Management unter "Einstellungen" versteckt



---  - node_modules Cleanup   - Benutzer findet Funktionen nicht



### **v1.0.x (September - Oktober 2025)**  - Asset-Optimierung



#### **v1.5.0 (05.10.2025) - QR-System Perfektionierung**  #### BEREINIGUNGSSTRATEGIE (Priorität: KRITISCH)

- Master-QR & Container-Übersicht

- QR-Album Verbesserungen (Labels, Kategorien)- [ ] **Build-Performance**

- Container-Indexierung (Fass-1, B-2, etc.)

- Intelligente Container-Sortierung  - Build-Zeit von 83s auf <30s##### Schritt 1: Tank-ID Normalisierung ⚡ SOFORT

- 904L Summations-Bug behoben

- GitHub Pages Integration stabilisiert  - Incremental Builds- [ ] Alle Tank-IDs auf einheitliches Format (T341, T349, etc.)



#### **v1.4.0 (01.10.2025) - Kritische Produktionsfehler behoben**  - Cache-Strategien- [ ] QR-Code Parameter-Mapping korrigieren

- Datenpersistenz vollständig repariert

- Lagerbewegungen aktualisieren UI korrekt- [ ] tank-offline.html Tank-Lookup reparieren

- Chargen-Übersicht UX optimiert (Sticky Actions)

#### 5.2 Feature-Enhancements (Mittlere Priorität)- [ ] Konsistenz zwischen allen Komponenten sicherstellen

#### **v1.3.0 (24.09.2025) - Hybrid Storage & Build-System**

- Hybrid Storage System implementiert- [ ] **QR-Code Batch-Druck für Chargen**

- Tank Auto-Sync modernisiert

- QR-Code Druckfunktion  - Checkbox-Auswahl in Chargen-Tabelle##### Schritt 2: Token-Management Vereinheitlichung ⚡ SOFORT  

- Portable Build erfolgreich (83s)

  - Multi-Select für QR-Code Generierung- [ ] Single-Point-of-Truth für GitHub Token

#### **v1.2.0 (September 2025) - System-Bereinigung**

- OneDrive-Integration ohne Azure  - PDF-Export mit mehreren QR-Codes- [ ] Automatische Synchronisation zwischen Komponenten

- Veraltete Cloud-Services entfernt

- Code-Cleanup und Vereinfachung  - Print-optimiertes Etiketten-Layout- [ ] Entfernung redundanter Token-Eingabefelder



---  - [ ] Event-basierte Token-Updates



## 🎯 Nächste Schritte (Priorisiert)- [ ] **Erweiterte Storage-Verwaltung**



### **Sofort (nach v1.1.0)**  - Automatische Backup-Erstellung (täglich/wöchentlich)##### Schritt 3: QR-Code Konsolidierung ⚡ HEUTE

1. ✅ ~~Dokumentation aktualisieren~~ (Diese Roadmap!)

2. ⏳ XLSX Export für Rezepturen implementieren  - Import/Export von kompletten Datensets- [ ] Eine einzige QR-Code Komponente

3. ⏳ Container-ID System planen

  - Storage-Verwendungs-Analytics- [ ] Einheitliche URL-Generierung (GitHub Pages)

### **Diese Woche**

1. Rezeptur-System in Produktion testen- [ ] Entfernung localhost-basierter QR-Codes  

2. User-Feedback sammeln

3. Bug-Fixes falls nötig---- [ ] Konsistente Parameter-Übertragung



### **Nächster Monat**

1. Container-ID System implementieren

2. QR-Code Batch-Druck für Chargen## 📋 Geplante Features##### Schritt 4: Navigation Restrukturierung ⚡ HEUTE

3. Performance-Optimierung starten

- [ ] "Inventory" als Haupt-Menüpunkt

---

### Phase 6: Container-Management Erweitert (Hohe Priorität)- [ ] Tank-Management direkt zugänglich  

## 📝 Technische Hinweise

- [ ] Logische Gruppierung der Funktionen

### **Branch-Strategie**

- **`pages-clean`**: Production Branch für GitHub Pages#### 6.1 Eindeutige Container-IDs- [ ] Benutzerfreundliche Struktur

- Alle QR-Codes zeigen auf GitHub Pages URLs

**Problem:** Mehrere Produkte pro Behälter-Typ (z.B. 4 verschiedene Produkte in "B"-Containern)  

### **Build-Prozess**

```bash**Lösung:** Dynamische Container-Nummerierung##### Schritt 5: Testing & Validation ⚡ HEUTE

# Development Build

npm run build- [ ] Ende-zu-Ende QR-Code Test



# Portable EXE Build- [ ] **Automatische Container-Nummerierung**- [ ] Mobile Offline-Funktionalität validieren

node scripts/build-ultra-minimal.js

```  - Schema: `{Typ}-{3-stellige Nummer}` (z.B. "B-001", "Fl-012")- [ ] Token-Synchronisation testen



### **Storage-System**  - Migration bestehender Container- [ ] Alle Tank-IDs durchprüfen

- Desktop: Electron Persistent Storage (IPC-basiert)

- Browser: localStorage als Fallback  - Flexible Erweiterung für neue Container

- Auto-Migration zwischen Systemen

  ### Phase 4: QR-CODE SYSTEM REDESIGN 🔄 STRATEGISCHE NEUAUSRICHTUNG

### **Debugging**

- Storage Debug Tools in: Einstellungen → "Storage Debug"- [ ] **Container-Status-Management**

- Tank Debug Utility für Sync-Probleme

- DevTools Console für Branch-Validation  - Status: "Belegt", "Leer", "Außer Haus", "Leihgabe", "Defekt"#### PROBLEM-ANALYSE: Aktueller QR-Code Ansatz



---  - Farbcodierung in Übersichten**Aktuelles System (fehlerhaft):**



## 📊 Erfolgsmetriken  - Filter-Funktionen (z.B. "Zeige alle leeren Fässer")- ❌ Dynamische QR-Codes mit komplexen URL-Parametern (dataUrl, backupUrl, fallbackUrl)



### **Systemstabilität**  - ❌ QR-Codes müssen bei jeder Synchronisation neu generiert werden

- ✅ 0 kritische Bugs in Production (v1.1.0)

- ✅ Datenpersistenz 100% zuverlässig- [ ] **Erweiterte Behälter-Verwaltung**- ❌ Backup-URL-Logik führt zu 404-Fehlern bei GitHub Pages Deployment-Verzögerungen

- ✅ QR-Code System vollständig funktionsfähig

- ✅ Build-Prozess fehlerfrei  - Bemerkungsfeld (z.B. "Leihgabe von Brennerei X")- ❌ Komplexe Fehlerbehandlung mit mehreren Datenquellen



### **Benutzerfreundlichkeit**  - Außer-Haus-Tracking für Transport- ❌ Unpraktisch: QR-Codes können nicht dauerhaft an Tanks befestigt werden

- ✅ Rezeptur-Editor intuitiv bedienbar

- ✅ QR-Album optimiert für Tablet/Smartphone  - Bulk-Container-Registrierung

- ✅ Master-View übersichtlich und sortiert

- ✅ Container eindeutig identifizierbar  - QR-Code Bulk-Generierung (Fass-001 bis Fass-010)**Erkannte Schwachstellen:**



### **Performance**- Tank T 341 QR-Code bringt "nicht gefunden" obwohl Daten korrekt synchronisiert

- ✅ Build-Zeit: 83 Sekunden (akzeptabel)

- ⚠️ App-Größe: ~6GB (Optimierung geplant)#### 6.2 Container-Übernahme-Workflow- GitHub Pages Deployment-Verzögerungen brechen das Backup-URL System

- ✅ Ladezeit: <2 Sekunden für alle Views

- ✅ QR-Code Generierung: <1 Sekunde- [ ] **Integration entleerter Container**- Unterschiedliche Datenquellen (universalStorage vs localStorage) führen zu Inkonsistenzen



---  - Container nach Rohstoff-Entleerung übernehmen



**Ende der Roadmap** - Letzte Aktualisierung: 11. Oktober 2025  - Automatische ID-Vergabe#### LÖSUNG: Statisches QR-Code System 🎯


  - QR-Code Druck für neue Container

  - Bestandsmanagement für leere Behälter**Neuer Ansatz (elegant und praktisch):**

- ✅ **Ein QR-Code pro Tank - für immer gültig**

### Phase 7: Analytics & Reporting (Mittlere Priorität)- ✅ **Einmal drucken, aufkleben, fertig**

- [ ] **Tank-Analytics Dashboard**- ✅ **Dynamische Datenabfrage beim Scannen**

  - Füllstand-Historie und Trends- ✅ **Keine komplexe Backup-URL-Logik**

  - Verbrauchsanalysen pro Tank- ✅ **Immer aktuelle Daten durch Auto-Sync im Hintergrund**

  - Optimierungsvorschläge für Lagerhaltung

  #### UMSETZUNGSPLAN (strukturiert & testbar)

- [ ] **Erweiterte Berichte**

  - Bestandsberichte mit Kategorien (Mazerat/Destillat)##### Phase 4.1: Analyse & Dokumentation �

  - Bewegungshistorie pro Container- [ ] **Dokumentation aktuelles System** - Alle URL-Parameter und Fallback-Mechanismen erfassen

  - Leihgaben-Tracking-Report- [ ] **Identifikation Schwachstellen** - Warum T 341 nicht gefunden wird trotz korrekter Sync

- [ ] **Architektur neues System** - Statische URLs, einfache Datenabfrage, robuste Tank-Suche

### Phase 8: Mobile & PWA (Niedrige Priorität)- [ ] **Migrations-Strategie** - Backward-Kompatibilität und schrittweise Umstellung

- [ ] **Progressive Web App**

  - Installierbar auf Smartphone##### Phase 4.2: Entwicklung Vereinfachte tank-viewer.html 🔧

  - Offline-First Funktionalität- [ ] **Entfernung komplexer URL-Parameter** - Nur noch tankId als Parameter

  - Push-Notifications für Tank-Updates- [ ] **Einfache Datenabfrage** - Direkter Zugriff auf tank-data.json ohne Fallbacks

  - [ ] **Robuste Tank-Suche** - Suche nach tankNr, id, und bezeichnung mit Normalisierung

- [ ] **Mobile Optimierungen**- [ ] **Erweiterte Debug-Logs** - Für bessere Fehlerdiagnose bei Tank-Lookup

  - Touch-optimierte UI-Elemente

  - Kamera-Integration für QR-Scan##### Phase 4.3: Statische QR-Code Generierung �

  - GPS-Tracking für Außer-Haus-Container- [ ] **QR-Code Tabelle für alle Tanks** - T341, T349, T1536, Fl, B, Fass, Cont, K, etc.

- [ ] **Einheitliche URL-Struktur** - `tank-viewer.html?tankId=T341` (unveränderlich)

---- [ ] **Print-optimierte Ausgabe** - PDF mit Tank-Bezeichnung und QR-Code

- [ ] **QR-Code Verwaltung im UI** - Anzeige aller verfügbaren statischen QR-Codes

## 🎯 Nächste Schritte (Priorisiert)

##### Phase 4.4: Testing & Validation 🧪

### Sofort (Höchste Priorität)- [ ] **Parallele System-Tests** - Altes vs. neues System Vergleich

1. ✅ ~~Master-QR System implementieren~~- [ ] **Mobile Offline-Tests** - Funktionalität bei schlechter Netzverbindung

2. ✅ ~~QR-Album Verbesserungen~~- [ ] **GitHub Pages Integration** - Deployment-Geschwindigkeit und Zuverlässigkeit

3. ✅ ~~Container-Indexierung (Fass-1, B-2)~~- [ ] **End-to-End Tank-Lookup** - Alle 12 Tanks + Fässer testen

4. ✅ ~~Kategorie-Anzeige (Mazerat/Destillat)~~

##### Phase 4.5: Produktive Implementierung 🚀

### Diese Woche (Hoch)- [ ] **Schrittweise Migration** - Einzelne Tanks auf neues System umstellen

1. [ ] Portable EXE Build finalisieren- [ ] **Legacy-Support** - Alte QR-Codes bleiben funktionsfähig

2. [ ] Dokumentation aktualisieren (APP_DOCUMENTATION.md)- [ ] **Dokumentation Update** - Neue QR-Code Workflows und Troubleshooting

3. [ ] System-Testing (End-to-End Workflows)- [ ] **Benutzer-Schulung** - Einfache Anleitung für statische QR-Codes



### Nächste Woche (Mittel)#### ERFOLGS-KRITERIEN

1. [ ] QR-Code Batch-Druck für Chargen- ✅ **Tank T 341 QR-Code funktioniert zuverlässig**

2. [ ] Container-ID-System planen- ✅ **Keine 404-Fehler bei GitHub Pages Deployment**

3. [ ] Performance-Optimierungen starten- ✅ **QR-Codes können dauerhaft an Tanks befestigt werden**

- ✅ **System funktioniert auch bei Auto-Sync Ausfällen**

### Nächster Monat (Niedrig)- ✅ **Einfache Wartung und Debugging**

1. [ ] Analytics Dashboard

2. [ ] PWA Entwicklung#### ROLLBACK-STRATEGIE

3. [ ] Sensor-Integration (optional)- Aktuelles System bleibt parallel verfügbar

- Graduelle Umstellung Tank für Tank

---- Jederzeit Rückkehr zum komplexen System möglich

- Keine Datenverluste durch Migration

## 📊 Erfolgsmetriken

### Phase 5: Produktionsreife Implementierung 🚧

### Systemstabilität

- ✅ 0 kritische Bugs in Production### Phase 4: POST-HALLELUJAH STABILISIERUNG & OPTIMIERUNG 🎯

- ✅ Datenpersistenz 100% zuverlässig

- ✅ QR-Code System vollständig funktionsfähig**Status**: Nach erfolgreichem QR-System Fix - System läuft PERFEKT!  

- ✅ Build-Prozess fehlerfrei**Priorität**: Systematische Verbesserung und Stabilisierung  

**Ziel**: Production-Ready Deployment mit robuster Funktionalität

### Benutzerfreundlichkeit

- ✅ QR-Album optimiert für Tablet/Smartphone#### 4.1 TANKLOGIK VALIDIERUNG 🔧

- ✅ Master-View übersichtlich und sortiert- [ ] **Tank-ID Konsistenz prüfen**

- ✅ Container eindeutig identifizierbar  - QR-Code vs. System-ID Mapping validieren

- [ ] Batch-Operationen verfügbar  - Tank T 341 und andere Tanks einzeln durchtesten

  - Fallback-Mechanismen für ID-Konflikte implementieren

### Performance  

- ✅ Build-Zeit: 83 Sekunden- [ ] **Füllstand-Berechnungen verifizieren**

- [ ] App-Größe: Ziel <1GB (aktuell ~6GB)  - Inventory-basierte vs. manuelle Füllstände abgleichen

- ✅ Ladezeit: <2 Sekunden für alle Views  - Edge-Cases testen (leere Tanks, Überfüllung, negative Werte)

- ✅ QR-Code Generierung: <1 Sekunde pro Code  - Berechnungslogik für mehrere Inhalte pro Tank prüfen



---#### 4.2 DATENPERSISTENZ & BACKUP 💾

- [ ] **Lokale Speicherung auditieren**

## 🔄 Changelog  - localStorage vs. Datei-basierte Speicherung bewerten

  - Datenkonsistenz zwischen Browser und Desktop-App prüfen

### v1.5.0 (05.10.2025) - QR-System Perfektionierung  - Backup-Strategien für kritische Datenverluste entwickeln

**Major Features:**  

- Master-QR & Container-Übersicht- [ ] **Auto-Sync Robustheit**

- QR-Album Verbesserungen (Labels, Kategorien, Formatierung)  - GitHub Pages Upload-Zuverlässigkeit testen

- Container-Indexierung (Fass-1, B-2, etc.)  - Fehlerbehandlung bei Netzwerkausfällen verbessern

- Mazerat/Destillat Kategorie-Anzeige  - Offline-Mode für Desktop-App sicherstellen

- Intelligente Container-Sortierung

- 904L Summations-Bug behoben#### 4.3 QR-CODE DRUCKSYSTEM 🖨️

- [ ] **Print-Layout optimieren**

**Fixes:**  - QR-Code Größe für verschiedene Drucker kalibrieren

- Container-Gruppierung nach `container.id` statt `tankNr`  - Tank-Beschriftung und Metadaten zu QR-Codes hinzufügen

- Kapazitäts-Formatierung (1 Nachkommastelle)  - Batch-Druck für mehrere Tanks implementieren

- Bezeichnungs-Cleanup ("Auto-erkannt:" entfernt)  

- GitHub Pages Integration stabilisiert- [ ] **QR-Code Haltbarkeit**

  - URL-Struktur für Langzeitstabilität optimieren

### v1.4.0 (01.10.2025) - Kritische Produktionsfehler behoben  - Backup-URLs in QR-Codes einbetten

**Major Fixes:**  - Test-Scan-Funktionalität für gedruckte Codes

- Datenpersistenz vollständig repariert (localStorage → hybridStorage)

- Lagerbewegungen aktualisieren UI korrekt#### 4.4 DATENÄNDERUNGS-WORKFLOW 📊

- Chargen-Übersicht UX optimiert (Sticky Actions)- [ ] **Change Tracking implementieren**

  - Änderungshistorie für Tank-Inhalte und Füllstände

### v1.3.0 (24.09.2025) - Hybrid Storage & Build-System  - Before/After-Vergleiche für kritische Operationen

**Major Features:**  - Rollback-Mechanismus für fehlerhafte Eingaben

- Hybrid Storage System implementiert  

- Tank Auto-Sync modernisiert- [ ] **Real-time Synchronisation testen**

- QR-Code Druckfunktion  - Desktop → GitHub → Mobile Workflow verifizieren

- Portable Build erfolgreich  - Latenz-Messungen für Änderungs-Propagierung

  - Conflict-Resolution bei gleichzeitigen Änderungen

### v1.2.0 (September 2025) - System-Bereinigung

- OneDrive-Integration ohne Azure#### 4.5 SECURITY & TOKEN MANAGEMENT 🔐

- Veraltete Cloud-Services entfernt- [ ] **GitHub Token externalisieren**

- Code-Cleanup und Vereinfachung  - Token aus Source-Code entfernen (Sicherheitsrisiko)

  - Externe Konfigurationsdatei außerhalb Git-Repository

---  - Environment-Variable oder sichere lokale Speicherung

  

## 📝 Hinweise für Entwickler- [ ] **Token-Rotation & Expiry handling**

  - Automatische Token-Validierung implementieren

### Branch-Strategie  - Fallback für abgelaufene Tokens

- **`pages-clean`**: Production Branch für GitHub Pages  - User-freundliche Token-Update-Prozedur

- **`fresh-main`**: DEPRECATED - nicht mehr verwenden

- Alle QR-Codes zeigen auf GitHub Pages URLs#### 4.6 ANLEITUNGSSEKTION AKTUALISIERUNG 📚

- [ ] **Dokumentation synchronisieren**

### Build-Prozess  - Aktuelle Branch-Struktur (fresh-main) dokumentieren

```bash  - ASCII-safe Encoding-Lösung in Anleitungen erklären

# Development Build  - Troubleshooting-Guide für neue Probleme erweitern

npm run build  

- [ ] **User-Journey optimieren**

# Portable EXE Build  - Schritt-für-Schritt Setup-Guide vereinfachen

node scripts/build-ultra-minimal.js  - Video-Tutorials oder Screenshots hinzufügen

```  - FAQ-Sektion mit häufigen Problemen erweitern



### Storage-System#### 4.7 PORTABLE APP OPTIMIERUNG 📦

- Desktop: Electron Persistent Storage (IPC-basiert)- [ ] **App-Größe reduzieren**

- Browser: localStorage als Fallback  - Aktuell: ~6GB → Ziel: <1GB

- Auto-Migration zwischen Systemen  - Unnötige node_modules eliminieren

  - Asset-Optimierung und Tree-shaking implementieren

### Debugging  

- Storage Debug Tools in: Einstellungen → "Storage Debug"- [ ] **Deployment-Prozess standardisieren**

- Tank Debug Utility für Sync-Probleme verfügbar  - One-Click Build-Skript für portable EXE

- DevTools Console für Branch-Validation  - Automated Testing vor Release

  - Version-Tagging und Release-Notes automatisieren

---

#### 4.8 KRITISCHE PRODUKTIONSFEHLER 🔴 HÖCHSTE PRIORITÄT - ✅ VOLLSTÄNDIG GELÖST!

**Ende der Roadmap** - Letzte Aktualisierung: 05.10.2025

**Status**: ✅ ABGESCHLOSSEN am 24.09.2025 - Alle kritischen Probleme behoben
**Resultat**: System ist vollständig produktionstauglich und stabil
**Deployment**: Portable Build erfolgreich erstellt (83 Sekunden Kompilierung)

##### 4.8.1 Datenpersistenz: Hybrid Storage Implementation ✅ VOLLSTÄNDIG IMPLEMENTIERT
- ✅ **GELÖST**: electron/persistent-storage.ts vollständig implementiert
  - Atomare Schreibvorgänge mit Backup-Mechanismus ✅
  - Thread-sichere Operationen mit Lock-System ✅
  - Umfangreiche Fehlerbehandlung und Recovery ✅
  - IPC-Bridge für Renderer-Prozess Integration ✅
  - Diagnostik und Debugging-Tools ✅
  
- ✅ **GELÖST**: src/lib/hybrid-storage.ts vollständig implementiert  
  - Intelligente Umgebungserkennung (Browser vs. Electron) ✅
  - Einheitliche API für beide Umgebungen ✅
  - Event-System für Storage-Änderungen ✅
  - Fallback-Mechanismen bei Fehlern ✅
  - Synchronisation zwischen Umgebungen ✅

- ✅ **GELÖST**: Integration und Testing erfolgreich abgeschlossen
  - Electron App Funktionalität validiert ✅
  - localStorage-Ersatz vollständig funktionsfähig ✅
  - IPC Bridge zwischen main.ts und preload.js getestet ✅
  - Storage Debug Panel in Einstellungen integriert ✅

##### 4.8.2 Tank Auto-Sync Modernisierung ✅ VOLLSTÄNDIG IMPLEMENTIERT
- ✅ **GELÖST**: Tank Auto-Sync komplett neu mit Hybrid Storage implementiert
  - tank-auto-sync-hybrid.ts als vollständiger Ersatz für defekte Version ✅
  - Automatische Datenmigration zwischen Storage-Systemen ✅
  - Robuste GitHub Pages Synchronisation ✅
  - QR-Code System mit einheitlichen URLs ✅
  
- ✅ **GELÖST**: Tank-Data-Migration System implementiert
  - Nahtlose Migration von localStorage zu Hybrid Storage ✅
  - Automatische Backup-Erstellung bei Migration ✅
  - Fehlerbehandlung und Rollback-Mechanismen ✅
  - Benutzerfreundliche Migration mit Progress-Anzeige ✅

##### 4.8.3 QR-Code System & Druckfunktionalität ✅ VOLLSTÄNDIG IMPLEMENTIERT
- ✅ **GELÖST**: Umfassende QR-Code Druckfunktionalität implementiert
  - Direkte Druckfunktion aus Tank-Management ✅
  - PDF-Export mit professionellem Layout ✅
  - Clipboard-Integration für QR-Codes ✅
  - Print-Dialog mit responsivem Design ✅
  
- ✅ **GELÖST**: QR-Code URL-Konsistenz hergestellt
  - Einheitliche GitHub Pages URLs für alle QR-Codes ✅
  - Tank-ID Normalisierung vollständig umgesetzt ✅
  - Robuste Tank-Lookup-Logik implementiert ✅
  - Mobile Offline-Funktionalität sichergestellt ✅

##### 4.8.4 Storage-Optimierung & Debugging ✅ VOLLSTÄNDIG IMPLEMENTIERT
- ✅ **GELÖST**: Umfassende Storage-Debug-Tools implementiert
  - Storage-Analyse mit detaillierter Schlüssel-Auflistung ✅
  - Automatische Storage-Reparatur-Funktionalität ✅
  - Storage-Cleanup reduzierte Schlüssel von 12 auf 7 ✅
  - Tank-Debug-Utilitiy für Sync-Probleme ✅
  
- ✅ **GELÖST**: Persistenz-Probleme vollständig behoben
  - Inventar-Daten bleiben nach App-Neustart erhalten ✅
  - Konsistente Datenspeicherung zwischen Browser und Desktop ✅
  - Automatische Wiederherstellung bei Storage-Problemen ✅
  - Fehlerdiagnose und Self-Healing implementiert ✅

**TESTING ERGEBNIS**:
✅ Portable Build erfolgreich: dist-new\MazerationsMeister-win32-x64
✅ Alle 11 statischen Seiten generiert ohne Fehler
✅ TypeScript-Kompilierung fehlerfrei abgeschlossen
✅ Funktionalität: Tank-Management, QR-Codes, Inventar, Mazerationen - alle Features funktional
✅ Storage-System vollständig stabil und getestet

#### 4.9 NÄCHSTE OPTIMIERUNGEN 🚀 (Priorität: Niedrig)

##### Performance & Build-Optimierung
- [ ] **Portable App-Größe reduzieren**
  - Aktuell: ~6GB → Ziel: <1GB
  - Webpack Tree-shaking implementieren
  - node_modules Cleanup und Production Dependencies
  - Asset-Optimierung und Compression

- [ ] **Build-Performance verbessern**
  - Build-Zeit von 83s auf <30s reduzieren
  - Incremental Builds implementieren
  - Cache-Strategien für TypeScript Compilation

##### Benutzerfreundlichkeit
- [ ] **Erweiterte QR-Code Features**
  - Batch-QR-Code-Druck für alle Tanks
  - QR-Code-Vorschau mit Metadaten
  - Anpassbare QR-Code-Größen

- [ ] **Enhanced Storage Management**
  - Automatische Backup-Erstellung (täglich/wöchentlich)
  - Import/Export von kompletten Datensets
  - Storage-Verwendungs-Analytics

##### Erweiterte Funktionalität
- [ ] **Tank-Analytics Dashboard**
  - Füllstand-Historie und Trends
  - Verbrauchsanalysen pro Tank
  - Optimierungsvorschläge für Lagerhaltung

- [ ] **Mobile App PWA**
  - Installierbare Progressive Web App
  - Offline-First Funktionalität
  - Push-Notifications für Tank-Updates

**STATUS**: ⚠️ KRITISCHE PRODUKTIONSFEHLER IDENTIFIZIERT - SOFORTIGER HANDLUNGSBEDARF! 🔴

#### 4.11 KRITISCHE PRODUKTIONSFEHLER 🔴 SOFORTIGE PRIORITÄT - 27.09.2025

**Problem identifiziert am**: 27.09.2025  
**Kritikalität**: PRODUCTION BREAKING - System nicht produktionstauglich  
**Status**: SOFORT ZU BEHEBEN - Höchste Priorität

##### Kritische Fehler-Liste:

**✅ FEHLER 1: Datenpersistenz komplett defekt - GELÖST (01.10.2025)**
- **Problem:** Artikel-/Lagerstand wurde nicht gespeichert
- **Symptom:** Bei Neustart war alles weg
- **Auswirkung:** System unbrauchbar für Produktionseinsatz
- **Root Cause:** localStorage statt hybridStorage verwendet
- **Lösung:** Vollständige Migration von localStorage zu hybridStorage in inventory-management.tsx
  - Import für hybridStorage hinzugefügt
  - clearArtikelDefinitionen Funktion angepasst
  - Initial Load useEffect angepasst
  - State Initialisierung (artikelDefinitionen, inventoryItems, inventoryTransactions) angepasst
  - Auto-Save useEffects angepasst
  - saveAllData Funktion angepasst
  - Alle verbleibenden Update-Handler (Export-Pfade, Import-Pfade) angepasst

**✅ FEHLER 2: Lagerbewegungen funktionslos - GELÖST (01.10.2025)**
- **Problem:** Änderung Lagerstand aktualisierte Anzeige nicht
- **Symptom:** Transaktionsprotokoll zeigte Bewegung, Lagerstand blieb unverändert
- **Auswirkung:** Bestandsführung nicht funktionsfähig
- **Root Cause:** handleSaveTransaction speicherte nur Transaktion, aktualisierte aber nicht den Lagerbestand
- **Lösung:** handleSaveTransaction erweitert in inventory-management.tsx
  - Lagerbestand (currentQuantityLiters) wird bei Zugang/Abgang korrekt berechnet
  - lastInventoryDate wird automatisch aktualisiert
  - Negative Bestände werden verhindert (Math.max(0, newQty))
  - UI-State synchronisiert sich automatisch über React State Management
  - Verbesserte Toast-Nachricht mit Mengenangabe

**✅ FEHLER 3: Chargen-Übersicht unbrauchbar - GELÖST (01.10.2025)**
- **Problem:** Bearbeiten/Löschen/Speichern Buttons nur durch horizontales Scrollen erreichbar
- **Symptom:** Buttons ganz rechts außerhalb Viewport, schlechte UX
- **Auswirkung:** Benutzer konnten Chargen nicht effizient bearbeiten
- **Root Cause:** Horizontal scrollende Tabelle mit Aktionen als letzte Spalte
- **Lösung:** Sticky Aktionsspalte + vertikales Button-Layout in inventory-table.tsx
  - Aktionsspalte mit `sticky right-0` fixiert (bleibt sichtbar beim Scrollen)
  - Shadow-Effekt für bessere visuelle Trennung
  - Buttons in 2 Zeilen gestapelt statt horizontal:
    - Obere Zeile: Zugang (grün) + Abgang (orange)
    - Untere Zeile: Bearbeiten (blau) + Löschen (rot)
  - Kleinere Button-Größe (h-7 w-7) für kompaktes Layout
  - Min-Width von 180px auf 100px reduziert
  - Z-Index 10 für korrekte Layering

**� FEHLER 4: QR-Code Batch-Druck fehlt - FEATURE-ENHANCEMENT**
- **Problem:** Kein Batch-Druck mit Mehrfachauswahl für Lagerartikel
- **Symptom:** Jeder QR-Code muss einzeln gedruckt werden
- **Auswirkung:** Unpraktisch für Produktionsumgebung mit vielen Artikeln
- **Root Cause:** Feature nicht implementiert, benötigt umfangreiche UI-Erweiterungen
- **Status:** Als Feature-Enhancement für Phase 2 geplant
- **Aktuelle Lösung:** 
  - QR-Code Batch-Druck bereits für Tanks verfügbar (tank-management.tsx)
  - Einzelne QR-Codes können über Export-Funktionen erstellt werden
  - Workaround: Excel-Export → externe QR-Code-Generierung
- **Geplante Implementierung (Phase 2):**
  - Checkbox-Auswahl in Chargen-Tabelle
  - Multi-Select State Management
  - Batch-QR-Code Generator Dialog
  - PDF-Export mit mehreren QR-Codes
  - "Alle auswählen/aufheben" Funktionalität
  - Print-optimiertes Layout für Etikettendruck

**�🔴 FEHLER 4: QR-Code Batch-Druck fehlt**
- **Problem:** Kein Batch-Druck mit Mehrfachauswahl
- **Symptom:** Jeder QR-Code muss einzeln gedruckt werden
- **Auswirkung:** Unpraktisch für Produktionsumgebung
- **Root Cause:** Feature nicht implementiert

##### SOFORT-MASSNAHMEN-PLAN:

**PHASE 1: Datenpersistenz reparieren** ⚡ SOFORT (Tag 1)
- [ ] **Hybrid Storage Debug & Fix**
  - Storage Debug Tools aus Einstellungen verwenden
  - localStorage vs. Electron Persistenz analysieren
  - IPC Bridge auf Funktionalität prüfen
  - Atomic Write Operations validieren

- [ ] **Lagerstand-Persistenz validieren**
  - Artikel-Daten Save/Load Mechanismus testen
  - Browser localStorage vs. Electron Storage prüfen
  - Event-basierte Speicherung implementieren
  - Backup-Recovery-Mechanismus aktivieren

**PHASE 2: Lagerbewegungen-UI Fix** ⚡ SOFORT (Tag 1)
- [ ] **State Management reparieren**
  - UI-State Synchronisation mit Datenschicht
  - Real-time Update nach Lagerbewegungen
  - Transaktions-Konsistenz sicherstellen
  - Cache-Invalidierung implementieren

**PHASE 3: Chargen-Übersicht UX Fix** ⚡ SOFORT (Tag 2)
- [ ] **Layout-Reparatur**
  - Responsive Table Design implementieren
  - Action-Buttons in Viewport positionieren
  - Horizontal Scroll eliminieren
  - Mobile-freundliche Bearbeitung

**PHASE 4: QR-Code Batch-Druck** ⚡ URGENT (Tag 2)
- [ ] **Batch-Funktionalität implementieren**
  - Checkbox-Auswahl für Multiple QR-Codes
  - Batch-Print Dialog
  - PDF mit mehreren QR-Codes
  - "Alle auswählen" / "Auswahl aufheben" Buttons

#### 4.10 KRITISCHES QR-SYSTEM DESIGN-PROBLEM 🔴 HOHE PRIORITÄT

**Problem identifiziert am**: 25.09.2025  
**Kritikalität**: BLOCKING für produktiven QR-Code Einsatz  
**Status**: NACH 4.11 - Muss nach Produktionsfehlern gelöst werden

##### Problem-Beschreibung:
**Mehrere Produkte pro Behälter-Typ ohne eindeutige Behälter-IDs**

**Konkrete Beispiele aus Chargenübersicht:**
- **Behälter "B" (Glasballon)**: 4 verschiedene Produkte
  - "GFKC-K" 
  - "Oregano"
  - "Sauvignon Bl"
  - [weiteres Produkt]
- **Behälter "Fl" (Flasche)**: 3 verschiedene Produkte
- **Behälter "Cont." (Container)**: Mehrere Produkte
- **Alle Gebinde mit Tag "keine feste Nummer"**

**Das Kern-Problem:**
- Aktuelles QR-System: 1 QR-Code → 1 Behälter-ID (z.B. "B", "Fl", "Cont.")
- Realität: 1 Behälter-Typ → N verschiedene Produkte
- **Resultat**: QR-Code kann nicht eindeutig zuordnen welches Produkt gemeint ist

##### Lösungsstrategie - 3 Ansätze:

**ANSATZ 1: Dynamische Behälter-IDs (Empfohlen) 🎯**
```
Beispiel Umsetzung:
- "B" → "B-001", "B-002", "B-003", "B-004" (für 4 Glasballons)
- "Fl" → "Fl-001", "Fl-002", "Fl-003" (für 3 Flaschen)
- "Cont" → "Cont-001", "Cont-002", etc.
```

**Vorteile:**
- ✅ Eindeutige QR-Codes pro physischem Behälter
- ✅ Skalierbar für beliebig viele Behälter
- ✅ Einfache Zuordnung Produkt ↔ Behälter
- ✅ QR-Code kann dauerhaft am Behälter befestigt werden

**ANSATZ 2: Produkt-basierte QR-Codes**
```
Beispiel: QR-Code enthält Produkt-Name statt Behälter-ID
- QR für "GFKC-K" → tank-viewer.html?product=GFKC-K
- QR für "Oregano" → tank-viewer.html?product=Oregano
```

**Vorteile:**
- ✅ Direkte Produkt-Zuordnung
- ✅ Keine Behälter-ID-Verwaltung nötig

**Nachteile:**
- ❌ QR-Code nicht am Behälter befestigbar (Produkt kann wechseln)
- ❌ Weniger praktisch für Lagerhaltung

**ANSATZ 3: Multi-Produkt QR-Codes mit Auswahl-Interface**
```
QR-Code für "B" → Auswahl-Seite mit allen 4 Produkten in B-Behältern
```

**Nachteile:**
- ❌ Zusätzlicher Klick erforderlich
- ❌ Ungeeignet für schnelle Bestandserfassung

##### Implementierungsplan für ANSATZ 1 (Empfohlen):

**Phase 1: Datenmodell erweitern** ⚡ DRINGEND
- [ ] **Behälter-ID-Generator implementieren**
  - Automatische Nummerierung für Behälter ohne feste Nummer
  - Schema: `{BehälterTyp}-{3-stellige Nummer}` (z.B. "B-001")
  - Konfigurierbare Startnummern pro Behälter-Typ
  
- [ ] **Chargen-Datenstruktur anpassen**
  - Migration existierender "B" → "B-001", "B-002", etc.
  - Eindeutige Behälter-IDs für alle "keine feste Nummer" Behälter
  - Backward-Kompatibilität sicherstellen

**Phase 2: QR-Code System anpassen** ⚡ DRINGEND
- [ ] **QR-Code Generierung für neue Behälter-IDs**
  - QR-Codes für "B-001", "B-002", "B-003", "B-004"
  - QR-Codes für "Fl-001", "Fl-002", "Fl-003"
  - QR-Codes für "Cont-001", "Cont-002", etc.
  
- [ ] **Tank-Viewer anpassen**
  - Lookup-Logik für neue ID-Schema
  - Fallback für alte Behälter-IDs
  - Robuste Tank-Suche implementieren

**Phase 3: UI & UX Anpassungen** ⚡ DRINGEND
- [ ] **Chargen-Übersicht aktualisieren**
  - Anzeige der neuen Behälter-IDs
  - Bearbeitungsmöglichkeit für Behälter-Zuordnung
  - Bulk-Operations für ID-Vergabe
  
- [ ] **QR-Code Management erweitern**
  - Batch-Generierung für alle Behälter eines Typs
  - QR-Code Übersicht mit Behälter ↔ Produkt Zuordnung
  - Print-Layout für mehrere QR-Codes

- [ ] **Erweiterte Behälter-Verwaltung implementieren**
  - Bemerkungsfeld für jeden Behälter (Leihgabe, Außer Haus, etc.)
  - Status-Dropdown: "Belegt", "Leer", "Außer Haus", "Leihgabe", "Defekt"
  - Farbcodierung in Übersichten (Grün=Leer, Blau=Belegt, Orange=Außer Haus)
  - Filter-Funktionen: "Zeige alle leeren Fässer", "Zeige Leihgaben"

- [ ] **Bulk-Container-Management UI**
  - Batch-Registrierung mehrerer leerer Behälter
  - Container-Import-Dialog aus externen Quellen  
  - Bulk-QR-Code-Generierung (Fass-001 bis Fass-010)
  - "Container übernehmen nach Entleerung" Workflow

**Phase 4: Migration & Testing** ⚡ DRINGEND
- [ ] **Daten-Migration implementieren**
  - Automatische Vergabe von IDs für existierende Chargen
  - Benutzer-Interface für manuelle Korrekturen
  - Backup vor Migration
  
- [ ] **End-to-End Testing**
  - QR-Code Scanning mit neuen IDs
  - Mobile Funktionalität validieren
  - Sync-Mechanismus testen

**Rollback-Strategie:**
- Alte Behälter-IDs bleiben als Fallback verfügbar
- Schrittweise Migration ohne Datenverlust
- Jederzeit Rückkehr zum alten System möglich

**Erweiterte Anforderungen - Praxisnahe Flexibilität:**

**Manuell erweiterbares numerisches System:**
- ✅ **Flexible Erweiterung:** Fl-001, Fl-002, Fl-003, ... Fl-010, etc.
- ✅ **Bestandsmanagement:** Beispiel 10 Fässer total, 4 belegt, 6 leer aber registriert
- ✅ **Schnelle Identifikation:** QR-Scan zeigt sofort "LEER" oder Inhalt
- ✅ **Container-Übernahme:** Neue Container nach Entleerung in Gebindepool integrieren

**Erweiterte Behälter-Status und -Tracking:**
```
Behälter-Status-Beispiele:
- "BELEGT" → [Produktname] + Füllstand
- "LEER" → Bereit zur Befüllung
- "Leihgabe von [Lieferant XYZ]" → Bemerkungsfeld
- "Außer Haus bei [Destillerie ABC]" → Tracking-Status
- "Neu übernommen" → Nach Container-Entleerung
```

**Praktische Anwendungsfälle:**
1. **Fass-Management:** 10 Fässer registriert → QR-Scan zeigt sofort welche leer/verfügbar
2. **Container-Integration:** Rohstoff-Container nach Entleerung übernehmen → QR-Code drucken → im System sichtbar
3. **Außer-Haus-Tracking:** Mazerat zur Destillation → Status "Außer Haus bei [Brennerei]"
4. **Leihgaben-Verwaltung:** Container von Lieferanten → Bemerkung "Leihgabe von [Firma]"
5. **Bestandsoptimierung:** Leere Behälter sofort identifizieren für neue Ansätze

**Zusätzliche UI-Features für erweiterte Funktionalität:**
- [ ] **Bemerkungsfeld für jeden Behälter**
  - Freitext für "Leihgabe von...", "Außer Haus bei...", etc.
  - Sichtbar in QR-Code Ansicht und Tank-Management
  - Bearbeitbar über Mobile und Desktop Interface
  
- [ ] **Behälter-Status-Management**
  - Status-Dropdown: "Belegt", "Leer", "Außer Haus", "Leihgabe", "Defekt"
  - Farbcodierung in Übersichten (Grün=Leer, Blau=Belegt, Orange=Außer Haus)
  - Filter-Funktionen: "Zeige alle leeren Fässer", "Zeige Leihgaben"
  
- [ ] **Bulk-Container-Management**
  - Batch-Registrierung mehrerer leerer Behälter
  - QR-Code Bulk-Generierung (z.B. Fass-001 bis Fass-010)
  - Container-Import aus externen Quellen

**Erfolgskriterien:**
- ✅ Jeder physische Behälter hat eindeutigen QR-Code
- ✅ QR-Codes können dauerhaft befestigt werden
- ✅ Eindeutige Zuordnung Produkt ↔ Behälter ↔ QR-Code
- ✅ Skalierbar für beliebig viele Behälter pro Typ
- ✅ **NEU:** Leere Behälter-Verwaltung und schnelle Verfügbarkeits-Prüfung
- ✅ **NEU:** Container-Integration nach Rohstoff-Entleerung
- ✅ **NEU:** Außer-Haus-Tracking für Mazerations-Transport
- ✅ **NEU:** Leihgaben-Dokumentation mit Bemerkungsfeld

---

### Phase 5: Cloud & Production-Ready 🚀

#### 🔴 DRINGENDE OPTIMIERUNGEN
1. **App-Größe drastisch reduzieren** 
   - Aktuell: ~6GB portable EXE 
   - Ziel: <500MB 
   - Problem: node_modules werden vollständig gepackt
   - Lösung: Webpack bundling oder alternative Packaging-Strategien

#### Mobile Optimierungen
1. **Progressive Web App (PWA)**
   - Installierbar auf Smartphone
   - Offline-Funktionalität
   - Push-Notifications für Updates

#### Erweiterte Tank-Features
1. **Sensor-Integration**
   - Temperatur- und Feuchtigkeits-Sensoren Integration
   - Automatische Füllstand-Überwachung
   - Echtzeit-Benachrichtigungen

### Phase 5: Enterprise Features 🏢

#### Multi-User & Synchronisation
- Benutzerkonten und Rollen
- Zentrale Datenhaltung
- Konfliktauflösung bei gleichzeitigen Änderungen
- Audit-Log für alle Änderungen

#### Erweiterte Funktionen
- Barcode-Scanner für Produkte
- Automatische Bestandswarnung
- Produktionsplanung und Forecasting

---

## 🎯 NÄCHSTE SCHRITTE - PRIORISIERTE TODO-LISTE

### **SOFORT (Höchste Priorität)**
1. **Tanklogik testen** - Tank T 341 und weitere Tanks systematisch durchprüfen
2. **Lokale Speicherung prüfen** - localStorage vs. Datei-Persistenz auditieren
3. **Token hardcodieren** - GitHub Token aus Source-Code in externe Konfiguration

### **DIESE WOCHE (Hoch)**
4. **QR-Codes drucken** - Print-Layout optimieren und Batch-Druck implementieren
5. **Datenstände ändern & testen** - Change-Tracking und Sync-Workflow verifizieren
6. **Anleitungssektion aktualisieren** - Dokumentation mit neuer Branch-Struktur synchronisieren

### **NÄCHSTE WOCHE (Mittel)**
7. **Portable App erstellen** - App-Größe reduzieren und One-Click-Build implementieren

---

## Änderungsprotokoll

### September 2025 - VOLLSTÄNDIGE SYSTEMMODERNISIERUNG ✅

### Oktober 2025 - QR-SYSTEM PERFEKTIONIERUNG & MASTER-VIEW ✅

#### Master-QR & Container-Übersicht (05.10.2025) ✅
- ✅ **Master-QR System:** Master-QR-Code für Container-Gesamtübersicht implementiert
- ✅ **Master-View Grid:** Grid-Layout aller befüllten Container mit sortierter Anzeige
- ✅ **Intelligente Sortierung:** Tank → Cont → IBC → Fass → K → Fl → B Hierarchie
- ✅ **Container-Indexierung:** Eindeutige IDs (Fass-1, Fass-2, B-1, B-2) statt generischer Namen
- ✅ **Kategorie-Anzeige:** Mazerat/Destillat/Selbstbeleg Kategorien in allen Views

#### QR-Album Verbesserungen (05.10.2025) ✅
- ✅ **Container-Labels:** Fass-1, Fass-2, B-1, B-2 statt nur "Fass", "B"
- ✅ **Produktnamen-Display:** Ersetzen von Container-Typ durch tatsächliche Produktnamen
- ✅ **Kategorie-Integration:** Mazerat/Destillat Anzeige in QR-Album Cards
- ✅ **Präzise Volumenangaben:** 1 Nachkommastelle für alle Liter-Angaben (81.0L statt 81L)
- ✅ **Datumsstempel:** Aktuelles Datum auf jedem QR-Code für Traceability

#### Datenstruktur-Fixes (05.10.2025) ✅
- ✅ **904L Bug behoben:** Container-Gruppierung nach `container.id` statt `tankNr`
- ✅ **Index-basierte Extraktion:** Korrekte Inventory-Zuordnung für Container mit gleicher tankNr
- ✅ **Füllstandsbalken:** Farbcodierte Prozentanzeige (grün > 70%, gelb > 30%, rot < 30%)
- ✅ **Kapazitäts-Formatierung:** Konsistente 1-Nachkommastelle für alle Volumenangaben

#### GitHub Pages Integration (05.10.2025) ✅
- ✅ **Branch-Cleanup:** `pages-clean` als einziger Production-Branch etabliert
- ✅ **localStorage Migration:** Forciert `branch: 'pages-clean'` bei jedem Save
- ✅ **QR-URL Hardcoding:** Alle QR-URLs auf GitHub Pages fixiert (keine localhost-Links)
- ✅ **Build-Cache Problem:** .next/out Cache-Problematik dokumentiert und gelöst

#### Bezeichnungs-Cleanup (05.10.2025) ✅
- ✅ **"Auto-erkannt:" entfernt:** Alle Container-Bezeichnungen bereinigt
- ✅ **Tank-data.json deployed:** Bereinigte Daten in /docs für GitHub Pages verfügbar
- ✅ **Konsistente Namensgebung:** T 341, Fass-1, B-2 statt "Auto-erkannt: T 341"

#### Phase 4.8.1: Hybrid Storage System (24.09.2025) ✅
- ✅ **Hybrid Storage Implementation:** Vollständiges Cross-Platform Storage-System implementiert
- ✅ **Electron Persistent Storage:** Atomare Schreibvorgänge, Thread-Sicherheit, IPC-Bridge
- ✅ **Automatische Datenmigration:** Nahtlose Migration zwischen localStorage und Electron Storage
- ✅ **Storage Debug Tools:** Umfassende Analyse-, Reparatur- und Cleanup-Funktionalität

#### Tank Auto-Sync Modernisierung (24.09.2025) ✅
- ✅ **Tank Auto-Sync Hybrid:** Komplette Neuentwicklung mit Hybrid Storage Integration
- ✅ **GitHub Pages Synchronisation:** Robuste Upload-Funktionalität mit Fehlerbehandlung  
- ✅ **Tank Data Migration:** Automatische Migration zwischen Storage-Systemen
- ✅ **QR-Code URL Konsistenz:** Einheitliche GitHub Pages URLs für alle QR-Codes

#### QR-Code System & Druckfunktionalität (24.09.2025) ✅
- ✅ **QR-Code Druckfunktion:** Direkte Druckfunktion aus Tank-Management Interface
- ✅ **PDF-Export:** Professionelle PDF-Generierung mit Tank-Metadaten  
- ✅ **Clipboard-Integration:** QR-Code Copy-to-Clipboard Funktionalität
- ✅ **Mobile Optimierung:** Responsive QR-Code Dialog für alle Geräte

#### Storage-Optimierung & Debugging (24.09.2025) ✅
- ✅ **Storage-Cleanup:** Reduzierung von 12 auf 7 Storage-Schlüssel für bessere Performance
- ✅ **Persistenz-Probleme behoben:** Inventar-Daten bleiben nach App-Neustart erhalten
- ✅ **Self-Healing Storage:** Automatische Erkennung und Reparatur von Storage-Problemen
- ✅ **Comprehensive Debugging:** Storage Analysis, Storage Repair, Tank Debug Utilities

#### Production Build & Deployment (24.09.2025) ✅
- ✅ **Portable Build Success:** Vollständiger Build in 83 Sekunden ohne Fehler
- ✅ **TypeScript Compilation:** Fehlerfreie Kompilierung aller Electron und Next.js Module
- ✅ **Static Export:** 11 statische Seiten erfolgreich generiert
- ✅ **Full Feature Set:** Tank-Management, QR-Codes, Inventar, Mazerationen - alle funktional

#### Frühere Entwicklung (September 2025) ✅
- ✅ **Build-System repariert:** Dynamische Routen-Probleme gelöst, statischer Export funktioniert
- ✅ **Electron-Integration:** Schwarzes Fenster-Problem behoben, App startet korrekt
- ✅ **Tank-Management System:** QR-Code-Generierung, mobile Tank-Seiten, dynamische Chargen-Verwaltung implementiert
- ✅ **OneDrive-Integration:** Lokale Synchronisation ohne Azure-Registrierung
- ✅ **System-Bereinigung:** Entfernung veralteter Cloud-Integration-Ansätze (ngrok, Azure-Services)
- ✅ **Code-Cleanup:** Vereinfachung der Einstellungen-Seite, Reduzierung der Komplexität

#### Single-File Auto-Sync - Vollständige Daten-Synchronisation (05.10.2025) 🔄 GEPLANT
- 🔄 **FEATURE-REQUEST**: Erweiterte Auto-Sync für ALLE App-Daten zwischen mehreren Rechnern
- 🎯 **USE CASE**: 
  - Rechner 1 (Büro): Arbeiten, Mazerationsprotokolle erstellen, Kalender/TODOs pflegen
  - Rechner 2 (Home-Office): Automatisch alle aktuellen Daten verfügbar
  - Kein manuelles Backup mehr nötig
- 📦 **SINGLE-FILE SYNC** - Eine Datei für alles:
  - `docs/app-data.json` auf GitHub (statt nur `tank-data.json`)
  - Struktur: `{ tanks, inventory, calendar, todos, mazerationProtocols }`
  - Nutzt bestehende GitHub Auto-Sync Infrastruktur
- 🔧 **TECHNISCHE UMSETZUNG**:
  - Erweitere `tank-auto-sync.ts` → `app-auto-sync.ts`
  - Sammelt ALLE Daten: `hybridStorage.get('tankDefinitions', 'inventoryItems', 'calendarEvents', 'todos', 'mazerationProtocols')`
  - Upload als Single JSON File zu GitHub Pages
  - Download beim App-Start (Rechner 2)
  - Conflict-Detection: Last-Write-Wins (Timestamp-basiert)
- 🎨 **UI-INTEGRATION**:
  - Einstellungen → Speicher-Sync (erweitert aus "Speicherpfade")
  - Erste Synchronisation: "📤 Hochladen" (Rechner 1) oder "📥 Herunterladen" (Rechner 2)
  - Auto-Sync Einstellung: EINE zentrale Einstellung für alle Daten (60 Min. Intervall)
  - Status-Anzeige: ✅ Synced / 🔄 Syncing / ⚠️ Conflict
  - Manuelle Sync: Button für sofortige Synchronisation
  - Conflict-Resolution UI: "Lokale Version" vs "Cloud-Version" wählen
- 📋 **VORTEILE**:
  - ✅ Keine parallele Arbeit nötig → 60 Min. Intervall ausreichend
  - ✅ Manuelle Sync vor Rechner-Wechsel möglich
  - ✅ Basiert auf bewährter Tank-Sync Infrastruktur
  - ✅ Single Source of Truth (GitHub)
  - ✅ OneDrive-Speicherpfade optional (nur als Backup-Fallback)
- ⚠️ **ENTSCHEIDUNG OFFEN**: 
  - **Variante A (Hybrid)**: GitHub = Primär-Sync, OneDrive = Backup-Fallback
  - **Variante B (Pure GitHub)**: Nur GitHub, OneDrive-Speicherpfade entfernen
- ⏰ **PRIORITÄT**: Mittel-Hoch (Multi-Rechner Workflow wichtig, aber nicht dringend)
- 📝 **STATUS**: In ROADMAP aufgenommen, Design dokumentiert in `STORAGE_SYNC_ANALYSE.md`

#### Google Calendar Integration - Mazerat-Erinnerungen (05.10.2025) 📅 GEPLANT
- 📅 **FEATURE-REQUEST**: Automatische Kalender-Erinnerungen für Mazerations-Fertigstellung
- 🎯 **USE CASE**: 
  - Mazeration starten → Ersten Vorgang abschließen
  - Mazerationsdauer eingeben (z.B. 4 Tage)
  - Automatischer Google Calendar Eintrag
  - Erinnerung via Push/E-Mail wenn Mazerat fertig
- 🔧 **TECHNISCHE UMSETZUNG**:
  - Google Calendar API Integration (Dashboard bereits verbunden)
  - Event beim Abschluss ersten Mazerationsvorgangs
  - Event-Titel: "🍃 [Produktname]-Mazerat fertig (Tank [ID])"
  - Event-Beschreibung: Link zu Tank-Detail-Seite + Füllstand-Info
  - Reminder: 1 Tag vorher + am Tag selbst
  - Optional: Manuelle Verlängerung aus Kalender heraus
- 📋 **INTEGRATION**: Erweiterung des bestehenden CalendarWidget
- ⏰ **PRIORITÄT**: Hoch (User-Request, hoher praktischer Nutzen)
- 📝 **STATUS**: In ROADMAP aufgenommen, noch nicht implementiert

#### Kritisches Design-Problem identifiziert (25.09.2025) 🔴
- 🔴 **PROBLEM**: Mehrere Produkte pro Behälter-Typ ohne eindeutige IDs
- 🔴 **BEISPIELE**: 4 Produkte in Behälter "B", 3 Produkte in "Fl"
- 🔴 **AUSWIRKUNG**: QR-Codes können nicht eindeutig zuordnen
- 📋 **LÖSUNGSSTRATEGIE**: Dynamische Behälter-IDs (B-001, B-002, Fl-001, etc.)
- 🎯 **ERWEITERTE ANFORDERUNGEN**: Praxisnahe Flexibilität dokumentiert
  - Leere Behälter-Verwaltung und Verfügbarkeits-Prüfung
  - Container-Integration nach Rohstoff-Entleerung  
  - Außer-Haus-Tracking für Mazerations-Transport
  - Leihgaben-Dokumentation mit Bemerkungsfeld
  - Bulk-Management für Behälter-Registrierung
- ⏰ **PRIORITÄT**: Nach Produktionsfehlern zu lösen

#### Kritische Produktionsfehler identifiziert (27.09.2025) 🔴 SOFORT
- 🔴 **FEHLER 1**: Artikel-/Lagerstand wird nicht gespeichert - bei Neustart alles weg
- 🔴 **FEHLER 2**: Lagerbewegungen aktualisieren Anzeige nicht - nur Protokoll zeigt Änderung
- 🔴 **FEHLER 3**: Chargen-Übersicht Layout unbrauchbar - Buttons nur durch Scrollen erreichbar  
- 🔴 **FEHLER 4**: QR-Code Batch-Druck fehlt - keine Mehrfachauswahl möglich
- ⚡ **SOFORT-PLAN**: 4-Phasen Reparatur-Plan mit Tag 1/2 Prioritäten
- 🎯 **STATUS**: System nicht produktionstauglich - sofortiger Handlungsbedarf

### 23.08.2025
- Exportfunktion verwendet jetzt den einstellbaren Export-Pfad aus den Einstellungen (localStorage) für XLSX-Exporte.
