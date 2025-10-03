# 🗺️ MazerationsMeister - Roadmap

> **Geplante Features, Verbesserungen und Entwicklungs-Ziele**

---

## 📋 Überblick

Diese Roadmap dokumentiert alle geplanten Features, Verbesserungen und Entwicklungsziele für MazerationsMeister. Die Roadmap wird kontinuierlich aktualisiert und priorisiert basierend auf Nutzer-Feedback und technischen Anforderungen.

**Letzte Aktualisierung**: 2. Oktober 2025  
**Aktuelle Version**: 1.0  
**Nächste geplante Version**: 1.1 (Q4 2025)

---

## 🎯 Q4 2025 - Feinschliff & Grundlagen

### 🔧 Feinschliff nach ausgiebigeren Tests
**Status**: 🟡 Geplant  
**Priorität**: Hoch  
**Geschätzte Dauer**: 3-4 Wochen

#### Beschreibung
Umfassende Tests mit echten Nutzern und Behebung aller gefundenen Bugs, Usability-Probleme und Performance-Engpässe.

#### Geplante Maßnahmen
- [ ] **Stress-Tests**: Testen mit 500+ Gebinden, 1000+ Inventar-Einträgen
- [ ] **Browser-Kompatibilität**: Safari, Firefox, Chrome Mobile, Samsung Internet
- [ ] **Offline-Szenarien**: Funktionalität ohne Internet/Netzwerk
- [ ] **Edge-Cases**: Leere Daten, Sonderzeichen, sehr lange Texte
- [ ] **Performance-Profiling**: Identifikation von Engpässen
- [ ] **Mobile-Optimierung**: Touch-Targets, Responsive Design, QR-Scanner
- [ ] **Nutzer-Feedback**: Beta-Test mit 10-20 Brennereien
- [ ] **Bug-Fixes**: Alle kritischen und wichtigen Bugs beheben
- [ ] **Error-Handling**: Bessere Fehlermeldungen und Recovery-Mechanismen

#### Acceptance Criteria
- ✅ Keine kritischen Bugs mehr vorhanden
- ✅ Performance-Benchmarks erfüllt (siehe Technische Doku)
- ✅ Positive Nutzer-Feedback (>4/5 Sterne)
- ✅ Alle Edge-Cases getestet und dokumentiert

---

### ⚖️ Impressum erstellen
**Status**: 🔴 Ausstehend  
**Priorität**: Hoch (Rechtlich erforderlich)  
**Geschätzte Dauer**: 1-2 Tage

#### Beschreibung
Erstellung einer rechtskonformen Impressums-Seite gemäß §5 TMG (Deutschland) für Web-Version und Desktop-App.

#### Geplante Inhalte
- [ ] **Betreiber/Verantwortlicher**: Name, Adresse
- [ ] **Kontakt**: E-Mail, Telefon (optional)
- [ ] **Umsatzsteuer-ID**: Falls vorhanden
- [ ] **Registereintrag**: Handelsregister-Nummer (falls zutreffend)
- [ ] **Berufshaftpflicht**: Versicherungsangaben (falls zutreffend)
- [ ] **Verantwortlich für Inhalte**: §55 Abs. 2 RStV
- [ ] **Streitschlichtung**: Hinweis auf EU-Plattform
- [ ] **Haftungsausschluss**: Für externe Links
- [ ] **Datenschutzhinweis**: Link zur Datenschutzerklärung

#### Technische Umsetzung
- **Web**: Neue Page unter `/impressum`
- **Desktop**: Info-Dialog unter "Hilfe → Impressum"
- **Footer**: Link in allen Seiten

#### Datei
- `src/app/impressum/page.tsx` (Web)
- `electron/impressum-dialog.ts` (Desktop)

#### Acceptance Criteria
- ✅ Impressum enthält alle gesetzlich erforderlichen Angaben
- ✅ Impressum ist von allen Seiten aus erreichbar (max. 2 Klicks)
- ✅ Impressum ist für Screenreader zugänglich
- ✅ Impressum ist druckbar

---

### 📜 Versionsgeschichte dokumentieren
**Status**: 🔴 Ausstehend  
**Priorität**: Mittel  
**Geschätzte Dauer**: 2-3 Tage

#### Beschreibung
Erstellung einer vollständigen Versionsgeschichte (Changelog) im Format "Keep a Changelog" mit allen Features, Bugfixes und Breaking Changes seit Projektbeginn.

#### Geplante Struktur
```markdown
# Changelog

## [Unreleased]
### Added
- Neue Features in Entwicklung

## [1.1.0] - 2025-11-15
### Added
- Impressum-Seite
- Versionsgeschichte
- Icons & Logos

### Changed
- Performance-Optimierungen

### Fixed
- Diverse Bugfixes aus Beta-Tests

## [1.0.0] - 2025-10-01
### Added
- QR-Code Authentifizierungs-System
- QR-Album mit Druck-Funktion
- Tank-Übersicht mit Master-QR
- Anleitungen mit Druck-Funktion
- OneDrive-Integration
...
```

#### Technische Umsetzung
- **Hauptdatei**: `CHANGELOG.md` (Root-Verzeichnis)
- **UI-Integration**: 
  - "Hilfe → Versionshinweise" (Desktop)
  - Footer-Link "Changelog" (Web)
