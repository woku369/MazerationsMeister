
# Mazerations-Meister V 1.2.2 - App Dokumentation

**Stand:** 21. November 2025  
**Version:** 1.2.3 (Google Calendar Integration)

---

## 1. Anwendungsbeschreibung

**Mazerations-Meister** ist ein spezialisiertes Werkzeug, das für Destillerien, Likörhersteller und Betriebe entwickelt wurde, die mit der Mazeration von Kräutern und anderen pflanzlichen Stoffen arbeiten. Die Anwendung dient primär vier Zwecken:

1.  **Protokollierung von Mazerationsprozessen:** Erfassung aller relevanten Daten während eines Mazerationsvorgangs, von den eingesetzten Rohstoffen über Prozesszeiten bis hin zu Ausbeute und Alkoholkonzentrationen.
2.  **Lagerverwaltung:** Verwaltung der Bestände von Rohmaterialien (z.B. Einsatzalkohol), Zwischenprodukten (Mazerate, Destillate) und Endprodukten.
3.  **Tank-Management mit QR-Codes:** Mobile-optimierte Tank-Überwachung mit dynamischen Füllständen und QR-Code-basiertem Zugriff.
4.  **Rezeptur-System:** *(NEU in v1.1.0)* Excel-Style Editor zur Verwaltung von Produkt-Rezepturen mit Workflow-Management und druckbarem Produktions-Protokoll.
5.  **Dashboard mit Widgets:** *(NEU in v1.2.3)* Zentrale Übersicht mit Google Calendar Integration und ToDo-Listen-Verwaltung.

Die operativen Daten der Lagerverwaltung (Artikelstamm, Chargen, Transaktionen, Tank-Daten) werden clientseitig im LocalStorage des Browsers gespeichert. Zusätzlich bietet das System eine optionale OneDrive-Synchronisation für lokale Backups ohne Azure-Registrierung. Mazerationsprotokolle werden als Dateien (PDF, XLSX, DOCX) auf den Computer des Benutzers heruntergeladen.

### Hauptfunktionen

*   **Mazerationsprotokollierung:**
    *   Detaillierte Eingabemasken für Basisdaten (Name, Charge, Datum), Pflanzeninformationen (Art, Teil, Ernte, Qualität, Gewicht in g/kg, Kistenmanagement bei kg-Einwaage), Alkoholinformationen (Typ, Konzentration, Volumen in ml/l).
    *   Erfassung des Mazerationszeitraums (Beginn/Ende mit Datum und Uhrzeit, Raumtemperatur).
    *   Erfassung der Ergebnisse (Ausbeute, Endkonzentration, Bemerkungen).
    *   Automatische Berechnungen:
        *   Nettogewicht der Pflanzen bei Kisteneinwaage.
        *   Verhältnis Pflanze zu Alkohol.
        *   Mazerationsdauer in Tagen und Stunden.
        *   Verlust (absolut und prozentual) basierend auf eingesetztem Alkohol und Ausbeute.
        *   Eingesetzter Liter Absolutalkohol (LA), Ausbeute LA, Verlust LA.
    *   Sektion für detaillierte Zeitaufzeichnung einzelner Arbeitsschritte (Vorbereitung, Verarbeitung Kräuter/Mazerat, Reinigung, Sonstiges) mit automatischer Stundenberechnung und Summenbildung.
    *   Export des aktuellen Mazerationsprotokolls als PDF, DOCX und XLSX.
    *   Export eines leeren Protokollformulars (PDF, DOCX, XLSX).
    *   Kontinuierliche Speicherung aller erstellten Protokolle in einer kumulativen XLSX-Log-Datei (spaltenweise), die bei jeder Protokollerstellung aktualisiert und heruntergeladen wird.

