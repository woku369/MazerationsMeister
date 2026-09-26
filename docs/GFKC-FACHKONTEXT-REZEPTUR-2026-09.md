# GFKC — Fachkontext & Rezeptur-Rechenmethodik (aus Claude-Projekt "GFKC")

**Quelle:** Claude-Desktop-Projekt "GFKC" (Gurktaler Frischkräutercocktail, Alt vs. Neu), Gespräche vom 08.09.2026 und 26.09.2026.
**Zweck:** Dies ist die in `docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md` (Abschnitt "Nächste Schritte") angekündigte Ergänzung aus dem separaten Claude-Desktop-Projekt. Beide Dokumente zusammen sind die fachliche Grundlage für die geplante GFKC-Verschnitt-/Buchungsfunktion in `fresh-main`.
**Autor/Auftraggeber:** Wolfgang Kulmitzer, Kräuter-Meister, Gurktaler AG.

---

## 1. Produktkontext

GFKC ist kein eigenständiges Verkaufsprodukt, sondern das im Mazerationsraum Gurk hergestellte Vor-/Zwischenprodukt, das als geschmacksprägende Aromakomponente in die Gurktaler-Endprodukte eingemischt wird — das "Signaturprodukt" des Kräuter-Meisters.

| Endprodukt | GFKC-Anteil |
|---|---|
| Milder Gurktaler | ~0,7 % |
| Alpen-Aperitif | etwas weniger als 0,7 % |
| Alpen-Spritz | etwas weniger als 0,7 % |

GFKC selbst ist eine Ausmischung aus sortenreinen Mazeraten und Destillaten mehrerer Kräutersorten.

### Sortenkürzel (verbindlich, für Datenmodell relevant)

| Kürzel | Sorte |
|---|---|
| OR | Oregano |
| SA | Salbei |
| ZM | Zitronenmelisse |
| PF | Pfefferminze |
| TH | Thymian |
| KK | Königskerze |
| Md | Mariendistel |

Produkt-Code: **M** = Mazerat, **Dest** = Destillat.

⚠️ **Verwechslungsgefahr:** "GFKC-**M**" ist die fortlaufende Charge-/Jahrgangsbezeichnung der GFKC-Ausmischung selbst (Buchungsbeleg-Konvention "Cocktailbuchung Gurk") — nicht der Produkt-Code "M" = Mazerat. Bei der Modellierung im Schema (`chargeId`, `sorte`) sollten diese beiden Bedeutungen von "M" nicht kollidieren.

---

## 2. Grundproblem: Jahr-zu-Jahr-Konstanz vs. natürliche Schwankung

- GFKC soll bei jeder Ausmischung geschmacklich gleich bleiben — bei vielen Einzelkomponenten strukturell schwierig.
- Mazerate unterscheiden sich von Jahr zu Jahr (Witterung, Erntemenge, eingesetzte Spritmenge).
- Natürliche Alterung/Oxidation läuft im fertig ausgemischten GFKC **weiter** (nicht nur in den Einzelkomponenten-Tanks).
- Anbauplanung ist nur grob möglich (Wetter kann ganze Jahresernten kosten) → tendenziell wird zu viel angebaut/gelagert = Teufelskreis.

---

## 3. Bisheriges Ausmischprinzip (Faustregel — bleibt für GFKC-O gültig)

1. **~1/3 Altbestand (Vorlage)** aus der vorherigen GFKC-Charge zurücklegen (Puffer/Basis).
2. **~2/3 Neuausmischung** aus frischen Mazeraten + Destillaten dazumischen.
3. **Sensorischer Abgleich:** Verdünnung **2 ml GFKC auf 100 ml Wasser**, Vergleich gegen **2 alte GFKC-Referenzchargen**.
4. Bei Bedarf **weitere Neuausmischung zugeben**, bis das Sensorik-Ziel erreicht ist → dadurch sinkt der tatsächliche Altbestand-Anteil am fertigen Produkt unter die ursprünglichen 33 %.
   - Beispielrechnung Charge GFKC-M (13.03.2025): Altbestand-Anteil rechnerisch nur noch **≈27 %** statt 33 % — kein Widerspruch zur Faustregel, sondern erwartetes Ergebnis der Sensorik-Nachjustierung.
