# Reichweitenanalyse - Konfiguration

## Schwellenwerte für Kritikalität

Die Reichweitenanalyse verwendet konfigurierbare Schwellenwerte, um den Status von Komponenten zu bestimmen.

### Verfügbare Schwellenwerte

**Datei:** `src/lib/range-calculator.ts`

```typescript
export const CRITICAL_THRESHOLD = 0;    // 0 Batches = kritisch (ausverkauft)
export const LOW_THRESHOLD = 5;         // < 5 Batches = niedrig (Warnung)
export const BOTTLENECK_THRESHOLD = 10; // < 10 Batches = potenzieller Engpass
```

### Status-Definitionen

| Status | Bedingung | Farbe | Symbol | Bedeutung |
|--------|-----------|-------|--------|-----------|
| **KRITISCH** | `possibleBatches <= CRITICAL_THRESHOLD` | Rot 🔴 | 🔴 | Komponente ist aufgebraucht oder nahezu leer |
| **NIEDRIG** | `possibleBatches < LOW_THRESHOLD` | Orange/Gelb ⚠️ | ⚠️ | Komponente wird bald knapp |
| **OK** | `possibleBatches >= LOW_THRESHOLD` | Grün ✅ | ✅ | Komponente ausreichend vorhanden |
| **ENGPASS** | Komponente mit wenigsten Batches | Rot 🔴 | 🔴 | Limitierende Komponente für Produktion |

### Engpass-Erkennung

Der **Engpass** ist die Komponente, die die Produktion am stärksten limitiert:

```typescript
// Die Komponente mit den WENIGSTEN möglichen Batches
const bottleneck = components.reduce((min, comp) => 
  comp.possibleBatches < min.possibleBatches ? comp : min
);
```

**Wichtig:** 
- Unbegrenzte Ressourcen (z.B. Wasser) haben `possibleBatches = Infinity` und werden NICHT als Engpass gewertet
- Es gibt immer **genau einen** Engpass (die limitierendste Komponente)
- Eine Komponente kann gleichzeitig **KRITISCH** und **ENGPASS** sein

### Beispiel-Szenario

```
Komponente         | Lager | Ben./Batch | Batches | Status
-------------------|-------|------------|---------|----------
Sprit              | 2.830 | 0,03 L     | 94.333  | OK ✅
GFKC - M           | 9.840 | 0,30 L     | 32.800  | OK ✅
Königskerze        |   845 | 0,03 L     | 28.166  | OK ✅
Pfefferminze       | 4.050 | 0,20 L     | 20.250  | OK ✅
Oregano            |   200 | 0,04 L     |  5.000  | OK ✅
Thymian            |    45 | 0,10 L     |    450  | OK ✅
Zitronenmelisse    |    20 | 0,20 L     |    100  | OK ✅
Salbei             |     4 | 0,10 L     |     40  | OK ✅
Basilikum          |     0 | 0,05 L     |      0  | KRITISCH 🔴 + ENGPASS 🔴
```

**Ergebnis:**
- **Basilikum** ist KRITISCH (0 Batches <= 0)
- **Basilikum** ist ENGPASS (wenigste Batches)
- Maximale Produktion: **0 Batches** (limitiert durch Basilikum)

### Schwellenwerte anpassen

Um die Schwellenwerte zu ändern, bearbeiten Sie die Konstanten in `src/lib/range-calculator.ts`:

```typescript
// Beispiel: Strengere Warnschwellen
export const CRITICAL_THRESHOLD = 5;    // < 5 Batches = kritisch
export const LOW_THRESHOLD = 20;        // < 20 Batches = niedrig
export const BOTTLENECK_THRESHOLD = 50; // < 50 Batches = Warnung
```

**Nach Änderungen:**
1. App neu builden: `npm run build`
2. Electron neu starten: `npx electron .`
3. Reichweitenanalyse erneut berechnen

### Manuelle Übersteuerung

Zusätzlich zu den Schwellenwerten können Sie **theoretische Bestände** manuell eingeben:

**Wann nutzen?**
- Bestellung ist unterwegs
- Komponente wird gerade produziert
- Alternative Quelle verfügbar
- Was-wäre-wenn-Szenarien

**Wie funktioniert's?**
1. Komponente ist **KRITISCH** oder **ENGPASS**
2. Button "Theoretischen Bestand eingeben" erscheint
3. Neue Menge eingeben (z.B. 500 L)
4. Berechnung wird automatisch aktualisiert
5. Override mit X-Button entfernen

