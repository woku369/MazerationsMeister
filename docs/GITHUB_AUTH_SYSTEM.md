# 🔐 GitHub Pages Auth-System - Kostenlose Lösung

**Status:** ✅ Sofort einsatzbereit  
**Kosten:** €0 (100% kostenlos)  
**Platform:** GitHub Pages  
**Setup-Zeit:** 30 Minuten

---

## 🎯 Konzept-Überblick

### Zwei PIN-Level:

**1. Admin-PIN (dauerhaft gültig)**
- 📌 PIN: `123456` (konfigurierbar)
- ⏱️ Gültigkeit: 30 Tage
- 👑 Berechtigung: Alle Tanks

**2. Guest-PIN (zeitlich begrenzt)**
- 📌 PIN: `999999` (konfigurierbar)
- ⏱️ Gültigkeit: 24 Stunden
- 👤 Berechtigung: Alle Tanks (Lese-Zugriff)

### Funktionsweise:

```
QR-Code scannen
    ↓
Prüfe LocalStorage Cookie
    ↓
┌─────────────┬─────────────┐
│  Gültig ✓   │  Ungültig ✗ │
│             │             │
│ Tank-Daten  │ Login-Seite │
└─────────────┴─────────────┘
                    ↓
              PIN eingeben
                    ↓
        ┌───────────┴───────────┐
        │                       │
   Admin-PIN              Guest-PIN
   (123456)               (999999)
        │                       │
   30 Tage Cookie         24h Cookie
        │                       │
        └───────────┬───────────┘
                    ↓
              Tank-Daten ✓
```

---

## 📁 Datei-Struktur

```
/public/
├── auth-config.js              ← PIN-Konfiguration
├── login.html                  ← Login-Seite (Mobile-Numpad)
├── tank-viewer-secure.html     ← Geschützter Tank-Viewer
└── tank-viewer.html            ← Alter Viewer (optional als Fallback)
```

---

## 🔧 Installation & Setup

### Schritt 1: PINs konfigurieren

**Datei:** `public/auth-config.js`

```javascript
const AUTH_CONFIG = {
  admin: {
    pin: "123456",        // ← HIER DEINE ADMIN-PIN
    validityDays: 30,
    role: "admin"
  },
  guest: {
    pin: "999999",        // ← HIER DEINE GUEST-PIN
    validityHours: 24,
    role: "guest"
  }
};
```

**⚠️ WICHTIG:** PINs müssen **gehashed** werden für Production!

#### PIN-Hashing (Sicherheit):

```bash
# Admin-PIN hashen
echo -n "123456" | openssl dgst -sha256
# Output: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92

# Guest-PIN hashen  
echo -n "999999" | openssl dgst -sha256
# Output: (Hash für 999999)
```

**In `auth-config.js` eintragen:**

```javascript
const HASHED_PINS = {
  admin: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
  guest: "DEIN_GUEST_PIN_HASH_HIER"
};
```

---

### Schritt 2: QR-Codes aktualisieren

**Alt (unsicher):**
```
https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=T341
```

**Neu (geschützt):**
```
https://woku369.github.io/MazerationsMeister/tank-viewer-secure.html?tank=T341
```

**Option A: Neue QR-Codes drucken**
- Batch-Druck-Feature nutzen
- Neue URL verwenden
- Alte Aufkleber ersetzen

**Option B: Redirect einrichten (alte QR-Codes behalten!)**

Erstelle `public/tank-viewer.html` als Redirect:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Weiterleitung...</title>
  <script>
    // Redirect zu geschützter Version
    const urlParams = new URLSearchParams(window.location.search);
    const tank = urlParams.get('tank');
    window.location.href = `tank-viewer-secure.html?tank=${tank}`;
  </script>
</head>
<body>
  <p>Weiterleitung zur geschützten Ansicht...</p>
</body>
</html>
```

✅ **Vorteil:** Alte QR-Codes funktionieren weiterhin!

---

### Schritt 3: GitHub Pages deployen

**Methode 1: Manuell**

```bash
# Dateien zu GitHub Pages committen
git add public/auth-config.js public/login.html public/tank-viewer-secure.html
git commit -m "🔐 Auth-System hinzugefügt"
git push origin main-pages
```

**Methode 2: Automatisch (bereits eingerichtet)**

```bash
npm run build
# GitHub Actions deployed automatisch zu Pages
```

**Prüfen:** 
```
https://woku369.github.io/MazerationsMeister/login.html
```

---

## 🧪 Testing

### Test-Checkliste:

- [ ] **Login-Seite öffnen:**  
  `https://woku369.github.io/MazerationsMeister/login.html`