5. Ziel: sensorische Spannen zwischen Chargen weiter verkleinern.

**Fürs Datenmodell relevant:** Der tatsächliche Altbestand-Anteil ist erst nach Abschluss der Nachjustierung bekannt — er ist kein Eingabewert, sondern ein Ergebniswert (`altbestandAnteilIstProzent`, abgeleitet aus den gebuchten Mengen, nicht planbar vorab).

---

## 4. QO "mehr Frische" — Zielrezeptur-Anpassung (2026)

Im Rahmen der Qualitätsoffensive (separates Projekt, siehe Claude-Memory-Datei `gfkc-qualitaetsoffensive`) wurde eine strukturelle Verschiebung der GFKC-Rezeptur beschlossen:

- **Zielverschnitt-Richtwert:** 0,65 (Anteil "GFKC alt"/Bestand) : 0,35 (zusätzlicher Zitronenmelisse-Mazerat-Anteil).
  ⚠️ **Noch unverifizierter Richtwert**, keine feste Größe. Verbindliche Festlegung erst über mehrere sensorische Sitzungen (Muster 1, Muster 2, … bis Freigabe).
- **Oregano-Anbau wird vollständig eingestellt.**
- **Thymian-Pflanzenbestand wird reduziert.**
- Beides verschiebt das Mengenverhältnis bereits anbauseitig in Richtung "mehr Frische".
- **Sortenreine Altmazerate (4–5 Jahre gelagert)** müssen aufgearbeitet werden, da die Oxidation im fertig ausgemischten GFKC weiterläuft.

### Iterativer Entwicklungsprozess der neuen Rezeptur

1. "GFKC neu Muster 1" ausmischen
2. Damit Ausmischungen der drei Endprodukte herstellen (Milder Gurktaler, Alpen-Aperitif, Alpen-Spritz)
3. Sensorische Bewertung je Endprodukt
4. Bei Bedarf zurück ans Reißbrett → "Muster 2" → Schritte 2–3 wiederholen, bis das Ergebnis passt

Das entspricht in `rezepturSchema.ts` mehreren Varianten (`version`, `vorgaengerRezepturId`) mit jeweils eigenen `sensorikBewertungen[]` — das Datenmodell deckt diesen Ablauf bereits konzeptionell ab.

### Übergangsplan: zwei unabhängige Korrektur-Batches (GFKC-M-Bestand)

Aktuelle QO-Maßnahmen sind eine **Übergangslösung**, um bereits im Vorjahr ausgemischten GFKC-Bestand aufzubrauchen — nicht die finale Dauerrezeptur (das ist GFKC-O, siehe Abschnitt 6).

| Batch | Herkunft | Menge | Status |
|---|---|---|---|
| A | Bestand Gurk | 3.650 l (3.190 + 460 l) | vor Ort lagernd |
| B | Retourbestand Mozart | 4.081 l | 2025 nach alter/unverbesserter Rezeptur ausgeliefert, für neue Frische-Anforderungen unbrauchbar |

Beide Batches sind **unabhängig voneinander** (Batch B ist NICHT sequenziell aus Batch A entstanden). Beide durchlaufen dieselbe Korrektur: Mischung 0,65 (GFKC alt) : 0,35 (ZM-Mazerat) → Einstellung auf **53,5 % vol ABV** → Musterausmischung Milder Gurktaler → Sensorik → Nachbesserung oder Freigabe. Beide korrigierten Ergebnisse zusammen bilden die Vorlage für die vollständige Neuausmischung nach neuer Rezeptur (GFKC-O).

---

## 5. Messmethodik / Genauigkeit