**Beispiel:**
```
Oregano: 200 L im Lager → 5.000 Batches
  ↓ (Bestellung: +300 L unterwegs)
Oregano: 500 L theoretisch → 12.500 Batches ✅
```

### Unbegrenzte Ressourcen

Bestimmte Komponenten werden automatisch als **unbegrenzt verfügbar** erkannt:

```typescript
const unlimitedResources = [
  'wasser',
  'leitungswasser', 
  'trinkwasser',
  'destilliertes wasser',
  'osmosewasser',
];
```

**Eigenschaften:**
- `possibleBatches = Infinity` (∞)
- Status immer **OK** ✅
- Wird NICHT als Engpass gewertet
- Anzeige: "∞ Unbegrenzt verfügbar"

### Zahlenformat

Alle Zahlen werden im **deutschen Format** angezeigt:

| Wert | Format | Beispiel |
|------|--------|----------|
| Ganzzahlen | `1.000` | 5.000 Batches |
| Dezimalzahlen | `1.000,00` | 3.500,00 L |
| Kleine Mengen | `0,05` | 0,05 L/Batch |

**Gültig in:**
- ✅ UI (alle Cards und Tabellen)
- ✅ PDF-Export
- ✅ CSV-Export
- ✅ Excel-Export

## Technische Details

### Berechnung: Mögliche Batches

```typescript
possibleBatches = Math.floor(availableQuantity / requiredPerBatch)
```

**Beispiel:**
- Lagerbestand: 845 L Königskerze
- Benötigt pro Batch: 0,03 L
- Mögliche Batches: `Math.floor(845 / 0.03) = 28.166 Batches`

### Berechnung: Produktionspotential

```typescript
productionPotential = minBatches * yieldPerBatch
```

**Beispiel:**
- Engpass: 5.000 Batches möglich
- Ertrag pro Batch: 1,01 L GFKC
- Produktionspotential: `5.000 × 1,01 = 5.050 L GFKC`

### Berechnung: Reichweite

```typescript
rangeInDays = totalPotential / (jahresbedarfLiter / 365)
rangeInYears = totalPotential / jahresbedarfLiter
```

**Beispiel:**
- Gesamt verfügbar: 15.887,17 L
- Jahresbedarf: 3.500 L
- Tagesverbrauch: `3.500 / 365 = 9,59 L/Tag`
- Reichweite: `15.887,17 / 9,59 = 1.656,8 Tage ≈ 4,54 Jahre`

## Best Practices

### 1. Realistische Schwellenwerte

- **CRITICAL_THRESHOLD = 0**: Nur wenn wirklich NICHTS mehr da ist
- **LOW_THRESHOLD = 5**: Genug Zeit zum Nachbestellen (ca. 1-2 Wochen)
- Bei schnellem Verbrauch: Schwellen höher setzen

### 2. Regelmäßige Überprüfung

- Wöchentlich: Kritische und niedrige Komponenten prüfen
- Monatlich: Engpass-Analyse durchführen
- Quartalsweise: Schwellenwerte überprüfen und anpassen

### 3. Manuelle Overrides

- Dokumentieren Sie Übersteuerungen (Screenshot oder Notiz)
- Entfernen Sie Overrides nach Wareneingang
- Nutzen Sie realistische Werte (keine Fantasiezahlen)

### 4. Export-Nutzung

- **PDF**: Für Management-Berichte und Archivierung
- **Excel**: Für eigene Analysen und Grafiken
- **CSV**: Für Import in andere Systeme (ERP, etc.)

## Troubleshooting

### Problem: "Alle Komponenten sind kritisch"

**Ursache:** Schwellenwerte zu streng gesetzt

**Lösung:** 
```typescript
export const CRITICAL_THRESHOLD = 0;  // Zurück auf 0
export const LOW_THRESHOLD = 5;       // Zurück auf 5
```

### Problem: "Engpass wechselt ständig"

**Ursache:** Mehrere Komponenten haben ähnliche Bestände

**Lösung:** Manuelle Overrides für kritische Komponenten nutzen

### Problem: "Wasser ist Engpass"

**Ursache:** Wasser nicht in Unlimited-Liste

**Lösung:** Name in `unlimitedResources` hinzufügen:
```typescript
const unlimitedResources = [
  'wasser',
  'ihr-wassername-hier',  // ← Neu
  // ...
];
```

