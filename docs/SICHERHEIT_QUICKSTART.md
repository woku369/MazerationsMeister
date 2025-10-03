# 🔐 QR-Code Sicherheit: Quick-Guide

**Problem:** Jeder kann deine Betriebsdaten sehen  
**Lösung:** Session-basierter Login mit 30-Tage-Cookie  
**Aufwand:** 4-6 Stunden Implementation

---

## 🎯 Empfohlene Lösung: PHP + PIN-System

### Wie es funktioniert:

```
Tag 1, erster Scan:
├─ QR-Code scannen
├─ Login-Seite erscheint
├─ PIN eingeben (z.B. 123456)
├─ Cookie wird gesetzt (30 Tage)
└─ Tank-Daten werden angezeigt

Tag 1-30, alle weiteren Scans:
├─ QR-Code scannen
└─ Direkt Tank-Daten ✅ (kein Login!)

Tag 31:
├─ Cookie abgelaufen
└─ Erneuter Login nötig
```

### Vorteile:

- ✅ **Einmaliger Login pro Monat** → Kein Nerv-Faktor
- ✅ **100% sichere Daten** → Unbefugte sehen nur Login
- ✅ **Billig** → €5/Monat Webhosting
- ✅ **Schnell implementiert** → 4-6 Stunden
- ✅ **DSGVO-konform** → Zugriffsprotokoll möglich

---

## 💻 Was wird benötigt?

### 1. Webhosting mit PHP

**Anbieter (Beispiele):**
- Strato: €5/Monat
- 1&1: €4/Monat
- All-Inkl: €8/Monat

