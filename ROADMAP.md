# MazerationsMeister - Roadmap

**Stand:** 11. Oktober 2025  
**Version:** 1.1.0 (Production Ready)

##  Was ist fertig (v1.1.0)

- Mazeration-Protokolle
- Lagerverwaltung mit Chargen & Transaktionen  
- Tank-Management mit QR-Codes
- **Container-Indexierung** (B-1, B-2, Fass-1, Fass-2) 
- **QR-Code Batch-Druck** 
- Rezeptur-System (Excel-Style Editor)
- PDF-Exporte (Protokolle, Lagerstände)
- **App-Größe optimiert** (294 MB portable) 

##  Offene Punkte (Q4 2025)

### **1. Feinschliff nach Tests** (Höchste Priorität)
- Stress-Tests (500+ Gebinde, 1000+ Einträge)
- Browser-Kompatibilität (Safari, Firefox, Mobile)
- Offline-Szenarien testen
- Performance-Profiling
- Beta-Test mit Brennereien
- Bug-Fixes aus User-Feedback

### **2. Impressum erstellen** (Rechtlich erforderlich!)
- Betreiber/Kontakt gemäß §5 TMG
- Haftungsausschluss, Datenschutzhinweis
- Web: /impressum Seite
- Desktop: Hilfe  Impressum Dialog

### **3. Versionsgeschichte dokumentieren** (Mittel)
- CHANGELOG.md im "Keep a Changelog" Format
- Alle Features seit Projektbeginn
- Breaking Changes dokumentieren

### **4. XLSX Export für Rezepturen** (Niedrig)
- Export von Rezepturen
- Import-Funktion für Bulk-Updates
- User-Request aus ursprünglicher Roadmap

##  Q1 2026 - Erweiterte Features

### **5. Gebindeverwaltung erweitern**
- Behälter-Status: Leer, Belegt, Außer Haus, Leihgabe
- Bemerkungsfeld für Leihgaben
- Tracking von Außer-Haus-Gebinden
- Historie pro Gebinde

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
**Build:** node scripts/build-ultra-minimal.js  
**Storage:** Electron IPC + localStorage  
**App-Größe:** 294 MB portable (196 MB exe)

---
**Quelle:** docs/ROADMAP.md (945 Zeilen, letzte Aktualisierung: 02.10.2025)  
**Diese Version:** Kompakt-Übersicht mit korrigierten Fakten
