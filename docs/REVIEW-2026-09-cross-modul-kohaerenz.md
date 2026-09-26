# MazerationsMeister — Cross-Modul-Kohärenz-Audit

**Kontext:** Nach Abschluss der Lagerbestand/Buchungslogik-Review (`docs/REVIEW-2026-09-lagerbestand-buchungslogik.md`, alle 9 Aufgaben verifiziert erledigt) wurde ein zweiter, breiterer Check angefordert: Logik und Zusammenhang der drei Kernmodule — Mazeration (Klein-/Großmengen), Lagerbestandsverwaltung (Import/Export, Zugang/Abgang, LA), Tankverwaltung (Visualisierung, Ein-/Ausgang, Lohnbrenner).

Alle Befunde sind mit Datei:Zeile belegt, durch tatsächliches Lesen des Codes verifiziert (nicht nur grep).

---

## TEIL A — Mazeration: Klein- vs. Großmengen

**A1. Kein eigenständiges Konzept.** "Kleinmenge"/"Großmenge" existiert an keiner Stelle als Schema-Feld, Enum oder Branch-Name (repo-weiter Check: 0 Treffer). Die Unterscheidung ist rein implizit über `plantWeightUnit: 'g'|'kg'` (`src/schemas/mazerationSchema.ts:50`).

**A2. Desktop: Einheiten sind zwangsgekoppelt, kein eigenes UI-Feld.** `alcoholVolumeUnit` hat im Desktop-Formular kein Auswahlelement — die Einheit wird automatisch erzwungen:
```ts
// src/hooks/use-calculated-form-values.ts:103-107
if (plantWeightUnit === 'kg') { if (...alcoholVolumeUnit === 'ml') form.setValue('alcoholVolumeUnit', 'l', ...); }
else { if (...alcoholVolumeUnit === 'l') form.setValue('alcoholVolumeUnit', 'ml', ...); }
```
`plantWeightUnit` ist der einzige "Master-Schalter". Die Ausbeute-Einheit ist zudem kein gespeichertes Feld, sondern wird bei jeder Anzeige aus `plantWeightUnit` neu abgeleitet (`getDerivedUnitsForProtocol`, `src/lib/mazeration-form-helpers.ts:13-16`) — `MazerationFormData` hat kein `yieldVolumeUnit`-Feld (siehe D4, aktiver Bug).

**A3. PWA verhält sich fundamental anders: drei unabhängige Einheiten-Schalter.** `public/mazeration-pwa.html:642-661` — `setWeightUnit()`, `setVolUnit()`, `setYieldUnit()` sind unabhängig, keine Kopplung. Ein PWA-Nutzer kann z.B. g+l+ml frei kombinieren, eine Kombination, die Desktop nie zulässt. Die PWA persistiert `yieldVolumeUnit` explizit als eigenes Feld — Desktop nicht.

**A4. Kein Mengen-Schwellwert.** Paletten-Sektion ist rein manuell sichtbar bei `plantWeightUnit==='kg'`, keine automatische Umschaltung ab einer bestimmten Menge (`mazeration-form.tsx:735-874`, `mazeration-calc.ts:29-53`).

**A5. Formeln selbst sind korrekt/skaleninvariant.** `calculateRatioDetails`, `calculateLADetails` rechnen konsequent über `toVolumeLiters()` um — kein Rundungs-/Einheitenfehler in der Formel selbst gefunden. Das Problem liegt in der Weiterverarbeitung (siehe D4).

---

## TEIL B — Lagerbestandsverwaltung: Import/Export, Zugang/Abgang, LA

**B1. XLSX-Import: `tankNr` ungeprüft, erzeugt Phantom-Tanks.**
```ts
// inventory-management.tsx:249
tankNr: (getByField('tankNr') || '') + ''  // kein Abgleich mit tankDefinitions
```
Direkt danach: `syncTankDefinitionsWithInventory()` (`tank-sync.ts:8-57`) legt für jede unbekannte `tankNr` automatisch einen neuen Tank an (`bezeichnung: "Auto-erkannt: ${tankNr}"`, `volumenLiter: 5000` Standardgröße, Zeile 39-44). Ein Tippfehler im Import erzeugt so einen falschen 5000-L-Tank statt einer Fehlermeldung. Gleiches passiert nach jedem manuellen Add/Edit (`inventory-management.tsx:519`).