**Anforderungen:**
- ✅ PHP 7.4+
- ✅ SQLite oder MySQL
- ✅ SSL-Zertifikat (Let's Encrypt)

### 2. Domain oder Subdomain

**Optionen:**
- Neue Domain: `mazerate.de` (€10/Jahr)
- Subdomain: `qr.deine-firma.de` (kostenlos)
- Hosting-Subdomain: `deine-firma.webhosting-domain.de` (kostenlos)

### 3. Dateien hochladen

```
/qr-system/
├── auth.php          ← Prüft Session
├── login.php         ← Login-Formular
├── logout.php        ← Logout-Funktion
├── tank-viewer.php   ← Zeigt Tank-Daten
├── users.json        ← User-Datenbank (PINs)
└── .htaccess         ← Sicherheits-Regeln
```

---

## 👥 User-Verwaltung (Beispiel)

### users.json

```json
{
  "users": [
    {
      "id": 1,
      "name": "Max Mustermann",
      "pin": "123456",
      "role": "admin",
      "active": true,
      "created": "2025-10-02"
    },
    {
      "id": 2,
      "name": "Anna Schmidt",
      "pin": "654321",
      "role": "employee",
      "active": true,
      "created": "2025-10-02"
    },
    {
      "id": 3,
      "name": "Tom Wagner",
      "pin": "111222",
      "role": "employee",
      "active": false,
      "created": "2025-09-01",
      "deactivated": "2025-10-01"
    }
  ]
}
```

### Rollen-Konzept

**Admin:**
- ✅ Alle Tanks sehen
- ✅ User verwalten
- ✅ Einstellungen ändern

**Employee:**
- ✅ Produktions-Tanks sehen
- ❌ Keine User-Verwaltung

**Viewer:**
- ✅ Nur Lese-Zugriff
- ❌ Keine Änderungen

---

## 📱 Login-Flow (Mobile)

### Login-Seite Design

```
┌───────────────────────────────┐
│  🏭 MazerationsMeister        │
│                               │
│  🔐 Zugriff geschützt         │
│                               │
│  Bitte PIN eingeben:          │
│                               │
│  ┌─────────────────┐          │
│  │  [ _ _ _ _ _ _ ]│          │ ← PIN-Feld
│  └─────────────────┘          │
│                               │
│    1    2    3                │
│    4    5    6                │ ← Virtuelles Numpad
│    7    8    9                │
│    ⌫    0    ✓                │
│                               │
│  [Angemeldet bleiben (30d)]   │ ← Checkbox
│                               │
└───────────────────────────────┘
```

**Features:**
- ✅ Großes Numpad (auch mit Handschuhen bedienbar)
- ✅ "Angemeldet bleiben" standardmäßig aktiv
- ✅ Auto-Submit nach 6 Ziffern
- ✅ Fehler-Anzeige ("Falsche PIN")

---

## 🔒 Sicherheits-Features

### Basis-Schutz (Minimum)

```php
// 1. Session-Sicherheit
ini_set('session.cookie_httponly', 1);    // Kein JS-Zugriff
ini_set('session.cookie_secure', 1);       // Nur HTTPS
ini_set('session.cookie_samesite', 'Lax'); // CSRF-Schutz

// 2. Session-Lifetime
ini_set('session.gc_maxlifetime', 2592000); // 30 Tage

// 3. Brute-Force-Schutz
if ($_SESSION['login_attempts'] > 5) {
    die('Zu viele Versuche. Warte 5 Minuten.');
}
```

### Erweitert (Empfohlen)

```php
// 1. IP-Binding (Session an IP binden)
if ($_SESSION['ip'] !== $_SERVER['REMOTE_ADDR']) {
    session_destroy();
    die('Session ungültig');
}

// 2. User-Agent-Check
if ($_SESSION['user_agent'] !== $_SERVER['HTTP_USER_AGENT']) {
    session_destroy();
    die('Session ungültig');
}

// 3. Zugriffs-Log
file_put_contents('access.log', 
    date('Y-m-d H:i:s') . ' - ' . 
    $_SESSION['user'] . ' - ' . 
    $_GET['tank'] . "\n",
    FILE_APPEND
);
```

---

## 🚀 Quick-Start (30 Minuten Setup)

### Schritt 1: Webhosting vorbereiten

1. Bei Hoster anmelden (z.B. Strato)
2. Domain/Subdomain einrichten
3. SSL-Zertifikat aktivieren (Let's Encrypt)

### Schritt 2: Dateien hochladen

Ich erstelle dir:
- ✅ Fertige PHP-Dateien
- ✅ User-Verwaltung
- ✅ Login-Design (mobile-optimiert)
- ✅ Admin-Panel

### Schritt 3: QR-Codes anpassen

**Alt:**
```
https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=T341
```

**Neu:**
```
https://deine-domain.de/qr/tank.php?id=T341
```

**Wichtig:** Alte QR-Codes müssen **nicht** neu gedruckt werden!

**Lösung:** Redirect einrichten:
```php
// Auf GitHub Pages: redirect.php
<?php
$tank = $_GET['tank'];
header('Location: https://deine-domain.de/qr/tank.php?id=' . urlencode($tank));
?>
```

---

## 📊 Alternative: Firebase (Modern)

### Vorteile

- ✅ **Kostenlos** (bis 50.000 Logins/Monat)
- ✅ **Biometrische Auth** möglich (Fingerprint)
- ✅ **Kein Server** nötig
- ✅ **Auto-Scaling**

### Nachteile

- ⚠️ Google-Account erforderlich
- ⚠️ Komplexer in der Einrichtung
- ⚠️ Abhängigkeit von Google

### Aufwand

- **Setup:** 8-12 Stunden
- **Laufende Kosten:** €0/Monat (bei kleiner Nutzung)

---

## 🎯 Meine Empfehlung für dich

### Start: PHP + PIN-System

**Warum?**
1. ✅ **Schnellster Start** (in 1 Woche produktiv)
2. ✅ **Geringste Kosten** (€5/Monat)
3. ✅ **Maximale Kontrolle** (eigener Server)
4. ✅ **Einfach wartbar** (PHP kennt jeder)

**Später:** Upgrade zu Firebase
- Wenn mehr als 50 User
- Wenn Biometric gewünscht
- Wenn keine Server-Verwaltung gewünscht

---

## 💡 Bonus-Features (später)

### 1. Admin-Panel

```
/admin/
├── Dashboard (Anzahl Logins heute)
├── User-Verwaltung (PINs hinzufügen/löschen)
├── Zugriffs-Log (wer scannte wann welchen Tank)
├── Tank-Berechtigungen (wer darf welche Tanks sehen)
└── Einstellungen (Session-Dauer, Sicherheit)
```

### 2. Mobile App

- Offline-Login (gecachte Credentials)
- Push-Benachrichtigungen
- Integrierter QR-Scanner

### 3. Zeitbasierte Zugriffe

- Nur während Arbeitszeit (z.B. 6-22 Uhr)
- Wochenend-Sperre
- Urlaubs-Modus

---

## 📞 Nächste Schritte

**Soll ich dir das PHP-System komplett programmieren?**

Ich erstelle:
- ✅ `auth.php` - Session-Check
- ✅ `login.php` - Mobile-optimiertes Login
- ✅ `tank-viewer.php` - Geschützte Tank-Ansicht
- ✅ `admin.php` - User-Verwaltung
- ✅ `users.json` - User-Datenbank
- ✅ `.htaccess` - Sicherheits-Regeln

**Aufwand:** ~2-3 Stunden Programmierung

**Dann:**
- Du lädst auf Webhosting hoch
- Wir testen mit 2-3 Test-Usern
- Bei Erfolg: Alle Mitarbeiter bekommen PINs

---

## ✅ Zusammenfassung

| Frage | Antwort |
|-------|---------|
| **Sicher?** | ✅ Ja, nur mit Login |
| **Nervig?** | ❌ Nein, 1x/Monat Login |
| **Teuer?** | ❌ Nein, €5/Monat |
| **Schnell?** | ✅ Ja, 4-6h Setup |
| **DSGVO?** | ✅ Ja, konform |

**Status:** Bereit zur Implementation! 🚀

---

**Erstellt:** 2. Oktober 2025  
**Letzte Änderung:** 2. Oktober 2025  
**Version:** 1.0
