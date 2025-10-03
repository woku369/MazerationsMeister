# 📱 OneDrive QR-Code System - Komplette Anleitung

## 🎯 Überblick

Das OneDrive QR-Code System ermöglicht es, Tank-Informationen mobil abzurufen, auch außerhalb des Büronetzwerks. Tank-Daten werden automatisch in OneDrive synchronisiert und über QR-Codes auf Smartphones zugänglich gemacht.

## 🔧 Technisches Konzept

```
Desktop App → JSON Export → OneDrive Upload → QR-Code → Mobile Web-App → Tank-Infos
```

### Workflow:
1. **Desktop App** exportiert Tank-/Inventardaten automatisch als JSON
2. **OneDrive Upload** der JSON-Datei (manuell oder automatisch)
3. **QR-Codes** verweisen auf OneDrive-gehostete Web-App
4. **Mobile Zugriff** über Smartphone-Kamera im Tankraum

## 📋 Setup-Anleitung

### Phase 1: OneDrive Ordner vorbereiten

1. **Ordner erstellen**:
   ```
   OneDrive/
   └── MazerationsMeister/
       ├── tank-data.json          (Haupt-Datei)
       ├── tank-viewer.html        (Mobile Web-App)
       └── tanks/                  (Optional: Einzelne Tank-Dateien)
           ├── tank-001.json
           └── tank-002.json
   ```

2. **Ordner freigeben**:
   - Rechtsklick auf `MazerationsMeister` Ordner
   - "Link teilen" → "Jeder mit dem Link" → "Anzeigen"
   - Share-URL kopieren (Format: `https://1drv.ms/f/s/xyz...`)

### Phase 2: Desktop App konfigurieren

1. **OneDrive in Einstellungen konfigurieren**:
   - Gehe zu "Einstellungen" in der Desktop App
   - Trage OneDrive Share-URL ein
   - Teste die Verbindung

2. **Automatischen Export einrichten**:
   - Export wird automatisch nach jeder Lagerbewegung erstellt
   - Manuelle Exports über "Tank-Daten exportieren" Button
   - JSON-Datei wird zum Download bereitgestellt

### Phase 3: OneDrive Upload

**Automatisch (empfohlen):**
- Desktop OneDrive Client installiert
- `tank-data.json` in den freigegebenen Ordner speichern
- OneDrive synchronisiert automatisch

**Manuell:**
- Download der `tank-data.json` aus der App
- Upload über OneDrive Web-Interface
- In den freigegebenen `MazerationsMeister` Ordner

### Phase 4: Mobile Web-App deployen

1. **tank-viewer.html hochladen**:
   - Datei aus `public/tank-viewer.html` kopieren
   - In OneDrive `MazerationsMeister` Ordner hochladen
   - Öffentlich freigeben

2. **URL testen**:
   - Direkte URL: `https://1drv.ms/u/s/xyz.../tank-viewer.html`
   - Mit Tank-ID: `...tank-viewer.html?data=DATEN_URL&tank=TANK_ID`

## 🎯 QR-Code Generierung

### Automatische Generierung:
```typescript
// QR-Code URL Format:
https://1drv.ms/u/s/xyz.../tank-viewer.html?data=https://1drv.ms/u/s/abc.../tank-data.json&tank=TANK_ID

// Beispiel:
https://1drv.ms/u/s/x1y2z3/tank-viewer.html?data=https://1drv.ms/u/s/a4b5c6/tank-data.json&tank=tank-001
```

### QR-Code Inhalt:
- **data**: URL zur OneDrive JSON-Datei
- **tank**: Spezifische Tank-ID für Einzelanzeige
- **Fallback**: Lokale URL wenn OneDrive nicht konfiguriert

## 📱 Mobile Nutzung

### Im Tankraum:
1. **QR-Code scannen** mit Smartphone-Kamera
2. **Web-App öffnet sich** automatisch im Browser
3. **Tank-Infos werden angezeigt**:
   - Tank-Nummer und Bezeichnung
   - Aktueller Inhalt (Artikel, Menge, Charge)
   - Einlagerungsdatum
   - Verfügbare Kapazität

### Offline-Verhalten:
- Web-App funktioniert ohne Internet (nach erstem Laden)
- Daten werden im Browser gecacht
- Letzte Aktualisierung wird angezeigt

## 🔧 Technische Details

### JSON-Datenformat:
```json
{
  "exportTimestamp": "2025-09-15T10:30:00.000Z",
  "version": "1.0.0",
  "lastUpdate": "15.09.2025, 12:30:15",
  "tanks": [
    {
      "id": "tank-001",
      "tankNr": "1",
      "bezeichnung": "Hauptgärtank",
      "volumenLiter": 1000,
      "standortDetails": "Raum A, Position 1",
      "aktuellerInhalt": {
        "artikel": "Apfelmaische",
        "menge": 850,
        "einheit": "L",
        "chargenNr": "AP2025-03",
        "einlagerungsDatum": "2025-09-10T00:00:00.000Z"
      }
    }
  ],
  "inventory": [...]
}
```

### Export-Trigger:
- ✅ Neue Lagerbewegung erfasst
- ✅ Tank-Definition geändert
- ✅ Inventar aktualisiert
- ✅ Manueller Export-Button

### Sicherheit:
- Nur Lesezugriff über OneDrive Share-Links
- Keine sensible Daten in QR-Codes
- HTTPS-verschlüsselte Übertragung

## 🚀 Deployment Checklist

- [ ] OneDrive Ordner `MazerationsMeister` erstellt
- [ ] Ordner öffentlich freigegeben (Share-URL kopiert)
- [ ] Desktop App mit OneDrive URL konfiguriert
- [ ] `tank-viewer.html` in OneDrive hochgeladen
- [ ] Test-Export durchgeführt
- [ ] `tank-data.json` in OneDrive hochgeladen
- [ ] QR-Code generiert und getestet
- [ ] Mobile Web-App funktional getestet

## 🐛 Troubleshooting

### QR-Code führt zu Fehler:
- Prüfe OneDrive Share-URL in Einstellungen
- Stelle sicher, dass `tank-data.json` öffentlich zugänglich ist
- Teste direkte URL im Browser: `https://1drv.ms/u/s/xyz.../tank-data.json`

### Mobile Web-App lädt nicht:
- Prüfe Internetverbindung
- Teste OneDrive URL direkt
- Lösche Browser-Cache und versuche erneut

### Daten veraltet:
- Führe manuellen Export in Desktop App durch
- Lade neue `tank-data.json` in OneDrive hoch
- Warte auf OneDrive Synchronisation

### OneDrive Synchronisation:
- Desktop OneDrive Client sollte aktiv sein
- Prüfe Sync-Status in OneDrive
- Bei Problemen: Manuelle Upload über Web-Interface

## 📈 Erweiterungsmöglichkeiten

### Zukünftige Features:
- 🔄 Automatische OneDrive API Integration
- 📊 Batch-QR-Code Generierung
- 🏷️ Custom QR-Code Designs
- 📱 Progressive Web App (PWA)
- 🔔 Push-Notifications bei Änderungen
- 📸 Barcode-Scanner Integration

## 📞 Support

Bei Problemen:
1. Prüfe OneDrive Konfiguration in Desktop App
2. Teste alle URLs direkt im Browser
3. Überprüfe Export-Logs in Browser-Konsole
4. Kontaktiere Support mit Fehlermeldungen