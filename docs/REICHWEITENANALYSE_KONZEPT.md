# Reichweitenanalyse - Konzept & Implementierungsplan

## 📋 Übersicht

Die Reichweitenanalyse ermöglicht eine Prognose, wie lange die vorhandenen Mazerate, Destillate und GFKC-Vorräte bei geplanter Absatzmenge ausreichen.

---

## 🎯 Zielsetzung

**Hauptfrage:** *"Wie lange reichen meine Vorräte bei geplanter Jahresproduktion?"*

### Geschäftskontext
- GFKC wird jährlich aus verschiedenen Mazeraten und Destillaten gemischt
- Lohnabfüller bestimmt jährliche Abfüllmenge
- Rezeptur variiert leicht je nach Verfügbarkeit der Komponenten
- Vorräte sind bei Produzent (Sie) und beim Lohnabfüller gelagert

---

## 🏗️ Technische Architektur

### Neue Seite: `/reichweite`

```
📁 src/app/reichweite/
  └── page.tsx          # Hauptseite Reichweitenanalyse
📁 src/components/reichweite/
  ├── RangeCalculator.tsx        # Eingabemaske & Berechnungslogik
  ├── RangeVisualization.tsx     # Grafische Darstellung
  ├── RecipeSelector.tsx         # Auswahl Musterrezeptur
  └── InventoryOverview.tsx      # Aktueller Lagerbestand
📁 src/lib/
  └── range-calculator.ts        # Berechnungslogik
```

---

## 📊 Datenquellen

### 1. **Lagerverwaltung** (inventoryItems)
```typescript
{
  produktName: string;        // z.B. "Zitronenmelisse"
  category: string;           // "Mazerat" | "Destillat" | "Sprit"
  currentQuantityLiters: number;
  alcoholVolProzent: number;
}
```

### 2. **Rezepturverwaltung** (recipes)
```typescript
{
  name: string;               // z.B. "GFKC Musterrezeptur 2025"
  ingredients: Array<{
    ingredient: string;       // Produktname aus Lager
    amount: number;          // Menge in Liter
    unit: string;            // "Liter"
  }>;
  yield: number;             // Ertrag in Liter
}
```

### 3. **Erweiterte Rezeptur-Struktur mit Reichweiten-Flag**
```typescript
type Recipe = {
  id: string;
  name: string;
  ingredients: Array<{
    ingredient: string;
    amount: number;
    unit: string;
  }>;
  yield: number;
  
  // NEU: Reichweiten-Relevanz
  isRangeRelevant?: boolean;             // Für Reichweitenanalyse berücksichtigen?
  rangeMetadata?: {
    productName: string;                  // Endprodukt (z.B. "GFKC")
    currentStock?: number;                // Aktueller Lagerbestand (Liter)
    externalStock?: number;               // Bestand beim Lohnabfüller (Liter)
    plannedAnnualSales?: number;          // Geplante Jahresabsatzmenge (Liter)
    priority?: number;                    // Priorität (1 = höchste)
    notes?: string;                       // Notizen (z.B. "Hauptprodukt")
  };
};
```

### 4. **Reichweiten-Konfiguration (pro Analyse)**
```typescript
type RangeConfig = {
  id: string;
  name: string;                          // "GFKC Reichweite 2025"
  recipeId: string;                      // Referenz zu Rezeptur mit isRangeRelevant=true
  plannedAnnualSales: number;            // Geplante Jahresabsatzmenge (Liter)
  currentStock: number;                  // Aktueller Lagerbestand (Liter)
  externalStock: number;                 // Bestand beim Lohnabfüller (Liter)
  lastCalculated: string;                // ISO-Datum
  createdAt: string;
  updatedAt: string;
};
```

---

## 🔢 Berechnungslogik

### Schritt 1: Gesamtvorrat GFKC
```
Gesamtvorrat = currentStockGFKC + externalStockGFKC
```

### Schritt 2: Produktionspotential aus Rohstoffen
Für jede Zutat in der Rezeptur:

```typescript
// Beispiel: Rezeptur ergibt 1000L GFKC
// Benötigt: 150L Zitronenmelisse Mazerat
// Lagerbestand: 2500L Zitronenmelisse Mazerat

const rezepturMenge = 150;  // Liter pro Batch (1000L GFKC)
const lagerbestand = 2500;  // Aktueller Bestand

// Wie viele Batches möglich?
const möglicheBatches = Math.floor(lagerbestand / rezepturMenge);
// = 16 Batches

// Wie viel GFKC kann produziert werden?
const produktionspotential = möglicheBatches * 1000;  // = 16.000 Liter
```

**Engpass-Komponente:** Die Zutat mit dem geringsten Produktionspotential.

