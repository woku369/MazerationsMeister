# 🧪 Rezepturen-System (Ausmischungen)

**Status:** 🚧 In Entwicklung  
**Erstellt:** 9. Oktober 2025  
**Ziel:** Verwaltung von Produktausmischungen für Endprodukte (z.B. GFKC)

---

## 📋 **Übersicht**

Das Rezepturen-System ermöglicht die Verwaltung, Berechnung und Dokumentation von Produktausmischungen. Der Hauptanwendungsfall ist die Herstellung von **GFKC** (Gurktaler Feinschnaps-Kräuter-Cocktail), welcher aus 10-12 Komponenten (Mazerate und Destillate) ausgemischt wird.

### **Hauptfunktionen:**
- ✅ Rezeptur-Editor mit Excel-ähnlicher Tabelle
- ✅ Komponenten aus Lagerverwaltung auswählen
- ✅ Flexible Eingabe: Liter ODER Prozent
- ✅ Automatische Berechnungen: %vol, LA, Gesamtmenge
- ✅ Skalierung: Testmischung (1L) → Produktion (500L)
- ✅ Verfügbarkeits-Check gegen Lagerbestand
- ✅ Sensorik-Bewertungen dokumentieren
- ✅ Varianten-Verwaltung (GFKC 2024, GFKC 2025 Var. A, etc.)
- ✅ Produktions-Checkliste (PDF/Excel-Export)
- ✅ KEINE automatischen Lagerbuchungen (nur manuelle Workflows)

---

## 🎯 **Workflow**

```
1. Rezeptur erstellen
   └─> Komponenten aus Lager auswählen
   └─> Mengen/Prozente eingeben
   └─> Live-Berechnung: %vol, LA, Summen

2. Testmischung (1L)
   └─> Rezeptur als "Test" markieren
   └─> Sensorische Bewertung eingeben
   └─> Notizen & Verbesserungsvorschläge

3. Optimierung
   └─> Varianten erstellen (A, B, C...)
   └─> Komponenten anpassen
   └─> Erneut testen

4. Freigabe
   └─> Rezeptur als "Freigegeben" markieren
   └─> Produktionsmenge festlegen (z.B. 500L)
   └─> Verfügbarkeit prüfen

5. Produktion
   └─> Checkliste drucken (PDF/Excel)
   └─> Manuelle Produktion durchführen
   └─> Manuell in Lagerverwaltung buchen
   └─> Rezeptur als "Produziert" markieren
```

---

## 📊 **Datenmodell**

### **Rezeptur**
```typescript
interface Rezeptur {
  id: string;
  name: string;                    // z.B. "GFKC 2025"
  zielProduktName: string;         // "GFKC"
  variantenName?: string;          // "Variante A - mehr Zitrone"
  basisMenge: number;              // 1.0L (Testmischung)
  produktionsMenge?: number;       // 500L (Produktionsmenge)
  komponenten: RezepturKomponente[];
  ergebnis: RezepturErgebnis;
  sensorikBewertungen: SensorikBewertung[];
  status: 'entwurf' | 'test' | 'freigegeben' | 'produziert' | 'archiviert';
  version: number;
  erstelltAm: string;
  geaendertAm: string;
}
```

### **Komponente**
```typescript
interface RezepturKomponente {
  id: string;
  produktId: string;               // Referenz zu Lagerverwaltung
  produktName: string;
  eingabeTyp: 'liter' | 'prozent';
  eingabeWert: number;             // User-Eingabe
  
  // Berechnete Werte:
  mengeInLiter: number;
  anteilProzent: number;
  alkoholgehalt: number;           // %vol
  literAlkohol: number;            // LA
  
  // Verfügbarkeit:
  verfuegbareMenge: number;        // Aus Lagerbestand
  istVerfuegbar: boolean;
  tankNr?: string;
}
```

### **Sensorik-Bewertung**
```typescript
interface SensorikBewertung {
  id: string;
  datum: string;
  testerName?: string;
  geruch: number;                  // 1-10
  geschmack: number;               // 1-10
  nachgeschmack: number;           // 1-10
  gesamteindruck: number;          // 1-10
  notizen: string;
  verbesserungsvorschlaege?: string;
  freigegeben: boolean;            // Zur Produktion freigegeben?
}
```

---

## 🧮 **Berechnungslogik**

### **1. Komponenten-Berechnung**

**Eingabe: Liter**
```
mengeInLiter = eingabeWert
anteilProzent = (eingabeWert / basisMenge) × 100
```