- Mazerate werden 1–2× jährlich je Sorte angefertigt, sortenrein in Tanks gepoolt. ABV variiert je Ansatz (Pflanze, Erntefeuchte, eingesetzte Spritmenge) — maßgeblich ist der **gespindelte ABV-Wert im Lagertank am Jahresende**.
- ABV- und Dichtebestimmung erfolgt durchgehend per **Spindel** (ungenau). Probedestillation zur Alkoholbestimmung ist wirtschaftlich nur beim Endprodukt GFKC vertretbar, nicht für alle Lagertanks.
- Spindelungenauigkeit wird vom Zollamt toleriert, keine Probleme in der Bestandsverwaltung.
- **Ab 2026 neu:** Alex 501 (Anton Paar) für direkte ABV-/Extrakt-/Dichtebestimmung einzelner Lagerkomponenten. Messbereich nur bis 41 % vol → Verdünnung mit Rückrechnung nötig, aber nicht zu stark (sonst Louche-Effekt, Messung unmöglich). Ziel: verbindlichere Werte und möglicher systematischer Korrekturfaktor gegenüber der Spindelmessung.

**Fürs Datenmodell relevant:** Ein `alkoholgehalt`-Feld pro Charge sollte perspektivisch eine `messmethode`-Angabe vertragen (`spindel` | `alex501` | `probedestillation`), da die Werte in unterschiedlicher Verlässlichkeit vorliegen und sich das ab 2026 laufend ändert.

---

## 6. GFKC-O — komplette Neuausmischung aus Einzelkomponenten (kein Altbestand)

Im Unterschied zum Übergangsplan (Abschnitt 4, Verschnitt von vorhandenem GFKC-alt-**Bestand** mit frischem ZM) ist GFKC-O eine **komplett neue Ausmischung direkt aus den Einzelkomponenten** (Mazeraten/Destillaten) — keine Verwendung von bereits fertig gemischtem GFKC-alt als Zutat.

### Zielstruktur

- **0,65 "GFKC-M-Basis"** : **0,35 zusätzliches, frisches ZM-Mazerat**.
- "GFKC-M-Basis" = die 15 Original-Komponenten der historischen GFKC-M-Rezeptur (siehe Abschnitt 7), in ihren relativen Mengenverhältnissen zueinander nachgebaut.

### Fixierungs-Entscheidung (Stand 26.09.2026)

Auf Nachfrage, ob einzelne Sorten unskaliert bleiben sollen:

- **Fix (nicht reduziert):** Pfefferminze (Mazerat + Destillat), Zitronenmelisse-Basisanteil (der in der GFKC-M-Basis enthaltene ZM-Anteil, zusätzlich zum frischen 0,35-Zusatz), Königskerze, Mariendistel, Lohnbearbeitung, GFKC-K-Destillat.
- **Reduzierbar:** Thymian, Oregano, Salbei — **jedoch NICHT auf 0 setzbar:**
  - Oregano: vorhandener Bestand muss noch aufgebraucht werden (Anbau ist gestrichen, aber Restbestand existiert und muss verwertet werden).
  - Thymian und Salbei: liefern sensorische Tiefe, bleiben im Einsatz.
- Als **Anhaltspunkt für die Erstausmischung** dient ein **Reduktionsfaktor von 50 %** auf die bisherige Einsatzmenge dieser drei Sorten — **noch nicht sensorisch verifiziert**, reine Ausgangsbasis für den ersten Testansatz.

### Rechenlogik (bei 1000-l-Referenzbasis, Reduktionsfaktor 50 % für TH/OR/SA)

| Größe | Wert |
|---|---|
| Fixkomponenten (PF, ZM-Basis, KK, Md, Lohnbearb., GFKC-K) | 661,22 l |
| TH+OR+SA bei 50 % Reduktionsfaktor | 169,39 l |
| **GFKC-M-Basis gesamt** | **830,61 l** (65 % des Gesamtergebnisses) |
| ZM-Zusatz (frisch, 52,5 % ABV, gleiche Quelle wie ZM-Basisanteil) | 447,25 l (35 %) |
| **GFKC-O pur (vor Wasser)** | **1.277,86 l bei 55,85 % vol** |
| Wasserzugabe (auf Ziel-ABV 53,5 %) | 56,04 l |
| **GFKC-O gesamt (inkl. Wasser)** | **1.333,90 l bei 53,50 % vol** |

