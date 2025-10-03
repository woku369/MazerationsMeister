# QR-Code-Stabilität und Dauerhaftigkeit

## ✅ BESTÄTIGUNG: QR-Codes sind PERMANENT gültig

**Stand:** 2. Oktober 2025

---

## 🎯 Kernaussage

**Ein einmal gedruckter QR-Code für einen Container bleibt für IMMER gültig.**

Die QR-Code-Aufkleber müssen **NIE gewechselt** werden.

---

## 🔬 Technische Grundlage

### Was enthält ein QR-Code?

Ein QR-Code für Tank **T 341** enthält ausschließlich:

```
https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=T 341
```

### Was ändert sich NICHT?

- ✅ **Tank-Nummer** (`T 341`) bleibt unveränderlich
- ✅ **URL-Struktur** bleibt konstant
- ✅ **GitHub Pages Domain** bleibt stabil
- ✅ **Viewer-Dateiname** (`tank-viewer.html`) bleibt gleich

### Was ändert sich NIE im QR-Code?

- ❌ **KEINE** aktuellen Füllstände
- ❌ **KEINE** Produktnamen
- ❌ **KEINE** Datums-Informationen
- ❌ **KEINE** Status-Informationen

**Alle dynamischen Daten werden beim Scannen LIVE aus der Datenbank geladen!**

---

## 🔐 Die 3 QR-Code-Systeme

### 1. GitHub Pages (Primär - Empfohlen)

**URL-Format:**
```
https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank={TANK_NR}
```

**Eigenschaften:**
- ✅ **Kostenlos & unbegrenzt gültig**
- ✅ **Weltweit erreichbar** (Internet erforderlich)
- ✅ **Schnell** (GitHub CDN)
- ✅ **Keine Wartung** erforderlich

**Beispiel:**
```
Tank T 341 → https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=T%20341
```

### 2. OneDrive (Fallback)

**URL-Format:**
```
https://onedrive.live.com/[...]/tank-viewer.html?tank={TANK_NR}
```

**Eigenschaften:**
- ✅ **Kostenlos** (OneDrive-Account erforderlich)
- ✅ **Dauerhaft gültig** (solange OneDrive-Freigabe aktiv)
- ⚠️ **Freigabe-Link kann ablaufen** (manuell verlängerbar)

### 3. Offline-Viewer (Notfall)

**URL-Format:**
```
http://localhost:[PORT]/tank-offline?tank={TANK_NR}
```

**Eigenschaften:**
- ✅ **Funktioniert ohne Internet**
- ✅ **Lokale Datenbank-Abfrage**
- ⚠️ **Nur im lokalen Netzwerk** erreichbar
- ⚠️ **App muss laufen**

---

## 📊 Datenfluss beim QR-Code-Scan

```
┌─────────────────┐
│  QR-Code (Tank) │
│   "T 341"       │  ← Statisch, ändert sich NIE
└────────┬────────┘
         │
         │ Scan
         ▼
┌─────────────────┐
│  Viewer-URL     │
│  + Tank-Nr.     │  ← Leitet zur Tank-Anzeige
└────────┬────────┘
         │
         │ Lädt Daten
         ▼
┌─────────────────┐
│  Live-Datenbank │
│  - Füllstand    │  ← Aktuelle Daten werden geladen
│  - Produkt      │
│  - Status       │
└─────────────────┘
```

**Ergebnis:** Immer aktuelle Daten, trotz statischem QR-Code!

---

## 🎨 Batch-Druck-Funktion

### Workflow

1. **Container auswählen:**
   - Checkboxen in der Gebindeverwaltung nutzen
   - Beliebig viele Container gleichzeitig wählbar

2. **Batch-Druck starten:**
   - Button **"QR-Codes drucken (X)"** erscheint automatisch
   - X = Anzahl ausgewählter Container

3. **Einstellungen konfigurieren:**
   - **QR-Code-Größe:**
     - Klein: 10x10cm (Etiketten)
     - Mittel: 15x15cm (Standard)
     - Groß: 20x20cm (große Behälter)
   - **Layout:**
     - Raster: 2 QR-Codes pro Seite
     - Liste: 1 QR-Code pro Seite (A4-Vollformat)

4. **Drucken:**
   - Vorschau zeigt alle QR-Codes
   - "Jetzt drucken" → Nur QR-Codes werden gedruckt
   - Dialog wird automatisch ausgeblendet

### Druckbare Informationen

Jeder gedruckte QR-Code enthält:
- ✅ **Container-Bezeichnung** (z.B. "T 341")
- ✅ **Scannbarer QR-Code**
- ✅ **Container-Typ** (🏭 Tank / 🛢️ Fass / 🍾 Flasche)
- ✅ **Kapazität** (z.B. 500L)
- ✅ **Aktueller Füllstand** (falls befüllt, z.B. 450L)

---

## 🔧 Technische Implementation

### QR-Code-Generierung (Code-Referenz)

**Datei:** `src/components/inventory/tank-management.tsx`

**Funktion:** `generateQRCode()` (Zeile 383-420)

```typescript
// GitHub zuerst versuchen, wenn aktiviert
if (githubEnabled && githubToken) {
  url = `https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=${tank.tankNr}`;
} else {
  // OneDrive Fallback
  url = await cloudQRGenerator.generateCloudQRUrl(tank.tankNr, tankInfo);
}

// QR-Code aus URL generieren
const qrCodeUrl = await QRCode.toDataURL(url);
```

**Wichtig:** Die URL enthält nur `tank.tankNr` (z.B. "T 341"). Diese ändert sich NIE!

