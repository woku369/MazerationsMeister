# GFKC-Verschnitt — Bestandsaufnahme vor der Umsetzung

**Zweck:** Vollständige Dokumentation dessen, was zum Thema "GFKC ausmischen und buchen" bereits existiert (Code auf Branch `pages-clean` + fachlicher Kontext aus dem Gespräch), als Ausgangsbasis für die geplante Umsetzung. **Umsetzung ist bewusst zurückgestellt** — der Nutzer bringt noch ergänzende Informationen aus einem separaten Claude-Desktop-Projekt zum Thema GFKC mit, danach wird zusammengeführt und final entworfen.

---

## Fachlicher Ablauf (aus dem Gespräch, 26.09.2026)

1. **Keine fixe Rezeptur** — nur eine grobe Näherung als Ausgangspunkt.
2. Wird ausgemischt (mehrere Lagerposten/Komponenten zusammengeführt).
3. **Danach mit Einzelkomponenten nachjustiert** — die Mischung wird nach Geschmack/Bedarf verändert (nicht nur Alkoholkorrektur, auch Anteile einzelner Zutaten).
4. **Am Ende wird der ABV eingestellt** — auf Zielkonzentration korrigiert (verdünnen oder aufspriten).
5. **Erst danach kann gebucht werden** — Komponenten abbuchen, fertiges GFKC einbuchen.
6. GFKC wird gelagert und verlässt **tranchenweise** das Haus (Abgang, kommt nicht zurück) — buchungs- und zollrelevant.
7. Es gibt ein **separates Claude-Desktop-Projekt** zu GFKC — der Nutzer bringt daraus noch ergänzende Informationen mit, bevor final entworfen wird.

---

## Was auf Branch `pages-clean` bereits existiert (Code-Fundstellen)

**Wichtig:** Das ist derselbe Repo (`MazerationsMeister`), nur ein anderer, seit langem divergierter Branch ohne gemeinsamen Vorfahren mit `fresh-main` (siehe frühere Analyse in diesem Dokument-Set) — kein separates Projekt. Das erklärte die anfängliche Verwirrung.

### 1. Datenmodell: `src/schemas/rezepturSchema.ts`

Vollständiges, gut durchdachtes Schema:

```typescript
RezepturKomponenteSchema:
  - produktId, produktName (Referenz auf StoredInventoryItem, oder 'FREITEXT')
  - istFreieZutat / freitextZutat (für Wasser, Zucker etc. ohne Lagerbezug)
  - eingabeTyp: 'liter' | 'prozent' — Komponente wird flexibel in L ODER % eingegeben
  - eingabeWert, alkoholgehalt, alkoholgehaltManuell, verfuegbareMenge, tankNr
  - mengeInLiter, anteilProzent, literAlkohol (berechnet)
  - mengeFuerProduktion (hochskaliert), istVerfuegbar

RezepturSchema:
  - name, zielProduktName (z.B. "GFKC"), variantenName (z.B. "Variante A - mehr Zitrone")
  - basisMenge (Testmenge, z.B. 1L), produktionsMenge (z.B. 500L)
  - komponenten: RezepturKomponente[]
  - ergebnis: { gesamtMengeLiter, durchschnittAlkohol (gewichtet!), gesamtLiterAlkohol,
               komponentenVerfuegbar, fehlendeKomponenten[], empfohlenerTank }
  - alkoholKorrektur: { gemessenerAlkohol, zielAlkohol, wasserZugabe, spritZugabe,
                        korrekturBerechnet, korrekturDurchgefuehrt }
  - sensorikBewertungen: SensorikBewertung[] (Geruch/Geschmack/Nachgeschmack/Gesamteindruck 1-10,
                                                freigegeben-Flag)
  - status: 'entwurf' → 'test' → 'freigegeben' → 'produziert' → 'archiviert'
  - produktionsDaten: { produziertAm, produzierteMenge, zielTankNr, chargenNummer, notizen }
    ⚠️ Existiert nur im Typ — wird von keiner UI-Stelle je befüllt (siehe unten)
  - version, vorgaengerRezepturId (Versionierung von Varianten)
```

### 2. Berechnungslogik: `src/lib/rezeptur-manager.ts` (321 Zeilen)

Reine, saubere Funktionen — kein React, gut testbar:

- `berechneKomponente()` — konvertiert L↔%, berechnet LA je Komponente (`literAlkohol = mengeInLiter × alkoholgehalt/100`), prüft Verfügbarkeit
- `berechneRezeptur()` — summiert alle Komponenten, berechnet **gewichteten** Durchschnitts-ABV: `durchschnittAlkohol = gesamtLA / gesamtMenge × 100`
- `skaliereRezeptur(rezeptur, produktionsMenge, inventoryItems)` — skaliert von Testmenge (z.B. 1L) auf Produktionsmenge (z.B. 500L), prüft Verfügbarkeit gegen echten Lagerbestand
- `validiereRezeptur()` — prüft Komponentensumme gegen Basismenge (1% Toleranz), gültige Werte
- `erstelleNeueRezeptur()`, `fuegeKomponenteHinzu()`, `entferneKomponente()`, `aktualisiereKomponente()` — CRUD, jede Änderung ruft automatisch `berechneRezeptur()` neu auf
- `erstelleVariante()` — kopiert Rezeptur als neue Version (für "Variante A/B" Vergleiche)
- `kannFreigebenWerden()` — Freigabe-Gate: braucht Status ≠ 'entwurf', mind. 1 positive Sensorik-Bewertung, valide Rezeptur

**❌ Was fehlt komplett:** Keine einzige Funktion, die tatsächlich bucht. Keine `produziereRezeptur()`, kein Aufruf von `StockService`/vergleichbarer Buchungslogik.

### 3. Alkoholkorrektur-Formel (aus `src/app/rezepturen/editor/page.tsx`, Zeilen ~950-965)

```typescript
const gemessen = alkoholKorrektur.gemessenerAlkohol;  // tatsächlich gemessener ABV nach Mischung
const ziel = alkoholKorrektur.zielAlkohol;             // gewünschter ABV
const aktuelleMenge = ergebnis.gesamtMengeLiter;

if (gemessen > ziel) {
  // Zu stark -> mit Wasser verdünnen
  wasserZugabe = (aktuelleMenge * gemessen / ziel) - aktuelleMenge;
} else if (gemessen < ziel) {
  // Zu schwach -> mit Sprit aufspriten
  const spritStaerke = 60; // ⚠️ hartcodiert, nicht aus Lagerbestand gelesen
  spritZugabe = (aktuelleMenge * (ziel - gemessen)) / (spritStaerke - ziel);
}
```

**Einschränkung:** `spritStaerke = 60` ist eine feste Zahl im Code, nicht aus dem tatsächlichen Lagerbestand des verwendeten Sprits gelesen. Bei der Umsetzung sollte das auf den echten `alcoholVolProzent` des ausgewählten Sprit-Postens umgestellt werden.

### 4. UI: `src/app/rezepturen/page.tsx` (226 Zeilen) + `src/app/rezepturen/editor/page.tsx` (1441 Zeilen)

- Listenseite: Suche, Status-Filter, "Neue Rezeptur" anlegen
- Editor: Komponenten hinzufügen/entfernen (aus Lagerbestand oder Freitext), Basismenge/Produktionsmenge, Alkoholkorrektur-Rechner (s.o.), Sensorik-Bewertungen erfassen, Status-Checkboxen (`entwurf`/`test`/`freigegeben`/`produziert`/`archiviert`)
- **Der "Produktionsmischung hergestellt"-Schalter ist eine reine Checkbox** (`status: 'produziert'`) — keine Eingabe für Zieltank, produzierte Menge oder Chargennummer an dieser Stelle, obwohl das Schema (`produktionsDaten`) genau dafür vorbereitet ist. Bestätigt per Code-Suche: `produktionsDaten`, `zielTankNr`, `chargenNummer` kommen im gesamten Editor **kein einziges Mal** vor (außer im Schema-Typ).

### 5. Persistenz: `src/lib/app-auto-sync.ts`

```typescript
export async function ladeRezepturen(): Promise<any[]> {
  const sync = getAppAutoSync();
  const data = await sync.getData();
  return data.rezepturen || [];
}
export async function speichereRezepturen(rezepturen: any[]): Promise<void> {
  const sync = getAppAutoSync();
  const data = await sync.getData();
  data.rezepturen = rezepturen;
  await sync.setData(data);
}
```

**Wichtig für die Portierung:** `pages-clean` nutzt eine zentrale `AppAutoSync`-Abstraktion (`getData()`/`setData()` über ein gemeinsames Datenobjekt), während `fresh-main` (aktueller Stand) pro Feature direkte `localStorage`-Keys + dedizierte Service-Dateien nutzt (`stock-service.ts`, `lohnbrand-service.ts`, `tank-sync.ts`). Eine reine Kopie des Codes funktioniert nicht 1:1 — die Datenzugriffsschicht muss auf das aktuelle Muster umgestellt werden.

