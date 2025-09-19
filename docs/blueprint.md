# Mazerations-Meister V 1.0 - Blueprint

## Anwendungsübersicht

**Mazerations-Meister** ist eine spezialisierte Anwendung für Destillerien und Likörhersteller zur Verwaltung von Mazerationsprozessen, Lagerhaltung und Tank-Management.

## Kern-Features

### 1. Mazerationsprotokollierung
- **Dateneingabe:** Eingabefelder für Pflanzenbeschreibung, Gewicht, Alkoholtyp, Volumen, Mazerationszeitraum
- **Automatische Berechnungen:** Verhältnis Pflanze/Alkohol, Mazerationsdauer, Verluste, Liter Absolutalkohol
- **Export-Funktionen:** PDF, XLSX, DOCX für Protokolle und Leerformulare
- **Zeiterfassung:** Detaillierte Arbeitsschritt-Protokollierung

### 2. Lagerverwaltung
- **Artikelstamm:** Definition und Verwaltung von Produktstammdaten
- **Chargenverwaltung:** Lagerbestand mit Chargen-/Tankzuordnung
- **Bestandsbewegungen:** Zu- und Abgänge mit automatischer Mengenanpassung
- **Übersichten:** Lagerbestände nach Artikel, Transaktionsprotokoll

### 3. Tank-Management mit QR-Codes
- **QR-Code-System:** Generierung für ausgewählte Tanks mit mobile-optimierter Anzeige
- **Dynamische Inhalts-Verfolgung:** Chargen/Batches pro Tank mit Echtzeit-Füllstandsberechnung
- **Mobile-Optimierung:** Smartphone-basierte Tank-Bearbeitung vor Ort
- **OneDrive-Sync:** Automatische Backups ohne Azure-Registrierung

## Technische Architektur

### Frontend
- **Framework:** Next.js 15.4.2 mit TypeScript
- **UI-Bibliothek:** Tailwind CSS, shadcn/ui Components
- **Datenvalidierung:** Zod Schemas
- **QR-Code-Generierung:** QRCode.js Library

### Datenhaltung
- **Primary Storage:** Browser localStorage für operative Daten
- **Backup-System:** OneDrive-Synchronisation über lokalen Ordner
- **Export-Formate:** PDF (jsPDF), XLSX (SheetJS), DOCX (docx-templates)

### Responsive Design
- **Desktop:** Vollständige Feature-Palette mit Sidebar-Navigation
- **Mobile:** Optimierte Tank-Detail-Ansichten, Touch-freundliche Bedienung
- **Druck:** Spezielle Print-Layouts für QR-Codes und Protokolle

## Design-Richtlinien

### Farbschema (Apotheker-Stil)
- **Primärfarbe:** Pergament-beige (#F4F1E8) - Hintergrund
- **Sekundärfarbe:** Tintenblau (#2C3E50) - Text und Navigation
- **Akzentfarbe:** Kupfer-bronze (#CD853F) - Hervorhebungen
- **Status-Farben:** Grün (#22C55E), Gelb (#F59E0B), Rot (#EF4444)

### Typografie
- **Basis-Schrift:** Inter/Helvetica für Lesbarkeit
- **Stil:** Klassisch-elegant, inspiriert von alten Apothekerbüchern
- **Hierarchie:** Klare Struktur mit gut lesbaren Größen

### Layout-Prinzipien
- **Navigation:** Sidebar mit Hauptbereichen (Mazerations-Protokoll, Inventar, Einstellungen)
- **Formulare:** Strukturierte Eingabebereiche mit Gruppierung verwandter Felder
- **Tabellen:** Sortier- und Filterfunktionen, responsive Anzeige
- **Mobile:** Card-basierte Layouts für Touch-Optimierung

## Systemintegration

### OneDrive-Synchronisation
- **Lokaler Approach:** Schreibt in lokalen OneDrive-Ordner
- **Automatische Sync:** OneDrive-Client übernimmt Cloud-Synchronisation
- **Kein Azure:** Funktioniert ohne Azure-App-Registrierung
- **Backup-Struktur:** JSON-Dateien mit automatischer Versionierung

### QR-Code-Workflow
1. **Tank-Auswahl:** Checkbox-basierte Mehrfachauswahl
2. **Code-Generierung:** URLs mit Fallback-Daten für Offline-Zugriff
3. **Print-Optimierung:** Druckbare Layouts mit Tank-Informationen
4. **Mobile-Scan:** Automatische Weiterleitung zu optimierten Tank-Seiten

## Datenmodell

### Tank-Definitionen
```typescript
type TankDefinition = {
  id: string;
  tankNr: string;
  bezeichnung: string;
  volumenLiter: number;
}
```

### Tank-Inhalte (Dynamisch)
```typescript
type TankContent = {
  tankId: string;
  charges: Array<{
    id: string;
    sorte: string;
    menge: number;
    alkoholgehalt: number;
  }>;
  gesamtfuellstand: number;
}
```

### Lagerdaten-Kompatibilität
- **Legacy Support:** Bestehende `inventory-items` Struktur
- **New Structure:** Erweiterte `inventoryItems` mit Tank-Zuordnung
- **Automatische Migration:** Transparente Datenkonvertierung

## Deployment & Betrieb

### Entwicklungsumgebung
- **Local Server:** `npx next dev --turbopack --port 9003`
- **Network Access:** Automatische IP-Erkennung für QR-Code-URLs
- **Hot Reload:** Entwickler-freundliche Updates

### Produktionsumgebung
- **Static Export:** Möglichkeit für statische Deployment-Optionen
- **PWA-Ready:** Vorbereitet für Progressive Web App Installation
- **Offline-Capable:** Lokale Datenhaltung ermöglicht Offline-Betrieb

## Sicherheit & Backup

### Datenschutz
- **Lokale Speicherung:** Sensible Daten bleiben auf Client-Geräten
- **OneDrive-Encryption:** Verschlüsselung durch OneDrive-Service
- **Keine Cloud-Services:** Reduziert externe Abhängigkeiten

### Backup-Strategie
- **Automatische Sicherung:** Regelmäßige OneDrive-Synchronisation
- **Export-Funktionen:** Manuelle XLSX-Exports als zusätzliche Sicherung
- **Versionierung:** OneDrive-Backup-Rotation mit konfigurierbarer Aufbewahrung

---

**Erstellt:** September 2025  
**Version:** 1.0  
**Status:** Production-Ready mit kontinuierlicher Weiterentwicklung