### Schritt 3: Gesamtreichweite
```typescript
const gesamtVerfügbar = gesamtvorratGFKC + produktionspotentialAusRohstoffen;
const reichweiteTage = (gesamtVerfügbar / plannedAnnualSales) * 365;
const reichweiteJahre = gesamtVerfügbar / plannedAnnualSales;
```

### Schritt 4: Kritische Zutaten identifizieren
Sortiere alle Zutaten nach Reichweite (aufsteigend).
Markiere Zutaten mit <30% Restreichweite als "kritisch".

---

## 🎨 UI/UX Design

### Layout-Struktur

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 > Reichweitenanalyse                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 GFKC Reichweitenanalyse                                  │
│                                                               │
│  ┌──────────────────┬──────────────────┬──────────────────┐ │
│  │ Konfiguration    │ Aktuelle Vorräte │ Berechnung       │ │
│  ├──────────────────┼──────────────────┼──────────────────┤ │
│  │ • Rezeptur: [▼]  │ • Lager: 500 L   │ ⏱ Reichweite:   │ │
│  │ • Absatz: 5000 L │ • Extern: 200 L  │   📅 2.8 Jahre   │ │
│  │ • Jahr: 2025     │ • Summe: 700 L   │   🔢 1024 Tage   │ │
│  │                  │                  │                  │ │
│  │ [Berechnen] 🚀   │ Prod.-Potential: │ ⚠️ Engpass:      │ │
│  │                  │ 14.000 L         │ Pfefferminze D.  │ │
│  └──────────────────┴──────────────────┴──────────────────┘ │
│                                                               │
│  📊 Reichweiten-Visualisierung                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │  ████████████████████░░░░░░░░  Gesamtvorrat (700 L)   │  │
│  │  ████████████████████████████████████  Prod. (14k L)  │  │
│  │  ────────────────────────────────────  Bedarf (5k L)  │  │
│  │                                                         │  │
│  │  ✅ Reichweite: 2.8 Jahre (1024 Tage)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  📦 Komponenten-Details                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Zutat              │ Rezept │ Lager │ Batches │ Status  ││
│  ├────────────────────┼────────┼───────┼─────────┼─────────┤│
│  │ Zitronenmelisse M. │ 150 L  │ 2500L │   16    │ ✅ OK   ││
│  │ Pfefferminze D.    │  80 L  │  500L │    6    │ ⚠️ Eng. ││
│  │ Salbei D.          │ 120 L  │ 1800L │   15    │ ✅ OK   ││
│  │ Sprit (60%)        │ 400 L  │ 3300L │    8    │ ✅ OK   ││
│  │ ...                │        │       │         │         ││
│  └────────────────────┴────────┴───────┴─────────┴─────────┘│
│                                                               │
│  📈 Verbrauchsprognose (Chart)                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │   Liter                                                  ││
│  │   15000 ┤                                                ││
│  │   12000 ┤ ████████████████                              ││
│  │    9000 ┤ ████████████████                              ││
│  │    6000 ┤ ████████████████ ░░░░░░░░                    ││
│  │    3000 ┤ ████████████████ ░░░░░░░░                    ││
│  │       0 ┤─────────────────────────────> Monate         ││
│  │           Jetzt   6M    12M   18M   24M   30M           ││
│  │          Vorrat  Verbrauch  Kritischer Punkt            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  💡 Empfehlungen                                             │
│  • Pfefferminze Destillat nachproduzieren (Engpass!)        │
│  • Sprit nachbestellen (Reichweite nur 8 Batches)           │
│  • Zitronenmelisse gut bevorratet (16 Batches)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Grafik-Features ("Schnickschnack")

### 1. **Reichweiten-Fortschrittsbalken**
- Grün: >1 Jahr Reichweite
- Gelb: 6-12 Monate
- Orange: 3-6 Monate
- Rot: <3 Monate

### 2. **Komponenten-Status-Indikatoren**
```
✅ Grün:   Reichweite >50% des Durchschnitts
⚠️  Gelb:   Reichweite 30-50%
🔴 Rot:    Reichweite <30% (Engpass!)
```

### 3. **Interaktives Verbrauchsdiagramm**
- Line Chart mit recharts
- X-Achse: Monate (0-36)
- Y-Achse: Liter
- Linien:
  - Blau: Verfügbare Menge (absteigend)
  - Rot: Kritischer Punkt (0 Liter)
  - Grün: Sicherheitspuffer (20%)

### 4. **Animierte Zahlen**
- CountUp-Effekt für Reichweite in Tagen
- Pulse-Animation für kritische Werte

### 5. **Exportfunktionen**
- PDF-Export der Analyse
- CSV-Export der Komponententabelle
- Screenshot-Funktion

---

## 🔧 Implementierungsschritte

### Phase 1: Grundfunktionalität ⏳
- [ ] Neue Seite `/reichweite` erstellen
- [ ] RangeConfig Datenstruktur definieren
- [ ] Berechnungslogik implementieren (`range-calculator.ts`)
- [ ] Eingabemaske für Konfiguration
- [ ] Basis-Ergebnisanzeige (Zahlen)

