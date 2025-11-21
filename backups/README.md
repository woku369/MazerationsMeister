# Container-Backups (Git-synchronisiert)

Dieses Verzeichnis enthält automatische Backups der Container-Definitionen (`tankDefinitions`).

## 🎯 Zweck

- **Automatische Sicherung**: Bei jeder Änderung der Container-Daten wird ein Backup erstellt
- **Git-Synchronisierung**: Backups werden über GitHub auf allen Rechnern verfügbar gemacht
- **Version 1.2.2 (FIX 5.11d)**: Eingeführt am 18. November 2025

## 📦 Backup-Format

```json
{
  "timestamp": "2025-11-18T15:30:45.123Z",
  "version": "1.2.2",
  "containerCount": 42,
  "containers": [
    {
      "id": "Fass-1",
      "tankNr": "Fass-1",
      "bezeichnung": "Holzfass 200L",
      "volumenLiter": 200,
      ...
    }
  ]
}
```

## 🔄 Backup-Strategie

### Lokale Backups (schnell)
- Gespeichert in `hybridStorage` (Electron: AppData, Browser: localStorage)
- Maximal 10 Backups
- Sofortiger Zugriff ohne Dateisystem

### Git-Backups (synchronisiert)
- Gespeichert in `backups/` Verzeichnis
- Maximal 10 Backups
- Über GitHub auf allen Rechnern verfügbar
- Automatisches Cleanup alter Backups

## 🛡️ Wiederherstellung

### In der App
1. Gebindeverwaltung öffnen
2. Button "📦 Backup wiederherstellen" klicken
3. Backup auswählen (Lokale oder Git-Backups werden angezeigt)
4. Bestätigen

### Manuell
1. Backup-Datei aus `backups/` öffnen
2. `containers` Array kopieren
3. In Einstellungen → "Daten importieren"

## 📊 Backup-Häufigkeit

Backups werden erstellt bei:
- ✅ XLSX-Import
- ✅ Manuellem Hinzufügen/Bearbeiten/Löschen von Containern
- ✅ Container-Sync mit Inventar
- ✅ Reset der Container-Daten

## 🚨 Wichtige Hinweise

- **Keine sensiblen Daten**: Backups enthalten nur Container-Definitionen, keine Benutzerdaten
- **Git-Tracking**: Diese Dateien werden automatisch committed (nicht in `.gitignore`)
- **Cleanup**: Alte Backups werden automatisch gelöscht (max. 10)
- **Konfliktlösung**: Bei Git-Konflikten neuestes Backup bevorzugen

## 🔧 Technische Details

- **Dateiname**: `tankDefinitions_backup_YYYY-MM-DDTHH-MM-SS.json`
- **Encoding**: UTF-8
- **Format**: JSON mit 2-Space Indentation
- **Maximale Größe**: ~5 MB pro Backup (typisch: 50-500 KB)
- **IPC Handlers** (Electron):
  - `save-git-backup`: Speichert Backup
  - `list-git-backups`: Listet verfügbare Backups
  - `load-git-backup`: Lädt spezifisches Backup
  - `cleanup-git-backups`: Räumt alte Backups auf

## 📚 Siehe auch

- [ROADMAP.md](../ROADMAP.md) - FIX 5.11d Dokumentation
- [docs/CONTAINER_BACKUP_SYSTEM.md](../docs/CONTAINER_BACKUP_SYSTEM.md) - Umfassende Anleitung
- [APP_DOCUMENTATION.md](../APP_DOCUMENTATION.md) - Feature-Dokumentation
