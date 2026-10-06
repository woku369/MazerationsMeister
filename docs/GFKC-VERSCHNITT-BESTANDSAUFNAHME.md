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
2. **Ziel-ABV 53,5 % ist ein gelebter Richtwert, kein technisches Gate — Korrektur vom 27.09.2026.** Das Fachdokument (Abschnitt 9) hatte das ursprünglich als starre IFS-Regel dargestellt ("zielAlkohol sollte gesperrt/auf 53,5 % vorbelegt sein"). Der Nutzer hat das direkt richtiggestellt: **Jede neue Charge durchläuft ohnehin denselben Freigabeprozess**, unabhängig vom tatsächlich erreichten ABV. Weicht eine Charge ab (z.B. 55 % statt 53,5 %), ändert das **nichts** an der Freigabe — es bedeutet nur, dass der Lohnabfüller seine Dosierungsberechnung fürs Endprodukt neu machen muss. **Technische Konsequenz:** `zielAlkohol` bleibt frei editierbar, keine Sperre, keine Sonderwarnung bei Abweichung. Der tatsächlich erreichte ABV jeder Charge muss nur klar sichtbar/exportierbar sein (leistet `ergebnis.durchschnittAlkohol` bereits) — keine neue Funktion nötig.
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
3. ~~`zielAlkohol` für GFKC-Rezepturen auf 53,5 % vorbelegen/schützen~~ — **entfällt** (Abschnitt 7, Punkt 2, Korrektur 27.09.2026): `zielAlkohol` bleibt frei editierbar, nur der tatsächlich erreichte ABV muss sichtbar/exportierbar sein, damit der Lohnabfüller ggf. neu kalkulieren kann.
4. Eine LA-Bilanz analog zu Mazeration (Aufgabe 19) und Lohnbrand (Aufgabe 15): Summe LA der Komponenten vs. LA des fertigen GFKC — bei reinem Verschnitt (kein Destillieren) sollte die LA-Bilanz **ohne Verlust** aufgehen (Ausnahme: Verdünnung mit Wasser ändert die LA nicht, nur die Konzentration; Aufspriten addiert LA). Eine Kontrollrechnung hier wäre ein sinnvoller Korrektheits-Check.
5. Ein UI-Feld für Zieltank + Chargennummer beim "Produktionsmischung hergestellt"-Schritt (aktuell fehlt das komplett).
6. Migration der Datenzugriffsschicht von `app-auto-sync.ts`-Musters auf das aktuelle `fresh-main`-Muster (direkte localStorage-Keys + dediziertes `rezeptur-service.ts` analog zu `stock-service.ts`/`lohnbrand-service.ts`).
7. Anpassung der Alkoholkorrektur-Formel: `spritStaerke` aus echtem Lagerbestand statt hartcodiert 60.
8. Tranchenweiser Abgang des fertigen GFKC (Punkt 6 im fachlichen Ablauf) — das ist danach ein ganz normaler `StockService.applyTransaction('Abgang', ...)`-Aufruf auf den neu angelegten GFKC-Posten, braucht keine neue Logik.
9. Sorgfältige Namensgebung im Schema, damit "GFKC-M" (Chargenbezeichnung) und "M" (Produkt-Code Mazerat) nicht kollidieren (Abschnitt 7, Punkt 3).

---

## Nächste Schritte

- [x] Nutzer bringt ergänzende Informationen aus dem separaten Claude-Desktop-GFKC-Projekt mit — `docs/GFKC-FACHKONTEXT-REZEPTUR-2026-09.md`, eingearbeitet in Abschnitt 7 oben
- [x] Buchungsfunktion entwerfen und implementieren, Menüpunkt in `fresh-main` integrieren — **umgesetzt als Aufgabe 17 (27.09.2026, "Gehen wirs an")**, siehe ROADMAP.md. Rest dieser Liste damit größtenteils historisch/überholt, nicht einzeln nachgezogen.
- [ ] Datenmodell final festlegen (Erweiterungen: `messmethode`, `reduktionsfaktor` je Komponente, Namenskonflikt GFKC-M/M auflösen) — offen, nicht Teil von Aufgabe 17
- [ ] Neue Rechenfunktion fix/reduzierbar + wachsende Gesamtmenge (GFKC-O-Spezialfall) — offen
- [ ] `zielAlkohol` bleibt bewusst frei editierbar (siehe Abschnitt 7, Punkt 2 oben) — kein Schutz/Sperre vorgesehen, erledigt sich von selbst

---

## 8. Echter Herstellungsablauf (Nutzer-Beschreibung 06.10.2026, erster Praxistest mit Aufgabe 17)

