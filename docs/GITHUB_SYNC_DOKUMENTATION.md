# GitHub Synchronisations-Dokumentation

**MazerationsMeister - Zentrale Datensynchronisation**

## 📋 Übersicht

MazerationsMeister nutzt **GitHub Pages als zentralen Datenspeicher** für die Synchronisation zwischen mehreren Rechnern. Alle wichtigen Arbeitsdaten werden automatisch über GitHub synchronisiert, während sensible Zugangsdaten lokal bleiben.

---

## ✅ WAS WIRD SYNCHRONISIERT (über GitHub)

### 1. **Gebindeverwaltung (Container/Tanks)**
- **Datei**: `docs/app-data.json` → `tanks[]`
- **Inhalt**: 
  - Tank-Definitionen (ID, Bezeichnung, Volumen, Typ)
  - Füllstände (aktueller Inhalt, Liter)
  - Container-Status (leer/gefüllt)
  - Container-Kapazitäten
- **Beispiel**: B-1 bis B-25, Fass-1 bis Fass-6, T-Tanks (T 341, T 349, etc.)

### 2. **Lagerverwaltung (Inventar)**
- **Datei**: `docs/app-data.json` → `inventory[]`
- **Inhalt**:
  - Alle Mazerate und Produkte im Lager
  - Produktname, Kategorie, Menge (Liter)
  - Behälter-Zuordnung (tankNr)
  - Alkoholgehalt, Dichte, Berechnungen
  - Letzte Inventur-Daten
- **Beispiel**: "Königskerze" in "Fass-1", 106.8L, 45% Vol.

### 3. **TODO-Liste (Dashboard-Aufgaben)**
- **Datei**: `docs/app-data.json` → `todos[]` (über `dashboardTasks` Key)
- **Inhalt**:
  - Projekt-Aufgaben mit Status (offen/erledigt)
  - Beschreibungen und Notizen
  - Fälligkeitsdaten
  - Prioritäten und Tags
- **Beispiel**: "QR-Codes drucken", Status: Erledigt

### 4. **Kalender-Events** (geplant)
- **Datei**: `docs/app-data.json` → `calendar[]`
- **Inhalt**:
  - Erinnerungen für Mazerat-Fertigstellung
  - Wartungstermine
  - Geplante Aufgaben
- **Status**: Datenstruktur vorhanden, UI kommt später

### 5. **Mazerations-Protokolle** (geplant)
- **Datei**: `docs/app-data.json` → `mazerationProtocols[]`
- **Inhalt**:
  - Start-/Enddaten von Mazerationen
  - Verwendete Zutaten
  - Verarbeitungs-Notizen
- **Status**: Datenstruktur vorhanden, UI kommt später

### 6. **Rezepturen/Ausmischungen** (geplant)
- **Datei**: `docs/app-data.json` → `rezepturen[]`
- **Inhalt**:
  - Mischungsverhältnisse
  - Zutaten-Listen
  - Anweisungen
- **Status**: Datenstruktur vorhanden, UI kommt später

### 7. **Sync-Metadaten**
- **Datei**: `docs/app-data.json` → Metadata-Felder
- **Inhalt**:
  - `lastUpdate`: Letzter Änderungszeitpunkt (ISO 8601)
  - `computerName`: Welcher Rechner hat zuletzt geändert
  - `userName`: Welcher Benutzer hat zuletzt geändert
  - `version`: Datenmodell-Version (z.B. "1.0.0")

---

## ❌ WAS WIRD NICHT SYNCHRONISIERT (nur lokal)

### 1. **GitHub-Zugangsdaten**
- **Speicherort**: `%APPDATA%\mazerationsmeister\mazerations-storage.json`
- **Key**: `githubToken`, `githubUsername`, `githubRepository`
- **Grund**: **Sicherheit** - Token darf nicht öffentlich auf GitHub landen!
- **Folge**: Muss auf jedem Rechner einmalig in Einstellungen eingegeben werden

### 2. **Sync-Konfiguration**
- **Speicherort**: `%APPDATA%\mazerationsmeister\mazerations-storage.json`
- **Keys**: 
  - `autoSyncEnabled`: Automatische Synchronisation an/aus
  - `autoSyncInterval`: Sync-Intervall in Minuten
  - `lastSyncTimestamp`: Letzter lokaler Sync
- **Grund**: Jeder Rechner kann eigene Sync-Einstellungen haben
- **Folge**: Muss pro Rechner individuell konfiguriert werden

### 3. **UI-Einstellungen** (falls vorhanden)
- **Speicherort**: `%APPDATA%\mazerationsmeister\mazerations-storage.json`
- **Keys**: 
  - Theme (Hell/Dunkel-Modus)
  - Sprache
  - Fenster-Positionen
  - Sortier-Präferenzen