**B2. `StockService` prüft `tankNr` nicht.** `stock-service.ts:30-46` (`applyTransaction`) ändert nur `currentQuantityLiters`/`lastInventoryDate`, keine Existenzprüfung gegen `TankDefinition`.

**B3. 🔴 LA wird bei keiner Buchung neu berechnet — aktiver Bug.** `stock-service.ts` (alle Funktionen: `addEntry`, `updateEntry`, `applyTransaction`, `persistAddEntry`) schreibt nie auf `literAbsolutalkohol`/`alcoholVolProzent`. Der Add/Edit-Dialog tut es ebenfalls nicht (`inventory-management.tsx:480-524`, `add-inventory-item-dialog.tsx:87-116`). Sobald ein Artikel einmal einen `literAbsolutalkohol`-Wert hat (aus dem Import), bleibt dieser eingefroren, während `currentQuantityLiters` durch jede weitere Buchung verändert wird — LA und Menge laufen auseinander.

**B4. 🔴 Drei unterschiedliche LA-Auswertungsstrategien koexistieren:**
- `inventory-table.tsx:247-249`: bevorzugt gespeicherten Wert, Fallback auf `calcLA` nur bei `null`/`undefined` → zeigt veraltete Werte dauerhaft
- `inventory-summary.tsx:47`, `generateSummaryXlsx` (`inventory-management.tsx:349`): ignoriert gespeicherten Wert, rechnet immer live neu
- Export "Aktuellen Lagerbestand" (`inventory-management.tsx:849-861`): schreibt rohen `item.literAbsolutalkohol` ohne jeden Fallback — kann leer/veraltet sein

**Konsequenz:** Für denselben Artikel zum selben Zeitpunkt liefern UI-Tabelle, Summary-Export und Rohbestand-Export drei unterschiedliche LA-Zahlen.

---

## TEIL C — Tankverwaltung: Visualisierung, Ein-/Ausgang, Lohnbrenner

**C1. Lohnbrenner-Konzept: vollständige Lücke.** Repo-weiter Check (`lohnbrenner|lohnbrand|toll.?dist|fremdbrenn|extern.*brenn`): 0 Treffer. `TankDefinition` (`tankSchema.ts:1-6`) hat kein Statusfeld; `StoredInventoryItem` (`inventorySchema.ts:49-63`) ebenfalls keines außer freien Strings (`tankNr`/`category`/`kennzeichen`). Dieser reale Workflow (Gebinde geht zum Fremdbrenner, kommt zurück) ist im Datenmodell nicht vorgesehen — eine Lücke, kein Bug.

**C2. Desktop-Komponenten sind untereinander konsistent mit dem neuen Unique-tankNr-Modell.** `tank-management.tsx:385-387` (`getTankFillLevel`) und `tank-content-manager.tsx:58-90` filtern beide sauber nach `item.tankNr === tank.tankNr` — kein Problem gefunden, die kürzlich durchgeführte Tank-ID-Migration (Aufgabe 4) wurde hier korrekt nachgezogen.

**C3. 🔴 `tank-viewer.html?view=all` ist für ALLE Tanks funktionslos — Regression, die durch die Migration entstand.**
```js
// tank-viewer.html:484
const isUniq = t.hasUniqueNumber === true;
```
`hasUniqueNumber` wird **nirgendwo** in `*.ts/*.tsx` gesetzt oder in den Sync-Export übernommen (`github-service.ts:279-282` kopiert nur id/tankNr/bezeichnung/volumenLiter). `isUniq` ist daher für **jeden** Tank immer `false` — auch für die großen nummerierten Tanks (T341 etc.). Alle Tanks fallen in den "Grouped containers"-Zweig (`tank-viewer.html:505-522`), der `fill = t.volumenLiter` setzt — **zeigt die Kapazität als Füllstand an** — und Felder liest (`currentContent`, `alcoholVolProzent`, `status`), die auf `TankDefinition` nie existieren. Einschränkend: Keine Desktop-Komponente erzeugt aktuell einen `?view=all`-Link (QR-Codes nutzen nur `?tank=...`), die Seite ist aber über direkte URL weiterhin erreichbar und liefert dann falsche Werte.

