# Dokumentenverwaltung

## Übersicht

Die zentrale Dokumentenverwaltung dient als Sammelstelle für alle im MazerationsMeister erstellten Dokumente und Berichte aus verschiedenen Bereichen der Anwendung.

## Zweck

Zentralisierung aller exportierten und generierten Dokumente:
- Reichweitenanalysen (PDF, Excel, CSV)
- Produktionsprotokolle
- Rezepturdokumente
- QR-Code-Sammlungen
- Inventarberichte
- Chargendokumentation

## Funktionsumfang

### 1. Dokumentenübersicht
- **Liste aller Dokumente** mit Filtermöglichkeiten
  - Nach Typ (Reichweite, Protokoll, Rezeptur, etc.)
  - Nach Datum (Erstellungsdatum, letzte Änderung)
  - Nach Status (Entwurf, Fertig, Archiviert)
- **Vorschau-Funktion** für unterstützte Formate
- **Metadaten-Anzeige**
  - Erstellt am
  - Erstellt von
  - Dateigröße
  - Dokumententyp
  - Zugehörige Entität (Rezeptur-ID, Charge-Nr., etc.)

### 2. Export und Download
- **Einzelexport**: Direkter Download eines Dokuments
- **Batch-Export**: Mehrere Dokumente als ZIP
- **Format-Konvertierung**: PDF ↔ Excel ↔ CSV (wo möglich)

### 3. Dokumentenerstellung
Schnellzugriff auf Dokument-Generierung:
- "Neue Reichweitenanalyse erstellen"
- "Produktionsprotokoll erstellen"
- "Rezeptur drucken"
- "QR-Codes exportieren"

### 4. Verwaltungsfunktionen
- **Umbenennen**: Dokumente umbenennen
- **Löschen**: Einzeln oder Batch-Löschung
- **Archivieren**: Alte Dokumente archivieren (ausblenden)
- **Tags**: Benutzerdefinierte Tags für bessere Organisation
- **Notizen**: Notizen zu Dokumenten hinzufügen

### 5. Suche und Filter
- **Volltextsuche** in Dokumentennamen und Notizen
- **Erweiterte Filter**:
  - Zeitraum (von-bis)
  - Dateityp
  - Größe
  - Status
  - Tags

### 6. Dokumenten-Historie
- **Versionierung**: Mehrere Versionen eines Dokuments
- **Änderungsprotokoll**: Wer hat wann was geändert
- **Vergleichsfunktion**: Unterschiede zwischen Versionen anzeigen

## Datenstruktur

```typescript
interface ManagedDocument {
  id: string;                          // Eindeutige ID
  name: string;                        // Dokumentenname
  type: DocumentType;                  // Typ (siehe unten)
  format: 'pdf' | 'xlsx' | 'csv' | 'json';
  filePath?: string;                   // Lokaler Pfad (Electron)
  blobUrl?: string;                    // Blob-URL (Browser)
  size: number;                        // Dateigröße in Bytes
  
  // Metadaten
  createdAt: string;                   // ISO-Datum
  updatedAt: string;                   // ISO-Datum
  createdBy?: string;                  // Benutzername (falls Mehrbenutzer)
  
  // Verknüpfungen
  linkedEntityType?: 'rezeptur' | 'charge' | 'inventory' | 'range-analysis';
  linkedEntityId?: string;             // ID der verknüpften Entität
  
  // Organisation
  status: 'draft' | 'final' | 'archived';
  tags: string[];                      // Benutzerdefinierte Tags
  notes?: string;                      // Notizen zum Dokument
  
  // Versionierung
  version: number;                     // Versionsnummer
  previousVersionId?: string;          // ID der vorherigen Version
}

enum DocumentType {
  RANGE_ANALYSIS = 'range-analysis',
  PRODUCTION_PROTOCOL = 'production-protocol',
  RECIPE_DOCUMENT = 'recipe-document',
  QR_CODE_SHEET = 'qr-code-sheet',
  INVENTORY_REPORT = 'inventory-report',
  BATCH_DOCUMENTATION = 'batch-documentation',
  CUSTOM = 'custom'
}
```

## UI/UX Design

### Layout
```
┌─────────────────────────────────────────────────┐
│  Header: Dokumentenverwaltung                   │
│  [+ Neu erstellen] [Filter ▼] [Suche...]       │
├─────────────────────────────────────────────────┤
│  Sidebar (Filter)  │  Dokumentenliste           │
│                    │  ┌──────────────────────┐  │
│  □ Alle (42)       │  │ 📄 Reichweite 2025   │  │
│  □ Reichweite (8)  │  │ PDF • 245 KB         │  │
│  □ Protokolle (12) │  │ 23.11.2025           │  │
│  □ Rezepturen (15) │  │ [👁] [⬇] [🗑]       │  │
│  □ QR-Codes (5)    │  └──────────────────────┘  │
│  □ Berichte (2)    │                            │
│                    │  ┌──────────────────────┐  │
│  Status            │  │ 📊 GFKC Analyse      │  │
│  □ Entwurf (3)     │  │ Excel • 89 KB        │  │
│  □ Fertig (35)     │  │ 20.11.2025           │  │
│  □ Archiv (4)      │  │ [👁] [⬇] [🗑]       │  │
│                    │  └──────────────────────┘  │
└────────────────────┴────────────────────────────┘
```