### Problem: "Komponente zeigt falsche Menge"

**Ursache:** Produkt über mehrere Tanks verteilt

**Lösung:** ✅ Seit v1.2.3 automatisch behoben - alle Tanks werden summiert!

**Prüfung:**
```typescript
// Calculator summiert jetzt alle Items:
const inventoryItems = this.inventory.filter(item => 
  item.produktName?.toLowerCase() === componentName.toLowerCase()
);
const totalQuantity = inventoryItems.reduce((sum, item) => 
  sum + (item.currentQuantityLiters || 0), 0
);
```

## Changelog

### v1.2.3 (23.11.2025)

**✅ Konfigurierbare Schwellenwerte**
- `CRITICAL_THRESHOLD`, `LOW_THRESHOLD`, `BOTTLENECK_THRESHOLD` als exportierte Konstanten
- Manuell änderbar in `range-calculator.ts`

**✅ Summen-Aggregation**
- Komponenten über mehrere Tanks werden jetzt korrekt summiert
- Beispiel: 2 Tanks GFKC (6.480 + 3.360 = 9.840 L) ✅

**✅ Deutsches Zahlenformat**
- Durchgängig in UI, PDF, CSV, Excel
- 1.000,00 L statt 1000.00 L
- Punkt als Tausender-Trennzeichen, Komma als Dezimaltrennzeichen

## Produktionsplanung (NEU in v1.2.4)

### Ziel-Produktionsmenge

Im Eingabefeld "Ziel-Produktionsmenge (optional)" kann eine gewünschte Produktionsmenge eingegeben werden:
- **0 oder leer**: Normale Reichweitenanalyse (maximale Reichweite)
- **>0 (z.B. 5000)**: Produktionsplanung wird berechnet

### FIFO-Gebinde-Empfehlung

**Gesperrte Gebinde:**
- Ballons (B-*) - KOMPLETT ausgeschlossen
- Flaschen (Fl-*) - KOMPLETT ausgeschlossen

**Bevorzugte Gebinde:**
- Tanks (T-*)
- Container (C-*)
- IBC (IBC-*)
- Fässer (Fass-*)

**Sortierungs-Logik:**
1. **Priorität**: Gebinde mit exakt passender Menge (± 5% Toleranz)
2. **Priorität**: Gebinde die alleine ausreichen (chargenreine Entnahme)
3. **Priorität**: Kleinste Gebinde zuerst (komplettes Leeren bevorzugt)

**Beispiel:**
```
Benötigt: 150 L Oregano

Verfügbar:
- T-1536: 200 L (Tank)
- Fass-1: 80 L
- Fass-2: 75 L
- B-1: 50 L (GESPERRT - Ballon)
- Fl-1: 20 L (GESPERRT - Flasche)

Empfehlung:
✅ 1. T-1536: 150 L entnehmen (Rest: 50 L)
→ CHARGENREIN aus EINEM Tank!
```

### Produktionsplanungs-Anzeige

Die lila Karte zeigt:
- **Status-Übersicht**: Ziel-Menge, Tatsächlich möglich, Status (✓/✗)
- **Skalierungsfaktor**: Multiplikator vom Rezept zur Zielproduktion
- **Pro Komponente**:
  - Benötigte vs. Verfügbare Menge
  - Max. mögliche Produktionsmenge
  - **FIFO-Gebindeliste** mit:
    - Container-ID und Typ
    - Aktueller Füllstand
    - Zu entnehmende Menge (lila)
    - Verbleibende Menge
    - "✓ Komplett leeren" (blau hinterlegt)

---

## Changelog

### v1.2.4 (24.11.2025)
- ✅ Produktionsplanung mit Ziel-Produktionsmenge
- ✅ FIFO-Gebinde-Empfehlung (Ballons/Flaschen gesperrt)
- ✅ Chargenreine Entnahme bevorzugt
- ✅ Intelligente Sortierung (3 Prioritäten)

### v1.2.3 (23.11.2025)
- ✅ Konfigurierbare Schwellenwerte
- ✅ Tank-Aggregation korrigiert
- ✅ Deutsches Zahlenformat

---

**Weitere Fragen?** Siehe [REICHWEITENANALYSE_ANLEITUNG.md](REICHWEITENANALYSE_ANLEITUNG.md)