**C4. Zeitstempel-Feldnamen-Bug.** `tank-viewer.html:366,375,470` und `tank-offline.html:238` lesen `data.lastExport`; `github-service.ts:284-288` schreibt aber `lastUpdated`. `lastExport` ist daher immer `undefined`, Fallback `new Date().toISOString()` greift — Anzeige zeigt immer "gerade eben"/"Online", unabhängig vom tatsächlichen Sync-Alter.

**C5. Physische Gebinde-Bewegung ist ausschließlich als Mengenbuchung modelliert.** `applyTransaction` kennt nur `Zugang`/`Abgang` mit Mengendelta, kein strukturiertes Feld für "dieses Fass hat das Haus verlassen". Ein Transfer zum Lohnbrenner und zurück wäre nur über zwei unabhängige Buchungen abbildbar — die Information "dasselbe Fass war unterwegs" geht verloren.

---

## TEIL D — Cross-Modul-Datenfluss

**D1. `targetTankNr` (Mazeration→Lager) ist reines Freitextfeld ohne Validierung.** `mazeration-form.tsx:1274-1289`: einfaches `<Input type="text">`, kein Dropdown, keine Bindung an `getTankDefinitions()`. Schema: `targetTankNr: z.string().optional()`. Der Bestätigungsdialog prüft nichts nach. Ein Mazerat kann klaglos in einen nicht existierenden Tank eingebucht werden; der Phantom-Tank entsteht erst beim nächsten `syncTankDefinitionsWithInventory()`-Lauf (der nur aus `inventory-management.tsx` ausgelöst wird, nicht aus dem Mazerationsformular selbst) — in der Zwischenzeit zeigen `tank-management.tsx` und `tank-content-manager.tsx` unterschiedliche Zwischenzustände für denselben Buchungsvorgang.

**D2. Sync-Snapshot vs. Live-Daten: erwartbare Divergenz, durch C4 verschleiert.** `tank-viewer.html` liest ausschließlich `tank-data.json`, nie live `localStorage`. Jede frische Buchung ist bis zum nächsten `TankAutoSync`-Tick unsichtbar — an sich normal, aber durch den Zeitstempel-Bug (C4) für den Nutzer nicht erkennbar.

**D3. Terminologie "Ausbeute": keine Kollision zwischen Modulen, aber Framing-Drift innerhalb Mazeration.** "Ausbeute" kommt in Lager-/Tankmodulen gar nicht vor. Innerhalb der Mazeration: Desktop zeigt nur "Verlust (%)" / "Verlust (absolut)", keine positive Ausbeute-%-Kennzahl. Die PWA zeigt zusätzlich "📊 Ausbeute: X %" — rechnerisch das Komplement zu Desktops Verlust-%, aber positiv statt negativ benannt und im Desktop gar nicht vorhanden.

**D4. 🔴 Aktiver Bug: `yieldVolumeUnit` fehlt im Desktop-Schema, wird von Sammelliste/PWA aber vorausgesetzt.**
- `sammelliste/page.tsx:26,33-42,97-98,116-118,239-241` liest `Protocol.yieldVolumeUnit`, Default `'l'` wenn `undefined`
- `MazerationFormData`/`mazerationFormSchema` (vollständig geprüft) hat **kein** `yieldVolumeUnit`-Feld
- `onSubmit` (`mazeration-form.tsx:226`) fügt es auch nicht nachträglich hinzu — landet unverändert in `localStorage['mazerationProtocols']`
- **Folge:** Bei einem Desktop-Kleinmengen-Protokoll (`plantWeightUnit='g'` → Ausbeute wird laut `getDerivedUnitsForProtocol` in **ml** erfasst) ist `yieldVolumeUnit` in der Sammelliste `undefined` → Default `'l'` greift → der ml-Zahlenwert wird fälschlich als Liter behandelt. **"Mazerat (L)" und "LA Ausbeute" werden für jedes Kleinmengen-Protokoll in Sammelliste (Tabelle UND XLSX-Export) um Faktor 1000 verfälscht.**
- Nur PWA-importierte Protokolle sind nicht betroffen (bringen eigenes `yieldVolumeUnit` mit) — aber der Import selbst mappt ungeprüft (siehe D5), sodass ein localStorage-Schlüssel zwei inkompatible Objektformen enthält.