### Phase 2: Datenintegration ⏳
- [ ] Anbindung an Lagerverwaltung (inventoryItems)
- [ ] Anbindung an Rezepturverwaltung (recipes)
- [ ] Rezeptauswahl-Dropdown
- [ ] Auto-Sync bei Lageränderungen

### Phase 3: Visualisierung ⏳
- [ ] Reichweiten-Fortschrittsbalken
- [ ] Komponenten-Detailtabelle mit Status
- [ ] Verbrauchsprognose-Chart (recharts)
- [ ] Responsive Design

### Phase 4: Erweiterte Features ⏳
- [ ] Mehrere Szenarien vergleichen
- [ ] "Was-wäre-wenn" Simulation
- [ ] Benachrichtigungen bei kritischen Werten
- [ ] Historische Reichweiten-Daten
- [ ] Produktionsplan-Generator

### Phase 5: Export & Reporting ⏳
- [ ] PDF-Export
- [ ] CSV-Export
- [ ] E-Mail-Versand an Lohnabfüller
- [ ] Druckoptimierte Ansicht

### Phase 6: Produktionsauftrag-Simulation ⏳ (Zukunft)
**Abhängigkeiten:** Phase 1-4 müssen abgeschlossen sein  
**Scope:** Vereinfacht - OHNE komplexe Anbauplanung

#### 6.1: Produktionsauftrag-Dialog
- [ ] Dialog "Produktionsauftrag simulieren"
- [ ] Input: Rezeptur + gewünschte Menge (Liter)
- [ ] Verfügbarkeitsprüfung aller Komponenten (✅/❌)
- [ ] Reichweiten-Auswirkung berechnen (Vorher/Nachher)
- [ ] Fehlmengen-Liste (was fehlt, wieviel)

#### 6.2: Export-Funktionen (WICHTIG!)
- [ ] **PDF-Export:** Reichweitenanalyse komplett
  - Übersichtskarten (Mazerat, Destillat, Sprit, Gesamt-LA)
  - Komponenten-Detailtabelle
  - Verbrauchsprognose-Chart als Bild
  - Empfehlungen (kritische Zutaten)
  - Datum, Version, Szenario-Name
- [ ] **CSV-Export:** Komponenten-Detailtabelle
  - Kategorie, Chargen, Liter, LA (L)
  - Importierbar in Excel/Google Sheets
- [ ] **Excel-Export (XLSX):** Vollständiger Report
  - Sheet 1: Übersicht (Metriken)
  - Sheet 2: Komponenten-Details
  - Sheet 3: Reichweiten-Prognose (Tabelle)
  - Sheet 4: Produktionsaufträge (falls vorhanden)
- [ ] **Produktionsauftrag-Export (PDF)**
  - Auftragsnummer, Datum
  - Rezeptur + Menge
  - Komponentenliste (benötigt vs. verfügbar)
  - Status: ✅ Produzierbar / ❌ Fehlende Komponenten
  - Auswirkung auf Reichweiten
- [ ] **E-Mail-Versand (optional)**
  - Reichweiten-Report per Mail
  - An Lohnabfüller / Team
  - Automatisch bei kritischen Werten

#### 6.3: Druck-Ansichten
- [ ] Druckoptimierte Seite (CSS @media print)
- [ ] Querformat für Charts
- [ ] Seitenumbrüche sinnvoll setzen
- [ ] Header/Footer mit Datum + Seitenzahl

---

## 📐 Technische Komponenten

### 1. **range-calculator.ts**
```typescript
export interface RangeCalculationResult {
  totalAvailableGFKC: number;          // Liter
  productionPotential: number;          // Liter
  rangeInDays: number;
  rangeInYears: number;
  bottleneckIngredient: string;
  criticalIngredients: string[];
  componentDetails: ComponentDetail[];
}

export interface ComponentDetail {
  name: string;
  requiredPerBatch: number;
  availableStock: number;
  possibleBatches: number;
  isBottleneck: boolean;
  isCritical: boolean;
}

export function calculateRange(
  config: RangeConfig,
  recipe: Recipe,
  inventory: StoredInventoryItem[]
): RangeCalculationResult;
```

### 2. **RangeCalculator.tsx**
- Eingabeformular
- Rezeptauswahl
- Absatzplanung
- Lagerstandseingabe (intern/extern)
- Berechnungs-Button

### 3. **RangeVisualization.tsx**
- Fortschrittsbalken
- Status-Indikatoren
- Hauptmetriken (Cards)

### 4. **ComponentTable.tsx**
- Sortierbare Tabelle
- Filterfunktion
- Status-Icons
- Highlight für Engpässe