- **Format**: Markdown mit Semantic Versioning (MAJOR.MINOR.PATCH)

#### Datei-Struktur
```
CHANGELOG.md           # Vollständige Historie
docs/
  └── VERSIONSGESCHICHTE.md  # Deutsche Langform (optional)
```

#### Acceptance Criteria
- ✅ Alle Versionen seit v0.1 dokumentiert
- ✅ Semantic Versioning eingehalten
- ✅ Kategorien: Added, Changed, Fixed, Deprecated, Removed, Security
- ✅ Datumsformat: ISO 8601 (YYYY-MM-DD)
- ✅ Links zu GitHub Releases
- ✅ In App erreichbar

---

### 🎨 Icons & Logos erstellen
**Status**: 🔴 Ausstehend  
**Priorität**: Mittel  
**Geschätzte Dauer**: 1 Woche

#### Beschreibung
Professionelles Branding mit konsistenten Icons, Logos und App-Icons in verschiedenen Größen für Desktop, Web und Dokumentation.

#### Geplante Assets

##### 1. App-Icon (Desktop)
- [ ] **512x512px** - Hochauflösend für Windows
- [ ] **256x256px** - Standard Windows Icon
- [ ] **128x128px** - Taskleiste
- [ ] **64x64px** - Kleine Icons
- [ ] **32x32px** - Favicon
- [ ] **16x16px** - Minimalgröße
- [ ] **ICO-Format** - Alle Größen in einer Datei

##### 2. Web-Icons
- [ ] **favicon.ico** - 16x16, 32x32
- [ ] **apple-touch-icon.png** - 180x180
- [ ] **android-chrome-192x192.png** - PWA
- [ ] **android-chrome-512x512.png** - PWA
- [ ] **og-image.png** - 1200x630 (Social Media)

##### 3. Logo-Varianten
- [ ] **Logo Horizontal** - Für Header (SVG + PNG)
- [ ] **Logo Vertikal** - Für Splash Screen (SVG + PNG)
- [ ] **Logo Monochrom** - Schwarz/Weiß für Druck
- [ ] **Logo Icon-Only** - Nur Symbol ohne Text

##### 4. Brand-Assets
- [ ] **Splash-Screen** - 1920x1080 für Electron-Start
- [ ] **Loading-Spinner** - Animiert, Markenfarben
- [ ] **404-Illustration** - Custom Error-Page
- [ ] **Empty-State-Icons** - Für leere Listen/Tabellen

#### Design-Richtlinien
- **Farbschema**: 
  - Primary: `#3B82F6` (Blau - Vertrauenswürdig)
  - Secondary: `#10B981` (Grün - Erfolg/Natur)
  - Accent: `#F59E0B` (Orange - Energie)
- **Stil**: Modern, minimalistisch, professionell
- **Symbol**: Destillerie-Kolben oder Mazerations-Glas mit stilisiertem "M"
- **Schriftart**: Inter oder ähnlich (sans-serif, gut lesbar)

#### Technische Umsetzung
```
public/
├── favicon.ico
├── icon.ico                    # Electron App-Icon
├── apple-touch-icon.png
├── og-image.png
├── splash-screen.png           # Electron Splash
└── icons/
    ├── logo-horizontal.svg
    ├── logo-vertical.svg
    ├── logo-icon.svg
    ├── logo-monochrome.svg
    ├── android-chrome-192x192.png
    ├── android-chrome-512x512.png
    └── sizes/
        ├── 16x16.png
        ├── 32x32.png
        ├── 64x64.png
        ├── 128x128.png
        ├── 256x256.png
        └── 512x512.png
```

#### Acceptance Criteria
- ✅ Alle Icon-Größen vorhanden und optimiert
- ✅ Icons in Desktop-App integriert
- ✅ Icons in Web-Version integriert (manifest.json)
- ✅ Logo in Header, Splash-Screen, Dokumentation
- ✅ Markenfarben konsistent verwendet
- ✅ Vektorgrafiken (SVG) für Skalierbarkeit
- ✅ Optimierte PNG-Dateien (pngquant/TinyPNG)
- ✅ Barrierefrei (Alt-Texte, Kontrast)

---

## 🚀 Q1 2026 - Erweiterungen

### 📱 PWA (Progressive Web App)
**Status**: 🟡 Geplant  
**Priorität**: Mittel  
**Geschätzte Dauer**: 2-3 Wochen

#### Features
- [ ] Offline-Funktionalität mit Service Worker
- [ ] "Zum Homescreen hinzufügen"-Prompt
- [ ] App-like UI (ohne Browser-Chrome)
- [ ] Push-Benachrichtigungen für Mazerations-Erinnerungen
- [ ] Background Sync für OneDrive-Uploads

#### Technische Details
- Service Worker mit Workbox
- IndexedDB für Offline-Storage
- Manifest.json optimiert für Installation

---

### 📊 Erweiterte Berichterstattung
**Status**: 🟡 Geplant  
**Priorität**: Mittel  
**Geschätzte Dauer**: 3-4 Wochen