**Eingabe: Prozent**
```
anteilProzent = eingabeWert
mengeInLiter = (eingabeWert / 100) × basisMenge
```

**Liter Alkohol (LA)**
```
literAlkohol = mengeInLiter × (alkoholgehalt / 100)
```

### **2. Gesamt-Berechnung**

**Gesamtmenge**
```
gesamtMenge = Σ mengeInLiter (aller Komponenten)
```

**Durchschnittliche %vol (gewichtet!)**
```
durchschnittAlkohol = (Σ literAlkohol / gesamtMenge) × 100
```

**Gesamt LA**
```
gesamtLA = Σ literAlkohol (aller Komponenten)
```

### **3. Skalierung**

```
skalierungsFaktor = produktionsMenge / basisMenge
mengeFuerProduktion = mengeInLiter × skalierungsFaktor
```

**Verfügbarkeit prüfen:**
```
istVerfuegbar = verfuegbareMenge >= mengeFuerProduktion
```

---

## 🎨 **UI-Komponenten**

### **1. Rezepturen-Übersicht** (`/rezepturen`)
- Karten-Grid mit allen Rezepturen
- Filter: Status, Suche
- Quick-Info: %vol, LA, Komponentenanzahl
- Status-Badges (Entwurf, Test, Freigegeben, etc.)

### **2. Rezeptur-Editor** (`/rezepturen/[id]`)
- Header: Name, Status, Zielprodukt
- Excel-Style Tabelle:
  - Komponente (Dropdown aus Lager)
  - Eingabe-Typ Toggle (Liter/%)
  - Wert (Input-Feld)
  - Berechnet: Liter, %, %vol, LA
  - Verfügbarkeit-Indikator
  - Löschen-Button
- Ergebnis-Panel:
  - Gesamtmenge
  - Ø %vol
  - Gesamt LA
  - Komponenten-Verfügbarkeit
- Skalierungs-Panel (optional):
  - Produktionsmenge eingeben
  - Verfügbarkeit für alle Komponenten prüfen
  - Fehlende Komponenten auflisten

### **3. Sensorik-Bewertungen**
- Bewertungsskala 1-10 (Geruch, Geschmack, Nachgeschmack, Gesamt)
- Notizen-Feld (Freitext)
- Verbesserungsvorschläge
- Freigabe-Checkbox

### **4. Produktions-Workflow**
- Checkliste generieren (PDF/Excel)
- Manueller Button "In Lagerverwaltung buchen"
- Bestätigungsdialog mit Übersicht

---

## 📁 **Dateistruktur**

```
src/
├── schemas/
│   └── rezepturSchema.ts          ✅ Zod-Schemas & TypeScript-Typen
├── lib/
│   └── rezeptur-manager.ts        ✅ Berechnungs- & Verwaltungslogik
├── app/
│   └── rezepturen/
│       ├── page.tsx               ✅ Übersicht
│       ├── [id]/
│       │   └── page.tsx           🚧 Editor (in Arbeit)
│       └── components/
│           ├── rezeptur-editor.tsx           🚧 Haupt-Editor
│           ├── komponenten-tabelle.tsx       🚧 Excel-Style Tabelle
│           ├── sensorik-bewertung.tsx        📝 Geplant
│           ├── skalierungs-panel.tsx         📝 Geplant
│           └── produktions-checkliste.tsx    📝 Geplant
├── components/
│   └── layout/
│       └── sidebar.tsx            ✅ Navigation erweitert
└── types/
    └── app-data.ts                ✅ AppData mit Rezepturen erweitert
```

---

## ✅ **Implementierungs-Status**

### **Phase 1: Grundgerüst** ✅
- [x] Datenmodell (rezepturSchema.ts)
- [x] Berechnungslogik (rezeptur-manager.ts)
- [x] Hauptseite mit Übersicht
- [x] Navigation (Sidebar)
- [x] Integration in app-data.json

### **Phase 2: Editor** 🚧 In Arbeit
- [ ] Rezeptur-Editor Seite ([id]/page.tsx)
- [ ] Komponenten-Tabelle (Excel-Style)
- [ ] Live-Berechnung
- [ ] Komponenten hinzufügen/entfernen
- [ ] Liter/Prozent Toggle

### **Phase 3: Erweiterte Features** 📝 Geplant
- [ ] Skalierungs-Funktion
- [ ] Verfügbarkeits-Check
- [ ] Sensorik-Bewertungen
- [ ] Varianten-Management
- [ ] Produktions-Checkliste
- [ ] XLSX-Export