**Wichtiger Nebeneffekt, der für die App-Logik relevant ist:** Da die fixen Komponenten (PF/ZM-Basis/KK/Md/Lohnbearb./GFKC-K) allein bereits **66,12 %** einer hypothetischen 1000-l-Charge ausmachen, ist ein exaktes 65:35-Verhältnis bei fester Zielmenge **nicht in jedem Fall erreichbar** — die Gesamtmenge muss sich dem Verhältnis anpassen (wachsen), nicht umgekehrt, sobald mehr als 0 % der reduzierbaren Sorten enthalten sein sollen. Das ist ein struktureller Constraint, kein Rechenfehler: Bei starren "Fix"-Mengen ist "Zielverhältnis UND Zielmenge beide exakt einhalten" nur lösbar, wenn genug skalierbare Komponenten vorhanden sind, um die Differenz auszugleichen.

---

## 7. Referenz-Grundrezeptur "GFKC-M" (Charge 13.03.2025) — vollständige Herleitung

Quelle: Beleg **"Cocktailbuchung Gurk"**, Charge GFKC-M, 13.03.2025 (Papierbeleg, fotografiert) + Bestandsliste `Bestand_2025-03-13.xlsx` (taggleicher Snapshot, zur ABV-Ermittlung der eingesetzten Chargen).

Diese Charge dient als **"Grundrezeptur alt"** — Ausgangsbasis für die Ableitung der GFKC-O-Rezeptur.

### Struktur der historischen Ausmischung

Altbestand GFKC-L (vorgelegt, ~1/3-Prinzip) + frische Mazerate + frische Destillate = neue Charge GFKC-M.

- Neue Mazerate: 3.005,00 LA
- Neue Destillate: 882,23 LA
- Altbestand GFKC-L (vorgelegt): 1.444,74 LA
- Summe: 5.331,97 LA (Beleg-Endcharge: 5.301,00 LA — Differenz ≈0,58 %, im Rahmen üblicher Spindel-Rundungsungenauigkeit)
- Altbestand-Anteil an dieser Charge: ≈27 % (siehe Abschnitt 3)

### Komponenten Neuausmischung (Mazerate + Destillate, ohne Altbestand)

