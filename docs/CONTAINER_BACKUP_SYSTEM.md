# 📦 Container Backup-System - Anleitung

**Stand:** 18. November 2025  
**Version:** 1.2.2 (FIX 5.11c + 5.11d)

## Übersicht

Das automatische Backup-System schützt Ihre Container-Definitionen (Gebinde) vor Datenverlust. Bei jeder Änderung wird automatisch ein Backup erstellt.

**NEU in v1.2.2 (FIX 5.11d)**: Backups werden jetzt **doppelt** gespeichert:
- 💾 **Lokal** (schneller Zugriff)
- 🌐 **Git-Repository** (über GitHub auf allen Rechnern verfügbar)

---

## 🔄 Automatische Backups

### Wann werden Backups erstellt?

Automatisch bei jeder Container-Synchronisation:
- **XLSX-Import** in Lagerverwaltung
- **Container hinzufügen/bearbeiten** in Gebindeverwaltung
- **Container befüllen** aus Lagerverwaltung
- **Container-Reset** (alle löschen und neu erstellen)

### Was wird gesichert?

Jedes Backup enthält:
- **Alle Container-Definitionen** (Tanks, Fässer, Ballons, IBC, etc.)
- **Container-IDs** (Fass-1, B-3, T 341, etc.)
- **Beschreibungen** (z.B. "Edelstahl 5000L, Eigentum XY GmbH")
- **Kapazitäten** (Volumen in Litern)
- **Container-Typen** (Tank, Fass, Ballon, IBC, Flasche, Sonstiges)
- **Notizen und Historie** (Movements, Notes)
- **Aktuelle Inhalte** (welche Produkte in welchen Containern)
- **Status** (leer, befüllt, verschickt, retour)

### Backup-Format

```
Dateiname: tankDefinitions_backup_2025-11-18T14-30-45
```

**Inhalt:**
```json
{
  "timestamp": "2025-11-18T14:30:45.123Z",
  "version": "1.2.2",
  "containerCount": 62,
  "containers": [
    {
      "id": "Fass-1",
      "tankNr": "Fass",
      "bezeichnung": "Holzfass 200L, Eigentum Brennerei XY",
      "volumenLiter": 200,
      "containerType": "barrel",
      "hasUniqueNumber": true,
      "status": "filled",
      "currentContent": "Zitronenmelisse",
      "movements": [...],
      "notes": "QR-Code generiert am 15.10.2025"
    },
    // ... weitere 61 Container
  ]
}
```

### Automatische Backup-Rotation

- **Letzte 10 Backups** werden behalten
- **Ältere Backups** werden automatisch gelöscht
- Backups sind chronologisch sortiert (neuestes zuerst)

### Dual-Storage-System (NEU in v1.2.2)

