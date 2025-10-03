# Sicherheits-Konzept: QR-Code-Zugriffskontrolle

## 🔐 Problem-Analyse

**Aktuelle Situation:**
- ❌ **JEDER** kann QR-Codes scannen und Betriebsdaten sehen
- ❌ Firmeninterne Informationen öffentlich zugänglich
- ❌ DSGVO-Risiko (unbefugter Datenzugriff)
- ❌ Wettbewerbsnachteil (Rezepturen sichtbar)

**Anforderungen:**
- ✅ Nur **autorisierte Personen** dürfen Daten sehen
- ✅ **Praktikabel** für tägliche Nutzung (100x/Tag)
- ✅ **Nicht bei jedem Scan** neu einloggen
- ✅ **Einfach** für Mitarbeiter

---

## 🎯 Empfohlene Lösung: Session-basierte Auth

### Konzept-Überblick

```
┌─────────────────┐
│  QR-Code Scan   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cookie-Check   │  ← Session gültig?
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   JA        NEIN
    │         │
    ▼         ▼
┌─────┐   ┌──────────┐
│Daten│   │Login-Page│
└─────┘   └──────────┘
              │
              │ Login OK
              ▼
          ┌─────────┐
          │Set Cookie│ ← 30 Tage gültig
          └─────────┘
```

### Workflow für Mitarbeiter

**Erster Scan (Tag 1):**
1. QR-Code scannen
2. Login-Seite erscheint
3. **Einmaliger Login**: PIN/Passwort/Fingerprint
4. Session-Cookie wird gesetzt (30 Tage)
5. Tank-Daten werden angezeigt

**Alle weiteren Scans (Tag 1-30):**
1. QR-Code scannen
2. Cookie wird automatisch geprüft ✅
3. **Direkt Tank-Daten** (kein Login!)

**Nach 30 Tagen:**
- Automatischer Logout
- Erneuter Login erforderlich

### Vorteile

- ✅ **Einmaliger Login** pro Monat
- ✅ **Keine Störung** im Arbeitsalltag
- ✅ **Maximale Sicherheit** für Unbefugte
- ✅ **DSGVO-konform** (Zugriffsprotokoll)
- ✅ **Einfach zu bedienen**

---

## 🔧 Technische Implementierung

### Option 1: PHP Backend (Einfachste Lösung)

**Vorteile:**
- ✅ Läuft auf jedem Webserver
- ✅ Session-Management built-in
- ✅ Einfache User-Verwaltung
- ✅ Keine externe Datenbank nötig (SQLite)

**Architektur:**

```
┌──────────────┐
│  QR-Code     │ → https://deine-domain.de/tank-viewer.php?tank=T341
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  auth.php    │ ← Prüft Session-Cookie
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
  OK      FAIL
   │       │
   ▼       ▼
┌─────┐ ┌──────┐
│Daten│ │Login │
└─────┘ └──────┘
```

**Code-Beispiel:**

```php
<?php
// auth.php - Session-Check
session_start();

// Cookie-Laufzeit: 30 Tage
ini_set('session.cookie_lifetime', 60*60*24*30);

// Prüfe ob eingeloggt
if (!isset($_SESSION['user_id'])) {
    // Nicht eingeloggt → Redirect zu Login
    header('Location: login.php?redirect=' . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

// Prüfe ob Berechtigung für diesen Tank
$tankNr = $_GET['tank'] ?? '';
if (!hasPermission($_SESSION['user_id'], $tankNr)) {
    die('Keine Berechtigung für diesen Tank');
}

// OK → Zeige Daten
include 'tank-viewer-secure.php';
?>
```

