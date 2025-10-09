# 🔐 QR-Code System mit PIN-Schutz

## 📱 Für Smartphone-Nutzer (QR-Code scannen)

### **Schritt 1: QR-Code scannen**
Scanne einen der ausgedruckten QR-Codes mit deinem Smartphone.

### **Schritt 2: PIN eingeben**
Beim ersten Scan wirst du zur PIN-Eingabe weitergeleitet.

**Verfügbare PINs:**
- **Admin-PIN:** `00369` (30 Tage gültig)
- **Gast-PIN:** `78963` (24 Stunden gültig)

### **Schritt 3: Tank-Daten ansehen**
Nach erfolgreicher PIN-Eingabe:
- ✅ Siehst du alle Tank-Informationen
- ✅ Session bleibt aktiv (30 Tage bei Admin, 24h bei Gast)
- ✅ Nächster QR-Scan funktioniert ohne erneute PIN-Eingabe

### **Logout**
Klicke auf den **"Abmelden"** Button oben rechts.

---

## 💻 Für App-Nutzer (QR-Codes erstellen)

### **QR-Codes generieren**

#### **Variante 1: QR-Album (Alle Tanks auf einmal)**
1. Öffne: **QR-Code Album** im Menü
2. Klicke: **"Alle drucken"** oder **"Als PDF"**
3. Jeder Tank bekommt einen eigenen QR-Code

#### **Variante 2: Master-QR (Tank-Übersicht)**
1. Öffne: **Tank-Übersicht** im Menü
2. Klicke: **"Master-QR generieren"**
3. QR-Code wird als PNG heruntergeladen
4. Drucke den Master-QR aus → zeigt Übersicht aller Tanks

#### **Variante 3: Einzelner Tank**
1. Öffne: **Inventar → Tank-Management**
2. Wähle einen Tank
3. Klicke: **QR-Code generieren**

---

## 🔒 Sicherheit

### **Wie funktioniert der PIN-Schutz?**

1. **QR-Code scannen** → URL öffnet sich
2. **Nicht eingeloggt?** → Redirect zu Login-Seite
3. **PIN eingeben** → SHA-256 Hash wird geprüft
4. **Session speichern** → LocalStorage im Browser
5. **Gültigkeitsdauer:**
   - Admin: 30 Tage
   - Gast: 24 Stunden

### **PINs ändern**

Die PINs sind in `public/auth-config.js` gespeichert:

```javascript
const AUTH_CONFIG = {
  admin: {
    pin: "00369",      // ← Admin-PIN (5-stellig)
    validityDays: 30
  },
  guest: {
    pin: "78963",      // ← Gast-PIN (5-stellig)
    validityHours: 24
  }
};
```

**Nach Änderung:**
1. Speichern
2. Neue portable EXE bauen: `node scripts/build-ultra-minimal.js`
3. QR-Codes neu generieren

---

## 🌐 URLs für QR-Codes

### **Automatisch generierte URLs:**

Die App generiert automatisch die richtigen URLs:

- **Production (GitHub Pages):**
  ```
  https://woku369.github.io/MazerationsMeister/tank-viewer-secure.html?tank=T123
  ```

- **Development (Localhost):**
  ```
  http://localhost:3000/tank-viewer-secure.html?tank=T123
  ```

Die App erkennt automatisch ob Production oder Development.

---

## 📊 Datenfluss

```
┌─────────────────┐
│  QR-Code Scan   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  PIN-Prüfung    │  ← auth-config.js
└────────┬────────┘
         │
         v (✅ OK)
┌─────────────────┐
│ Lade tank-data  │  ← GitHub: tank-data.json
│  von GitHub     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Zeige Tank-    │
│  Informationen  │
└─────────────────┘
```

### **Wichtig:**
- **Tank-Daten (`tank-data.json`)** werden weiterhin automatisch zu GitHub synchronisiert
- **Viewer-Seiten** (`tank-viewer-secure.html`, `login.html`) sind auf GitHub Pages
- **PIN-Prüfung** läuft im Browser (keine Server-Kommunikation)

---

## 🐛 Troubleshooting

### **Problem: "Ungültige PIN"**
- ✅ PIN ist **exakt 5-stellig**
- ✅ Keine Leerzeichen vor/nach der PIN
- ✅ PINs: `00369` (Admin) oder `78963` (Gast)

### **Problem: "Tank nicht gefunden"**
- ✅ Prüfe `tank-data.json` auf GitHub
- ✅ Tank muss in der App angelegt sein
- ✅ Tank-Synchronisation läuft automatisch

### **Problem: "Session abgelaufen"**
- ✅ Admin-Session: 30 Tage
- ✅ Gast-Session: 24 Stunden
- ✅ Einfach neu einloggen

### **Problem: QR-Code führt zu 404**
- ✅ GitHub Pages aktiviert? (Settings → Pages)
- ✅ Branch: `pages-clean`
- ✅ Folder: `/docs`
- ✅ Warte 2-3 Minuten nach Aktivierung

---

## 📝 Checkliste für Inbetriebnahme

- [ ] GitHub Pages aktiviert (Branch: `pages-clean`, Folder: `/docs`)
- [ ] Test-Login erfolgreich: https://woku369.github.io/MazerationsMeister/login.html
- [ ] Tank-Daten auf GitHub vorhanden: `tank-data.json`
- [ ] QR-Codes generiert (QR-Album oder Master-QR)
- [ ] QR-Codes ausgedruckt und aufgehängt
- [ ] Test-Scan mit Smartphone erfolgreich
- [ ] PIN-Eingabe funktioniert
- [ ] Tank-Daten werden korrekt angezeigt

---

## 🎯 Best Practices

### **Für den Tankraum:**
1. **Master-QR** an zentraler Stelle aufhängen → Übersicht aller Tanks
2. **Einzelne QR-Codes** direkt am Tank anbringen → Schneller Zugriff

### **Für Mitarbeiter:**
- **Admin-PIN** nur für Vorgesetzte (30 Tage Zugriff)
- **Gast-PIN** für temporäre Mitarbeiter (24h Zugriff)
- PINs regelmäßig ändern (z.B. monatlich)

### **Für die App:**
- Portable EXE auf USB-Stick → Auf jedem PC nutzbar
- Tank-Daten werden automatisch synchronisiert
- Backup von `tank-data.json` regelmäßig erstellen

---

## 📞 Support

Bei Problemen:
1. Prüfe diese Anleitung
2. Prüfe Browser-Konsole (F12)
3. Prüfe GitHub Pages Status
4. Prüfe `tank-data.json` auf GitHub

**GitHub Repository:**
https://github.com/woku369/MazerationsMeister

**GitHub Pages:**
https://woku369.github.io/MazerationsMeister/