### 6. Verwandtes Feature: Reichweitenanalyse (`src/lib/range-calculator.ts`, `src/app/reichweite/`)

Bereits in einer früheren Runde als **Planungs-/Prognose-Tool** eingeordnet (siehe `docs/REICHWEITENANALYSE_KONZEPT.md`, referenziert in ROADMAP.md Aufgabe 17). Nutzt `Rezeptur` mit einer Erweiterung `isRangeRelevant`/`rangeMetadata` (Jahresabsatz, Priorität). Enthält bereits eine fertige **FIFO-Gebinde-Empfehlungslogik** (`ContainerRecommendation`: welches Gebinde in welcher Reihenfolge entnehmen). Diese Logik ist wiederverwendbar für die Verschnitt-Buchung (welches Gebinde welcher Komponente tatsächlich angezapft wird), wurde aber bisher nur für die Prognose gebaut, nie für eine echte Buchung.

---

## 7. Ergänzung durch Fachkontext-Dokument (`docs/GFKC-FACHKONTEXT-REZEPTUR-2026-09.md`, 26.09.2026)

Der Nutzer hat ein ausführliches Fachdokument aus einem separaten Claude-Desktop-Projekt ("GFKC") nachgeliefert. Es bestätigt und erweitert die hier dokumentierte Code-Lücke um wesentliche fachliche Anforderungen, die beim Entwurf der Buchungsfunktion berücksichtigt werden müssen:

1. **Die bestehende `alkoholKorrektur` reicht für GFKC-O nicht aus.** Sie kennt nur "Wasser ODER Sprit bei fester Gesamtmenge". Der reale Fall (GFKC-O) braucht eine **zusätzliche, neue** Rechenfunktion: Komponenten in "fix" (Reduktionsfaktor immer 1) und "reduzierbar" (Reduktionsfaktor stufenlos 0–1, nicht nur an/aus) aufteilen, daraus eine **wachsende** Gesamtmenge ableiten (Fachdokument Abschnitt 6+8.3) — kein Sonderfall der bestehenden Funktion.
2. **Ziel-ABV 53,5 % ist eine IFS-Geschäftsregel, keine Rezeptur-Feinheit** (Fachdokument Abschnitt 9): Abweichung löst ein Zertifizierungsverfahren am Endprodukt aus. `zielAlkohol` sollte für GFKC-Rezepturen vorbelegt/geschützt sein, nicht frei editierbar wie aktuell im Schema.
3. **Namenskollision im Datenmodell:** "GFKC-M" (Chargenbezeichnung/Buchungskonvention) vs. "M" (Produkt-Code für Mazerat) — bei Feldern wie `chargeId`/`sorte` müssen diese beiden Bedeutungen sauber getrennt bleiben.
4. **Zwei Verdünnungsvarianten** je nachdem ob Zielvolumen oder Konzentratmenge fix ist (Fachdokument 8.4, Variante A/B) — GFKC-O braucht Variante B (Konzentrat fix, Gesamtmenge wächst mit).
5. **Messmethodik im Wandel:** Spindel (bisher) → Alex 501 (ab 2026, Anton Paar, direkte ABV-/Dichtebestimmung, Messbereich nur bis 41 % vol). `alkoholgehalt` je Komponente sollte perspektivisch ein `messmethode`-Feld (`spindel`/`alex501`/`probedestillation`) vertragen.
6. **Kumulierte-ABV-Live-Anzeige** (Fachdokument 8.5) als sinnvolle Zusatzfunktion beim schrittweisen Befüllen — dieselbe Formel wie `durchschnittAlkohol`, nur laufend pro hinzugefügter Komponente statt einmalig am Ende.
7. Enthält zusätzlich die vollständige Referenz-Grundrezeptur "GFKC-M" (Charge 13.03.2025, 15 Komponenten mit LA/ABV) als konkretes Testdaten-Beispiel für die spätere Implementierung, sowie Methodik-Learnings zur Rekonstruktion historischer Chargen aus Bestandslisten-Snapshots (für spätere Nachbuchungen relevant, nicht für die laufende Buchungsfunktion selbst).

**Offene, im Fachdokument selbst als unverifiziert markierte Werte** (bei der Umsetzung als Kommentarfeld/Warnung sichtbar halten, nicht als gesicherte Werte einbauen): Zielverschnitt-Verhältnis 0,65:0,35, Reduktionsfaktor 50 % für Thymian/Oregano/Salbei, ABV-Richtwerte 53 %/78 % für vier nicht rekonstruierbare historische Chargen.

---

