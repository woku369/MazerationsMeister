# 🧪 OneDrive QR-Code System - Test-Anleitung

## ❌ Problem: QR-Codes zeigen localhost

**Das ist der Grund:** OneDrive ist noch nicht konfiguriert!

## ✅ Lösung: OneDrive konfigurieren

### Schritt 1: Desktop App starten
```bash
./dist/MazerationsMeister-win32-x64/MazerationsMeister.exe
```

### Schritt 2: OneDrive Setup (in der App)
1. **Gehe zu "Einstellungen"**
2. **Klicke auf Tab "OneDrive QR-Codes"**  
3. **Gib eine Test-URL ein:**
   ```
   https://1drv.ms/f/s/DEINE_SHARE_ID
   ```
4. **Klicke "Speichern"**

### Schritt 3: QR-Code Test
1. **Gehe zu "Lagerverwaltung" → "Tank Management"**
2. **Erstelle einen Test-Tank** (falls noch nicht vorhanden)
3. **Wähle Tank aus** (Checkbox anklicken)
4. **Klicke "QR-Codes generieren"**

### Schritt 4: Debugging
**Öffne Browser-Konsole (F12)** und schaue die Log-Ausgaben:

```javascript
// Das solltest du sehen:
"OneDrive konfiguriert: true"
"Verwende OneDrive-URLs für QR-Codes"  
"OneDrive Config gefunden: {shareUrl: '...', appPath: ''}"
"Tank-Viewer URL für Tank 1: https://1drv.ms/f/s/xyz/tank-viewer.html?tank=tank-001"

// NICHT das hier:
"OneDrive konfiguriert: false"
"OneDrive nicht konfiguriert, verwende lokale URLs"
"Verwende Fallback-URL für Tank..."
```

## 🔧 Debug-Schritte

### 1. Prüfe localStorage:
**In Browser-Konsole eingeben:**
```javascript
console.log('OneDrive Config:', localStorage.getItem('oneDriveConfig'));
```

**Sollte zeigen:**
```json
{"shareUrl":"https://1drv.ms/f/s/xyz","appPath":""}
```

### 2. Prüfe QR-Generierung:
**In Tank Management → Browser-Konsole:**
- Schaue nach "Generiere QR-Codes für Tanks..."
- Prüfe "OneDrive konfiguriert: true/false"

### 3. Manuelle Konfiguration (falls UI nicht funktioniert):
**In Browser-Konsole eingeben:**
```javascript
// OneDrive direkt setzen
const config = {
  shareUrl: "https://1drv.ms/f/s/DEINE_SHARE_ID",
  appPath: ""
};
localStorage.setItem('oneDriveConfig', JSON.stringify(config));
console.log('OneDrive Config gesetzt:', config);

// Seite neu laden
location.reload();
```

## 📱 Test-Workflow (wenn OneDrive konfiguriert)

### 1. QR-Code sollte zeigen:
```
https://1drv.ms/f/s/xyz/tank-viewer.html?tank=tank-001
```

### 2. NICHT zeigen:
```
http://localhost:3000/tank/tank-001  ❌
```

## 🚨 Häufige Probleme

### Problem: Immer noch localhost
**Ursache:** OneDrive-Konfiguration nicht gespeichert
**Lösung:** 
1. Einstellungen neu öffnen
2. OneDrive URL erneut eingeben  
3. "Speichern" klicken
4. Browser-Konsole prüfen

### Problem: Fehler "OneDrive nicht konfiguriert"
**Ursache:** Falsche URL oder leere Konfiguration
**Lösung:**
1. Prüfe localStorage wie oben
2. Verwende korrektes OneDrive Share-URL Format
3. Stelle sicher dass URL mit "https://" beginnt

### Problem: QR-Dialog öffnet sich nicht
**Ursache:** JavaScript-Fehler
**Lösung:**
1. Browser-Konsole öffnen (F12)
2. Schaue nach Fehlermeldungen
3. Lade Seite neu und versuche erneut

## ✅ Erfolgreicher Test

**Du weißt es funktioniert wenn:**
1. Browser-Konsole zeigt: "OneDrive konfiguriert: true"
2. QR-Code URL beginnt mit deiner OneDrive Share-URL
3. KEINE localhost URLs in QR-Codes
4. Konsole zeigt: "QR-Code Generierung abgeschlossen. Anzahl generiert: X"

## 📋 Nächste Schritte (nach erfolgreichem Test)

1. **Echter OneDrive Ordner:** Erstelle MazerationsMeister Ordner in OneDrive
2. **Dateien hochladen:** tank-viewer.html und tank-data.json
3. **Echter Share-Link:** Verwende echten OneDrive Share-Link
4. **Mobile Tests:** QR-Code mit Smartphone scannen

---

**Teste das zuerst und berichte, was du in der Browser-Konsole siehst!**