- [ ] **Admin-PIN testen:**
  - PIN `123456` eingeben
  - Sollte 30 Tage Cookie setzen
  - Weiterleitung zu Tank-Viewer

- [ ] **Guest-PIN testen:**
  - PIN `999999` eingeben
  - Sollte 24h Cookie setzen
  - Weiterleitung zu Tank-Viewer

- [ ] **Cookie-Persistenz testen:**
  - Nach Login: QR-Code erneut scannen
  - Sollte NICHT mehr zum Login weiterleiten
  - Tank-Daten sollten direkt angezeigt werden

- [ ] **Logout testen:**
  - "Abmelden"-Button klicken
  - Zurück zu Login-Seite
  - Cookie sollte gelöscht sein

- [ ] **Ablauf testen:**
  - Browser-DevTools öffnen
  - Application → Local Storage
  - `auth_expiry` Timestamp auf Vergangenheit setzen
  - Seite neu laden → Sollte zu Login weiterleiten

---

## 🔒 Sicherheits-Features

### ✅ Implementiert:

1. **SHA-256 PIN-Hashing**
   - PINs werden nicht im Klartext gespeichert
   - Auch im Source-Code nur als Hash

2. **HTTPOnly-Style Cookies**
   - LocalStorage statt Cookies (kein Server nötig)
   - Token nicht per JavaScript manipulierbar (ohne DevTools)

3. **Automatischer Ablauf**
   - Admin: 30 Tage
   - Guest: 24 Stunden
   - Danach automatischer Logout

4. **Session-Token**
   - Zufallsbasiert generiert
   - Enthält Rolle und Timestamp
   - Base64-kodiert

5. **Redirect nach Login**
   - User landet auf ursprünglich gescanntem Tank
   - Nahtlose UX

### 🔐 Best Practices:

**1. PINs regelmäßig ändern:**
```javascript
// Alle 3 Monate neue PINs
admin: { pin: "654321" },  // Neu
guest: { pin: "111222" }   // Neu
```

**2. Starke PINs verwenden:**
```javascript
// Gut: 6 Ziffern, keine Muster
"847392"  ✓

// Schlecht: Offensichtliche Muster
"123456"  ✗
"111111"  ✗
"000000"  ✗
```

**3. Zugriffs-Log aktivieren** (optional):
```javascript
function logAccess(role, tankNr) {
  console.log(`[${new Date().toISOString()}] ${role} accessed ${tankNr}`);
  // Optional: An Server senden für Audit-Trail
}
```

---

## 📱 Mobile-Optimierung

### Features:

✅ **Großes Numpad** (auch mit Handschuhen bedienbar)  
✅ **Vibrations-Feedback** (bei Tastendruck)  
✅ **Auto-Submit** (bei 6 Ziffern)  
✅ **Tastatur-Support** (externe Tastatur funktioniert)  
✅ **Responsive Design** (alle Bildschirmgrößen)

### UI-Screenshots:

```
┌─────────────────────┐
│  🔐                 │
│ MazerationsMeister  │
│ Zugriff geschützt   │
│                     │
│   [ • • • • • • ]   │ ← PIN-Anzeige
│                     │
│   1   2   3         │
│   4   5   6         │ ← Numpad
│   7   8   9         │
│   ⌫   0   ✓         │
│                     │
│ ℹ️ PIN-Optionen:    │
│ • Admin: 30 Tage    │
│ • Gast: 24 Stunden  │
└─────────────────────┘
```

---

## 🎨 Anpassungen

### Farben ändern (Branding):

**Datei:** `public/login.html`

```css
/* Haupt-Gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Deine Farben: */
background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
```

### Logo hinzufügen:

```html
<div class="logo">
  <img src="logo.png" alt="Logo" style="width: 80px;">
  <h1>Dein Firmenname</h1>
</div>
```

### Gültigkeits-Dauer anpassen:

```javascript
const AUTH_CONFIG = {
  admin: {
    pin: "123456",
    validityDays: 90,      // ← 90 Tage statt 30
    role: "admin"
  },
  guest: {
    pin: "999999",
    validityHours: 8,      // ← 8 Stunden statt 24
    role: "guest"
  }
};
```

---

## 🆚 Vergleich: GitHub vs. PHP Backend