| Sorte | Produkt | Charge (Referenz) | LA (Beleg) | ABV % | Quelle/Status ABV |
|---|---|---|---|---|---|
| OR | M | OR2201+OR3001 | 468,70 | 53,0 | Annahme — Tank im Bestand vom 13.03.2025 nicht mehr auffindbar, vermutlich durch genau diese Buchung restlos verbraucht |
| SA | M | SA2301 | 213,20 | 53,0 | Annahme — dito |
| PF | M | PF2101 | 935,00 | 53,1 | Bestand 13.03.2025 (Charge im Bestand als "2102" geführt — Code-Abweichung, vermutlich Lesefehler am Papierbeleg) |
| TH | M | TH2400 | 441,60 | 55,2 | Bestand 13.03.2025 (exakter Charge-Treffer) |
| ZM | M | ZM2201 | 892,50 | 52,5 | Bestand 13.03.2025, Tank T345 (Charge "2201/2400" — Poolcode; ein zweiter Tank T346 mit Charge "2201" pur und 54,0 % ABV war ebenfalls möglich, T345 wegen glatter Ergebniszahlen bei der Rückrechnung wahrscheinlicher) |
| KK | M | KK2201 | 54,00 | 54,0 | Bestand 13.03.2025 (exakter Treffer) |
| SA | Dest | SA141618 | 146,56 | 78,0 | Annahme — lt. Kräuter-Meister Destillatbestand aus den Jahren 2014/2016/2018 (zusammengefasste Mehrfachcharge, daher der untypisch lange Code), vermutlich vollständig verbraucht wie Oregano |
| SA | Dest | SA2201 | 16,16 | 77,7 | Bestand 13.03.2025 (exakter Treffer) |
| Md | Dest | MAR2023 | 155,80 | 77,9 | Bestand 13.03.2025 (exakter Treffer) |
| PF | Dest | PF2018 | 158,80 | 79,4 | Bestand 13.03.2025 (Pool-Charge "2301/2018") |
| PF | Dest | PF1302 | 4,40 | 71,65 | Bestand 13.03.2025, Mittel zweier Lose (71,5 % / 71,8 %) — welches der beiden genau, nicht eindeutig zuordenbar |
| ZM | Dest | ZM2012 | 160,20 | 78,0 | Annahme — im Bestand vom 13.03.2025 keine passende Charge, vermutlich restlos verbraucht |
| ZM | Dest | ZM1201 | 7,32 | 74,6 | Bestand 13.03.2025 (exakter Treffer) |
| Lohnbearb. | Dest | SBWK1/2012 | 17,24 | 78,0 | Annahme — nicht zuordenbar (externe Lohnbearbeitung, nicht in der Lager-Gurk-Bestandsliste geführt), mit ~17 LA gegenüber der Gesamtcharge vernachlässigbar |
| GFKC | Dest | GFKC-K2023 | 215,75 | 78,3 | Bestand 13.03.2025, Charge "GFKC-K" — identischer LA-Wert in der Bestandsliste vom 13.03.2025 UND vom 31.12. desselben Jahres → Tank zwischen diesen beiden Stichtagen unverändert |

**Berechnete ABV der reinen Neuausmischung (ohne Altbestand, ohne Wasser): 57,38 % vol** (LA-gewichteter Durchschnitt: Summe LA 3.887,23 / Summe Volumen 6.775,1 l).

### Vereinfachungsregel für nicht rekonstruierbare Chargen

Für alle vier "Annahme"-Positionen (OR-Mazerat, SA-Mazerat SA2301, ZM-Destillat ZM2012, SA-Destillat SA141618) sowie Lohnbearbeitung gilt der vom Kräuter-Meister vorgegebene Richtwert:
**53 % ABV für fehlende Mazerate, 78 % ABV für fehlende Destillate.**

---

## 8. Rechenmethodik — generische Formeln (Kandidat für `rezeptur-manager.ts`)

Diese Formeln wurden über mehrere Excel-Arbeitsmappen mit LibreOffice-Neuberechnung fehlerfrei verifiziert (0 Fehler bei über 200 Formeln je Mappe) und sind die fachliche Grundlage, die die App-Rechenlogik abbilden sollte.

### 8.1 Volumen aus LA und ABV (Grundformel, bereits in `berechneKomponente()` vorhanden)

```
Volumen = LA / (ABV / 100)
LA = Volumen × ABV / 100
```

### 8.2 Skalierung auf Zielmenge (bereits in `skaliereRezeptur()` vorhanden)

```
Skalierungsfaktor = Zielvolumen / Summe(Volumen_historisch aller Komponenten)
Volumen_skaliert[i] = Volumen_historisch[i] × Skalierungsfaktor
```

### 8.3 Verschnitt-Auflösung mit fixen und skalierbaren Komponentengruppen (⚠️ fehlt aktuell im Schema/Manager)

Das ist die zentrale, in `rezeptur-manager.ts` noch **nicht abgebildete** Logik, die GFKC-O benötigt: eine Aufteilung der Komponenten in "fix" (nicht skaliert, Reduktionsfaktor = 1) und "reduzierbar" (Reduktionsfaktor frei wählbar 0–1, editierbar, **nicht** auf einen einzigen Ein/Aus-Schalter beschränkt — siehe Abschnitt 6, wo genau ein binärer Schalter zunächst zu einem unlösbaren Zielkonflikt führte), plus eine daraus abgeleitete Gesamtmenge:

```
GFKC-M-Basis_Summe = Σ(Fixkomponenten) + Σ(reduzierbare Komponenten × jeweiliger Reduktionsfaktor)
Gesamtmenge = GFKC-M-Basis_Summe / Ziel-Anteil-Basis   (z.B. / 0,65)
ZM-Zusatz_Volumen = Gesamtmenge − GFKC-M-Basis_Summe    (= Gesamtmenge × Ziel-Anteil-Zusatz, z.B. × 0,35)
ZM-Zusatz_LA = ZM-Zusatz_Volumen × ZM-Zusatz-ABV / 100
```

**Wichtig:** Wenn Fixkomponenten allein bereits mehr als `Ziel-Anteil-Basis` der ursprünglich angenommenen Zielmenge ausmachen, muss die Gesamtmenge über die ursprüngliche Zielmenge hinaus wachsen (siehe Abschnitt 6) — die App sollte das erkennen und anzeigen, nicht stillschweigend eine falsche Verhältniszahl ausgeben.

### 8.4 Wasserzugabe auf Ziel-ABV bei fixem oder wachsendem Gesamtvolumen

Zwei Varianten, je nach Vorgabe (beide wurden gebraucht):

**Variante A — Zielvolumen fix, Konzentrat wird kleiner skaliert:**
```
Volumen_Konzentrat = Zielvolumen × Ziel-ABV / ABV_Konzentrat_pur
Wasserzugabe = Zielvolumen − Volumen_Konzentrat
```
(Hier wird die GESAMTE Rezeptur — nicht nur einzelne Komponenten — vor der Verdünnung kleiner skaliert, damit nach Wasserzugabe exakt die Zielmenge erreicht wird.)

**Variante B — Konzentratmenge ist fix (ergibt sich aus der Rezeptur), Gesamtvolumen wächst mit:**
```
Wasserzugabe = LA_Konzentrat / (Ziel-ABV / 100) − Volumen_Konzentrat
Gesamtmenge_final = Volumen_Konzentrat + Wasserzugabe
```
Variante B wurde für GFKC-O verwendet (Abschnitt 6), weil dort die Konzentratmenge bereits durch die Fixkomponenten-Logik (8.3) bestimmt ist und nicht nachträglich zusätzlich verkleinert werden sollte.

### 8.5 Kumulierte ABV beim schrittweisen Mischen (Tank-Befüllreihenfolge)

Nützlich als Kontrollanzeige während der praktischen Ausmischung (Komponente für Komponente in den Tank):

```
Kumulierte_Menge[i] = Kumulierte_Menge[i-1] + Volumen[i]
Kumulierte_LA[i] = Kumulierte_LA[i-1] + LA[i]
Kumulierte_ABV[i] = Kumulierte_LA[i] / Kumulierte_Menge[i] × 100
```

Das ist dieselbe Formel wie `durchschnittAlkohol` in `berechneRezeptur()`, nur nicht erst am Ende einmal, sondern als laufende Zeile pro hinzugefügter Komponente — z. B. als Live-Anzeige im Editor, während der Kräuter-Meister die Komponenten nacheinander einträgt.

---

## 9. Ziel-ABV 53,5 % — gelebter Richtwert (nicht fixiert)

> ⚠️ **Korrektur vom 27.09.2026 (Wolfgang Kulmitzer, direkt im App-Chat):** Dieser Abschnitt stellte den Ziel-ABV ursprünglich als starre, technisch zu erzwingende IFS-Regel dar. Das ist **so nicht richtig**. Der Absatz bleibt unten unverändert stehen (Nachvollziehbarkeit), gilt aber als **überholt** — maßgeblich ist die Richtigstellung direkt danach.