- **Grund**: Persönliche Präferenzen pro Arbeitsplatz
- **Status**: Noch nicht implementiert

### 4. **Temporäre Daten**
- **Speicherort**: Browser localStorage (im Renderer-Process)
- **Inhalt**:
  - UI-Zustand (geöffnete Dialoge, Tabs)
  - Filter-Einstellungen
  - Scroll-Positionen
- **Grund**: Kurzlebige Session-Daten, nicht persistent

### 5. **Cache-Daten**
- **Speicherort**: Browser-Cache
- **Inhalt**:
  - Heruntergeladene QR-Codes
  - Generierte PDFs
  - Temporäre Bilder
- **Grund**: Können jederzeit neu generiert werden

---

## 🔄 Synchronisations-Workflow

### **Ablauf bei lokalen Änderungen:**

```
1. Benutzer ändert Daten (z.B. neues TODO)
   ↓
2. Dashboard Widget speichert in hybridStorage
   hybridStorage.set("dashboardTasks", tasks)
   ↓
3. hybridStorage speichert lokal
   %APPDATA%\mazerationsmeister\mazerations-storage.json
   ↓
4. app-auto-sync.ts erkennt Änderung (automatisch alle 60 Min.)
   ↓
5. app-auto-sync sammelt ALLE Daten:
   - tanks (aus "tankDefinitions")
   - inventory (aus "inventoryItems")
   - todos (aus "dashboardTasks")
   - calendar, protocols, rezepturen (aktuell leer)
   ↓
6. Upload zu GitHub Pages
   PUT docs/app-data.json via GitHub API
   ↓
7. GitHub Pages aktualisiert öffentliche Datei
   https://woku369.github.io/MazerationsMeister/app-data.json
```

### **Ablauf auf anderem Rechner:**

```
1. app-auto-sync läuft automatisch (alle 60 Min.)
   ↓
2. Download von GitHub Pages
   GET https://woku369.github.io/.../app-data.json
   ↓
3. Vergleich: Remote vs. Lokal
   - Timestamp-Check (wer ist neuer?)
   - ComputerName-Check (Konflikt-Erkennung)
   ↓
4. Bei neuen Remote-Daten: Überschreiben
   hybridStorage.set("tankDefinitions", remote.tanks)
   hybridStorage.set("inventoryItems", remote.inventory)
   hybridStorage.set("dashboardTasks", remote.todos)
   ↓
5. UI aktualisiert sich automatisch
   Komponenten lauschen auf Storage-Events
```

---

## 🛡️ Konflikt-Behandlung

### **Szenario: Beide Rechner offline bearbeitet**

1. **Erkennung**: 
   - `lastUpdate` Timestamps vergleichen
   - `computerName` prüfen (Rechner A vs. Rechner B)

2. **Strategie** (aktuell):
   - **Remote gewinnt**: GitHub-Version überschreibt lokale Änderungen
   - **Warnung**: Dialog zeigt Konflikt an

3. **Zukünftig geplant**:
   - Merge-Logik für Arrays (z.B. TODOs zusammenführen)
   - Manuelle Konflikt-Auflösung
   - Backup vor Überschreiben

---

## 📁 Datei-Struktur

### **GitHub Pages (öffentlich, synchronisiert)**
```
docs/
├── app-data.json          ← ALLE synchronisierten Daten
├── tank-data.json         ← Legacy (wird noch von QR-Viewer genutzt)
└── index.html             ← QR-Viewer Oberfläche
```

### **Lokaler Speicher (privat, nicht synchronisiert)**
```
%APPDATA%\mazerationsmeister\
└── mazerations-storage.json  ← GitHub-Token + lokale Einstellungen
```

---

## 🔐 Sicherheits-Hinweise

### ✅ **Sicher (kann öffentlich sein)**
- Gebinde-Daten (Tanks, Füllstände)
- Inventar (Produktnamen, Mengen)
- TODO-Listen
- Kalender-Events
- → Keine sensiblen persönlichen Daten