```php
<?php
// login.php - Login-Formular
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pin = $_POST['pin'];
    
    // PIN prüfen (Datenbank oder Config-File)
    $user = checkPIN($pin);
    
    if ($user) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name'] = $user['name'];
        
        // Zurück zur ursprünglichen Seite
        $redirect = $_GET['redirect'] ?? 'index.php';
        header('Location: ' . $redirect);
        exit;
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Login - MazerationsMeister</title>
    <style>
        body { 
            font-family: Arial; 
            text-align: center; 
            padding: 50px;
        }
        input[type="password"] {
            font-size: 24px;
            padding: 15px;
            width: 200px;
            text-align: center;
        }
        button {
            font-size: 20px;
            padding: 15px 30px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>🔐 Login erforderlich</h1>
    <p>Bitte gib deine PIN ein:</p>
    <form method="POST">
        <input type="password" name="pin" autofocus maxlength="6" pattern="[0-9]*" inputmode="numeric">
        <br>
        <button type="submit">Anmelden</button>
    </form>
</body>
</html>
```

---

### Option 2: Firebase Auth (Cloud-Lösung)

**Vorteile:**
- ✅ Keine eigene Server-Infrastruktur
- ✅ Kostenlos für kleine Teams (<100 User)
- ✅ Biometrische Auth (Fingerprint) möglich
- ✅ Automatische Session-Verwaltung

**Architektur:**

```
┌──────────────┐
│  QR-Code     │ → GitHub Pages / OneDrive
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Firebase    │ ← Prüft Auth-Token
│  Auth Check  │
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
  OK      FAIL
   │       │
   ▼       ▼
┌─────┐ ┌──────┐
│Daten│ │Login │
└─────┘ └──────┘
```

**Code-Beispiel:**

```typescript
// tank-viewer-secure.ts
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mazerationsmeister.firebaseapp.com",
  // ...
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Prüfe Auth-Status
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Eingeloggt → Zeige Tank-Daten
    loadTankData(getTankNrFromURL());
  } else {
    // Nicht eingeloggt → Zeige Login
    showLoginPage();
  }
});

// Login mit PIN
async function loginWithPIN(pin: string) {
  const email = `user_${pin}@mazerationsmeister.internal`;
  const password = pin; // Oder sicherer Hash
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Session-Cookie wird automatisch gesetzt
  } catch (error) {
    alert('Falsche PIN');
  }
}
```

---

### Option 3: JWT-Token (Fortgeschritten)

**Vorteile:**
- ✅ Keine Session-Datenbank nötig
- ✅ Stateless (skalierbar)
- ✅ Token kann Berechtigungen enthalten

**Architektur:**

```
┌──────────────┐
│  Login       │ → JWT-Token wird generiert
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Token im    │ ← LocalStorage / Cookie
│  Browser     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  QR-Scan     │ → Token wird mitgeschickt
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Server      │ ← Prüft Token-Signatur
│  validiert   │
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
  OK      FAIL
   │       │
   ▼       ▼
┌─────┐ ┌──────┐
│Daten│ │Login │
└─────┘ └──────┘
```

---

## 🔑 User-Management-Konzepte

### Konzept A: Einfache PIN (Empfohlen für kleine Teams)

**Eigenschaften:**
- 4-6 stellige PIN
- Schnell einzugeben
- Kein Tippen auf Tastatur nötig

**Beispiel-Struktur:**

```json
{
  "users": [
    {
      "id": 1,
      "name": "Max Mustermann",
      "pin": "123456",
      "role": "admin",
      "active": true
    },
    {
      "id": 2,
      "name": "Anna Schmidt",
      "pin": "654321",
      "role": "employee",
      "active": true
    }
  ]
}
```

**UI-Konzept:**
```
┌─────────────────────────┐
│   🔐 PIN eingeben       │
├─────────────────────────┤
│                         │
│     [ _ _ _ _ _ _ ]     │ ← Große Zahlen-Eingabe
│                         │
│   ┌─┬─┬─┐               │
│   │1│2│3│               │
│   ├─┼─┼─┤               │
│   │4│5│6│               │  ← Virtuelles Numpad
│   ├─┼─┼─┤               │
│   │7│8│9│               │
│   ├─┴─┼─┤               │
│   │ 0 │✓│               │
│   └───┴─┘               │
└─────────────────────────┘
```