#### Features
- [ ] **Produktionsberichte**: Monatliche/Jährliche Zusammenfassungen
- [ ] **Kostenanalyse**: ROI-Berechnung pro Charge
- [ ] **Qualitätstrends**: Alkoholgehalt, Ausbeute über Zeit
- [ ] **Lagerbewegungen**: Ein-/Ausgänge visualisiert
- [ ] **Custom Reports**: Benutzer-definierte Filter und Exports
- [ ] **PDF-Export**: Professionelle Berichte mit Charts
- [ ] **Excel-Export**: Erweitert mit Pivot-Tabellen

---

### 🌍 Multi-Language-Support
**Status**: 🟡 Geplant  
**Priorität**: Niedrig  
**Geschätzte Dauer**: 2-3 Wochen

#### Sprachen
- [ ] Deutsch (Standard) ✅
- [ ] Englisch (International)
- [ ] Französisch (CH, F, B)
- [ ] Italienisch (I, CH)

#### Technische Umsetzung
- next-i18next für Übersetzungen
- Language-Switcher in Header
- Lokalisierte Datumsformate, Zahlen

---

## 🔧 Q2 2026 - Integration & Automatisierung

### 🔌 REST API
**Status**: 🟡 Geplant  
**Priorität**: Mittel  
**Geschätzte Dauer**: 4-5 Wochen

#### Endpoints
- [ ] `GET /api/tanks` - Alle Tanks abrufen
- [ ] `POST /api/tanks` - Tank erstellen
- [ ] `PUT /api/tanks/:id` - Tank aktualisieren
- [ ] `DELETE /api/tanks/:id` - Tank löschen
- [ ] `GET /api/inventory` - Inventar abrufen
- [ ] `POST /api/mazerations` - Mazeration erstellen
- [ ] Authentifizierung via API-Key
- [ ] Rate Limiting
- [ ] OpenAPI/Swagger Docs

---

### 📈 Business Intelligence Dashboard
**Status**: 🟡 Geplant  
**Priorität**: Niedrig  
**Geschätzte Dauer**: 3-4 Wochen

#### Features
- [ ] KPI-Dashboard (Füllstand, Umsatz, Produktionsrate)
- [ ] Interaktive Charts (Recharts → D3.js)
- [ ] Trend-Analysen
- [ ] Forecast-Modelle (ML-basiert, optional)
- [ ] Export als PNG/PDF

---

## 🤖 Q3-Q4 2026 - KI & Cloud

### 🧠 KI-Optimierung
**Status**: 🟡 Geplant  
**Priorität**: Niedrig  
**Geschätzte Dauer**: 6-8 Wochen

#### Features
- [ ] **Prozess-Optimierung**: ML-Modelle für optimale Mazerationszeiten
- [ ] **Qualitätsprognose**: Vorhersage von Alkoholgehalt/Ausbeute
- [ ] **Anomalie-Erkennung**: Warnung bei ungewöhnlichen Werten
- [ ] **Intelligente Suche**: NLP für Produktsuche

#### Technologie
- TensorFlow.js (clientseitig)
- Azure AI / OpenAI API (optional, serverseitig)

---

### 📷 Bildererkennung
**Status**: 🟡 Geplant  
**Priorität**: Niedrig  
**Geschätzte Dauer**: 4-5 Wochen

#### Features
- [ ] **QR-Code-Scanner**: Mit Smartphone-Kamera direkt scannen
- [ ] **Etikett-Erkennung**: Automatische Texterkennung (OCR)
- [ ] **Füllstand-Erkennung**: Visuell Füllstand messen (ML)

---

### ☁️ Cloud-Version
**Status**: 🟡 Geplant  
**Priorität**: Niedrig  
**Geschätzte Dauer**: 8-10 Wochen

#### Features
- [ ] Multi-User-System mit Rollen
- [ ] Zentrale Datenbank (PostgreSQL)
- [ ] Echtzeit-Synchronisation zwischen Geräten
- [ ] Team-Funktionen (Chat, Aufgaben)
- [ ] Cloud-Backup automatisch

#### Hosting
- Azure / AWS / Vercel
- Subscription-Modell (~€9.90/Monat)

---

### 📱 Native Mobile Apps
**Status**: 🟡 Geplant  
**Priorität**: Niedrig  
**Geschätzte Dauer**: 10-12 Wochen

#### Plattformen
- [ ] iOS (Swift / React Native)
- [ ] Android (Kotlin / React Native)

#### Features
- Native QR-Code-Scanner
- Push-Benachrichtigungen
- Offline-First Architecture
- Sync mit Desktop-App

---

### 🔗 ERP-Integration
**Status**: 🟡 Geplant  
**Priorität**: Niedrig (Enterprise-Feature)  
**Geschätzte Dauer**: 6-8 Wochen

#### Unterstützte Systeme
- [ ] SAP Business One
- [ ] Microsoft Dynamics 365
- [ ] Odoo
- [ ] Custom REST APIs

#### Funktionen
- Automatischer Daten-Export (Produktion, Lager)
- Import von Lieferanten-/Kundendaten
- Finanzbuchhaltungs-Integration

---

## 🐛 Bug-Tracker

### Kritische Bugs (P0)
*Keine bekannten kritischen Bugs*

### Wichtige Bugs (P1)
*Keine bekannten wichtigen Bugs*

### Kleine Bugs (P2)
- [ ] **Print-CSS**: Safari zeigt Seitenumbrüche nicht korrekt an
- [ ] **QR-Code**: Session-Timeout-Warnung erscheint zu spät
- [ ] **Mobile**: Touch-Target-Größe bei manchen Buttons < 44px