**D5. 🔴 Aktiver Bug: PWA-Import bricht den kumulativen XLSX-Export.**
`generateCumulativeXlsx` (`mazeration-xlsx.ts:172`, Zeile 218-219) iteriert `protocols` und greift ungeprüft auf `allCalculatedValues[index]` zu. `handleImportFromGitHub` (`mazeration-form.tsx:327-397`) erweitert nur `loggedProtocols` (Zeile 383), ruft aber **nie** `setAllLoggedCalculatedValues` auf. Nach einem PWA-Import ist `loggedProtocols.length > allLoggedCalculatedValues.length` — der nächste reguläre Export liefert für die importierten (und alle folgenden) Indizes `undefined` und wirft eine TypeError. **Der kumulative Log-Export bricht danach komplett ab, bis die App neu geladen wird.**

**D6. Sekundäre Formdivergenz: `targetTanks`-Array (PWA) vs. `targetTankNr`-String (Desktop).** PWA unterstützt mehrere Zieltanks mit je eigenem Anfangs-/Endstand; Desktop-Schema kennt nur einen einzelnen String. Ein importiertes PWA-Protokoll behält sein `targetTanks`-Array als für Desktop unlesbare Zusatzdaten — die Tank-Zuordnung geht nach Import faktisch verloren.

---

## Zusammenfassung nach Schwere

| # | Befund | Typ | Ort |
|---|---|---|---|
| 1 | LA nie neu berechnet bei Buchung + 3 widersprüchliche Auswertungen | 🔴 aktiver Bug | `stock-service.ts`, `inventory-table.tsx`, `inventory-summary.tsx`, `inventory-management.tsx` |
| 2 | `?view=all` für alle Tanks funktionslos (Kapazität als Füllstand) | 🔴 aktiver Bug / Regression | `tank-viewer.html`, `github-service.ts` |
| 3 | Faktor-1000-Fehler in Sammelliste bei Kleinmengen (fehlendes `yieldVolumeUnit`) | 🔴 aktiver Bug | `mazerationSchema.ts`, `sammelliste/page.tsx` |
| 4 | Kumulativer XLSX-Export stürzt nach PWA-Import ab | 🔴 aktiver Bug | `mazeration-form.tsx`, `mazeration-xlsx.ts` |
| 5 | `targetTankNr`/`tankNr` ungebundene Freitextfelder → Phantom-Tanks | 🟠 Datenintegrität | `mazeration-form.tsx`, `inventory-management.tsx`, `tank-sync.ts` |
| 6 | Zeitstempel-Bug (`lastExport` vs. `lastUpdated`) | 🟠 irreführende Anzeige | `tank-viewer.html`, `tank-offline.html`, `github-service.ts` |
| 7 | Lohnbrenner-Workflow nicht modelliert | 🟡 fehlende Funktion | Datenmodell gesamt |
| 8 | Klein-/Großmenge: Desktop zwangsgekoppelt, PWA frei kombinierbar | 🟡 Inkonsistenz | `use-calculated-form-values.ts`, `mazeration-pwa.html` |
| 9 | Ausbeute-%-Framing: Desktop zeigt nur Verlust, PWA zeigt Ausbeute | 🟡 Terminologie-Drift | `mazeration-form-helpers.ts`, `mazeration-pwa.html` |
| 10 | `targetTanks`-Array (PWA) vs. `targetTankNr`-String (Desktop) | 🟡 Formdivergenz | Schema-Vergleich |

---

## Vorgeschlagene Aufgaben

### Aufgabe 10 — LA-Aktualisierung bei Buchung (höchste Priorität, Datenintegrität)
- `StockService.applyTransaction`/`addEntry`/`updateEntry` sollen `literAbsolutalkohol` bei jeder Mengenänderung konsistent aus `currentQuantityLiters × alcoholVolProzent / 100` (also über `calcLA`) neu berechnen und schreiben
- `inventory-table.tsx:247-249` danach auf reines `calcLA(...)`-Live-Rechnen umstellen (kein Fallback-Pattern mehr nötig, wenn der Wert immer aktuell ist) — oder zumindest die drei Stellen (Tabelle, Summary, Rohexport) auf dieselbe Quelle vereinheitlichen