---

### Konzept B: Biometrische Auth (Modern)

**Eigenschaften:**
- Fingerprint-Scanner
- Face-ID
- Noch schneller als PIN

**Voraussetzungen:**
- HTTPS erforderlich
- Browser muss WebAuthn unterstützen
- Einmalige Registrierung

**Code-Beispiel:**

```typescript
// Biometrische Auth mit WebAuthn
async function loginWithBiometric() {
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: new Uint8Array([/* server challenge */]),
      timeout: 60000,
      userVerification: 'required'
    }
  });
  
  // Credential an Server senden → Session erstellen
}
```

---

### Konzept C: QR-Code-basierte Auth (Innovativ!)

**Eigenschaften:**
- Mitarbeiter-Ausweis mit QR-Code
- Einmal scannen → Eingeloggt
- Kein Tippen nötig

**Workflow:**

```
1. Mitarbeiter hat QR-Code-Ausweis
2. Tank-QR wird gescannt → Login nötig
3. Mitarbeiter-QR wird gescannt → Session erstellt
4. Ab jetzt: Alle Tank-QRs funktionieren
```

**Vorteile:**
- ✅ Sehr schnell
- ✅ Keine PIN merken
- ✅ Kann mit Zeiterfassung kombiniert werden

---

## 🛡️ Berechtigungs-Konzepte

### Level 1: Alle-oder-Nichts

**Regel:** Eingeloggt = Zugriff auf alle Tanks

**Einfachheit:** ⭐⭐⭐⭐⭐  
**Flexibilität:** ⭐

```typescript
function hasAccess(userId: string, tankNr: string): boolean {
  return isLoggedIn(userId); // Alle Tanks erlaubt
}
```

---

### Level 2: Rollen-basiert (Empfohlen)

**Rollen:**
- `admin`: Alle Tanks + Einstellungen
- `employee`: Nur Produktions-Tanks
- `viewer`: Nur Lese-Rechte

**Einfachheit:** ⭐⭐⭐⭐  
**Flexibilität:** ⭐⭐⭐⭐

```typescript
const roles = {
  admin: ['*'], // Alle Tanks
  employee: ['T*', 'Fass*'], // Produktions-Tanks
  viewer: ['T*'] // Nur Tanks lesen
};

function hasAccess(userId: string, tankNr: string): boolean {
  const user = getUser(userId);
  const patterns = roles[user.role];
  
  return patterns.some(pattern => 
    new RegExp(pattern).test(tankNr)
  );
}
```

---

### Level 3: Tank-spezifisch (Maximum Security)

**Regel:** Jeder User hat Liste von erlaubten Tank-Nummern

**Einfachheit:** ⭐⭐⭐  
**Flexibilität:** ⭐⭐⭐⭐⭐

```typescript
const permissions = {
  user_1: ['T 341', 'T 338', 'Fass-1'], // Nur diese Tanks
  user_2: ['*'], // Alle
  user_3: ['B-*'] // Alle B-Container
};

function hasAccess(userId: string, tankNr: string): boolean {
  const allowed = permissions[userId];
  
  return allowed.some(pattern => {
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(tankNr);
    }
    return pattern === tankNr;
  });
}
```

---

## 📊 Vergleich der Lösungen

| Lösung | Sicherheit | Komfort | Komplexität | Kosten | Empfehlung |
|--------|-----------|---------|-------------|--------|------------|
| **PHP Backend** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | €5/Monat | ⭐⭐⭐⭐⭐ |
| **Firebase Auth** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Kostenlos | ⭐⭐⭐⭐ |
| **JWT-Token** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Variable | ⭐⭐⭐ |
| **PIN-System** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | Inkludiert | ⭐⭐⭐⭐⭐ |
| **Biometric** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Inkludiert | ⭐⭐⭐⭐ |
| **QR-Ausweis** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Druckkosten | ⭐⭐⭐⭐ |