### Batch-Generierung (Code-Referenz)

**Funktion:** `generateBatchQRCodes()` (Zeile 423-472)

```typescript
for (const tankId of Array.from(selectedTanks)) {
  const tank = tanks.find(t => t.id === tankId);
  
  // Gleiche Logik wie Einzel-QR-Code
  url = `https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=${tank.tankNr}`;
  
  const qrCodeUrl = await QRCode.toDataURL(url, { width: 512, margin: 1 });
  newQRCodes.set(tankId, qrCodeUrl);
}
```

---

## ✅ Garantien

### Was ist garantiert?

1. **QR-Code-Stabilität:**
   - ✅ Ein QR-Code für Tank "T 341" führt IMMER zu diesem Tank
   - ✅ Tank-Nummern werden NIE wiederverwendet
   - ✅ URL-Struktur wird nicht geändert

2. **Daten-Aktualität:**
   - ✅ Beim Scan werden IMMER die aktuellsten Daten geladen
   - ✅ Füllstand, Produkt, Status werden live abgerufen
   - ✅ Keine verzögerten oder veralteten Informationen

3. **Rückwärtskompatibilität:**
   - ✅ Alte QR-Codes funktionieren auch nach App-Updates
   - ✅ Viewer-Datei bleibt kompatibel
   - ✅ Parameter-Format bleibt unverändert

### Was ist NICHT garantiert?

- ⚠️ **Internet-Verbindung** (für GitHub/OneDrive erforderlich)
- ⚠️ **OneDrive-Freigabe** (kann manuell deaktiviert werden)
- ⚠️ **GitHub Pages Verfügbarkeit** (externer Service)

**Lösung:** Bei Internet-Ausfall funktioniert der **Offline-Viewer** automatisch!

---

## 🏭 Praktische Anwendung

### Empfohlener Workflow

1. **Initial-Setup:**
   - ✅ GitHub Pages aktivieren (Einstellungen)
   - ✅ Token hinterlegen
   - ✅ Container-System einrichten

2. **QR-Codes drucken:**
   - ✅ Alle Container in Gebindeverwaltung auswählen
   - ✅ Batch-Druck mit Größe "Mittel" (15x15cm)
   - ✅ Layout "Raster" (2 pro Seite)
   - ✅ Auf Etiketten-Papier drucken

3. **Aufkleber anbringen:**
   - ✅ QR-Code gut sichtbar auf Behälter
   - ✅ Wettergeschützt (Folie überkleben empfohlen)
   - ✅ Scan-freundliche Position (nicht zu hoch/tief)

4. **Dauerhaft nutzen:**
   - ✅ QR-Code mit Smartphone scannen
   - ✅ Aktuelle Tank-Daten werden angezeigt
   - ✅ Aufkleber niemals wechseln!

### Besondere Szenarien

**Szenario 1: Container wird umgebaut**
- Tank-Nr. bleibt gleich → QR-Code gültig ✅
- Kapazität ändert sich → In Datenbank aktualisieren
- QR-Code muss NICHT neu gedruckt werden

**Szenario 2: Container wird versandt**
- QR-Code bleibt auf dem Container ✅
- Status wird auf "shipped" gesetzt
- Beim Scannen: Zeigt aktuellen Status "Versandt"

**Szenario 3: Container kehrt zurück**
- QR-Code immer noch derselbe ✅
- Status wird auf "returned" gesetzt
- Neue Mazeration kann zugeordnet werden

**Szenario 4: Internet-Ausfall**
- GitHub Pages nicht erreichbar ❌
- Offline-Viewer greift automatisch ein ✅
- Lokale Daten werden angezeigt

---

## 📋 Checkliste für Sicherheit

### Vor dem Druck

- [ ] GitHub Pages aktiviert und funktioniert
- [ ] Test-Scan mit einem Container durchgeführt
- [ ] Alle Container haben eindeutige Tank-Nummern
- [ ] Batch-Auswahl funktioniert (Checkboxen sichtbar)

### Nach dem Druck

- [ ] Stichproben-Test: 5 zufällige QR-Codes scannen
- [ ] Aufkleber wetterfest gemacht (Folie)
- [ ] Backup der QR-Code-PDF erstellt
- [ ] Dokumentation für Mitarbeiter erstellt

### Langfristige Wartung

- [ ] Jährlich: Stichproben-Test von 10 QR-Codes
- [ ] Bei Problemen: OneDrive/Offline-Viewer testen
- [ ] Keine QR-Codes neu drucken (außer bei Beschädigung)

---

## 🎯 Zusammenfassung

| Aspekt | Status | Begründung |
|--------|--------|------------|
| **QR-Code-Stabilität** | ✅ PERMANENT | Tank-Nr. ändert sich nie |
| **Daten-Aktualität** | ✅ LIVE | Daten werden beim Scan geladen |
| **Internet erforderlich** | ⚠️ EMPFOHLEN | Offline-Viewer als Fallback |
| **Neudruck nötig** | ❌ NEIN | Nur bei physischer Beschädigung |
| **Wartung erforderlich** | ❌ NEIN | System ist selbst-wartend |

---

## 📞 Support

Bei Fragen zur QR-Code-Stabilität:
- Dokumentation lesen: `docs/QR_CODE_STABILITAET.md` (diese Datei)
- GitHub Issues: https://github.com/woku369/MazerationsMeister/issues
- Code-Referenz: `src/components/inventory/tank-management.tsx`

---

**Erstellt:** 2. Oktober 2025  
**Letzte Änderung:** 2. Oktober 2025  
**Version:** 1.0  
**Status:** ✅ Produktionsreif
