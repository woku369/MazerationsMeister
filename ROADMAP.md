# Roadmap und Änderungsprotokoll

## Roadmap

### Phase 1: Grundfunktionen ✅ 
1. ✅ Sidebar - Design und Implementierung einer Sidebar-Navigation.
2. ✅ Dashboard - Entwicklung eines Dashboards mit Kennzahlen und Statistiken.
3. ✅ Funktionsprüfung aller Seiten - Test und Review aller bestehenden Seiten.
4. ✅ Berechnungsprüfung - Validierung aller Berechnungen und automatisierte Tests.
5. ✅ Exporte (PDF) der Protokolle und Lagerdaten - PDF-Export für Protokolle, Lagerstände und Bewegungen.
6. ✅ Lagerhaltung und Lagerstände - Erweiterung der Lagerlogik und Bestandsführung.
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
- ✅ **Entfernung veralteter Implementierungen:** 
  - Ngrok-Integration entfernt
  - Cloud-Services-Integration vereinfacht
  - Azure-Abhängigkeiten entfernt
  - Komplexe Sync-Mechanismen reduziert
- ✅ **Fokus auf lokale OneDrive-Synchronisation:**
  - Automatische Backup-Erstellung
  - Keine Azure-Registrierung erforderlich
  - Vereinfachte Daten-Synchronisation

### Phase 3: KRITISCHE SYSTEM-BEREINIGUNG 🔴 DRINGEND

#### Identifizierte Probleme (September 2025)
1. **Inkonsistente Tank-IDs:** 
   - QR-Code generiert "tank-fwdgp3bqt" 
   - System erwartet "T341"
   - tank-offline.html kann Tank nicht finden

2. **Doppelte Token-Verwaltung:**
   - Einstellungen → QR-Codes → Token-Eingabe
   - Einstellungen → GitHub Integration → Token-Eingabe
   - Verwirrende UX, keine Synchronisation

3. **Mehrfache QR-Code Implementierungen:**
   - Tank-Verwaltung (unter QR-Codes) → localhost URLs
   - Tank-Inhalte → GitHub Pages URLs
   - Verschiedene Parameter-Schemas

4. **Navigations-Inkonsistenz:**
   - Kein direkter "Inventory" Menüpunkt
   - Tank-Management unter "Einstellungen" versteckt
   - Benutzer findet Funktionen nicht

#### BEREINIGUNGSSTRATEGIE (Priorität: KRITISCH)

##### Schritt 1: Tank-ID Normalisierung ⚡ SOFORT
- [ ] Alle Tank-IDs auf einheitliches Format (T341, T349, etc.)
- [ ] QR-Code Parameter-Mapping korrigieren
- [ ] tank-offline.html Tank-Lookup reparieren
- [ ] Konsistenz zwischen allen Komponenten sicherstellen

##### Schritt 2: Token-Management Vereinheitlichung ⚡ SOFORT  
- [ ] Single-Point-of-Truth für GitHub Token
- [ ] Automatische Synchronisation zwischen Komponenten
- [ ] Entfernung redundanter Token-Eingabefelder
- [ ] Event-basierte Token-Updates

##### Schritt 3: QR-Code Konsolidierung ⚡ HEUTE
- [ ] Eine einzige QR-Code Komponente
- [ ] Einheitliche URL-Generierung (GitHub Pages)
- [ ] Entfernung localhost-basierter QR-Codes  
- [ ] Konsistente Parameter-Übertragung

##### Schritt 4: Navigation Restrukturierung ⚡ HEUTE
- [ ] "Inventory" als Haupt-Menüpunkt
- [ ] Tank-Management direkt zugänglich  
- [ ] Logische Gruppierung der Funktionen
- [ ] Benutzerfreundliche Struktur

##### Schritt 5: Testing & Validation ⚡ HEUTE
- [ ] Ende-zu-Ende QR-Code Test
- [ ] Mobile Offline-Funktionalität validieren
- [ ] Token-Synchronisation testen
- [ ] Alle Tank-IDs durchprüfen

### Phase 4: Produktionsreife Implementierung 🚧

#### 1. QR-Code Druckfunktion 🔴 AKTUELL
**Problem:** Aktuelle Druckfunktion ohne Funktionalität
- Tank-Auswahl per Checkbox implementieren
- Alle verfügbaren Tanks auflisten
- Multi-Tank-Auswahl für Batch-Druck
- Print-Preview mit Layout-Optionen
- PDF-Export für externe Druckerei

#### 2. GitHub-Integration fertigstellen 🔴 NÄCHSTER SCHRITT
**Status:** Token hardcodiert, weitere Funktionen fehlen
- Token-Management über Einstellungen
- Automatische Backup-Commits
- Konfliktauflösung bei gleichzeitigen Änderungen
- Versionsverlauf und Rollback-Funktionalität
- Branch-Management für verschiedene Standorte

#### 3. Mobile Tank-Scan Offline-Funktionalität 🔴 KERNFUNKTION
**Ziel:** Vollständige Tank-Info auch bei Netzwerk-Trennung
- Offline-fähige Tank-Datenbank in QR-Code
- Anzeige: Bezeichnung, Inhalt, Kapazität, Füllmenge, %-Anzeige
- Funktionalität auch ohne laufende Desktop-App
- Cross-Network Zugriff (verschiedene WLANs)
- Fallback-Mechanismen für schlechte Netzverbindung

#### 4. Anleitungen-Sektion aktualisieren
- Neue QR-Code-Workflows dokumentieren
- GitHub-Integration Anleitung
- Mobile-First Bedienungshinweise
- Troubleshooting für Offline-Szenarien

### Phase 4: Cloud & Production-Ready 🚀

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

## Änderungsprotokoll

### September 2025
- ✅ **Build-System repariert:** Dynamische Routen-Probleme gelöst, statischer Export funktioniert
- ✅ **Electron-Integration:** Schwarzes Fenster-Problem behoben, App startet korrekt
- ✅ **Tank-Management System:** QR-Code-Generierung, mobile Tank-Seiten, dynamische Chargen-Verwaltung implementiert
- ✅ **OneDrive-Integration:** Lokale Synchronisation ohne Azure-Registrierung
- ✅ **System-Bereinigung:** Entfernung veralteter Cloud-Integration-Ansätze (ngrok, Azure-Services)
- ✅ **Code-Cleanup:** Vereinfachung der Einstellungen-Seite, Reduzierung der Komplexität

### 23.08.2025
- Exportfunktion verwendet jetzt den einstellbaren Export-Pfad aus den Einstellungen (localStorage) für XLSX-Exporte.