> **Ziel-ABV für jede GFKC-Charge (GFKC-M wie GFKC-O) ist üblicherweise 53,5 % vol — als gelebter Richtwert, nicht als fixe Vorgabe.**
>
> Jede neue Charge durchläuft ohnehin denselben Freigabeprozess, unabhängig vom tatsächlich erreichten ABV. Erreicht eine Charge z.B. 55 % statt 53,5 %, ändert das **nichts** an der Freigabe selbst — es bedeutet lediglich, dass der Lohnabfüller seine ABV-Berechnung für die Dosierung im Endprodukt neu machen muss.
>
> **Für die App bedeutet das:** `zielAlkohol` bleibt frei editierbar, keine Sperre, keine Sonderwarnung bei Abweichung nötig. Der tatsächlich erreichte ABV jeder Charge sollte lediglich klar sichtbar/exportierbar sein, damit der Lohnabfüller ihn für seine Neuberechnung hat.

<details>
<summary>Ursprüngliche, überholte Fassung dieses Abschnitts (zur Nachvollziehbarkeit)</summary>

> **Ziel-ABV für jede GFKC-Charge (GFKC-M wie GFKC-O) ist immer 53,5 % vol.**

Grund, warum diese Regel für die App-Logik zentral sein sollte: Die **Einsatzmenge von GFKC im Milder Gurktaler soll bei einer GFKC-Rezepturänderung gleich bleiben**, damit keine im Sinne der IFS-Zertifizierung erkennbare "Rezepturänderung" am Endprodukt entsteht (ein aufwändiges Freigabeverfahren). Solange GFKC durchgängig bei 53,5 % vol angeliefert wird, ändert sich für das Endprodukt-Rezept nur die **eingesetzte GFKC-Charge** — kein zusätzlicher IFS-Vorgang nötig, nur normale Neuausmischung + Freigabe.

**Für die App bedeutet das:** `zielAlkohol` bei GFKC-Rezepturen sollte nicht frei editierbar, sondern mit 53,5 % vorbelegt sein (oder zumindest mit einer deutlichen Warnung versehen werden, falls abweichend), weil ein Abweichen hier eine geschäftskritische Nebenwirkung (IFS-Verfahren) auslöst, die im UI nicht sichtbar ist, wenn man nur die Zahl sieht.

</details>

---

## 10. Bestandsplanung

- Jahresbedarf GFKC: ca. 4.000 l
- Ziel-Lagerbestand: 6.000 l (voller Tank, wenig Kopfraum für Oxidation)
- Daraus 4 volle IBC (~4.000 l) für Mozart bereitstellbar, danach wieder Platz für 4.000 l Neuausmischung

---

## 11. Historische Bestandslisten als Rechengrundlage — Methodik-Learnings

Diese Erkenntnisse stammen aus der Arbeit mit zwei realen Bestandslisten-Exports (`Bestand_2025-03-13.xlsx`, `Bestand_2025-12-31.xlsx`) und sind für jede Funktion relevant, die alte Buchungen rückwirkend rekonstruieren soll:

1. Bestandslisten sind **Momentaufnahmen des aktuellen Poolzustands** eines Tanks — keine Historie einzelner Entnahmen. Eine frühere Entnahme lässt sich nur rekonstruieren, wenn eine Bestandsliste **vom (annähernd) selben Tag** wie die fragliche Buchung vorliegt.
2. Physikalisches Prinzip, das das nutzbar macht: **Eine Entnahme aus einem homogen gepoolten Tank verändert dessen ABV nicht.** Der am selben Tag notierte Vol%-Wert entspricht also dem ABV der entnommenen Menge → `Volumen = eingesetzte LA ÷ ABV` lässt sich rückwirkend berechnen.
3. Wenn eine Charge in der taggleichen Bestandsliste **komplett fehlt**, ist das ein Indiz, dass sie durch genau die untersuchte Buchung restlos verbraucht wurde — nicht automatisch ein Datenfehler.
4. Charge-Codes mit unüblicher Länge (z. B. 6-stellig "SA141618" statt der sonst 4-stelligen Codes) sind ein Hinweis auf **zusammengefasste Mehrfachchargen** (hier: Jahrgänge 2014/2016/2018 in einer Buchungszeile) — vor einer Einzelchargen-Suche darauf prüfen.
5. Ein Tank mit über mehrere Monate **identischem LA-Wert** in zwei verschiedenen Bestandslisten-Exports (hier: GFKC-K, gleicher Wert im März- und Dezember-Export) zeigt an, dass der Tank in diesem Zeitraum nicht bewegt wurde — nützlich als Plausibilitätscheck.