*   **Lagerverwaltung:**
    *   **Artikelstamm (Master Data):**
        *   Definition von Artikelstammdaten (Artikelnummer, Produktname, Kategorie, Beschreibung).
        *   Dialog zum Anlegen und Bearbeiten von Artikeldefinitionen (Produktname als primäres Eingabefeld).
        *   Tabellarische Übersicht der Artikelstammdaten mit Filter- (nach Kategorie) und Sortierfunktionen.
    *   **Chargenverwaltung (Lagerbestand):**
        *   Anlegen neuer Lagerartikel/Chargen, wobei Artikeldetails (Artikel-Nr., Name, Kategorie) aus dem Artikelstamm per Dropdown ausgewählt und übernommen werden können.
        *   Erfassung von Chargennummer, Tank-Nr./Lagerort, Menge, Alkoholgehalt, Erfassungsdatum und Bemerkungen.
        *   Tabellarische Übersicht der einzelnen Chargen im Lager mit Filter- (nach Kategorie) und Sortierfunktionen (diverse Spalten).
        *   **Container-Befüllung:** *(FIX in v1.2.1)* 
            *   Violetter "In Container füllen" Button (PackageOpen-Icon) in jeder Tabellenzeile.
            *   Dialog zur Zuordnung von Lagerbeständen zu Tanks/Containern.
            *   Auswahl aus 62 verfügbaren Containern mit Anzeige von Produktname, Charge, Menge und Alkoholgehalt.
            *   Automatische Aktualisierung des Tank-Feldes nach Zuordnung.
    *   **Bestandsbewegungen:**
        *   Möglichkeit, für jede Charge "Zugänge" und "Abgänge" zu buchen.
        *   Dialog zur Erfassung von Menge, Datum und Bemerkungen für jede Transaktion.
        *   Automatische Anpassung der Lagermenge und des letzten Buchungsdatums der betroffenen Charge.
        *   Jede Transaktion wird separat im `localStorage` gespeichert.
    *   **Übersichten & Protokolle:**
        *   Anzeige einer Lagerübersicht, die den Gesamtbestand pro Artikel (summiert über alle Chargen) in Litern und Litern Absolutalkohol darstellt.
        *   Detailliertes Transaktionsprotokoll (Manipulationsprotokoll), das alle gebuchten Zu- und Abgänge chronologisch auflistet, mit Filter- (nach Transaktionstyp) und Sortierfunktionen.
        *   Export der Lagerübersicht (nach Artikel) als XLSX-Datei.
        *   Export des Transaktionsprotokolls als XLSX-Datei.

*   **Tank-Management (Gebindeverwaltung):**
    *   **Container-Inventar:**
        *   Intelligente Synchronisation von Container-Definitionen aus dem Lagerbestand.
        *   **Container-ID-System:** Eindeutige IDs (Fass-1, B-3, T 341) für jedes physische Gebinde.
        *   **Smart Merge:** Bestehende Container werden aktualisiert (nicht ersetzt) - QR-Codes bleiben erhalten!
        *   Anlage von Container-Einträgen mit Container-ID, Beschreibung, Kapazität und Füllmenge.
        *   Kategorisierung nach Container-Typ (Tank, Fass, Ballon, IBC, Flasche, Sonstiges).
    *   **QR-Code-System:**
        *   Generierung von QR-Codes für ausgewählte Container (per Checkbox auswählbar).
        *   Mobile-optimierte Container-Detail-Seiten mit großer, gut lesbarer Darstellung.
        *   Direkte Bearbeitung von Füllstand und Inhalt über Smartphone.
        *   Batch-Druck: QR-Codes für mehrere Container gleichzeitig drucken.
    *   **Dynamische Inhalts-Verfolgung:**
        *   Verwaltung von Chargen/Batches pro Container mit individuellen Mengen.
        *   Mehrere Produkte pro Container erlaubt (z.B. T 341 mit 3 verschiedenen Mazeraten).
        *   Hinzufügen/Entfernen von Chargen mit automatischer Füllstand-Berechnung.
        *   Echtzeit-Übersicht über Gesamtinhalt und Zusammensetzung.
    *   **Automatisches Backup-System:** *(NEU in v1.2.2)*
        *   Automatische Backups bei jeder Container-Änderung (XLSX-Import, Befüllen, Bearbeiten).
        *   10 Backup-Versionen mit Timestamp (z.B. `tankDefinitions_backup_2025-11-18T14-30-45`).
        *   Button "📦 Backup wiederherstellen" zur Auswahl und Wiederherstellung alter Versionen.
        *   Backup-Rotation: Letzte 10 werden behalten, ältere automatisch gelöscht.
        *   Schutz vor Datenverlust bei XLSX-Imports, versehentlichem Löschen oder Sync-Fehlern.
    *   **OneDrive-Synchronisation:**
        *   Optional: Lokale OneDrive-Ordner-Synchronisation ohne Azure-Registrierung.
        *   Automatische Backups der Container-Daten in lokalen OneDrive-Ordner.
        *   Wiederherstellung von Container-Daten aus OneDrive-Backups.