**Lokale Backups** (hybridStorage):
- Gespeichert in: `C:\Users\[User]\AppData\Roaming\mazerationsmeister\` (Electron) oder localStorage (Browser)
- Sofortiger Zugriff ohne Dateisystem
- Ideal für schnelle Wiederherstellung

**Git-Backups** (Repository):
- Gespeichert in: `backups/tankDefinitions_backup_*.json` im Projektverzeichnis
- Werden automatisch via GitHub synchronisiert
- Auf allen Rechnern verfügbar (nach Git Pull)
- Ideal für Multi-Rechner-Setup

---

## 📥 Backup wiederherstellen

### Schritt-für-Schritt

1. **Gebindeverwaltung öffnen**
   - Navigieren Sie zu "Gebindeverwaltung" im Hauptmenü

2. **Backup-Button klicken**
   - Klicken Sie auf den Button **"📦 Backup wiederherstellen"**
   - Befindet sich oben in der Buttonleiste

3. **Backup auswählen**
   - Ein Popup zeigt alle verfügbaren Backups (NEU: mit Quelle):
     ```
     Verfügbare Backups:
     
     1. 18.11.2025, 14:30:45 - 62 Container (🌐 Git)
     2. 18.11.2025, 12:15:23 - 60 Container (💾 Lokal)
     3. 17.11.2025, 16:45:10 - 58 Container (🌐 Git)
     4. 17.11.2025, 09:20:35 - 55 Container (💾 Lokal)
     ... bis zu 10 Backups pro Quelle
     
     Nummer eingeben (1-10):
     ```
   - **🌐 Git**: Backup aus Git-Repository (auf allen Rechnern verfügbar)
   - **💾 Lokal**: Backup aus lokalem Speicher (nur dieser Rechner)

4. **Nummer eingeben**
   - Geben Sie die Nummer des gewünschten Backups ein (z.B. "1" für neuestes)
   - Bestätigen Sie mit Enter/OK

5. **Bestätigung**
   - Erfolgsmeldung erscheint:
     ```
     ✅ Backup wiederhergestellt: 62 Container
     Timestamp: 2025-11-18T14:30:45.123Z
     ```
   - App lädt automatisch neu

6. **Überprüfung**
   - Alle Container sind wiederhergestellt
   - Überprüfen Sie die Gebindeverwaltung
   - QR-Codes, Beschreibungen, Kapazitäten sind intakt

---

## 🛡️ Anwendungsfälle

### Fall 1: Versehentlicher Container-Reset

**Problem:**
- Sie haben versehentlich "ALLE CONTAINER ZURÜCKSETZEN" geklickt
- 62 Container mit QR-Codes und Beschreibungen sind weg

**Lösung:**
1. "📦 Backup wiederherstellen" klicken
2. Backup von VOR dem Reset auswählen (z.B. 5 Minuten alt)
3. Alle Container sind wieder da mit allen Daten

### Fall 2: XLSX-Import überschreibt manuelle Daten

**Problem:**
- Sie haben Tank T 344 manuell angelegt: "Edelstahl 5000L, QR: xyz123"
- XLSX-Import hat T 344 überschrieben (nur noch generischer Name)

**Lösung:**
1. "📦 Backup wiederherstellen" klicken
2. Backup von VOR dem Import auswählen
3. T 344 hat wieder Ihre Beschreibung und QR-Code-Info

### Fall 3: Fehlerhafte Sync-Logik (historisch)

**Problem:**
- Alte Version hat "Fass-1" zu "Fass-1-1", "Fass-1-2" aufgespalten
- Container-IDs sind durcheinander

**Lösung:**
1. Auf neue Version updaten (v1.2.2+)
2. "📦 Backup wiederherstellen" klicken
3. Letztes GUTES Backup auswählen (vor dem Split)
4. Neue Sync-Logik verhindert zukünftige Splits

---

## 💡 Best Practices

### Regelmäßige Kontrolle

- **Nach XLSX-Imports**: Kurz Gebindeverwaltung checken
- **Nach manuellen Änderungen**: Überprüfen ob alles korrekt
- **Bei Unklarheiten**: Backup wiederherstellen kostet nur 10 Sekunden

### Externe Backups

Zusätzlich zu automatischen Backups:

1. **Manueller Export**
   - Button "Tanks exportieren" in Gebindeverwaltung
   - Speichert `tanks.json` auf Ihrer Festplatte
   - Datieren Sie die Datei: `tanks_2025-11-18.json`

2. **Regelmäßige Sicherung**
   - Exportieren Sie nach großen Änderungen
   - Vor Updates der App
   - Mindestens einmal pro Monat

3. **Cloud-Backup** (optional)
   - Kopieren Sie `tanks.json` in OneDrive/Dropbox
   - Zusätzliche Sicherheit außerhalb der App

---

## 🔧 Technische Details

### Speicherort

Backups werden in **hybridStorage** gespeichert:
- **Electron/Desktop**: IndexedDB
- **Browser**: localStorage Fallback

### Backup-Keys

Format: `tankDefinitions_backup_YYYY-MM-DDTHH-MM-SS`

Beispiele:
```
tankDefinitions_backup_2025-11-18T14-30-45
tankDefinitions_backup_2025-11-18T12-15-23
tankDefinitions_backup_2025-11-17T16-45-10
```

### Automatische Löschung

Wenn mehr als 10 Backups existieren:
1. Sortierung: Neueste zuerst
2. Behalte: Top 10
3. Lösche: Alle älteren

**Beispiel:**
- 12 Backups vorhanden
- Backup Nr. 11 und 12 werden automatisch gelöscht
- Console: `🗑️ Altes Backup gelöscht: tankDefinitions_backup_2025-10-15T...`

---

## ❓ Häufige Fragen

### Kann ich mehrere Backups auf einmal wiederherstellen?

Nein, Sie wählen EIN Backup zur Wiederherstellung. Nach der Wiederherstellung lädt die App neu und verwendet dieses Backup.

### Was passiert mit dem aktuellen Zustand beim Wiederherstellen?

Der aktuelle Zustand wird ersetzt. **ABER**: Vor der Wiederherstellung wird automatisch ein neues Backup erstellt, sodass Sie zurück können.

### Werden Backups beim App-Update gelöscht?

Nein, Backups bleiben erhalten. Sie sind in IndexedDB/localStorage gespeichert, nicht im App-Ordner.

### Wie lösche ich alte Backups manuell?

Backups werden automatisch rotiert. Manuelles Löschen ist normalerweise nicht nötig. Falls gewünscht:
1. Entwickler-Tools öffnen (F12)
2. Application → IndexedDB oder Local Storage
3. Keys mit `tankDefinitions_backup_` suchen und löschen

### Funktionieren Backups auch nach Container-Reset?

Ja! Der "ALLE CONTAINER ZURÜCKSETZEN" Button erstellt VOR dem Löschen automatisch ein Backup. Sie können immer wiederherstellen.

---

## 🆘 Problemlösung

### "Keine Backups gefunden"

**Ursache:** Noch keine Container-Änderung seit Update auf v1.2.2

**Lösung:**
1. Container manuell bearbeiten (irgendeinen)
2. Speichern → Backup wird erstellt
3. Oder: XLSX-Import durchführen

### Backup kann nicht wiederhergestellt werden

**Ursache:** Beschädigtes Backup oder Storage-Fehler

**Lösung:**
1. Anderes Backup auswählen (eine Nummer höher/niedriger)
2. Falls alle Backups fehlschlagen: Manueller Import von `tanks.json`
3. Button "Tanks importieren" → Vorher exportierte JSON-Datei laden

### App stürzt ab nach Wiederherstellung

**Ursache:** Inkompatibles Backup-Format (sehr selten)

**Lösung:**
1. Browser-Cache leeren (Strg+Shift+Delete)
2. App neu starten
3. Falls weiterhin Probleme: "ALLE CONTAINER ZURÜCKSETZEN" → Neu aufbauen

---

## 📞 Support

Bei Problemen mit dem Backup-System:
1. Console öffnen (F12 → Console)
2. Nach Fehlermeldungen suchen (rot markiert)
3. Screenshot machen
4. Issue auf GitHub erstellen oder Support kontaktieren

---

## ✅ Checkliste: Nach XLSX-Import

- [ ] Gebindeverwaltung öffnen
- [ ] Anzahl Container überprüfen (sollte ~62 sein)
- [ ] Stichprobe: 3-5 Container öffnen und Beschreibungen checken
- [ ] Falls etwas falsch: "📦 Backup wiederherstellen" → Backup VOR Import
- [ ] Falls alles OK: Weiter arbeiten (neues Backup ist bereits erstellt)

---

**Hinweis:** Das Backup-System ist seit Version 1.2.2 aktiv und läuft vollautomatisch im Hintergrund. Sie müssen nichts konfigurieren!
