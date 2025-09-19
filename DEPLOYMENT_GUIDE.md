# MazerationsMeister - Desktop App Deployment Anleitung

## 🚀 Deployment auf entferntem Rechner

### Was muss kopiert werden?

**✅ JA - Komplettes Verzeichnis kopieren:**
```
MazerationsMeister-win32-x64/
├── MazerationsMeister.exe     ← Haupt-Anwendung
├── locales/                   ← Sprachdateien
├── resources/                 ← App-Daten (WICHTIG!)
│   └── app.asar              ← Gepackte Anwendung (~6GB)
├── snapshot_blob.bin          ← V8 Engine
├── v8_context_snapshot.bin    ← V8 Context
├── chrome_100_percent.pak     ← UI Resources
├── chrome_200_percent.pak     ← UI Resources (High-DPI)
├── icudtl.dat                ← Unicode-Daten
├── LICENSE                    ← Lizenz-Info
├── version                    ← Version-Info
└── [weitere Electron-Dateien]
```

**❌ NICHT einzeln kopieren:**
- Nur die .exe Datei reicht NICHT aus
- Fehlende `resources/app.asar` → App startet nicht
- Fehlende DLLs → Electron Runtime-Fehler

### 📋 Deployment Checkliste

#### 1. Vorbereitung (Quell-Rechner)
- [x] **App erfolgreich getestet** auf Entwicklungs-Rechner
- [x] **Alle Funktionen verifiziert** (Dashboard, Inventory, QR-Codes)
- [x] **Portable Build erstellt**: `dist\MazerationsMeister-win32-x64\`

#### 2. Transfer (Ziel-Rechner)  
- [ ] **Kompletten Ordner kopieren**: `MazerationsMeister-win32-x64\` 
- [ ] **Zielordner**: z.B. `C:\Programme\MazerationsMeister\`
- [ ] **Dateigröße prüfen**: ~6GB (normale Größe für Electron App)

#### 3. Installation (Ziel-Rechner)
- [ ] **Verknüpfung erstellen**: Desktop-Shortcut zu `MazerationsMeister.exe`
- [ ] **Firewall-Regel**: Windows Firewall TCP Port 3000-9003 freigeben
- [ ] **OneDrive installiert**: Für Datensynchronisation (optional)

#### 4. Erster Start
- [ ] **App starten**: `MazerationsMeister.exe` doppelklicken
- [ ] **Port-Check**: App zeigt `http://localhost:[PORT]` in Console
- [ ] **Alle Bereiche testen**: Dashboard, Inventory, Mazerationen, Einstellungen

## 💾 OneDrive-Datensynchronisation

### Wann werden Daten geschrieben?

**🔄 Automatische Speicherung:**
1. **LocalStorage (sofort)**: Alle Eingaben werden sofort im Browser-LocalStorage gespeichert
2. **OneDrive-Backup (manuell)**: Über "Daten speichern" Button in Inventory-Management
3. **Export-Funktionen (manuell)**: XLSX/PDF Exports über entsprechende Buttons

**📂 OneDrive-Pfad-Struktur:**
```
C:\Users\[Username]\OneDrive\MazerationsMeister\
├── tanks/
│   ├── tank-T341.json        ← Tank-spezifische Daten
│   ├── tank-T342.json
│   └── tank-T343.json
├── chargen/
│   ├── MB-2025-001.json      ← Chargen-Informationen  
│   └── MB-2025-002.json
├── backup/
│   ├── tank-T341_2025-09-14T10-30-00.json  ← Timestamped Backups
│   └── inventory-backup-2025-09-14.json
└── exports/
    ├── inventory-export-2025-09-14.xlsx
    └── tank-report-2025-09-14.pdf
```

### OneDrive-Konfiguration

**🔧 Setup in App:**
1. **Einstellungen öffnen** → "OneDrive QR-Codes" Tab
2. **OneDrive-Freigabe-URL eingeben** (falls vorhanden)
3. **App-Pfad festlegen** (optional für QR-Codes)
4. **"Konfiguration speichern"** klicken
5. **"Verbindung testen"** für Funktionsprüfung

**📤 Manueller Daten-Export:**
- **Inventory-Management** → "📁 Daten speichern" Button
- **Automatisches Backup**: Alle 10 Aktionen (konfigurierbar)
- **XLSX-Export**: "Excel-Export" Button für Tabellenkalkulation

## 🌐 Netzwerk-Konfiguration

### Lokaler Zugriff (Smartphone QR-Codes)

**🔧 Firewall-Einstellungen:**
```powershell
# Windows Firewall-Regel hinzufügen (als Administrator ausführen)
netsh advfirewall firewall add rule name="MazerationsMeister" dir=in action=allow protocol=TCP localport=3000-9003
```

**📱 Smartphone-Setup:**
1. **WLAN-Verbindung**: Smartphone im gleichen Netzwerk wie Computer
2. **IP-Adresse finden**: App zeigt automatisch lokale IP (z.B. 192.168.0.7:9003)
3. **QR-Code scannen**: Funktioniert mit Standard-Kamera-Apps (iOS/Android)
4. **Browser öffnet automatisch**: Mobile-optimierte Tank-Ansicht

## 🔧 Troubleshooting

### Häufige Probleme

**❌ App startet nicht:**
- **Lösung**: Kompletten Ordner kopieren, nicht nur .exe
- **Check**: `resources\app.asar` vorhanden? (~6GB Datei)
- **Alternative**: Anti-Virus temporär deaktivieren

**❌ "Can't connect to server":**
- **Lösung**: Firewall-Regeln prüfen, Port freigeben
- **Check**: Windows Defender / Firewall blockiert Ports?
- **Alternative**: App als Administrator starten

**❌ OneDrive-Sync funktioniert nicht:**
- **Lösung**: OneDrive Desktop-App installieren und anmelden
- **Check**: Ordner `C:\Users\[User]\OneDrive\` existiert?
- **Alternative**: Lokaler Export über "Daten speichern"

**❌ QR-Codes funktionieren nicht auf Smartphone:**
- **Lösung**: WLAN-Verbindung prüfen (gleiche IP-Range)
- **Check**: Firewall TCP Port freigegeben?
- **Alternative**: Offline-Fallback-Daten in QR-URL enthalten

### Support-Informationen sammeln

**📊 System-Informationen:**
```
- Windows-Version: [z.B. Windows 11 Pro]
- App-Pfad: [z.B. C:\Programme\MazerationsMeister\]
- OneDrive-Status: [Installiert/Nicht installiert]
- Netzwerk-IP: [z.B. 192.168.0.7]
- Firewall-Status: [Aktiviert/Deaktiviert]
- Browser: [Chrome/Edge/Firefox für OneDrive-Test]
```

**🐛 Fehler-Logs:**
- **App-Console**: F12 drücken → Console-Tab → Fehlermeldungen kopieren
- **Windows-Ereignisanzeige**: Windows-Logs → Anwendung → MazerationsMeister-Einträge
- **OneDrive-Sync-Status**: OneDrive-Icon → "Synchronisierungsstatus anzeigen"

---

**📝 Erstellt**: September 2025  
**👤 Für**: Deployment auf entfernten Rechnern  
**🔄 Update**: Bei App-Updates diese Anleitung aktualisieren