### 5. **ConsumptionChart.tsx**
- Recharts LineChart
- X: Monate, Y: Liter
- Mehrere Szenarien vergleichbar

---

## 🎯 User Stories

### US-1: Reichweite berechnen
**Als** Produzent  
**möchte ich** die Reichweite meiner Vorräte berechnen  
**damit ich** rechtzeitig nachproduzieren kann

**Akzeptanzkriterien:**
- ✅ Rezeptur auswählbar
- ✅ Jahresabsatzmenge eingeben
- ✅ GFKC-Lagerbestände eingeben (intern + extern)
- ✅ Reichweite in Tagen und Jahren angezeigt
- ✅ Engpass-Komponente hervorgehoben

### US-2: Komponenten-Details einsehen
**Als** Produzent  
**möchte ich** sehen, welche Zutaten knapp werden  
**damit ich** priorisiert nachproduzieren kann

**Akzeptanzkriterien:**
- ✅ Tabelle mit allen Komponenten
- ✅ Sortierbar nach Reichweite
- ✅ Kritische Zutaten markiert
- ✅ Benötigte Menge pro Batch
- ✅ Mögliche Batches berechnet

### US-3: Was-wäre-wenn Analyse
**Als** Produzent  
**möchte ich** verschiedene Absatzszenarien simulieren  
**damit ich** besser planen kann

**Akzeptanzkriterien:**
- ✅ Mehrere Szenarien parallel
- ✅ Absatzmenge variierbar
- ✅ Vergleich in Grafik
- ✅ Speichern/Laden von Szenarien

---

## 🚀 Priorisierung

### Must-Have (MVP)
1. Berechnungslogik
2. Eingabemaske
3. Ergebnisanzeige (Zahlen)
4. Komponenten-Detailtabelle

### Should-Have
5. Fortschrittsbalken
6. Status-Indikatoren
7. Verbrauchsprognose-Chart

### Nice-to-Have
8. PDF-Export
9. Was-wäre-wenn Szenarien
10. Historische Daten

---

## 📅 Zeitschätzung

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Grundfunktionalität | 4-6h | Hoch |
### Multi-Rezeptur-System (User-Request 22.11.2025)
- **Evolutionärer Ansatz:** Start mit einem Hauptprodukt (GFKC)
- **Schrittweise Erweiterung:** Weitere Rezepturen als "reichweitenrelevant" markierbar
- **Flexibles Flag-System:** `isRangeRelevant` in Rezeptur-Schema
- **Geschichte vervollständigen:** Mit der Zeit alle wichtigen Produkte erfassen
- **Komponenten-Sharing:** Automatische Erkennung gemeinsam genutzter Zutaten
- **Vorteil:** System wächst mit den Anforderungen, kein Big-Bang-Approach
- **Backward Compatible:** Bestehende Rezepte bleiben unberührt (Default: false)

### Produktionsauftrag-Simulation (User-Request 22.11.2025 - Vereinfacht)
- **Kernidee:** Produktionsauftrag simulieren (z.B. 500 L GFKC)
- **Verfügbarkeitsprüfung:** Sind alle Komponenten im Lager? (✅/❌)
- **Reichweiten-Impact:** Wie ändern sich die Reichweiten nach Produktion?
- **Fehlmengen-Liste:** Was fehlt, wieviel wird benötigt?
- **Empfehlungen:** Welche Komponenten nachproduzieren?
- **WICHTIG: Export-Funktionen:** PDF, Excel, CSV für Reports
- **Scope-Reduzierung:** KEINE Anbauplanung (zu komplex, Datenoverkill vermeiden)
- **Use Case:** "Wir müssen 500L GFKC produzieren - sehen wir sofort, ob alle Zutaten da sind und wie sich die Reichweite ändert"
- **Vorteil:** Fokus auf Kernfunktionen, keine überladene Datenbank
## 🔄 Multi-Rezeptur-System (Erweiterung)

### Konzept: Mehrere reichweitenrelevante Rezepturen

**Anwendungsfall:**
- **Hauptprodukt:** GFKC (5.000 L/Jahr)
- **Nebenprodukte:** GFKC-A (500 L/Jahr), GFKC-K (300 L/Jahr)
- **Sonderprodukte:** Jubiläumsedition (einmalig 1.000 L)

### Rezepturverwaltung erweitern

**Neuer Toggle in Rezept-Editor:**
```
┌─────────────────────────────────────────────┐
│ Rezeptur: GFKC Standardrezeptur            │
│                                             │
│ [ ] Für Reichweitenanalyse berücksichtigen │  ← NEU
│     └─ [x] Als Hauptprodukt markieren      │
│     └─ Endprodukt: [GFKC      ▼]          │
│     └─ Priorität:  [1 - Hoch  ▼]          │
│     └─ Lagerbestand: [_____] L (optional) │
│     └─ Extern:       [_____] L (optional) │
│     └─ Jahresabsatz: [_____] L (optional) │
└─────────────────────────────────────────────┘
```
## 📝 Notizen