*   **Rezeptur-System:** *(NEU in v1.1.0)*
    *   **Rezeptur-Editor:**
        *   Excel-Style Tabelle zur Verwaltung von Produkt-Rezepturen (z.B. GFKC aus 10-12 Komponenten).
        *   Inventory-Integration: Komponenten per Dropdown aus Lagerbeständen auswählbar.
        *   Freie Zutaten: Freitext-Eingabe für Wasser, Zucker, Zusatzstoffe etc.
        *   Editierbarer Alkoholgehalt pro Komponente mit Auto-Berechnung.
        *   Live-Berechnung von Liter, Prozent, %vol und Litern Absolutalkohol (LA).
    *   **Intelligente Mengen-Anzeige:**
        *   Automatische Einheiten-Umschaltung: ≤ 2L → Anzeige in **ml** (Testmischungen), > 2L → **L** (Produktionsmengen).
        *   Deutsche Formatierung mit Komma als Dezimaltrennzeichen.
    *   **Alkohol-Korrektur:**
        *   Wasser/Sprit-Korrektur bei Abweichungen vom Zielalkoholgehalt.
        *   Eingabe von gemessenem vs. Ziel-Alkoholgehalt mit automatischer Mengen-Berechnung.
    *   **Workflow-Status:**
        *   5 Status-Checkboxen für Produktionsprozess: Entwurf → Freigabe → Produktion → Fertig → Archiv.
        *   Visuelle Fortschritts-Anzeige und Status-Tracking.
    *   **Produktions-Protokoll:**
        *   Druckbares A4-Protokoll für die Produktion.
        *   SOLL/IST-Werte mit Abweichungs-Anzeige (± ml/L).
        *   Summenzeile mit Gesamt-Litern und gewichtetem %vol.
        *   Sensorik-Bereich mit karierter Notiz-Box für Verkostungs-Notizen.
        *   IST-Werte-Übernahme aus Eingabefeldern.
    *   **Datenmodell & Persistenz:**
        *   Zod-Schemas für Rezeptur-Validierung (RezepturSchema, RezepturKomponenteSchema).
        *   Rezeptur-Manager mit CRUD-Operationen (erstellen, laden, aktualisieren, löschen).
        *   Persistent Storage via hybridStorage (Electron + localStorage).
        *   Rezepturen-Liste mit Suche, Filter und Status-Übersicht.

*   **Benutzeroberfläche:**
    *   Gestaltet im Stil alter Apothekerbücher/kolorierter Kupferstiche mit pergamentartigen Farben und einer klaren, gut lesbaren Schrift.
    *   Navigation über eine Kopfleiste zu den Bereichen "Mazerationsprotokoll" und "Lagerverwaltung".

## 2. Änderungsprotokoll (Chronologisch)

### **v1.2.3 - Google Calendar Integration (21.11.2025)**

