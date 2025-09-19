# 🌐 Cloud-QR-Code Setup für MazerationsMeister

## ✅ Problem gelöst: QR-Codes funktionieren jetzt offline!

Die QR-Codes verwenden jetzt **OneDrive Cloud-URLs** statt localhost-Links. Das bedeutet:

- ✅ **QR-Codes funktionieren auch ohne laufende App**
- ✅ **Scannen im Tankraum ohne Netzwerkverbindung zur App**
- ✅ **Tank-Informationen direkt aus der Cloud abrufbar**
- ✅ **Mobile Nutzung perfekt unterstützt**

## 🚀 Verwendung

### 1. Portable Desktop App starten
```bash
# Doppelklick auf:
dist/MazerationsMeister-win32-x64/MazerationsMeister.exe
```

### 2. OneDrive Cloud-QR-Codes konfigurieren
1. App öffnen → **Einstellungen** → **OneDrive QR-Codes** Tab
2. OneDrive Share-URL eingeben (z.B. `https://1drv.ms/f/s/[IHR-LINK]`)
3. **"Konfiguration speichern"** klicken
4. **"URL testen"** um Erreichbarkeit zu prüfen

### 3. QR-Codes generieren
1. **Inventar** → **Lagertanks verwalten**
2. Tanks auswählen
3. **"QR-Codes generieren"** klicken
4. QR-Codes drucken und auf Tanks kleben

### 4. Offline-Scanning
- QR-Code mit Smartphone scannen
- Automatische Weiterleitung zur Cloud-URL
- Tank-Details werden angezeigt (auch ohne lokale App!)

## 🔧 Technische Details

### Cloud-QR-Generator
- **Datei:** `src/lib/cloud-qr-generator.ts`
- **Funktion:** Generiert OneDrive-basierte URLs für QR-Codes
- **Fallback:** Lokale URLs wenn OneDrive nicht konfiguriert

### Konfiguration
```json
// localStorage: 'oneDriveConfig'
{
  "shareUrl": "https://1drv.ms/f/s/[IHR-SHARE-LINK]",
  "appPath": ""
}
```

### QR-Code Format
```
https://1drv.ms/f/s/[SHARE-LINK]/tank/[TANK-ID]?nr=[TANK-NR]&name=[NAME]&capacity=[LITER]
```

## 📱 Setup-Anleitung für OneDrive

1. **OneDrive-Ordner erstellen** (öffentlich zugänglich)
2. **App-Dateien hochladen** (Optional: Tank-Daten exportieren)
3. **Share-Link erstellen** (öffentlich lesbar)
4. **Share-URL in App konfigurieren**

## ⚠️ Wichtige Hinweise

- **OneDrive-Ordner muss öffentlich sein** für QR-Code-Funktionalität
- **Fallback auf localhost** wenn OneDrive nicht konfiguriert
- **App funktioniert weiterhin lokal** ohne OneDrive-Anbindung

## 🎉 Ergebnis

**Sie scannen im Tankraum den QR-Code und sehen den Stand und alle weiteren Informationen, ohne dass die App im selben Netzwerk ist oder überhaupt läuft!**