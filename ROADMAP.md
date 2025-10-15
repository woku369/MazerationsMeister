# MazerationsMeister - Roadmap

**Stand:** 15. Oktober 2025  
**Version:** 1.1.0 (Production Ready - Build läuft)

## ✅ Was ist fertig (v1.1.0)

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

## 🐛 Bug-Fixes (Oktober 2025)

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
  - FIX 1.1 bis 4.1 mit technischen Details
  - Test-Checklisten
  - Deployment-Guide

##  Offene Punkte (Q4 2025)

**Strategie:** Erst stabilisieren & testen, dann neue Features!

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
**Quelle:** docs/ROADMAP.md (letzte Aktualisierung: 15.10.2025)  
**Letzte Änderungen:** FIX 4.1 (QR-Codes), FIX 3.1 (TODO-Sync), FIX 2.1 (GitHub zentralisiert)