### Aufgabe 11 — Sammelliste: `yieldVolumeUnit` im Desktop-Schema ergänzen (Faktor-1000-Bug)
- `mazerationFormSchema`/`MazerationFormData` um `yieldVolumeUnit` erweitern, in `onSubmit` aus `getDerivedUnitsForProtocol(plantWeightUnit)` befüllen
- Bestehende, bereits gespeicherte Protokolle ohne dieses Feld: beim Lesen in `sammelliste/page.tsx` weiterhin über `getDerivedUnitsForProtocol(plantWeightUnit)` ableiten statt hartem `'l'`-Default, als Rückwärtskompatibilität

### Aufgabe 12 — PWA-Import: `allLoggedCalculatedValues` synchron halten (Absturz-Fix)
- `handleImportFromGitHub` muss für jedes importierte Protokoll auch einen passenden `calculatedValues`-Eintrag berechnen/anhängen (z.B. über `useCalculatedFormValues`-Logik einmalig ausgeführt, oder eine vereinfachte Berechnung analog `calculateLADetails`/`calculateYieldAndLossDetails`), damit `loggedProtocols.length === allLoggedCalculatedValues.length` immer gilt
- Alternativ: `generateCumulativeXlsx` defensiv machen (Index-Check, Skip bei fehlendem `calculatedValues`-Eintrag statt Crash) als zusätzliches Sicherheitsnetz

### Aufgabe 13 — `tank-viewer.html?view=all` reparieren (hasUniqueNumber-Flag)
- `github-service.ts`s Sync-Export um `hasUniqueNumber` erweitern (aus `TankDefinition` übernehmen — dafür muss das Feld ggf. erst im Schema ergänzt werden, aktuell hat `TankDefinition` es laut `tankSchema.ts:1-6` gar nicht als offizielles Feld, nur `tank-viewer.html` erwartet es)
- Sinnvoller Ansatz: Unterscheidung anhand `volumenLiter`-Größenordnung oder eines neuen expliziten Schema-Felds treffen, dann konsistent durchziehen zu Export und Viewer
- `lastExport`/`lastUpdated`-Namensinkonsistenz beheben (einheitlich auf einen Feldnamen, empfohlen `lastUpdated` beibehalten und `tank-viewer.html`/`tank-offline.html` anpassen)

### Aufgabe 14 — Tank-Zuordnung validieren statt Freitext (Phantom-Tank-Vermeidung)
- `targetTankNr` in `mazeration-form.tsx` auf ein `<Select>` mit den echten `getTankDefinitions()`-Einträgen umstellen (Freitext-Fallback optional für neue Tanks, aber mit Bestätigungshinweis "neuer Tank wird angelegt")
- XLSX-Import: bei unbekannter `tankNr` eine Warnung/Bestätigung statt stiller Phantom-Tank-Erzeugung

### Aufgabe 15 — Lohnbrenner-Workflow (neue Funktion, kein Bugfix)
- Erfordert vorab eine fachliche Klärung: reicht ein einfacher Status auf `TankDefinition`/`StoredInventoryItem` (z.B. `standort: 'lager'|'lohnbrenner'|'unterwegs'`), oder wird ein eigenes Bewegungsprotokoll gebraucht (separate Tabelle mit Ausgangs-/Eingangsdatum, Gebinde-ID, Lohnbrenner-Name)?
- Erst nach dieser Entscheidung sinnvoll implementierbar — nicht blind loscoden

### Aufgabe 16 — Klein-/Großmengen-Konsistenz zwischen Desktop und PWA (niedrige Priorität)
- Entscheiden: soll die PWA die Desktop-Zwangskopplung der Einheiten übernehmen (Konsistenz) oder soll Desktop die PWA-Freiheit übernehmen (Flexibilität)? Aktuell ist es einfach unterschiedlich, ohne bewusste Entscheidung dahinter