Nach dem ersten echten Arbeiten mit dem seit Aufgabe 17 bestehenden Rezepturen(GFKC)-Modul hat der Nutzer den tatsächlichen, zweistufigen Herstellungsablauf beschrieben — das war vorher nirgends explizit festgehalten, nur implizit im Datenmodell (`basisMenge`/`produktionsMenge`, Status-Kette, `vorgaengerRezepturId`) vorweggenommen.

### Stufe 1 — Testansatz (Litermaßstab, ca. 1 L, nicht bindend)
1. GFKC der letzten Charge vorlegen (ca. 30 % der Zielmenge)
2. Mazerate + Destillate aus dem Bestand zugeben
3. Sensorische Prüfung
4. Bei Bedarf: Komponenten nachjustieren, zurück zu Schritt 2 (iterativ)
5. ABV auf Zielwert einstellen (~53,5 % — gelebter Richtwert, siehe Abschnitt 7 Punkt 2, keine harte Vorgabe)
6. Testansatz freigeben

### Stufe 2 — Scale-up
7. **Eckdaten klären, die die maximale Produktionsmenge begrenzen:** Restmenge des alten GFKC, Restmengen der im Testansatz verwendeten Mazerate/Destillate, Kapazität des für die Ausmischung vorgesehenen Tanks
8. Gleiches Verhältnis wie im Testansatz hochskalieren: GFKC alt vorlegen, Mazerate, Destillate, Wasser/Sprit auf End-ABV zugeben
9. Sensorische Prüfung, Vergleich mit dem Testansatz-Ergebnis, bei Bedarf Nachbesserung
10. Freigabe der Produktionscharge

**Wiederkehrendes Prinzip, jährlich:** Keine fixen, verbindlichen Rezepturen — die sensorischen Eigenschaften der Mazerate ändern sich jährlich. Jede neue Ausmischung geht vom Ergebnis des Vorjahres aus und versucht, möglichst nahe heranzukommen. Mühsame Tüftelei, kein mechanischer Vorgang.

### Konkrete Lücke zwischen Code und diesem Ablauf

`skaliereRezeptur()` (`src/lib/rezeptur-manager.ts:84`) verlangt heute eine bereits feststehende `produktionsMenge` als Eingabe, skaliert alle Komponenten stur linear mit diesem Faktor hoch und prüft **danach** erst, ob jede Komponente in ausreichender Menge vorhanden ist (`fehlendeKomponenten`). Der echte Ablauf braucht es umgekehrt: Die **maximal mögliche** Produktionsmenge soll sich aus der knappsten verfügbaren Komponente **und** der Kapazität des gewählten Ausmisch-Tanks ergeben — nicht raten/vorgeben und dann scheitern. Zusätzlich fehlt jede Verknüpfung zwischen einem freigegebenen Testansatz (Stufe 1) und der daraus abgeleiteten Scale-up-Rezeptur (Stufe 2) — `skaliereRezeptur()` nimmt zwar eine bestehende Rezeptur als Ausgangspunkt, aber nichts in der UI führt den Nutzer aktuell durch „Testansatz freigeben → daraus Scale-up ableiten → gegen Testansatz-Sensorik vergleichen" als zusammenhängenden Vorgang.