- Rezeptur ist "ungefähr" → Toleranzen einbauen (+/- 10%)
- Jährliche Variation berücksichtigen (Rezepturanpassungen)
- Sprit als Sonderfall: Ausgangsstoff, nicht Endprodukt
- Alkoholgehalt muss bei LA-Berechnung berücksichtigt werden
- Mehrere GFKC-Varianten möglich (GFKC-A, GFKC-K)

### Multi-Rezeptur-System (User-Request 22.11.2025)
- **Evolutionärer Ansatz:** Start mit einem Hauptprodukt (GFKC)
- **Schrittweise Erweiterung:** Weitere Rezepturen als "reichweitenrelevant" markierbar
- **Flexibles Flag-System:** `isRangeRelevant` in Rezeptur-Schema
- **Geschichte vervollständigen:** Mit der Zeit alle wichtigen Produkte erfassen
- **Komponenten-Sharing:** Automatische Erkennung gemeinsam genutzter Zutaten
- **Vorteil:** System wächst mit den Anforderungen, kein Big-Bang-Approach
- **Backward Compatible:** Bestehende Rezepte bleiben unberührt (Default: false)──────────┤
│                                                           │
│  🎯 GFKC (Hauptprodukt)          ✅ 2.8 Jahre  (1024 T)  │
│     Absatz: 5.000 L/J  Vorrat: 700 L  Prod.: 14.000 L   │
│     Engpass: Pfefferminze D. (6 Batches)                │
│                                                           │
│  🎯 GFKC-A (Nebenprodukt)        ⚠️  1.2 Jahre  (438 T)  │
│     Absatz: 500 L/J    Vorrat: 100 L  Prod.: 500 L      │
│     Engpass: Königskerze D. (2 Batches)                 │
│                                                           │
│  🎯 GFKC-K (Nebenprodukt)        ✅ 3.5 Jahre  (1277 T)  │
│     Absatz: 300 L/J    Vorrat: 50 L   Prod.: 1.000 L    │
│     Engpass: Salbei D. (4 Batches)                      │
│                                                           │
│  ──────────────────────────────────────────────────────  │
│                                                           │
│  📦 Gemeinsame Komponenten (über alle Produkte)          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Zutat              │ Verbrauch │ Lager │ Status  │   │
│  ├────────────────────┼───────────┼───────┼─────────┤   │
│  │ Pfefferminze D.    │ 950 L/J   │ 500 L │ 🔴 Krit.│   │
│  │ Zitronenmelisse M. │ 800 L/J   │ 2500L │ ✅ OK   │   │
│  │ Salbei D.          │ 600 L/J   │ 1800L │ ✅ OK   │   │
│  │ Sprit (60%)        │ 2200 L/J  │ 3300L │ ⚠️  Eng.│   │
│  └────────────────────┴───────────┴───────┴─────────┘   │
│                                                           │
│  💡 Empfehlungen:                                        │
│  • Pfefferminze nachproduzieren (Engpass für 2 Produkte)│
│  • GFKC-A hat kritische Reichweite (< 1.5 Jahre)        │
│  • Sprit nachbestellen (über alle Produkte verteilt)    │
└──────────────────────────────────────────────────────────┘
```

### Berechnungslogik für Multi-Rezeptur

```typescript
// 1. Alle als reichweitenrelevant markierten Rezepte laden
const relevantRecipes = recipes.filter(r => r.isRangeRelevant);

// 2. Für jede Rezeptur separate Reichweite berechnen
const productRanges = relevantRecipes.map(recipe => 
  calculateRange(recipe, inventory)
);

// 3. Gemeinsame Komponenten identifizieren
const sharedIngredients = new Map<string, {
  totalAnnualConsumption: number;  // Summe über alle Rezepte
  availableStock: number;
  criticalForProducts: string[];   // Welche Produkte betroffen?
}>();

// 4. Jahresverbrauch pro Zutat aggregieren
relevantRecipes.forEach(recipe => {
  const annualSales = recipe.rangeMetadata?.plannedAnnualSales || 0;
  const batchesPerYear = annualSales / recipe.yield;
  
  recipe.ingredients.forEach(ing => {
    const annualConsumption = ing.amount * batchesPerYear;
    
    if (!sharedIngredients.has(ing.ingredient)) {
      sharedIngredients.set(ing.ingredient, {
        totalAnnualConsumption: 0,
        availableStock: getStockFromInventory(ing.ingredient),
        criticalForProducts: []
      });
    }
    
    const shared = sharedIngredients.get(ing.ingredient)!;
    shared.totalAnnualConsumption += annualConsumption;
    
    // Kritisch wenn Reichweite < 1 Jahr
    if (shared.availableStock < shared.totalAnnualConsumption) {
      shared.criticalForProducts.push(recipe.rangeMetadata?.productName || recipe.name);
    }
  });
});