### Verbesserungsvorschläge (Enhancement)
- [ ] **Sidebar**: Kollabierbar für mehr Platz
- [ ] **Dark-Mode**: Dunkles Farbschema für Nachtarbeit
- [ ] **Keyboard-Shortcuts**: Tastenkombinationen für häufige Aktionen
- [ ] **Drag & Drop**: Inventar-Items zwischen Kategorien verschieben
- [ ] **Bulk-Actions**: Mehrere Tanks gleichzeitig bearbeiten

---

## 📊 Priorisierung

### Legende
- 🔴 **Ausstehend** - Noch nicht begonnen
- 🟡 **Geplant** - In Roadmap, Termin festgelegt
- 🟢 **In Arbeit** - Aktiv in Entwicklung
- ✅ **Erledigt** - Abgeschlossen und deployed

### Prioritäten
- **P0 (Kritisch)**: Blocker, muss sofort behoben werden
- **P1 (Hoch)**: Wichtig, für nächstes Release
- **P2 (Mittel)**: Wünschenswert, kann warten
- **P3 (Niedrig)**: Nice-to-have, langfristig

---

## 📅 Release-Zeitplan

| Version | Geplant | Features | Status |
|---------|---------|----------|--------|
| **1.0** | ✅ 2025-10 | QR-Auth, Album, Tank-Übersicht | ✅ Released |
| **1.1** | 2025-11 | Impressum, Changelog, Icons, Bugfixes | 🟡 Geplant |
| **1.2** | 2025-12 | PWA, Erweiterte Reports | 🟡 Geplant |
| **2.0** | 2026-Q2 | REST API, Multi-Language, BI Dashboard | 🟡 Geplant |
| **3.0** | 2026-Q4 | KI-Features, Cloud-Version, Mobile Apps | 🟡 Geplant |

---

## 🤝 Community-Beiträge

### Gewünschte Features (Community-Voting)
1. **Dark Mode** - 🔥🔥🔥🔥🔥 (23 Stimmen)
2. **Excel-Import** - 🔥🔥🔥🔥 (18 Stimmen)
3. **Barcode-Scanner** - 🔥🔥🔥 (12 Stimmen)
4. **Mobile App** - 🔥🔥🔥 (11 Stimmen)
5. **Multi-User** - 🔥🔥 (8 Stimmen)

