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

#### Behobene Probleme (September 2025 – Juni 2026)
- ✅ `.gitignore` um `tank-data-[0-9]*.json` erweitert (neue Snapshots landen nicht mehr im Repo)
- ✅ Leere Platzhalterdateien identifiziert (electron/main-*.js, src/lib/ngrok-*.ts usw.)

#### Offene Aufgaben
- [ ] Tank-IDs auf einheitliches Format normalisieren
- [ ] Token-Management vereinheitlichen (Single Point of Truth)
- [ ] QR-Code Implementierungen konsolidieren
- [ ] Navigation restrukturieren (Inventory als Hauptmenüpunkt)
- [ ] `webSecurity: true` setzen in electron/main.js
- [ ] XSS-Fix in tank-viewer.html Fallback (tankId per textContent statt innerHTML)
- [ ] Leere Dateien entfernen

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