// 5. Priorisierung nach Wichtigkeit
productRanges.sort((a, b) => {
  const priorityA = a.recipe.rangeMetadata?.priority || 999;
  const priorityB = b.recipe.rangeMetadata?.priority || 999;
  return priorityA - priorityB;
});
```

### UI-Features für Multi-Rezeptur

1. **Filter/Toggle**
   ```
   Anzeigen: [x] Hauptprodukte  [x] Nebenprodukte  [ ] Sonderprodukte
   ```

2. **Komponenten-Sharing-Indikator**
   ```
   🔗 Diese Zutat wird von 3 Produkten benötigt: GFKC, GFKC-A, GFKC-K
   ```

3. **Was-wäre-wenn Multi-Szenario**
   ```
   📊 Szenario-Vergleich:
   - Basis: Alle Produkte wie geplant → Engpass in 1.2 Jahren
   - "Nur Hauptprodukt": GFKC-A pausieren → Reichweite +8 Monate
   - "Doppelter Absatz": GFKC verdoppeln → Engpass in 6 Monaten
   ```

4. **Prioritäts-Manager**
   ```
   Bei Engpass: Welches Produkt hat Vorrang?
   1. 🔥 GFKC (Hauptprodukt, 90% Umsatz)
   2. 📦 GFKC-A (Nebenprodukt, 8% Umsatz)
   3. 🎁 GFKC-K (Sonderprodukt, 2% Umsatz)
   ```

### Migrations-Strategie

**Phase 1 (MVP):** Single Recipe
- Ein Hauptprodukt (GFKC)
- Basis-Reichweitenberechnung

**Phase 2:** Multi-Recipe Support
- Flag `isRangeRelevant` in Rezeptur
- Mehrere Produkte parallel
- Gemeinsame Komponenten-Tabelle

**Phase 3:** Advanced Features
- Prioritäts-Management
- Automatische Produktionsempfehlungen
- Multi-Szenario-Vergleich

### Datenmigration

```typescript
// Bestehende Rezepte erweitern (backward compatible)
const migrateRecipes = async () => {
  const recipes = await hybridStorage.get<Recipe[]>('recipes') || [];
  
  recipes.forEach(recipe => {
    // Nur wenn noch nicht vorhanden
    if (!recipe.hasOwnProperty('isRangeRelevant')) {
      recipe.isRangeRelevant = false;  // Default: nicht relevant
    }
  });
  
  await hybridStorage.set('recipes', recipes);
};
```

---

## 🏭 Produktionsauftrag-Simulation (Phase 6 - Vereinfacht)

### Konzept: Verfügbarkeitsprüfung + Reichweiten-Impact

**User-Szenario (22.11.2025):**
> "Produkt A, 500 Liter werden gebraucht, Rezeptur A vorhanden"
> → Sind alle Komponenten da?
> → Wie ändern sich die Reichweiten?
> → Was fehlt, wenn nicht alle Komponenten da sind?

**Scope-Reduzierung (22.11.2025):**
- ❌ KEINE Anbauplanung (zu komplex, Datenoverkill)
- ❌ KEINE Jahreskalender-Integration
- ❌ KEINE Pflanzendatenbank
- ✅ Fokus: Verfügbarkeit prüfen + Reichweiten-Impact
- ✅ Einfache Fehlmengen-Liste
- ✅ **WICHTIG: Umfassende Export-Funktionen!**

### Neue Funktion: "Produktionsauftrag simulieren"

```
┌──────────────────────────────────────────────────────────┐
│  🏭 Produktionsauftrag Simulation                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Rezeptur: [GFKC Standardrezeptur  ▼]                   │
│  Menge:    [500] Liter                                   │
│                                                           │
│  [Verfügbarkeit prüfen] 🔍                               │
│                                                           │
│  ──────────────────────────────────────────────────────  │
│                                                           │
│  📦 Komponentenverfügbarkeit                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Zutat              │ Benötigt │ Lager │ Status     │ │
│  ├────────────────────┼──────────┼───────┼────────────┤ │
│  │ Zitronenmelisse M. │  75 L    │ 2500L │ ✅ OK      │ │
│  │ Pfefferminze D.    │  40 L    │  500L │ ✅ OK      │ │
│  │ Salbei D.          │  60 L    │ 1800L │ ✅ OK      │ │
│  │ Sprit (60%)        │ 200 L    │ 3300L │ ✅ OK      │ │
│  │ ...                │          │       │            │ │
│  └────────────────────┴──────────┴───────┴────────────┘ │
│                                                           │
│  ✅ Alle Komponenten verfügbar! Produktion möglich.      │
│                                                           │
│  📊 Auswirkung auf Reichweiten                           │
│  💡 Empfehlungen                                         │
│  • Alle Komponenten verfügbar - Produktion möglich!     │
│  • Nach Produktion: Pfefferminze nachproduzieren        │
│  • GFKC-Reichweite sinkt um 73 Tage                    │
│                                                           │
│  [📄 Als PDF exportieren] [📊 Als Excel exportieren]     │
│  [✅ Auftrag bestätigen]  [❌ Abbrechen]                 │
│  ├─────────────────┼──────────┼───────────┼──────────┤ │
│  │ Zitronenmelisse │ 15 kg    │ April 26  │ Ernte 8W │ │
│  │ Pfefferminze    │  8 kg    │ Mai 26    │ Ernte 6W │ │
│  │ Salbei          │ 12 kg    │ Juni 26   │ Ernte 8W │ │
│  └─────────────────┴──────────┴───────────┴──────────┘ │
│                                                           │
│  [Produktionsauftrag buchen] 🚀  [Abbrechen]            │
└──────────────────────────────────────────────────────────┘
```

### Erweiterte Datenstruktur: Pflanzen-Metadaten

```typescript
### Vereinfachte Datenstruktur: Produktionsauftrag