---

## 12. Offene / nicht verifizierte Punkte

Diese Liste sollte bei der Umsetzung sichtbar bleiben (z. B. als Kommentarfeld je Rezeptur-Charge), da hier mit Annahmen statt gesicherten Werten gearbeitet wurde:

- Zielverschnitt-Verhältnis **0,65 : 0,35 selbst ist noch unverifiziert** — Festlegung erst nach mehreren sensorischen Sitzungen.
- **Reduktionsfaktor 50 %** für Thymian/Oregano/Salbei bei GFKC-O ist ein Anhaltspunkt für die Erstausmischung, **noch nicht sensorisch geprüft**.
- ABV-Richtwerte **53 % (Mazerat) / 78 % (Destillat)** für vier nicht mehr rekonstruierbare historische Chargenpositionen sind grobe Vereinfachungsannahmen, keine Messwerte.
- **PF-Mazerat-Chargencode-Abweichung** (Beleg "2101" vs. Bestandsliste "2102") — vermutlich ein Lesefehler am handschriftlichen Papierbeleg, nicht abschließend geklärt.
- **ZM-Mazerat-Tankzuordnung** (T345 mit ABV 52,5 % vs. T346 mit ABV 54,0 %, beide mit Charge-Bezug "2201") nicht eindeutig, T345 nur wegen glatter Rückrechnungs-Ergebniszahlen wahrscheinlicher.
- **PF-Destillat PF1302:** zwei mögliche Lose mit leicht unterschiedlichem ABV (71,5 % / 71,8 %), Mittelwert verwendet.

---

## 13. Bezug zu bestehendem Code (`pages-clean`) und offener Lücke

Die in `docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md` beschriebene Lücke (fehlende Buchungsfunktion, `spritStaerke` hartcodiert, `produktionsDaten` nie befüllt) bleibt unverändert bestehen. Ergänzend aus diesem Dokument für die Umsetzung relevant:

- Die dort vorhandene einfache Alkoholkorrektur (Wasser **oder** Sprit, feste Gesamtmenge) deckt **nicht** den GFKC-O-Fall ab, bei dem eine Gruppe von Komponenten fix bleibt, eine andere Gruppe reduziert wird und die Gesamtmenge sich daraus erst ergibt (Abschnitt 6 und 8.3) — das ist eine eigene, zusätzliche Rechenfunktion, kein Sonderfall der bestehenden `alkoholKorrektur`.
- ~~`zielAlkohol` sollte auf 53,5 % vorbelegt/geschützt werden~~ — **entfällt** (siehe Korrektur in Abschnitt 9): bleibt frei editierbar, nur der tatsächlich erreichte ABV muss sichtbar/exportierbar sein.
- Ein `messmethode`-Feld je Komponenten-ABV (Abschnitt 5) wird mittelfristig relevant, sobald der Alex 501 im Einsatz ist.

---

## 14. Verwandte Ressourcen

- GitHub-Skill-Repo `woku369/claude-skills`, Datei `gfkc/SKILL.md` — derselbe Fachinhalt in kompakterer Form, für Claude-Chat-Antworten außerhalb dieser App gepflegt. Bei künftigen Änderungen an der GFKC-Rezeptur beide Stellen abgleichen, damit App-Doku und Skill nicht auseinanderlaufen.
- Claude-Memory-Projekt "GFKC" (claude.ai) — laufende Dokumentation der GFKC-Qualitätsoffensive, Datei `areas/gfkc-rezeptur.md`.
- Referenzdateien in diesem Repo: `docs/Bestand 2025-03-13.xlsx`, `docs/Bestand 2025-03-13.pdf`.