### Aktionen
- **Quick Actions**: Buttons für häufige Aktionen (Vorschau, Download, Löschen)
- **Context Menu**: Rechtsklick für erweiterte Optionen
- **Drag & Drop**: Upload neuer Dokumente per Drag & Drop
- **Batch Operations**: Mehrfachauswahl für Massenaktionen

## Speicherung

### Electron (Desktop)
- **Lokale Dateien**: Dokumente im User-Verzeichnis
  ```
  ~/MazerationsMeister/documents/
    ├── range-analysis/
    ├── protocols/
    ├── recipes/
    └── qr-codes/
  ```
- **Metadaten**: SQLite-Datenbank oder JSON-Datei
- **Index**: Schnellzugriff über Index-Datei

### Browser (PWA)
- **IndexedDB**: Metadaten und kleine Dokumente
- **Blob Storage**: Größere Dateien als Blobs
- **Optional**: OneDrive/Cloud-Sync

## Integration in bestehende Features

### Reichweitenanalyse
Nach Export (PDF/Excel/CSV):
```typescript
// Dokument automatisch in Verwaltung speichern
await documentManager.saveDocument({
  name: `Reichweitenanalyse_${date}`,
  type: DocumentType.RANGE_ANALYSIS,
  format: 'pdf',
  blob: pdfBlob,
  linkedEntityType: 'range-analysis',
  linkedEntityId: calculationId,
  tags: ['GFKC', 'Reichweite', '2025']
});
```

### Produktionsprotokolle
Beim Speichern:
```typescript
await documentManager.saveDocument({
  name: `Protokoll_Charge_${chargeNr}`,
  type: DocumentType.PRODUCTION_PROTOCOL,
  format: 'pdf',
  linkedEntityType: 'charge',
  linkedEntityId: chargeId
});
```

### Rezepturen
Beim Druck:
```typescript
await documentManager.saveDocument({
  name: `Rezeptur_${rezepturName}`,
  type: DocumentType.RECIPE_DOCUMENT,
  format: 'pdf',
  linkedEntityType: 'rezeptur',
  linkedEntityId: rezepturId
});
```

## Zugriff

### Navigation
- **Sidebar-Tab**: Ganz unten in der Sidebar (nach Einstellungen)
  - Icon: 📁 oder FileText
  - Label: "Dokumente"
- **Tastenkombination**: Strg+D (optional)
- **URL**: `/documents` oder `/dokumente`

### Schnellzugriff
Von anderen Seiten aus:
- "In Dokumentenverwaltung speichern" Button nach Export
- "Vorherige Exporte anzeigen" Link
- Benachrichtigung mit Link nach erfolgreichem Export

## Technische Implementation

### Komponenten
```
src/
├── app/
│   └── dokumente/
│       └── page.tsx                 # Hauptseite
├── components/
│   └── dokumente/
│       ├── DocumentList.tsx         # Liste aller Dokumente
│       ├── DocumentCard.tsx         # Einzelnes Dokument
│       ├── DocumentFilter.tsx       # Filter-Sidebar
│       ├── DocumentPreview.tsx      # Vorschau-Modal
│       ├── DocumentUpload.tsx       # Upload-Dialog
│       └── CreateDocumentMenu.tsx   # Schnellerstellung
└── lib/
    └── document-manager.ts          # Core-Logik
```

### Services
```typescript
class DocumentManager {
  async saveDocument(doc: ManagedDocument): Promise<string>;
  async getDocument(id: string): Promise<ManagedDocument | null>;
  async listDocuments(filter?: DocumentFilter): Promise<ManagedDocument[]>;
  async deleteDocument(id: string): Promise<void>;
  async updateDocument(id: string, updates: Partial<ManagedDocument>): Promise<void>;
  async searchDocuments(query: string): Promise<ManagedDocument[]>;
  async exportDocuments(ids: string[]): Promise<Blob>; // ZIP
  async createVersion(id: string): Promise<string>; // Neue Version
}
```

## Prioritäten

### Phase 1 (MVP)
1. ✅ Grundlegende Dokumentenliste
2. ✅ Speicherung von exportierten Dokumenten
3. ✅ Download-Funktion
4. ✅ Einfache Filter (nach Typ, Datum)
5. ✅ Integration in Reichweitenanalyse

### Phase 2
1. ⬜ Vorschau-Funktion (PDF-Viewer)
2. ⬜ Suchfunktion
3. ⬜ Tags und Notizen
4. ⬜ Umbenennen und Löschen
5. ⬜ Drag & Drop Upload

### Phase 3
1. ⬜ Versionierung
2. ⬜ Archivierung
3. ⬜ Batch-Operationen
4. ⬜ Cloud-Sync (optional)
5. ⬜ Vergleichsfunktion

## Offene Fragen

1. **Speicherlimit**: Maximale Anzahl/Größe von Dokumenten?
2. **Auto-Cleanup**: Alte Dokumente automatisch löschen nach X Tagen?
3. **Backup**: Automatisches Backup der Dokumentenverwaltung?
4. **Mehrbenutzer**: Benutzerverwaltung für Dokumente?
5. **Cloud-Sync**: OneDrive-Integration wie bei QR-Codes?

## Nächste Schritte

1. **Roadmap-Eintrag erstellen** ✅
2. UI-Mockups erstellen
3. Datenmodell finalisieren
4. Implementierung Phase 1 starten
5. Tests mit echten Dokumenten
6. User Feedback einholen