```typescript
type ProductionOrderSimulation = {
  recipeId: string;
  recipeName: string;
  requestedQuantity: number;            // Gewünschte Menge in Liter
  
  // Ergebnis der Simulation
  feasible: boolean;                    // true = alle Komponenten da
  requiredIngredients: Array<{
    name: string;
    required: number;                   // Benötigte Menge
    available: number;                  // Verfügbare Menge
    sufficient: boolean;                // true = genug da
    shortage?: number;                  // Fehlmenge (falls insufficient)
  }>;
  
  // Auswirkung auf Reichweiten
  rangeImpact: Array<{
    productName: string;
    rangeBefore: number;                // Reichweite vorher (Tage)
    rangeAfter: number;                 // Reichweite nachher (Tage)
    changeDays: number;                 // Änderung in Tagen
  }>;
  
  // Empfehlungen
  recommendations: string[];            // ["Pfefferminze nachproduzieren", ...]
};
```

### Berechnungslogik: Verfügbarkeit + Impact
const productionOrder = {
  recipeId: 'gfkc-standard',
  requestedQuantity: 500  // Liter
};

// 2. Benötigte Komponenten berechnen
const recipe = getRecipe(productionOrder.recipeId);
const batchSize = recipe.yield;  // z.B. 1000 L
const scaleFactor = productionOrder.requestedQuantity / batchSize;  // 0.5

const requiredIngredients = recipe.ingredients.map(ing => ({
  name: ing.ingredient,
  required: ing.amount * scaleFactor,
  available: getStockFromInventory(ing.ingredient),
  sufficient: getStockFromInventory(ing.ingredient) >= ing.amount * scaleFactor
}));

// 3. Fehlende Mengen identifizieren
const shortages = requiredIngredients.filter(ing => !ing.sufficient);

// 4. Für Mazerate: Pflanzenbedarf berechnen
const plantRequirements = requiredIngredients
  .filter(ing => ing.ingredientType === 'mazerat')
  .map(ing => {
    const plantMeta = ing.plantMetadata;
    const missingMazerat = Math.max(0, ing.required - ing.available);
    const kgFreshPlant = missingMazerat / plantMeta.freshPlantToMaceratRatio;
    
    return {
// 4. Auswirkung auf Reichweiten
    change: newRange.rangeInDays - currentRange.rangeInDays
  };
});
```

### UI-Features: Produktionsplanung

#### 1. **Produktionsauftrag-Dialog**
```
Eingabe:
- Rezeptur auswählen
- Menge eingeben
- Optional: Lieferdatum (für Anbauplanung)

Ausgabe:
- ✅/❌ Verfügbarkeit pro Komponente
- 📊 Reichweiten-Änderung
- 🌱 Pflanzenbedarf
- ⏰ Kritische Pfade (zu spät für Anbau?)
```

#### 2. **Jahreskalender Anbauplanung**
```
┌──────────────────────────────────────────────────────────┐
│  📅 Anbaukalender 2026                                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  April 2026                                              │
│  └─ 🌱 Zitronenmelisse pflanzen (15 kg benötigt)        │
### UI-Features: Vereinfachte Produktionsplanung

#### 1. **Produktionsauftrag-Dialog (Vereinfacht)**
```
Eingabe:
- Rezeptur auswählen
- Menge eingeben (Liter)

Ausgabe:
- ✅/❌ Verfügbarkeit pro Komponente
- 📊 Reichweiten-Änderung (Vorher/Nachher)
- ⚠️ Fehlmengen-Liste (falls nicht verfügbar)
- 💡 Empfehlungen (z.B. "Pfefferminze nachproduzieren")
```

