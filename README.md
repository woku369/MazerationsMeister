# MazerationsMeister

**Version:** 1.1.0 (Production Ready)  
**Stand:** 11. Oktober 2025

Eine professionelle Anwendung zur Verwaltung von Mazerationen, Lagerbeständen, Tank-Management und Rezepturen für Spirituosen-Produktion.

## 🚀 Features

- **Mazeration-Protokolle** - Vollständige Dokumentation von Mazerationsprozessen
- **Lagerverwaltung** - Tracking von Beständen, Chargen und Transaktionen
- **QR-Code Tank-Management** - Mobile Abfrage von Tank-Inhalten via QR-Codes
- **Rezeptur-System** ✨ *(NEU in v1.1.0)* - Excel-Style Editor für Produkt-Rezepturen
- **PDF-Exporte** - Protokolle, Lagerdaten und Produktions-Checklisten
- **Responsive Design** - Optimiert für Desktop und Mobile

## ✨ Neu in Version 1.1.0

### **Rezeptur-System**
- **Excel-Style Editor** - Verwaltung von Produkt-Rezepturen (z.B. 10-12 Komponenten)
- **Inventory-Integration** - Komponenten aus Lagerbeständen per Dropdown
- **Intelligente Mengen** - Automatisch ml (≤2L) oder L (>2L) Anzeige
- **Alkohol-Korrektur** - Wasser/Sprit-Korrektur bei Abweichungen
- **Workflow-Status** - 5 Checkboxen (Entwurf → Produktion → Archiv)
- **Produktions-Protokoll** - Druckbares A4-Protokoll mit SOLL/IST-Werten

Siehe [REZEPTUR_MEILENSTEIN.md](./REZEPTUR_MEILENSTEIN.md) für vollständige Details!

## 📱 QR-Code Tank-System

### Neue Features (September 2025):
- ✅ **QR-Code-Generierung** für ausgewählte Tanks
- ✅ **Mobile-optimierte Ansicht** mit großen, gut lesbaren Karten
- ✅ **Offline-Funktionalität** mit Fallback-Daten in URLs
- ✅ **Automatische Geräte-Erkennung** (Desktop ↔ Mobile)
- ✅ **Network-IP-Integration** für WLAN-übergreifenden Zugriff

### Quick Start QR-Codes:
1. **Tanks definieren** → Inventory → Tank-Management
2. **QR-Codes generieren** → Tanks auswählen → "QR-Codes generieren"
3. **Drucken & Aufkleben** → QR-Codes an Tanks anbringen
4. **Mobile scannen** → Mit beliebiger QR-App scannen

**Zeigt mobil an:** Sorte, Charge, Inhalt (L), Alkoholgehalt (% vol.)

## 🛠 Entwicklung

### Lokaler Start:
```bash
npm install
npx next dev --turbopack --port 9003
```

**Lokal:** http://localhost:9003  
**Netzwerk:** http://192.168.0.7:9003 (für QR-Code-Zugriff)

### Technologie-Stack:
- **Frontend:** Next.js 15.4.2 + React + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **QR-Codes:** qrcode.js
- **Daten:** localStorage (Client-side)
- **PDF:** Browser-native Druck-API

## 📁 Projekt-Struktur

```
src/
├── app/
│   ├── page.tsx                 # Dashboard
│   ├── mazerationen/           # Mazeration-Protokolle
│   ├── inventory/              # Lagerverwaltung
│   └── tank/[id]/              # QR-Code Tank-Details
├── components/
│   ├── mazeration-form.tsx     # Mazeration-Erfassung
│   ├── inventory/              # Lager-Komponenten
│   └── ui/                     # UI-Komponenten (shadcn)
├── lib/
│   ├── mazeration-calc.ts      # Berechnungslogik
│   └── tank-sync.ts           # Tank-Synchronisation
└── schemas/                    # TypeScript-Schemas
```

## 📖 Dokumentation

- **[QR-Code Tank-Management](docs/QR_CODE_TANK_MANAGEMENT.md)** - Detaillierte Implementierung
- **[Roadmap](ROADMAP.md)** - Geplante Features und Verbesserungen
- **[App Documentation](APP_DOCUMENTATION.md)** - Vollständige Anwendungsdokumentation

## 🔧 Network Setup für QR-Codes

### Windows Firewall konfigurieren:
1. **Windows-Taste + R** → `wf.msc`
2. **Eingehende Regeln** → **Neue Regel**
3. **Port** → **TCP** → **9003**
4. **Verbindung zulassen** → **Fertig**

### IP-Adresse ermitteln:
```bash
ipconfig | findstr "IPv4"
# Meist: 192.168.0.7 oder 192.168.1.x
```

## 📋 OneDrive-Integration (Geplant)

**Roadmap Phase 2:**
- ☐ Automatische Daten-Synchronisation nach OneDrive
- ☐ QR-Codes verweisen auf OneDrive-gehostete Seiten
- ☐ Serverlose Lösung ohne lokalen Development-Server
- ☐ Progressive Web App für Offline-Installation

## 🤝 Mitwirkende

Entwickelt für professionelle Spirituosen-Produktion mit Fokus auf:
- **Compliance** - Vollständige Dokumentation für Behörden
- **Effizienz** - Schnelle mobile Zugriffe über QR-Codes
- **Präzision** - Automatisierte Berechnungen und Validierung

---

**Status:** ✅ Produktiv einsatzbereit  
**Version:** 1.0 (QR-Code System Complete)  
**Letztes Update:** 7. September 2025