*   **Dashboard-Widget: Google Calendar** *(FEATURE 6.1)*
    *   Vollständige Google Calendar Integration mit OAuth 2.0
    *   **Native Electron-OAuth via IPC:**
        *   IPC-Handler `google-oauth-login` in `electron/main.ts`
        *   Modal BrowserWindow statt Browser-Popup (umgeht COOP-Probleme)
        *   URL-Überwachung via `will-redirect` und `did-navigate` Events
        *   Automatische Token-Extraktion aus URL-Hash
        *   Kein Popup-Blocking, bessere UX
    *   **Kalender-Monatsansicht:**
        *   7-Tage-Woche (Mo-So) mit deutscher Formatierung
        *   Aktueller Tag hervorgehoben (blau)
        *   Event-Indikatoren: Bis zu 3 Punkte unter Tagen mit Terminen
        *   Tooltip zeigt Event-Titel bei Hover
    *   **Navigation & Interaktion:**
        *   ‹ / › Buttons zum Blättern zwischen Monaten
        *   Monatsname und Jahr als Header (z.B. "November 2025")
        *   Klick auf Tag öffnet Event-Erstellungs-Dialog mit vorausgefülltem Datum (9:00-10:00 Uhr)
        *   Automatisches Nachladen der Events beim Monatswechsel
    *   **Event-Management:**
        *   Erstellen: Dialog mit Titel, Datum/Zeit, Ort, Beschreibung
        *   Bearbeiten: Button bei jedem Event
        *   Löschen: Mit Bestätigung
        *   .ics-Download: Export für Kalender-Import
    *   **Event-Liste:** Nächste 5 anstehende Termine unter dem Kalender
    *   **Client-ID hardcodiert:** `1004514561626-ak5fear0b788324hrchjbv6hkhdiobam.apps.googleusercontent.com`
    *   **Technisch:**
        *   `src/lib/google-calendar.ts`: API-Wrapper mit Electron-IPC-Support
        *   `electron/preload.js`: IPC-Bridge `invoke()` für OAuth
        *   Google Identity Services + Google Calendar API v3
        *   COOP-Problem gelöst durch native BrowserWindow

*   **Grundlegende Einrichtung:** Next.js-Anwendung initialisiert.
*   **Mazerationsformular - Phase 1 (Basis):**
    *   Eingabefelder für Name der Mazeration und 5-stellige numerische Chargennummer. App-Name geändert.
    *   PDF-Export für das ausgefüllte Protokoll implementiert.
*   **Mazerationsformular - Phase 2 (Zeit & Bemerkungen):**
    *   Eingabefelder für Uhrzeit (Beginn/Ende) des Mazerationszeitraums hinzugefügt.
    *   Berechnung und Anzeige der Mazerationsdauer in Tagen und Stunden.
    *   Texteingabefeld für "Bemerkungen" im Ergebnisblock hinzugefügt.
*   **Mazerationsformular - Phase 3 (Datum & Einheiten):**
    *   Datumsfeld für "Erstellungsdatum" in den Basisdaten hinzugefügt.
    *   Auswahlmöglichkeit für Gewichtseinheit der Pflanze (g/kg) und Volumeneinheit des Alkohols (ml/l).
*   **Mazerationsformular - Phase 4 (Kistenmanagement & Logik):**
    *   Bedingte Eingabefelder für "Anzahl Kisten", "Bruttogewicht kg", "Tara Kiste" (fix auf 2,00 kg) bei kg-Einwaage der Pflanze.
    *   Automatische Berechnung und Anzeige des Nettogewichts der Pflanze und des durchschnittlichen Nettogewichts pro Kiste.
    *   Automatische Anpassung der Alkoholeinheit auf Liter, wenn Pflanzengewicht in kg.
*   **Mazerationsformular - Phase 5 (Weitere Details & Exporte):**
    *   Eingabefeld für "Durchschnittliche Raumtemperatur".
    *   XLSX-Export für das ausgefüllte Protokoll hinzugefügt.
    *   Felder "Erntedatum" und "Qualitätsbeurteilung bei Anlieferung" hinzugefügt.
    *   Ausbeuteeinheit (ml/l) dynamisch basierend auf Pflanzengewichtseinheit.
    *   Berechnung und Anzeige von absolutem und prozentualem Verlust.
*   **Design & UI Anpassungen:**
    *   Versuch, Schriftart "Eskapade Fraktur" zu verwenden, nach Problemen rückgängig gemacht und bei Helvetica/Inter geblieben.
    *   "by" und Logo aus Header entfernt.
*   **Leerformular-Funktionalität:**
    *   Export eines leeren Protokollformulars als PDF, XLSX und DOCX implementiert.
    *   DOCX-Leerformular: Zweispaltig, A4 Querformat.
*   **Datenpersistenz & -struktur (Iterationen):**
    *   Ursprünglicher Plan zur Speicherung in Firebase Firestore wurde verworfen/zurückgenommen.
    *   Fokus auf lokale Speicherung (`localStorage` für Lagerdaten, Dateiexporte für Mazerationsprotokolle).