#### 2. **Export-Optionen (WICHTIG!)**
```
Buttons:
- [📄 PDF exportieren]     → Vollständiger Report
- [📊 Excel exportieren]   → Komponenten-Tabelle + Prognose
- [📋 CSV exportieren]     → Einfache Tabelle für Excel
- [🖨️ Drucken]            → Optimierte Druckansicht
- [📧 Per E-Mail senden]  → Optional: An Lohnabfüller
```

#### 3. **Fehlmengen-Anzeige (wenn nicht verfügbar)**
```
⚠️  Produktionsauftrag nicht vollständig durchführbar!

Produktionsauftrag: 500 L GFKC
Fehlende Komponenten:

┌────────────────────────────────────────────────┐
│ Zutat           │ Benötigt │ Lager │ Fehlt   │
├─────────────────┼──────────┼───────┼─────────┤
│ Pfefferminze D. │   40 L   │  5 L  │  35 L ❌│
│ Salbei D.       │   60 L   │ 45 L  │  15 L ❌│
└─────────────────┴──────────┴───────┴─────────┘

Empfehlung:
• Pfefferminze nachproduzieren (35 L benötigt)
• Salbei nachproduzieren (15 L benötigt)
• Alternative: Rezeptur anpassen (falls möglich)
```

#### 4. **Einfache Datenstruktur (ohne Anbau)**
```typescript
// KEIN PlantDatabase, KEINE Kalender-Integration
// Fokus: Verfügbarkeit + Reichweiten-Impact

type ProductionOrderSimulation = {
  recipeId: string;
  requestedQuantity: number;
  feasible: boolean;
  requiredIngredients: Ingredient[];
  rangeImpact: RangeImpact[];
  recommendations: string[];
};
```

### PDF-Export Struktur

```
┌─────────────────────────────────────────────────┐
│  MazerationsMeister                             │
│  Reichweitenanalyse                             │
│  Stand: 22.11.2025                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Übersicht                                      │
│  • Sorten im Lager: 26                         │
│  • Mazerat: 23.727,4 L                         │
│  • Destillat: 5.123,8 L                        │
│  • Sprit: 3.330,0 L                            │
│  • Gesamt LA: 18.456,2 L                       │
│                                                 │
│  Komponenten-Details                            │
│  [Tabelle mit allen Kategorien]                │
│                                                 │
│  Verbrauchsprognose                             │
│  [Chart als Bild eingebettet]                  │
│                                                 │
│  Produktionsauftrag-Simulation (falls genutzt) │
│  • Rezeptur: GFKC Standardrezeptur             │
│  • Menge: 500 L                                │
│  • Status: ✅ Produzierbar                     │
│  • Auswirkung: -73 Tage Reichweite             │
│                                                 │
│  Empfehlungen                                   │
│  • Pfefferminze nachproduzieren                │
│  • Sprit nachbestellen                         │
│                                                 │
└─────────────────────────────────────────────────┘
```utomatisch berechnen

### 4. **Produktionskalender**
   - Optimaler Zeitpunkt für Nachproduktion
   - Priorisierung nach Engpässen über alle Produkte
   - **NEU:** Integration mit Anbaukalender

### 4. **Lohnabfüller-Portal**
   - Direkter Zugriff auf Reichweitenanalyse
   - Bestellanfragen direkt stellen

### 5. **KI-Prognose**
   - Basierend auf historischen Verbräuchen
   - Saisonale Schwankungen berücksichtigen
   - Produktmix-Optimierung

### 6. **Mobile Benachrichtigungen**
   - Push bei kritischen Reichweiten
   - Pro Produkt oder aggregiert

### 7. **Kostenrechnung**
   - Produktionskosten pro Batch und Produkt
   - Break-Even-Analyse für Produktportfolio
   - ROI-Berechnung für Nebenprodukte

---

## 📝 Notizen

- Rezeptur ist "ungefähr" → Toleranzen einbauen (+/- 10%)
- Jährliche Variation berücksichtigen (Rezepturanpassungen)
- Sprit als Sonderfall: Ausgangsstoff, nicht Endprodukt
- Alkoholgehalt muss bei LA-Berechnung berücksichtigt werden
- Mehrere GFKC-Varianten möglich (GFKC-A, GFKC-K)

---

## ✅ Status

**Stand:** 22.11.2025  
**Status:** 📋 Konzept erstellt  
**Nächster Schritt:** Implementierung Phase 1 starten

---

## 🔗 Verwandte Dokumente

- [ROADMAP.md](../ROADMAP.md) - Feature Roadmap
- [REZEPTUR_MEILENSTEIN.md](../REZEPTUR_MEILENSTEIN.md) - Rezepturverwaltung
- [APP_DOCUMENTATION.md](../APP_DOCUMENTATION.md) - Hauptdokumentation