## Zusammengefasste Lücke (das eigentliche Ziel der Umsetzung)

Die gesamte **Planungsseite** (Rezeptur komponieren, Verfügbarkeit prüfen, skalieren, Alkoholkorrektur berechnen, Sensorik freigeben) ist bereits gut gebaut. Es fehlt die **Ausführungsseite** sowie eine fachlich vollständigere Rechenlogik für den GFKC-O-Fall:

1. Eine Funktion, die beim Übergang zu `status: 'produziert'` tatsächlich:
   - für jede nicht-freie Komponente einen Abgang bucht (Menge = `mengeFuerProduktion`, gegen `produktId`/Inventory-Item)
   - berücksichtigt, falls Alkoholkorrektur durchgeführt wurde (Wasser hat keinen Lagerbezug, aber Sprit-Zugabe muss ebenfalls als Abgang von einem echten Sprit-Posten gebucht werden — das fehlt in der aktuellen Korrektur-UI komplett, dort wird nur eine Menge berechnet, nicht gebucht)
   - einen neuen Lagerposten für das fertige GFKC anlegt (Zugang), mit `produzierteMenge`, korrigiertem `zielAlkohol`, im ausgewählten `zielTankNr`
   - `produktionsDaten` tatsächlich befüllt (aktuell nur toter Schema-Typ)
2. Eine **neue** Rechenfunktion für fixe/reduzierbare Komponentengruppen mit abgeleiteter, wachsender Gesamtmenge (siehe Punkt 1 in Abschnitt 7 oben) — zusätzlich zur bestehenden `alkoholKorrektur`, kein Ersatz dafür.
3. `zielAlkohol` für GFKC-Rezepturen aus Geschäftsgründen (IFS) auf 53,5 % vorbelegen/schützen (Abschnitt 7, Punkt 2).
4. Eine LA-Bilanz analog zu Mazeration (Aufgabe 19) und Lohnbrand (Aufgabe 15): Summe LA der Komponenten vs. LA des fertigen GFKC — bei reinem Verschnitt (kein Destillieren) sollte die LA-Bilanz **ohne Verlust** aufgehen (Ausnahme: Verdünnung mit Wasser ändert die LA nicht, nur die Konzentration; Aufspriten addiert LA). Eine Kontrollrechnung hier wäre ein sinnvoller Korrektheits-Check.
5. Ein UI-Feld für Zieltank + Chargennummer beim "Produktionsmischung hergestellt"-Schritt (aktuell fehlt das komplett).
6. Migration der Datenzugriffsschicht von `app-auto-sync.ts`-Musters auf das aktuelle `fresh-main`-Muster (direkte localStorage-Keys + dediziertes `rezeptur-service.ts` analog zu `stock-service.ts`/`lohnbrand-service.ts`).
7. Anpassung der Alkoholkorrektur-Formel: `spritStaerke` aus echtem Lagerbestand statt hartcodiert 60.
8. Tranchenweiser Abgang des fertigen GFKC (Punkt 6 im fachlichen Ablauf) — das ist danach ein ganz normaler `StockService.applyTransaction('Abgang', ...)`-Aufruf auf den neu angelegten GFKC-Posten, braucht keine neue Logik.
9. Sorgfältige Namensgebung im Schema, damit "GFKC-M" (Chargenbezeichnung) und "M" (Produkt-Code Mazerat) nicht kollidieren (Abschnitt 7, Punkt 3).

---

## Nächste Schritte

- [x] Nutzer bringt ergänzende Informationen aus dem separaten Claude-Desktop-GFKC-Projekt mit — `docs/GFKC-FACHKONTEXT-REZEPTUR-2026-09.md`, eingearbeitet in Abschnitt 7 oben
- [ ] Datenmodell final festlegen (Übernahme von `rezepturSchema.ts` weitgehend wie vorhanden, plus Erweiterungen: `messmethode`, `reduktionsfaktor` je Komponente, Namenskonflikt GFKC-M/M auflösen)
- [ ] Neue Rechenfunktion fix/reduzierbar + wachsende Gesamtmenge entwerfen (Kern-Ergänzung zu `rezeptur-manager.ts`)
- [ ] Buchungsfunktion entwerfen und implementieren (Kernaufgabe, siehe Lücke oben)
- [ ] UI portieren und an aktuelles Datenzugriffsmuster anpassen, `zielAlkohol` für GFKC auf 53,5 % schützen
- [ ] Menüpunkt "GFKC-Ausmischung" final in `fresh-main` integrieren

**Nicht sofort — Start geplant für die Woche ab 29.09.2026 (laut Nutzer).**