*   **Mazerationsformular - Phase 6 (Liter Absolutalkohol & Zeitaufzeichnung):**
    *   Berechnung und Anzeige von "Eingesetzte LA", "Ausbeute LA" und "Verlust LA".
    *   Neuer Bereich "Zeitaufzechnung" mit Eingabefeldern für Datum, Von/Bis-Zeiten und automatischer Stundenberechnung für "Vorbereitung", "Verarbeitung Kräuter", "Verarbeitung Mazerat", "Reinigung", "Sonstiges" sowie eine Gesamtsumme der Stunden.
*   **Kontinuierlicher Protokoll-Export & Formular-Reset:**
    *   Implementierung der kontinuierlichen Speicherung aller Mazerations-Protokolle in einer kumulativen XLSX-Datei (spaltenweise). Dateiname mit aktuellem Datum.
    *   Zurücksetzen aller Eingabefelder bei Auswahl "Neues Protokoll".
    *   Sicherstellung der Verwendung des Kommas als Dezimaltrennzeichen in Anzeigen und Eingaben.
    *   Entfernung des Feldes "Sammlung (für Dateiname)".
    *   Formatierungsanpassungen für die kumulative XLSX-Datei (Kopfzeilen, Ausrichtung).
*   **Lagerverwaltung - Phase 1 (Grundstruktur & Artikelstamm):**
    *   Navigationslink "Lagerverwaltung" und zugehörige Seite (`/inventory`) hinzugefügt.
    *   Grundlegende Schemata für Inventarartikel (`StoredInventoryItem`) und Transaktionen (`InventoryTransaction`) in `inventorySchema.ts` erstellt.
    *   Komponente `InventoryManagement.tsx` als zentrale Verwaltungslogik.
    *   Erstellung des Artikelstamms (Master Data Management):
        *   Schema `artikelDefinitionSchema.ts` für Artikeldefinitionen.
        *   Dialog `AddEditArtikelDefinitionDialog.tsx` zum Anlegen/Bearbeiten von Artikeldefinitionen (Feldreihenfolge angepasst: Produktname zuerst).
        *   Tabelle `ArtikelDefinitionTable.tsx` zur Anzeige des Artikelstamms.
        *   Speicherung der Artikeldefinitionen im `localStorage`.
        *   Filterung nach Kategorie und Sortierung für die Artikelstamm-Tabelle implementiert.
*   **Lagerverwaltung - Phase 2 (Chargen & Transaktionen):**
    *   Komponente `AddInventoryItemDialog.tsx` zum Anlegen/Bearbeiten von Lagerartikeln/Chargen.
        *   Möglichkeit, einen Artikel aus dem Stamm auszuwählen, wodurch Artikel-Nr., Name und Kategorie automatisch befüllt werden.
        *   Standard-Alkoholgehalt von 60% für neue Artikel der Kategorie "Einsatzalkohol".
    *   Komponente `InventoryTable.tsx` zur Anzeige der einzelnen Chargen.
        *   Filterung nach Kategorie und Sortierung für diverse Spalten (inkl. berechnetem LA) implementiert.
    *   Dialog `RecordTransactionDialog.tsx` zur Erfassung von Zu- und Abgängen für spezifische Chargen.
    *   Speicherung der einzelnen Transaktionsdaten im `localStorage` als separate Einträge.
*   **Lagerverwaltung - Phase 3 (Übersichten & Exporte):**
    *   Komponente `InventorySummary.tsx` zur Anzeige der summierten Lagerbestände pro Artikel (Gesamtmenge & Gesamt-LA).
    *   Komponente `InventoryTransactionTable.tsx` zur Anzeige des detaillierten Transaktionsprotokolls mit Filter- und Sortierfunktionen.
    *   Implementierung des XLSX-Exports für das Transaktionsprotokoll.
    *   Implementierung des XLSX-Exports für die Lagerübersicht (nach Artikel).
*   **Styling & UI-Verbesserungen:**
    *   Globales CSS (`globals.css`) angepasst, um einen Stil zu erzeugen, der an alte Apothekerbücher/kolorierte Kupferstiche erinnert (pergamentartige Farben, Tinten-ähnliche Schriftfarben).
    *   Diverse UI-Verbesserungen in Tabellen: Tooltips für lange Texte, differenziertere Badges, Scrollbalken für breite Tabellen.