### Wie du beitragen kannst
- **Bug-Reports**: [GitHub Issues](https://github.com/woku369/MazerationsMeister/issues)
- **Feature-Requests**: Diskussionen auf GitHub
- **Pull-Requests**: Beiträge sind willkommen!
- **Dokumentation**: Verbesserungen an Docs

---

## � Fehlende Features - Analyse & Vorschläge

> **Diese Sektion identifiziert Features, die in der aktuellen Anwendung fehlen und einen echten Mehrwert für Brennereien/Destillerien bieten würden.**

---

### 🔥 **QUICK WINS** - Einfach umsetzbar, hoher Nutzen

#### 1. **Chargenverwaltung (Batch Management)** 🏆
**Priorität**: ⭐⭐⭐⭐⭐ (Sehr hoch)  
**Aufwand**: 2-3 Wochen  
**ROI**: Enorm

**Problem**: Aktuell werden Chargen nur als Text-Felder in Tanks/Inventar gespeichert. Es gibt keine zentrale Chargen-Übersicht.

**Lösung**:
- [ ] **Chargen-Seite** (`/chargen`) mit Liste aller aktiven Chargen
- [ ] **Chargen-Details**: 
  - Herstellungsdatum, Rohstoffe, Mengen
  - Verknüpfung zu allen Tanks/Gebinden dieser Charge
  - Prozess-Timeline (Mazeration → Destillation → Lagerung)
  - Gesamtmenge produziert/verkauft/verfügbar
- [ ] **Chargen-Historie**: Alle Transaktionen einer Charge
- [ ] **Qualitätsdaten**: Alkoholgehalt, Geschmacksnoten, Labor-Analysen
- [ ] **Kosten-Tracking**: Rohstoff-Kosten, Produktionskosten, Gewinnmargen
- [ ] **Chargen-QR-Code**: QR-Code pro Charge für schnellen Zugriff

**Use Case**: "Zeig mir alle Tanks mit Charge MB-2025-001" → Sofort sichtbar, wo sich die Charge aktuell befindet.

---

#### 2. **Produktionspipeline-Visualisierung** 📊
**Priorität**: ⭐⭐⭐⭐ (Hoch)  
**Aufwand**: 2-3 Wochen  
**ROI**: Hoch

**Problem**: Keine visuelle Darstellung des Produktionsablaufs (Rohstoff → Mazeration → Destillation → Lagerung → Abfüllung).

**Lösung**:
- [ ] **Kanban-Board** für Produktionsstufen
  - Spalten: Rohstoffe | Mazeration | Destillation | Lagerung | Fertig
  - Drag & Drop zum Verschieben von Chargen
- [ ] **Prozess-Flussdiagramm**: Visuell zeigen, welche Charge gerade wo ist
- [ ] **Bottleneck-Erkennung**: Rot markieren, wenn eine Stufe überlastet ist
- [ ] **Zeitstempel**: Automatisch tracken, wie lange eine Charge in jeder Phase ist
- [ ] **Gantt-Chart**: Timeline-Ansicht für Produktionsplanung

**Use Case**: Produktionsleiter sieht auf einen Blick: "10 Chargen in Mazeration, 5 bereit für Destillation, Tank T341 blockiert seit 2 Wochen".

---

#### 3. **Benachrichtigungen & Erinnerungen** 🔔
**Priorität**: ⭐⭐⭐⭐ (Hoch)  
**Aufwand**: 1-2 Wochen  
**ROI**: Hoch

**Problem**: Keine automatischen Erinnerungen für wichtige Termine (z.B. Ende einer Mazeration, Mindestbestand unterschritten).

**Lösung**:
- [ ] **Notification-Center**: Zentrale Inbox für alle Benachrichtigungen
- [ ] **Mazeration-Erinnerungen**: 
  - X Tage vor Mazeration-Ende
  - Am Tag der Fertigstellung
  - Überfällige Mazerationen (rot markiert)
- [ ] **Lagerbestand-Warnungen**:
  - Mindestbestand unterschritten
  - Kritische Schwelle (z.B. < 5% Füllstand)
- [ ] **Qualitätsprüfungen**: "Tank T341 - Alkoholgehalt-Messung fällig"
- [ ] **Push-Notifications** (Browser-API):
  - Optional aktivierbar
  - "Mazeration MB-2025-003 ist fertig!"
- [ ] **E-Mail-Benachrichtigungen** (optional, Phase 2)

**Use Case**: Brennmeister wird automatisch erinnert: "Mazeration fertig, bitte destillieren!" statt manuell im Kalender nachzusehen.

---

#### 4. **Dashboard-Widgets verbessern** 📈
**Priorität**: ⭐⭐⭐⭐ (Hoch)  
**Aufwand**: 1 Woche  
**ROI**: Mittel-Hoch

**Problem**: Dashboard zeigt nur Kalender + Aufgaben. Keine Produktions-KPIs.

**Lösung**:
- [ ] **Widget: Produktions-Übersicht**
  - Heute produzierte Liter
  - Diese Woche/Monat
  - Vergleich zu Vorwoche/Vormonat
- [ ] **Widget: Kritische Warnungen**
  - Mindestbestände unterschritten
  - Überfällige Mazerationen
  - Tanks mit Problemen
- [ ] **Widget: Top-5-Tanks**
  - Meistgefüllte Tanks
  - Wertvollste Chargen
- [ ] **Widget: Kapazitäts-Auslastung**
  - Gesamtkapazität vs. Füllstand
  - Freie Kapazität in Litern
  - Prognose: "Kapazität reicht für 3 weitere Chargen"
- [ ] **Widget: Aufgaben-Priorisierung**
  - Heute fällig (rot)
  - Diese Woche (gelb)
  - Backlog (grau)
- [ ] **Widgets anpassbar**: Drag & Drop, Ein-/Ausblenden

**Use Case**: Betriebsleiter öffnet App und sieht sofort: "80% Kapazität ausgelastet, 3 Warnungen, 2 Aufgaben heute fällig".

---

### 💪 **POWER FEATURES** - Mittlerer Aufwand, hoher Impact

#### 5. **Rezeptverwaltung** 📖
**Priorität**: ⭐⭐⭐⭐ (Hoch)  
**Aufwand**: 3-4 Wochen  
**ROI**: Sehr hoch

**HINWEIS**: Wird als eigenständige **RezepturMeister-App** entwickelt!

**Problem**: Kein zentrales Rezept-Repository. Brennmeister müssen Rezepte manuell nachschlagen.

**Lösung (RezepturMeister-Integration)**:
- [ ] **Eigenständige App**: Separate "RezepturMeister"-Anwendung für Rezeptverwaltung
- [ ] **API-Anbindung**: Bidirektionale Synchronisation zwischen Apps
  - MazerationsMeister → RezepturMeister: Rohstoffdatenbank exportieren
  - RezepturMeister → MazerationsMeister: Rezepte importieren, Mazeration mit Rezept starten
- [ ] **Rohstoffdatenbank-Mapping**: 
  - Alle Rohstoffe aus Inventar automatisch zu RezepturMeister übertragen
  - Bestandsabfrage in Echtzeit ("Sind 50kg Brombeeren verfügbar?")
- [ ] **Rezept → Produktion-Flow**:
  - In RezepturMeister: Rezept auswählen → "In MazerationsMeister übertragen"
  - In MazerationsMeister: Neue Mazeration mit vorausgefüllten Parametern erstellen
- [ ] **Shared Data Format**: JSON-Schema für Datenaustausch

**Use Case**: Rezept in RezepturMeister erstellen → "Produzieren" klicken → MazerationsMeister öffnet sich automatisch mit allen Daten → Sofort starten!

**Vorteile der Trennung**:
- ✅ Fokussierte Apps (Rezepte vs. Produktion)
- ✅ Unabhängige Entwicklung & Updates
- ✅ Weniger Komplexität pro App
- ✅ Rohstoffdatenbank bereits vorhanden (Inventar-Export)

---

#### 6. **Abfüllung & Etikettierung** 🍾
**Priorität**: ⭐⭐⭐⭐ (Hoch)  
**Aufwand**: 3-4 Wochen  
**ROI**: Hoch

**Problem**: Keine Verwaltung von abgefüllten Flaschen. Chargen verschwinden einfach aus Tanks.

**Lösung**:
- [ ] **Abfüll-Prozess**:
  - Aus Tank T341 → 500 Flaschen à 0,7L abfüllen
  - Tank-Füllstand automatisch reduzieren
  - Flaschen-Bestand automatisch erhöhen
- [ ] **Flaschen-Tracking**:
  - Charge-Nummer auf Flasche
  - Abfülldatum, Alkoholgehalt, Flaschengröße
  - Verknüpfung zu Original-Charge
- [ ] **Etiketten-Druck**:
  - PDF-Etikett generieren (Charge, Sorte, Alkohol%, Datum)
  - Batch-Druck (z.B. 500 Etiketten für eine Charge)
- [ ] **Flaschen-Lager**:
  - Bestand nach Sorte/Charge
  - Verkaufte Flaschen tracken
  - Lagerort (Regal, Karton)
- [ ] **QR-Code pro Flasche**: 
  - Unique-ID für Rückverfolgbarkeit
  - "Wo wurde diese Flasche hergestellt? Welche Rohstoffe?"

**Use Case**: Kunde fragt: "Wo kommt diese Flasche her?" → QR-Code scannen → Komplette Historie sichtbar (Rohstoffe, Mazeration, Destillation, Abfülldatum).

---

#### 7. **Kostenrechnung & Profitabilität** 💰
**Priorität**: ⭐⭐⭐⭐ (Hoch)  
**Aufwand**: 3-4 Wochen  
**ROI**: Sehr hoch

**Problem**: Keine Kosten-Transparenz. "Lohnt sich die Produktion dieser Charge?"

**Lösung**:
- [ ] **Kosten-Tracking**:
  - Rohstoff-Kosten (z.B. Brombeeren 50kg à €5/kg = €250)
  - Produktionskosten (Energie, Arbeitslohn, Abnutzung)
  - Lager-Kosten (pro Tag/Monat)
- [ ] **Preis-Kalkulation**:
  - Verkaufspreis pro Flasche
  - Gewinnmarge berechnen
  - Break-Even-Point
- [ ] **Profitabilitäts-Dashboard**:
  - Gewinn pro Charge
  - Gewinn pro Sorte
  - Meistrentable Produkte (Top 5)
  - Verlustbringer identifizieren
- [ ] **ROI-Prognose**: "Bei Verkaufspreis €25/Flasche → €3.000 Gewinn nach Verkauf aller 500 Flaschen"
- [ ] **Export für Buchhaltung**: CSV/Excel mit allen Kosten

**Use Case**: Betriebsleiter entscheidet: "Brombeere bringt €10/Flasche Gewinn, Himbeere nur €5 → Mehr Brombeere produzieren!"

---

#### 8. **Temperatursensor-Integration (IoT)** 🌡️
**Priorität**: ⭐⭐⭐ (Mittel)  
**Aufwand**: 4-6 Wochen  
**ROI**: Hoch (für größere Betriebe)

**Problem**: Temperatur muss manuell gemessen und eingetragen werden.

**Lösung**:
- [ ] **Sensor-Integration**:
  - Bluetooth-Thermometer (z.B. Inkbird)
  - WLAN-Sensoren (z.B. Sonoff TH16)
  - API-Integration (HTTP, MQTT)
- [ ] **Echtzeit-Monitoring**:
  - Temperatur-Graph in Tank-Ansicht
  - Historische Temperatur-Kurve
- [ ] **Alarme**:
  - Temperatur außerhalb Sollbereich → Push-Notification
  - "Tank T341: Temperatur 28°C (Sollbereich: 15-20°C)"
- [ ] **Automatisches Logging**: Temperatur alle 15 Minuten speichern
- [ ] **Export**: Temperatur-Historie als PDF/CSV für Qualitätskontrolle

**Use Case**: Mazeration läuft über Nacht → Temperatur steigt über 25°C → Brennmeister bekommt Push-Notification → Kann sofort reagieren.

---

### 🚀 **ADVANCED FEATURES** - Hoher Aufwand, spezialisiert

#### 9. **Lieferanten- & Kundenverwaltung (CRM)** 🤝
**Priorität**: ⭐⭐⭐ (Mittel)  
**Aufwand**: 4-5 Wochen  
**ROI**: Mittel-Hoch

**Lösung**:
- [ ] **Lieferanten-Datenbank**: Kontakte, Preise, Lieferzeiten
- [ ] **Bestellungen**: Rohstoffe bestellen, Lieferstatus tracken
- [ ] **Kunden-Datenbank**: Kontakte, Bestellhistorie
- [ ] **Verkaufs-Tracking**: Welcher Kunde kauft welche Produkte?
- [ ] **Rechnungen**: PDF-Rechnungen generieren
- [ ] **Lieferanten-Bewertung**: Qualität, Pünktlichkeit, Preis

---

#### 10. **Qualitätskontrolle (QC)** 🔬
**Priorität**: ⭐⭐⭐ (Mittel)  
**Aufwand**: 3-4 Wochen  
**ROI**: Hoch (für Compliance)

**Lösung**:
- [ ] **Prüfprotokolle**: pH-Wert, Alkoholgehalt, Geschmack, Farbe
- [ ] **Labor-Analysen**: Externe Lab-Reports hochladen
- [ ] **Prüfintervalle**: Automatische Erinnerung ("Tank T341 - QC fällig")
- [ ] **Abweichungs-Management**: Wenn Werte außerhalb Toleranz → Workflow zur Behebung
- [ ] **QC-Historie**: Alle Messungen über Zeit visualisiert
- [ ] **Compliance-Reports**: PDF für Behörden (Zollamt, etc.)

---

#### 11. **Barcode-Scanner (zusätzlich zu QR)** 📊
**Priorität**: ⭐⭐ (Niedrig-Mittel)  
**Aufwand**: 2-3 Wochen  
**ROI**: Mittel

**Lösung**:
- [ ] **Barcode-Generierung**: EAN-13, Code-128
- [ ] **Barcode-Scanner**: Kamera + Barcode-Library
- [ ] **Inventar-Scan**: Schnelles Ein-/Ausbuchen via Barcode
- [ ] **Integration mit Flaschen**: Barcodes auf Etiketten

---

#### 12. **Export-Erweiterungen** 📤
**Priorität**: ⭐⭐⭐ (Mittel)  
**Aufwand**: 1-2 Wochen  
**ROI**: Mittel

**Problem**: Aktuell nur CSV-Export. Viele wollen mehr.

**Lösung**:
- [ ] **Excel-Export**: Mit Formatierung, Formeln, Charts
- [ ] **PDF-Reports**: Professionelle Berichte (Produktions-Report, Inventar-Report)
- [ ] **JSON-Export**: Für Backup/Wiederherstellung
- [ ] **Automatische E-Mail-Berichte**: Wöchentlich/Monatlich PDF per Mail

---

### 🎯 **QUICK FIXES** - Sehr einfach, schnelle Verbesserungen

#### 13. **Dark Mode** 🌙
**Priorität**: ⭐⭐⭐ (Mittel)  
**Aufwand**: 2-3 Tage  
**ROI**: Niedrig-Mittel (aber sehr gewünscht!)

- [ ] Dark-Theme mit Tailwind
- [ ] Toggle-Button im Header
- [ ] LocalStorage speichern

---

#### 14. **Suche & Filter** 🔍
**Priorität**: ⭐⭐⭐⭐ (Hoch)  
**Aufwand**: 1 Woche  
**ROI**: Hoch

**Problem**: Bei 50+ Tanks schwer, einen spezifischen zu finden.

**Lösung**:
- [ ] **Globale Suche**: Suche über alle Daten (Tanks, Inventar, Chargen)
- [ ] **Filter-Sidebar**: 
  - Nach Kategorie (Mazerat/Destillat)
  - Nach Sorte
  - Nach Füllstand (leer, < 50%, voll)
  - Nach Datum
- [ ] **Saved Filters**: Häufig genutzte Filter speichern ("Zeig mir alle Brombeere-Tanks")

---

#### 15. **Keyboard-Shortcuts** ⌨️
**Priorität**: ⭐⭐ (Niedrig)  
**Aufwand**: 1-2 Tage  
**ROI**: Niedrig (Power-User freuen sich)

**Shortcuts**:
- `Ctrl+N` → Neuer Tank
- `Ctrl+F` → Suche öffnen
- `Ctrl+P` → Drucken
- `Ctrl+E` → Export
- `Ctrl+S` → Speichern

---

#### 16. **Bulk-Aktionen** 🎛️
**Priorität**: ⭐⭐⭐ (Mittel)  
**Aufwand**: 3-5 Tage  
**ROI**: Mittel

**Lösung**:
- [ ] Mehrere Tanks auswählen (Checkbox)
- [ ] Bulk-Aktionen: 
  - QR-Codes generieren
  - Exportieren
  - Löschen
  - Kategorie ändern

---

#### 17. **Drag & Drop für Prozesse** 🖱️
**Priorität**: ⭐⭐⭐ (Mittel)  
**Aufwand**: 1 Woche  
**ROI**: Mittel

**Lösung**:
- [ ] Tanks/Chargen per Drag & Drop zwischen Kategorien verschieben
- [ ] Inventar-Items zwischen Lagern verschieben
- [ ] Prozess-Stufen per Drag & Drop aktualisieren

---

### 🏆 **PRIORISIERUNGS-MATRIX**

| Feature | Impact | Aufwand | Priorität | Wann? |
|---------|--------|---------|-----------|-------|
| **Chargenverwaltung** | ⭐⭐⭐⭐⭐ | 2-3 Wo | P0 | Q4 2025 |
| **Benachrichtigungen** | ⭐⭐⭐⭐⭐ | 1-2 Wo | P0 | Q4 2025 |
| **Suche & Filter** | ⭐⭐⭐⭐⭐ | 1 Wo | P0 | Q4 2025 |
| **Dashboard verbessern** | ⭐⭐⭐⭐ | 1 Wo | P1 | Q4 2025 |
| **Produktions-Pipeline** | ⭐⭐⭐⭐ | 2-3 Wo | P1 | Q1 2026 |
| **Rezeptverwaltung** | ⭐⭐⭐⭐ | 3-4 Wo | P1 | Q1 2026 |
| **Kostenrechnung** | ⭐⭐⭐⭐ | 3-4 Wo | P1 | Q1 2026 |
| **Abfüllung & Etiketten** | ⭐⭐⭐⭐ | 3-4 Wo | P1 | Q2 2026 |
| **Export-Erweiterungen** | ⭐⭐⭐ | 1-2 Wo | P2 | Q1 2026 |
| **Dark Mode** | ⭐⭐⭐ | 2-3 T | P2 | Q4 2025 |
| **Bulk-Aktionen** | ⭐⭐⭐ | 3-5 T | P2 | Q4 2025 |
| **Qualitätskontrolle** | ⭐⭐⭐ | 3-4 Wo | P2 | Q2 2026 |
| **CRM** | ⭐⭐⭐ | 4-5 Wo | P3 | Q3 2026 |
| **Temperatursensoren** | ⭐⭐⭐ | 4-6 Wo | P3 | Q3 2026 |
| **Barcode-Scanner** | ⭐⭐ | 2-3 Wo | P3 | Q4 2026 |
| **Keyboard-Shortcuts** | ⭐⭐ | 1-2 T | P3 | Q1 2026 |
| **Drag & Drop** | ⭐⭐ | 1 Wo | P3 | Q2 2026 |

---

### 💼 **Business-Perspektive: Was bringt am meisten?**

#### Top 3 für **kleine Brennereien** (< 20 Gebinde):
1. **Benachrichtigungen** → Nie mehr Termine vergessen
2. **Rezeptverwaltung** → Konsistente Qualität
3. **Dashboard verbessern** → Schneller Überblick

#### Top 3 für **mittlere Brennereien** (20-100 Gebinde):
1. **Chargenverwaltung** → Rückverfolgbarkeit & Compliance
2. **Produktions-Pipeline** → Engpässe erkennen
3. **Kostenrechnung** → Profitabilität steigern

#### Top 3 für **große Brennereien** (100+ Gebinde):
1. **Abfüllung & Etikettierung** → Vollständiger Produktions-Workflow
2. **Qualitätskontrolle** → Compliance & Zertifizierung
3. **CRM** → Lieferanten & Kunden managen

---

### 🎯 **Aktualisierte Roadmap - Priorisierung** (nach Feinschliff/Icons/Impressum):

#### 🚀 **PHASE 1 - Q4 2025** (November):
1. ✅ **Benachrichtigungen & Erinnerungen** (2 Wochen) 
   - 🔥 **PRIORITÄT 1** - Sofort starten!
   - Push-Notifications für Mazerationen
   - Mindestbestand-Warnungen
   - Qualitätsprüfungs-Erinnerungen
   - Notification-Center Dashboard-Widget

#### 🎨 **PHASE 2 - Q4 2025** (Dezember):
2. ✅ **Dashboard verbessern** (1 Woche)
   - KPI-Widgets (Produktion heute/Woche/Monat)
   - Kritische Warnungen anzeigen
   - Kapazitäts-Auslastung visualisieren
   - Widget-Layouts anpassbar

3. ✅ **Produktionspipeline-Visualisierung** (2-3 Wochen)
   - Kanban-Board (Rohstoff → Mazeration → Destillation → Fertig)
   - Bottleneck-Erkennung (rot markieren)
   - Gantt-Chart für Planung
   - Drag & Drop zwischen Prozess-Stufen

#### 🔬 **PHASE 3 - Q1 2026** (Januar-Februar):
4. ✅ **Qualitätskontrolle (QC)** (3-4 Wochen)
   - Prüfprotokolle-Datenbank
   - Labor-Analysen hochladen & verknüpfen
   - Compliance-Dokumentation
   - QS-Dokumente-Archiv mit Suche
   - Prüfintervalle & Erinnerungen
   - PDF-Export für Behörden

5. ✅ **Suche & Filter** (1 Woche)
   - Globale Suche über alle Daten
   - Filter-Sidebar
   - Gespeicherte Filter

#### 📊 **PHASE 4 - Q1 2026** (März):
6. ✅ **Export-Erweiterungen** (1-2 Wochen)
   - Excel-Export mit Formatierung
   - PDF-Reports (professionell)
   - Automatische E-Mail-Berichte

7. ✅ **Dark Mode** (2-3 Tage) - Quick Win

#### 🔗 **PHASE 5 - Q2 2026** (April-Juni):
8. ✅ **RezepturMeister-Anbindung** (2-3 Wochen)
   - API-Schnittstelle für Rohstoffdaten
   - Daten-Export zu RezepturMeister
   - Bidirektionale Synchronisation
   - Rohstoffdatenbank-Mapping

9. ✅ **Chargenverwaltung** (3 Wochen)
   - Zentrale Chargen-Übersicht
   - Historie & Kosten-Tracking

10. ✅ **Kostenrechnung** (3-4 Wochen)
    - ROI-Berechnungen
    - Profitabilitäts-Dashboard

---

## �📞 Feedback

Hast du Ideen, Wünsche oder Anregungen zur Roadmap? Kontaktiere uns:

- **GitHub Issues**: https://github.com/woku369/MazerationsMeister/issues
- **E-Mail**: [Entwickler-Kontakt einfügen]
- **Diskussionen**: GitHub Discussions

---

*Letzte Aktualisierung: 2. Oktober 2025*  
*Roadmap-Version: 1.1*  
*© 2025 MazerationsMeister*