### **Phase 4: Polish** 📝 Geplant
- [ ] Testing mit echten Daten
- [ ] UI-Optimierungen
- [ ] Validierung & Fehlerbehandlung
- [ ] Dokumentation

---

## 🔍 **Wichtige Design-Entscheidungen**

### **1. KEINE automatischen Buchungen**
❌ Komponenten werden NICHT automatisch aus dem Lager abgebucht  
❌ GFKC wird NICHT automatisch ins Lager eingebucht  
✅ Manuelle Checkliste als Zwischenschritt  
✅ Doppelte Prüfung durch User  
✅ Separate Buchung in Lagerverwaltung

**Grund:** Sicherheit und Kontrolle bei wichtigen Produktionen

### **2. Varianten statt Überschreiben**
✅ Jede Änderung = neue Variante  
✅ Versionierung mit Historie  
✅ Vergleich zwischen Varianten möglich  

**Grund:** Nachvollziehbarkeit und Dokumentation

### **3. Testmischung als Standard**
✅ Basisgröße 1L für sensorische Tests  
✅ Skalierung optional für Produktion  

**Grund:** Ressourcenschonend, iterative Optimierung

---

## 📖 **Beispiel-Workflow: GFKC 2025**

```
1. Neue Rezeptur anlegen
   Name: "GFKC 2025"
   Zielprodukt: "GFKC"
   Basismenge: 1.0L

2. Komponenten hinzufügen
   [✓] Zitronenmelisse Mazerat   15% (0.15L)  45%vol  → 0.068L LA
   [✓] Arnika Destillat          10% (0.10L)  78%vol  → 0.078L LA
   [✓] Spitzwegerich Mazerat     12% (0.12L)  42%vol  → 0.050L LA
   ... (weitere 8 Komponenten)

3. Ergebnis
   Gesamtmenge: 1.00L
   Ø %vol: 48.5%
   Gesamt LA: 0.485L
   ✅ Alle Komponenten verfügbar

4. Testmischung herstellen
   Status → "Test"
   1L aus Tanks entnehmen
   Manuell mischen

5. Sensorik-Bewertung
   Geruch: 8/10
   Geschmack: 9/10
   Nachgeschmack: 8/10
   Gesamt: 9/10
   Notiz: "Perfekte Balance, etwas mehr Arnika?"
   [✓] Freigeben

6. Variante B erstellen (optional)
   Arnika: 10% → 12% (+2%)
   Zitronenmelisse: 15% → 13% (-2%)
   Status → "Entwurf"
   Erneut testen...

7. Produktion vorbereiten
   Rezeptur: GFKC 2025 Variante A
   Produktionsmenge: 500L eingeben
   
   Verfügbarkeit prüfen:
   ✅ Zitronenmelisse: 75L benötigt, 120L verfügbar
   ✅ Arnika: 50L benötigt, 80L verfügbar
   ✅ Spitzwegerich: 60L benötigt, 95L verfügbar
   ✅ Tank T-341 (5000L) hat genug Kapazität
   
8. Checkliste drucken
   [PDF] oder [Excel] Export
   Enthält: Alle Komponenten, Mengen, Tanks, Reihenfolge

9. Produktion durchführen
   Checkliste abhaken
   500L GFKC herstellen
   In Tank T-341 füllen

10. In Lagerverwaltung buchen (MANUELL!)
    - Komponenten abbuchen (Arnika: -50L, etc.)
    - GFKC einbuchen (+500L, Tank T-341)
    
11. Rezeptur finalisieren
    Status → "Produziert"
    Produktionsdatum: 2025-10-09
    Ziel-Tank: T-341
    Chargennummer: GFKC-2025-001
```

---

## 🚀 **Nächste Schritte**

1. **Jetzt:** Rezeptur-Editor UI implementieren
2. **Dann:** Skalierung & Verfügbarkeit
3. **Später:** Sensorik & Export
4. **Finale:** Testing mit echten Daten

---

## 📝 **Notizen**

- Alle Berechnungen erfolgen client-side in TypeScript
- Keine Server-Anfragen nötig (Offline-First)
- Speicherung in `app-data.json` → GitHub-Sync
- Excel-Export via `xlsx` Library (noch zu installieren)
- PDF via Browser-Druck-Dialog (window.print)

---

**Letzte Aktualisierung:** 9. Oktober 2025, 21:00 Uhr