### ⚠️ **Privat (darf NICHT auf GitHub)**
- `githubToken` - **Zugriff auf GitHub-Account**
- Passwörter, API-Keys
- Persönliche Notizen mit vertraulichem Inhalt
- → Bleiben in `%APPDATA%\mazerationsmeister\`

### 🔧 **Hinweis für GitHub Pages**
- Repository muss **öffentlich** sein für GitHub Pages
- `docs/app-data.json` ist öffentlich lesbar (kein Problem bei Destillerie-Daten)
- Wer URL kennt, kann Daten lesen (aber nicht schreiben ohne Token)

---

## 🚀 Ersteinrichtung pro Rechner

### **Rechner 1 (Hauptrechner - Upload)**
1. App starten
2. Einstellungen → GitHub-Integration
3. Token, Username, Repository eingeben
4. "Daten zu GitHub hochladen" klicken
5. Fertig! ✅

### **Rechner 2 (Zweitrechner - Download)**
1. App starten
2. Einstellungen → GitHub-Integration
3. **Gleichen** Token, Username, Repository eingeben
4. "Daten von GitHub laden" klicken
5. Alle Daten werden synchronisiert ✅

### **Automatische Synchronisation**
- Nach Ersteinrichtung: Automatisch alle 60 Minuten
- Kann in Einstellungen angepasst werden (15, 30, 60, 120 Min.)
- Kann komplett deaktiviert werden (nur manuell)

---

## 📊 Datenformat-Beispiel

### **docs/app-data.json (vereinfacht)**
```json
{
  "version": "1.0.0",
  "lastUpdate": "2025-10-15T14:30:00.000Z",
  "computerName": "DESKTOP-BRENNEREI",
  "userName": "Wolfgang",
  
  "tanks": [
    {
      "id": "B-1",
      "tankNr": "B",
      "bezeichnung": "B-1",
      "volumenLiter": 25,
      "containerType": "canister",
      "status": "filled",
      "currentContent": "Königskerze"
    }
  ],
  
  "inventory": [
    {
      "id": "inv-001",
      "produktName": "Königskerze",
      "tankNr": "B-1",
      "currentQuantityLiters": 25,
      "alcoholContent": 45.0
    }
  ],
  
  "todos": [
    {
      "id": "todo-001",
      "name": "QR-Codes drucken",
      "status": "erledigt",
      "date": "2025-10-15"
    }
  ],
  
  "calendar": [],
  "mazerationProtocols": [],
  "rezepturen": []
}
```

---

## 🔍 Debugging & Monitoring

### **Console-Logs prüfen**
```
✅ Dashboard Tasks geladen (hybridStorage → GitHub): 3 Aufgaben
✅ Dashboard Tasks gespeichert (→ GitHub Sync): 3 Aufgaben
📤 Uploading to GitHub: docs/app-data.json
✅ GitHub Upload successful: docs/app-data.json
```

### **Sync-Status checken**
- Einstellungen → GitHub-Integration
- "Letzte Synchronisation" anzeigen
- "Sync-Status" (Idle/Syncing/Error)

### **Manuelle Synchronisation**
- Einstellungen → "Jetzt hochladen" (Push)
- Einstellungen → "Jetzt herunterladen" (Pull)

---

## 🐛 Troubleshooting

### **Problem: TODO-Liste wird nicht synchronisiert**
- ✅ **Lösung**: GitHub-Token in Einstellungen prüfen
- ✅ **Lösung**: "Jetzt hochladen" manuell ausführen
- ✅ **Lösung**: Console-Logs prüfen (F12)

### **Problem: Daten auf Rechner 2 veraltet**
- ✅ **Lösung**: "Jetzt herunterladen" klicken
- ✅ **Lösung**: Auto-Sync Intervall verkleinern (15 Min.)

### **Problem: Konflikt zwischen Rechnern**
- ✅ **Lösung**: GitHub-Version gewinnt (automatisch)
- ⚠️ **Workaround**: Nicht gleichzeitig auf beiden Rechnern arbeiten
- 🔜 **Geplant**: Intelligente Merge-Logik

---

## 📝 Zusammenfassung

| Datentyp | Synchronisiert | Speicherort |
|----------|----------------|-------------|
| **Gebinde (Tanks)** | ✅ Ja | GitHub → `docs/app-data.json` |
| **Inventar** | ✅ Ja | GitHub → `docs/app-data.json` |
| **TODO-Liste** | ✅ Ja | GitHub → `docs/app-data.json` |
| **Kalender** | ✅ Ja (geplant) | GitHub → `docs/app-data.json` |
| **Protokolle** | ✅ Ja (geplant) | GitHub → `docs/app-data.json` |
| **Rezepturen** | ✅ Ja (geplant) | GitHub → `docs/app-data.json` |
| **GitHub-Token** | ❌ Nein | Lokal → `%APPDATA%\mazerationsmeister\` |
| **Sync-Einstellungen** | ❌ Nein | Lokal → `%APPDATA%\mazerationsmeister\` |
| **UI-Präferenzen** | ❌ Nein | Lokal → `%APPDATA%\mazerationsmeister\` |

---

**Stand**: 15. Oktober 2025  
**Version**: 1.1.0  
**System**: GitHub Pages + hybridStorage + app-auto-sync