---

## 🎯 Konkrete Empfehlung für dich

### Kurzfristig (nächste Woche):

**PHP Backend + PIN-System**

**Warum?**
- ✅ Schnell implementiert (1-2 Tage)
- ✅ Läuft auf billigem Webhosting (€3-5/Monat)
- ✅ Sehr benutzerfreundlich (PIN merken)
- ✅ 30-Tage-Session → kaum noch Logins

**Setup:**
1. Webhosting mit PHP mieten (z.B. Strato, 1&1)
2. `tank-viewer.php` + `auth.php` + `login.php` hochladen
3. User-Datenbank mit PINs anlegen
4. QR-Codes auf neue URL umstellen
5. Testen mit 2-3 Mitarbeitern

**Aufwand:** ~4-6 Stunden

---

### Mittelfristig (nächster Monat):

**Firebase Auth + Biometrische Option**

**Warum?**
- ✅ Moderne Lösung
- ✅ Fingerprint-Login möglich
- ✅ Kostenlos für kleine Teams
- ✅ Kein Server-Management

**Setup:**
1. Firebase-Projekt erstellen
2. Auth aktivieren (Email/Password)
3. Login-Seite mit Firebase SDK erstellen
4. Biometrische Auth als Option hinzufügen
5. GitHub Pages mit Firebase verbinden

**Aufwand:** ~8-12 Stunden

---

## 🔒 Sicherheits-Checkliste

### Essentiell (Minimum)

- [ ] Login-System implementiert
- [ ] Session-Cookies mit HTTPOnly-Flag
- [ ] HTTPS aktiviert (Pflicht!)
- [ ] Session-Timeout konfiguriert
- [ ] Logout-Funktion verfügbar

### Empfohlen

- [ ] Zugriffs-Protokoll (wer scannte wann welchen Tank)
- [ ] Brute-Force-Schutz (max. 5 Login-Versuche)
- [ ] Passwort-/PIN-Reset-Funktion
- [ ] Email-Benachrichtigung bei neuem Login
- [ ] Admin-Panel für User-Verwaltung

### Optional (Maximum Security)

- [ ] 2-Faktor-Authentifizierung (2FA)
- [ ] IP-Whitelist (nur Firmen-Netzwerk)
- [ ] Geofencing (nur am Firmen-Standort)
- [ ] Zeitbasierte Zugriffe (nur während Arbeitszeit)
- [ ] Automatische Logout bei Inaktivität

---

## 💰 Kosten-Übersicht

### PHP Backend (Empfohlen)
- **Webhosting:** €3-5/Monat
- **Domain:** €10/Jahr (optional, kann Subdomain nutzen)
- **SSL-Zertifikat:** Kostenlos (Let's Encrypt)
- **Gesamt:** ~€5/Monat

### Firebase Auth
- **Bis 50.000 Logins/Monat:** Kostenlos
- **Darüber:** Pay-as-you-go
- **Typisch für kleine Firma:** €0/Monat

### Eigener Server
- **VPS:** €10-30/Monat
- **Wartung:** €50-200/Monat (oder selbst)
- **Gesamt:** €10-230/Monat

---

## 🚀 Nächste Schritte

Ich kann dir **sofort** helfen mit:

1. **PHP Login-System** komplett programmieren
2. **Firebase Auth** einrichten
3. **User-Verwaltung** implementieren
4. **Admin-Panel** erstellen
5. **Bestehende QR-Codes** auf neue URLs umstellen

**Was ist deine Präferenz?**
- 🚀 **Schnell & Einfach** → PHP + PIN
- 🔥 **Modern & Sicher** → Firebase + Biometric
- 💪 **Maximale Kontrolle** → Eigener Server + JWT

---

**Erstellt:** 2. Oktober 2025  
**Status:** Konzept-Phase  
**Nächster Schritt:** Lösung wählen + implementieren