*   **Fehlerbehebungen:**
    *   Mehrfache Iterationen zur Behebung von Hydrationsfehlern in Next.js (einschließlich des Versuchs mit `suppressHydrationWarning` am `<html>`-Tag).
    *   Korrekturen bezüglich "controlled vs. uncontrolled input components" und "`value` prop on `input` should not be null"-Fehlern, insbesondere durch konsistente Verwendung von `field.value ?? ""` und Anpassung von Schema-Definitionen (Entfernung von `.nullable()` bei optionalen Strings).

*   **Tank-Management - Implementierung (2025):**
    *   QR-Code-Generierung für ausgewählte Tanks hinzugefügt.
    *   Mobile-optimierte Tank-Detail-Seiten entwickelt.
    *   Tank-Content-Manager mit dynamischer Chargen-Verwaltung.
    *   OneDrive-Synchronisation für lokale Backups ohne Azure-Registrierung.
    *   Print-optimierte QR-Code-Ausgabe implementiert.
    *   Bereinigung veralteter Cloud-Integration-Ansätze (ngrok, Azure-Services).

*   **Tank-Management - Verbesserungen Oktober 2025:**
    *   **Master-QR System:**
        *   Master-QR-Code Generierung für Container-Übersicht implementiert.
        *   Master-View (`tank-viewer-secure.html?view=all`) mit Grid-Layout aller befüllten Container.
        *   Intelligente Sortierung: Tank → Cont → IBC → Fass → K → Fl → B.
        *   Kategorien-Anzeige (Mazerat/Destillat/Selbstbeleg) in Container-Cards.
        *   Vollständige Container-IDs (Fass-1, B-2 statt nur "Fass", "B").
        *   1 Nachkommastelle für Kapazitätsangaben (81.0L / 200.0L).
    *   **QR-Album Verbesserungen:**
        *   Container-Indexierung: Fass-1, Fass-2, B-1, B-2 statt nur "Fass", "B".
        *   Produktnamen statt Container-Typ anzeigen.
        *   Mazerat/Destillat Kategorien in QR-Album Cards (📋 Symbol).
        *   1 Nachkommastelle für alle Volumenangaben (Füllstand + Kapazität).
        *   Aktuelles Datum auf jedem QR-Code für Traceability.
        *   "Leer"-Status für ungefüllte Container.
    *   **Datenstruktur-Fixes:**
        *   Container-Gruppierung nach `container.id` statt `tankNr` behoben (904L Bug).
        *   Kritischer Bug behoben: Alle Container mit gleicher `tankNr` wurden zusammengefasst.
        *   Index-basierte Inventory-Extraktion für Container mit gleicher tankNr implementiert.
        *   Beispiel: Fass-1, Fass-2, Fass-3 teilen `tankNr: "Fass"` aber haben unique `id`.
        *   Füllstandsbalken mit farbcodierter Prozentanzeige (grün > 70%, gelb > 30%, rot < 30%).
    *   **GitHub Pages Integration:**
        *   Branch-Strategie bereinigt: `pages-clean` als einziger Production-Branch.
        *   localStorage Migration implementiert: Forciert `branch: 'pages-clean'` bei jedem Save.
        *   Alle QR-URLs hardcoded auf GitHub Pages (keine localhost-Links mehr).
        *   Build-Cache (.next/out) Problematik dokumentiert und gelöst.
        *   Token-Migration für Auto-Sync auf pages-clean Branch.
    *   **Bezeichnungs-Cleanup:**
        *   "Auto-erkannt:" Prefix aus allen Container-Bezeichnungen entfernt.
        *   Tank-data.json bereinigt und in /docs deployed für GitHub Pages Zugriff.
        *   Konsistente Namensgebung: "T 341" statt "Auto-erkannt: T 341".
    *   **Zentrale GitHub-Konfiguration (Oktober 2025):**
        *   **Problem gelöst**: Duplicate GitHub-Config in "Tank-QR-System" UND "App-Daten-Sync".
        *   **Lösung**: Singleton-basierter `GitHubConfigManager` mit Priority-Loading.
        *   **UI-Komponente**: `GitHubConnectionSettings` als erste Tab in Einstellungen.
        *   **Token-Storage**: `.env.local` für einfaches Kopieren zwischen Rechnern.
        *   **Event-System**: `githubConfigUpdated` für automatische Cross-Component-Updates.
        *   **Status-Feedback**: Connected/Configured/Not configured mit Test-Button.
        *   **Verwendung**: Tank-QR-System + App-Daten-Sync nutzen zentrale Config.
        *   **Dokumentation**: Siehe `GITHUB_CONFIG_ZENTRAL.md` für Details.
    *   **Technische Details:**
        *   getTankFillLevel() Funktion überarbeitet: Rückgabe von `products` und `categories` Arrays.
        *   Master-View `loadAllTanks()`: Container-spezifische Datenextraktion statt tankNr-basiert.
        *   QR-Album: hasUniqueNumber Check für automatische Indexierung.
        *   Viewer: PIN-geschützt (00369 oder 78963), optimiert für Mobile und Desktop.