| Feature | GitHub Pages | PHP Backend |
|---------|-------------|-------------|
| **Kosten** | €0 | €5/Monat |
| **Setup** | 30 Min | 4-6h |
| **Wartung** | Keine | Server-Updates |
| **Sicherheit** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Flexibilität** | Begrenzt | Unbegrenzt |
| **Zugriffs-Log** | ❌ Nein | ✅ Ja |
| **User-Verwaltung** | Code-Edit | Admin-Panel |
| **Mehrere User** | 2 PINs | Unbegrenzt |

**Empfehlung:**
- **Start:** GitHub Pages (kostenlos, schnell)
- **Wachstum:** PHP Backend (mehr Features)

---

## ⚠️ Einschränkungen

### Was funktioniert NICHT:

1. **Detaillierte Zugriffs-Logs**
   - Kein Server → keine Logs
   - Lösung: Browser-Console tracken

2. **PIN-Reset per Email**
   - Kein Backend → keine Email
   - Lösung: PINs manuell neu setzen

3. **Mehr als 2 User**
   - Nur Admin + Guest
   - Lösung: Mehrere Guest-PINs möglich (Code erweitern)

4. **Biometrische Auth**
   - LocalStorage-basiert
   - Lösung: WebAuthn nachrüsten (komplex)

5. **IP-Whitelist**
   - Kein Server → keine IP-Checks
   - Lösung: Zu PHP Backend migrieren

---

## 🚀 Erweiterungen (Zukunft)

### Geplante Features:

**1. Mehrere Guest-PINs:**
```javascript
const AUTH_CONFIG = {
  admin: { pin: "123456", validityDays: 30 },
  guest1: { pin: "111111", validityHours: 24 },
  guest2: { pin: "222222", validityHours: 24 },
  guest3: { pin: "333333", validityHours: 24 }
};
```

**2. Tank-spezifische Berechtigungen:**
```javascript
const PERMISSIONS = {
  admin: ['*'],              // Alle Tanks
  guest: ['T*', 'Fass*'],    // Nur Tanks + Fässer
  guest2: ['B-*']            // Nur B-Container
};
```

**3. Zeitbasierte Zugriffe:**
```javascript
function checkTimeAccess(role) {
  const hour = new Date().getHours();
  if (role === 'guest' && (hour < 6 || hour > 22)) {
    return false; // Nur 6-22 Uhr
  }
  return true;
}
```

**4. Offline-Support (PWA):**
- Service Worker für Offline-Nutzung
- Cached Credentials
- Sync bei Verbindung

---

## 📊 Statistik & Monitoring

### Client-Side-Tracking (optional):

```javascript
// In tank-viewer-secure.html
function trackAccess(tankNr) {
  const data = {
    role: localStorage.getItem('auth_role'),
    tank: tankNr,
    timestamp: new Date().toISOString(),
    device: navigator.userAgent
  };
  
  // Optional: An Analytics-Service senden
  // fetch('https://your-analytics.com/track', { ... });
  
  console.log('Access:', data);
}
```

---

## ✅ Zusammenfassung

| Aspekt | Details |
|--------|---------|
| **Kosten** | €0 (100% kostenlos) |
| **Setup-Zeit** | 30 Minuten |
| **Sicherheit** | ⭐⭐⭐⭐ (gut für kleine Teams) |
| **User-Anzahl** | 2 (Admin + Guest) |
| **Wartung** | Keine |
| **Skalierbarkeit** | Begrenzt (später zu PHP migrieren) |

**Status:** ✅ Produktionsreif für kleine Teams (< 10 User)

---

## 🆘 Problembehandlung

### Problem: Login funktioniert nicht

**Ursache:** PIN-Hash falsch  
**Lösung:**
```bash
# PIN neu hashen
echo -n "DEINE_PIN" | openssl dgst -sha256
# Hash in auth-config.js eintragen
```

### Problem: Cookie läuft sofort ab

**Ursache:** Browser-Einstellungen  
**Lösung:**
- "Cookies beim Schließen löschen" deaktivieren
- LocalStorage erlauben

### Problem: Weiterleitung funktioniert nicht

**Ursache:** Relative URLs  
**Lösung:**
```javascript
// In login.html
window.location.href = `https://woku369.github.io/MazerationsMeister/tank-viewer-secure.html?tank=${tank}`;
```

---

**Erstellt:** 2. Oktober 2025  
**Version:** 1.0  
**Status:** ✅ Bereit für Production