**Noch offen, bewusst nicht sofort umgesetzt** (Nutzer erwartet weitere Ergänzungen, sobald er tiefer mit dem Modul arbeitet):
- ~~Wie die Verfügbarkeits-/Kapazitätsgrenze technisch berechnet wird~~ — **umgesetzt, siehe Abschnitt 9**
- Ob/wie `vorgaengerRezepturId` für den Jahresvergleich („vom Vorjahresergebnis ausgehen") tatsächlich genutzt werden soll, über die bisherige Varianten-Verwendung (A/B-Vergleich) hinaus
- ~~UI-Führung für den Übergang Testansatz → Scale-up als zusammenhängender, geführter Vorgang~~ — **umgesetzt, siehe Abschnitt 9**
- Eingabefelder für Kleinstmengen (siehe ROADMAP „GFKC: Ablauf für Kleinmengen-Testansätze" — Beispiel 0,02 L Korrekturzugabe), eng verwandt, aber eigener Teilaspekt — **weiterhin offen**

---

## 9. Umsetzung Testansatz → Scale-up (Aufgabe 65, 06.10.2026)

Setzt direkt auf Abschnitt 8 auf — Nutzer-Entscheidung: "Dann beginnen wir einfach mit der Umsetzung des Projekts." Umgesetzt in `src/lib/rezeptur-manager.ts` und `src/components/rezeptur-editor.tsx`, ohne Schema-Änderung (alle nötigen Felder waren bereits vorhanden).

**Neue Funktionen (`rezeptur-manager.ts`):**
- `berechneMaxProduktionsmenge(rezeptur, tankKapazitaet)`: ermittelt die maximal mögliche Produktionsmenge aus der knappsten Komponente (Faktor `verfuegbareMenge / mengeInLiter`, kleinster Wert gewinnt) **und** der Tankkapazität — meldet zusätzlich, welche der beiden Grenzen tatsächlich greift (`limitierendeKomponente` vs. `limitiertDurchTank`). Freie Zutaten (Wasser) werden bei der Begrenzung ignoriert.
- `erstelleScaleUp(testansatz, produktionsMenge, inventoryItems)`: leitet aus einem freigegebenen Testansatz eine neue Rezeptur ab (Komponentenverhältnis übernommen, auf `produktionsMenge` skaliert über das bestehende `skaliereRezeptur()`), verknüpft über `vorgaengerRezepturId`, startet wieder bei `status: 'entwurf'` — die Scale-up-Charge durchläuft denselben Sensorik-/Freigabeprozess wie der Testansatz, nur in Produktionsmenge. Eigene, leere `sensorikBewertungen` (keine Übernahme vom Testansatz), `alkoholKorrektur` wird zurückgesetzt (muss für die Produktionscharge neu gemessen werden).
- `berechneRezeptur()` erweitert: hält `mengeFuerProduktion` automatisch synchron, falls nach dem Scale-up noch eine Komponente nachjustiert wird (echter Ablauf, Stufe 2, Schritt 9: "eventuell Nachbesserung") — ohne diese Ergänzung wäre die Produktionsmenge nach einer Nachbesserung veraltet stehen geblieben. Die Verfügbarkeitsprüfung gegen den echten Lagerbestand bleibt `skaliereRezeptur()` vorbehalten (braucht frische Inventory-Daten); `produziereRezeptur()` prüft das Lager beim tatsächlichen Buchen ohnehin nochmal verbindlich, das hier betrifft nur die Anzeige.

**UI (`rezeptur-editor.tsx`):**
- Neuer Button „Scale-up ableiten" (sichtbar ab `status: 'freigegeben'`) öffnet einen Dialog: Tank wählen → zeigt die berechnete Maximalmenge inkl. limitierendem Faktor im Klartext → Produktionsmenge eingeben (vorbelegbar mit der Maximalmenge) → legt die neue Rezeptur an und navigiert direkt in deren Editor.
- Jede Komponentenzeile zeigt jetzt zusätzlich „→ X L für Produktion", sobald eine Produktionsmenge gesetzt ist — vorher stand nur die kleine Testansatz-Menge da, ohne jeden Hinweis auf die tatsächlich zu entnehmende Produktionsmenge (im Review vor dem ersten Commit aufgefallen, siehe Testprotokoll unten).
- Neue Karte „Vergleich mit Testansatz" erscheint in einer Scale-up-Rezeptur (sobald `vorgaengerRezepturId` gesetzt ist): zeigt Ergebnis und Sensorik-Bewertungen der verlinkten Ursprungsrezeptur zur direkten Gegenprobe, mit Link zum Öffnen.

**Verifikation:**
- 5 neue Vitest-Tests (`berechneMaxProduktionsmenge`: Komponenten-Limit, Tank-Limit, freie Zutat ignoriert; `erstelleScaleUp`: korrekte Skalierung + Verknüpfung; Nachbesserungs-Sync) — 157/157 Tests grün, `tsc --noEmit` sauber.
- **Vollständiger Browser-Durchlauf mit Playwright** (nach der Lehre aus Aufgabe 63/64 — Unit-Tests allein hätten eine tote UI-Verdrahtung nicht gefunden): simulierter Testansatz mit 3 Komponenten (GFKC-M alt 0,3L/50L verfügbar, Mazerat 0,5L/40L verfügbar, Destillat 0,2L/100L verfügbar) und einem 300L-Tank, Status auf „Freigegeben" gesetzt, „Scale-up ableiten" geklickt. Ergebnis: korrekt mit 80L als Maximalmenge berechnet (limitiert durch die Mazerat-Komponente, nicht den Tank), neue Rezeptur mit eigener ID angelegt und verknüpft, „Vergleich mit Testansatz"-Karte erscheint, Komponentenzeilen zeigen korrekt 24L/40L/16L für Produktion (0,3/0,5/0,2 × Faktor 80). Dabei im ersten Durchlauf **die oben genannte Lücke gefunden und sofort behoben**, dass `mengeFuerProduktion` nirgends angezeigt wurde — ohne den Browsertest wäre das unbemerkt geblieben.

**Bewusst nicht in dieser Runde umgesetzt** (siehe weiterhin offene Punkte oben): Jahresvergleich über `vorgaengerRezepturId` hinaus (z.B. automatischer Verweis "letztes Jahr: X% vol"), Kleinstmengen-Eingabefelder.