## 3. Mögliche zukünftige Erweiterungen und Verbesserungen

*   **Backend-Integration:**
    *   Umstellung der Datenpersistenz von `localStorage` auf eine serverseitige Datenbank (z.B. Firebase Firestore, Supabase) für Robustheit, zentrale Datenhaltung, Backups und potenzielle Mehrbenutzerfähigkeit.
*   **Detailliertere Produktionsmodul-Abbildung:**
    *   Direkte Verknüpfung von Materialverbrauch (z.B. Abgang von Einsatzalkohol) mit der Produktion eines neuen Artikels/Charge (z.B. Zugang eines Mazerats) über eine geführte Aktion.
    *   Konzept einer Stückliste (Bill of Materials) für Produkte.
    *   Berechnung von Produktionskosten.
*   **Erweiterte Berichte und Analysen:**
    *   Visuelle Diagramme für Lagerbestandsentwicklungen.
    *   Berichte über Materialverbrauch, Produktionsausbeuten, spezifische Verluste pro Prozess.
    *   Für Steuerzwecke relevante Berichte (z.B. Alkoholbilanz).
*   **Benutzerverwaltung und Authentifizierung:**
    *   Falls mehrere Benutzer Zugriff benötigen oder die Daten besser geschützt werden sollen (insbesondere bei Cloud-Speicher).
*   **Optimierte Suchfunktionen:**
    *   Umfassendere Suchmöglichkeiten über alle Protokolle und Lagerartikel hinweg.
*   **Mobile Optimierung und PWA (Progressive Web App):**
    *   Weitere Verbesserung der Darstellung und Bedienung auf mobilen Geräten.
    *   PWA-Funktionen für verbesserte Offline-Fähigkeiten (wobei die Datenspeicherung dann kritisch wird, wenn nicht `localStorage` verwendet wird).
*   **Anpassbare Einheiten:**
    *   Flexibilität, falls die festen Einheiten (g, kg, ml, l) nicht für alle Anwendungsfälle ausreichen.
*   **Automatisierte Benachrichtigungen:**
    *   Z.B. bei Erreichen von Mindestbeständen.
*   **Versionsverlauf für Protokolle:**
    *   Möglichkeit, ältere Versionen eines Mazerationsprotokolls einzusehen oder wiederherzustellen (bei Dateiexporten eher schwierig, bei DB-Speicherung einfacher).
*   **Internationalisierung (i18n):**
    *   Unterstützung für mehrere Sprachen, falls die Anwendung international eingesetzt werden soll.
*   **Direktes Drucken aus der Anwendung:**
    *   Zusätzlich zum PDF-Export eine Funktion, um direkt den Druckdialog des Browsers zu öffnen.
*   **Fein-Tuning der UI/UX:**
    *   Kontinuierliche Verbesserung der Benutzerführung und des visuellen Erscheinungsbilds basierend auf Feedback.
*   **Importfunktionen:**
    *   Möglichkeit, bestehende Lagerdaten oder Artikelstämme aus z.B. CSV-Dateien zu importieren.

Diese Dokumentation wird bei zukünftigen Änderungen und Erweiterungen laufend aktualisiert.
    
