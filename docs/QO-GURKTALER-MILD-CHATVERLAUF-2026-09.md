# Qualitätsoffensive Gurktaler Mild — Chatverlauf & Fachkontext (September 2026)

**Quelle:** Claude-Desktop-Projekt "QO Gurktaler mild" (Projektbeschreibung: *"Qualitätsoffensive Gurktaler mild — Mehr Frische durch Zusatz von Zitronenmelisse als Mazerat zum GFKC"*), Gespräch vom 28.09.2026.
**Zweck:** Vollständige, detaillierte Zusammenfassung dieses Chatverlaufs samt aller fachlichen Entscheidungen, Rechenwege und erzeugten Dateien — als Referenz für spätere Sessions und als fachliche Grundlage, die neben `docs/GFKC-FACHKONTEXT-REZEPTUR-2026-09.md` und `docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md` bei der geplanten GFKC-Verschnitt-/Buchungsfunktion in `fresh-main` berücksichtigt werden sollte.
**Autor/Auftraggeber:** Wolfgang Kulmitzer, Kräuter-Meister, Gurktaler AG.

⚠️ **Abgrenzung zu den bestehenden Dokumenten in diesem Repo:** `GFKC-FACHKONTEXT-REZEPTUR-2026-09.md` und `GFKC-VERSCHNITT-BESTANDSAUFNAHME.md` stammen aus einem separaten Claude-Desktop-Projekt ("GFKC", Gespräche vom 08.09. und 26.09.2026) und behandeln primär die **Zusammensetzung** von GFKC aus sortenreinen Mazeraten/Destillaten (OR/SA/ZM/PF/TH/KK/Md) sowie den Software-Entwurf für die Buchungsfunktion. Dieses Dokument stammt aus dem **Projekt "QO Gurktaler mild"** und behandelt die **Frische-Initiative**: den Umbau des GFKC-Rezepts selbst (höherer Zitronenmelisse-Mazerat-Anteil statt separatem Destillat-Zusatz) sowie die konkrete Bestandsauffrischung der GFKC-Tanks. Beide Themenstränge betreffen dieselbe Charge "GFKC-M" und sollten bei der Implementierung zusammengeführt werden.

---

## 1. Projektrahmen

Gurktaler Mild ("Der Milde") soll im Rahmen der Qualitätsoffensive (QO) mehr "Frische" erhalten. Der Hebel dazu ist **GFKC** (Gurktaler Frischkräutercocktail, Mat-Nr 70048) — die einzige geschmacksprägende Komponente, an der angesetzt wird ("Single Point of Intervention").

Die QO ist konzeptionell mit einem zweiten, unabhängigen Workstream gekoppelt: einer alkoholsteuerbedingten ABV-Reduktion (AlkSt 2027, Erhöhung 12 → 15,60 €/l A), dokumentiert mit den Varianten A (nur Frische, 27 %vol bleibt), B (ABV-Reduktion), C (kombiniert), D (phasiert). Dieses Gespräch behandelt ausschließlich die Frische-Seite (Variante A).

**Eckdaten Gurktaler Mild:**
- Ziel-ABV: 27 %vol (Toleranz 26,7–27,4 %vol)
- 1000-L-Referenzansatz laut `portfolio/references/kernprodukt.md`
- GFKC-Anteil in der Originalrezeptur: 0,7 % (bezogen auf den fertigen 1000-L-Ansatz)

---

## 2. Kernentscheidung: "GFKC neu" — Umbau statt Zusatzdestillat

**Bisheriger Zustand (QI-Behelfslösung):** Zusätzlich zum GFKC wurde separat Zitronenmelissen-**Destillat** (80,1 %vol) mit 0,25 % (bezogen auf den 1000-L-Ansatz) zudosiert, um Frische zu erzeugen.

**Neuer Ansatz:** Das Zitronenmelissen-Destillat wird durch Zitronenmelissen-**Mazerat** ersetzt und direkt in den GFKC eingebaut — kein separater Zusatz mehr. Da das Mazerat weniger konzentriert ist als das Destillat, ist eine höhere Dosierung nötig: **0,35 %** statt 0,25 % (bezogen auf den 1000-L-Ansatz).

**"GFKC neu" = 0,65 Teile Bestands-GFKC + 0,35 Teile Zitronenmelissen-Mazerat (ZM-Mazerat).**

Dieses Mischungsverhältnis (0,65:0,35) ist die zentrale, in mehreren Berechnungen wiederverwendete Konstante des gesamten Gesprächs — sowohl für die Sensorik-Pilotcharge als auch für die spätere Tank-Bestandsauffrischung.

Bestätigter ABV-Wert für ZM-Mazerat (generisch): **53 %vol** (tankspezifische Bestandswerte weichen davon ab, siehe Abschnitt 5).

Nach dem Umbau entfällt der separate ZM-Destillat-Zusatz vollständig — er war laut Nutzer ausdrücklich nur ein Hilfsmittel für die frühere Qualitätsinitiative (QI) und "wird in der Form nie mehr benötigt", da der GFKC selbst umgebaut wird und den höheren ZM-Mazerat-Anteil bereits enthält.

### ABV-Drift-Kontrolle (protokolliert, nicht Teil der finalen Tankrechnung)

Für eine frühe Beispielrechnung mit angenommenen Mengen (7710 L Bestand à 52,5 %vol + 3855 L ZM-Mazerat à 53 %vol) ergab sich:

```
(7710 × 52,5 + 3855 × 53) / 11565 = 52,67 %vol
```

→ vernachlässigbare ABV-Drift gegenüber dem ursprünglichen Bestand (52,5 %vol). Diese Zahlen sind eine frühe Illustrationsrechnung; die verbindliche, finale Tankrechnung mit echten Beständen folgt in Abschnitt 5.

---

## 3. Sensorik-Pilotplan (1-Liter-Ansatz)

Protokollierter Ablauf, **vor** Ansetzen der Sensorik-Charge festgehalten (nicht als neuer Rechenplan, sondern als Dokumentation der vom Nutzer gewählten Vorgehensweise):

1. "GFKC neu" ansetzen: 0,65 Teile Bestands-GFKC + 0,35 Teile ZM-Mazerat, 1 Liter Ansatzgröße.
2. Gurktaler Mild ansetzen, ebenfalls 1 Liter, ursprüngliche 0,7 % GFKC 1:1 durch "GFKC neu" ersetzt.
3. Aus diesem 1-Liter-Ansatz zweimal je 300 ml entnehmen und mit GFKC neu **aufdosieren**: einmal auf +0,2 %-Punkte, einmal auf +0,4 %-Punkte gegenüber der Basis 0,7 % — ergibt drei Proben: 0,7 % / 0,9 % / 1,1 %.
4. Vergleich dieser drei Proben gegen ein **Referenzmuster** (klassische Rezeptur mit separatem ZM-Destillat, am selben Tag hergestellt).

### Erstellte Datei: `gurktaler_mild_pilot_1L.xlsx`

Formelgetriebene 1-L-Rezeptur (openpyxl, nach `xlsx`-Skill-Konvention: Formeln als Excel-Formelstrings, `recalc.py` nach jedem Speichern, Arial, Farbcodierung Blau=Input/Schwarz=Formel/Gelb=Stellhebel). Enthält:

- Zucker Normalkristall auf eine Position konsolidiert (125 + 15,625 = 140,625 g; ursprünglich zwei getrennte Zeilen).
- **Primasprit-60%-Korrektur** bei Alkohol neutral (70000) und Wasser enthärtet (siehe Abschnitt 4).
- CHECK-8-Summenkontrolle (Pilotansatz-Summenkontrolle, laut `produktentwicklung/SKILL.md`): Abweichung von −11,0 % gegenüber dem Zielvolumen, nachvollziehbar erklärt durch nicht dichtekorrigierte Feststoffpositionen bereits in der Original-Stückliste (kein Rechenfehler).
- ABV-Kontrolle (R1-Check) je Komponente mit LA-Bilanz und Status-Formel (`=IF(AND(D...>=0,267;D...<=0,274);"OK — innerhalb Toleranz";"PRÜFEN")`).
- Entnahme- und Aufdosierungs-Sektion für die drei Sensorikproben (0,7 % / 0,9 % / 1,1 %).
- Dichte- und Masse-Spalten (Einwiegen) für spätere Nutzung.

---

## 4. Primasprit-60%-Korrektur (kritische Klarstellung)

**Problem:** Die Original-Stückliste für Gurktaler Mild (Mozart, Lohnabfüller) verwendet die Position "Alkohol neutral" (Mat-Nr 70000) im Sinne von **absolutem Alkohol** (100 %-Äquivalent, reiner Alkohol/LA), weil Mozart intern mit 96 %vol Primasprit arbeitet und über eine eigene Mischanlage selbst verdünnt.

Der Kräuter-Meister (Nutzer) erhält sein Primasprit-Rohmaterial dagegen **bereits vorverdünnt auf 60 %vol**. Eine direkte Übernahme der Original-Stücklistenwerte für "Alkohol neutral" und "Wasser enthärtet" wäre daher falsch.

**Korrekte Methode:** Die ursprüngliche LA-Menge der Position "Alkohol neutral" bleibt unverändert, wird aber auf 60 %vol-Stärke umgerechnet (direkte Einheitenumrechnung, **keine** Neuherleitung über eine frische Ziel-ABV-Gleichung):

```
Alkohol neutral (60 %vol) = ursprüngliche LA-Menge / 0,60
Wasser enthärtet (neu)    = ursprüngliches Wasser − bereits im Primasprit enthaltenes Verdünnungswasser
```

Für den 1-L-Pilotansatz (Basis 256,914 ml LA aus der Originalrezeptur):

| Position | Original (Mozart-Konvention) | Korrigiert (60 %vol-Primasprit) |
|---|---|---|
| Alkohol neutral | 256,914 ml (≈ absoluter Alkohol) | **428,19 ml** (= 256,914 / 0,60) |
| Wasser enthärtet | 432,108 ml | **260,832 ml** (= 432,108 − 171,276 ml bereits enthaltenes Verdünnungswasser) |

Summe Alkohol + Wasser bleibt vor und nach der Korrektur konstant (689,022 ml/L) — nur die Aufteilung zwischen den beiden Positionen ändert sich.

Diese Klarstellung ist auch im `mazeration-destillation`-Skill dokumentiert (Abschnitt *"Herkunft des Mazerationssprits: Mozart vs. Gurk — Stand 21.07.2026"*) und wurde als Korrektur im Projektprotokoll (`claude-skills`-Repo) festgehalten.

---

## 5. GFKC-Bestandsauffrischung — Tank-Verschnittrechnung (Operation 1 & 2)

Iterativ verfeinerte Aufgabenstellung: die vorhandenen GFKC- und ZM-Mazerat-Tankbestände sollen im festen Verhältnis 0,65:0,35 zu neuem, hochwertigerem GFKC ("GFKC neu"-Bestand) verschnitten werden. Die Konstanten und die Vorgehensweise wurden über mehrere Nutzer-Korrekturen präzisiert, bis eine hochgeladene echte Bestandsliste (`Bestand_2025-12-31.xlsx`) die finalen Ausgangswerte lieferte.

### Ausgangsbestände (aus `Bestand_2025-12-31.xlsx`, Tabelle1, Kopfzeile 5)

| Tank | Inhalt | Menge | ABV | Dichte |
|---|---|---|---|---|
| T341 | Primasprit | — | 60,0 %vol | 0,9112 g/ml |
| T349 | GFKC-M | 3190 L | 53,5 %vol | — |
| T342 | GFKC-M | 460 L | 55,5 %vol | — |
| T345 | Zitronenmelisse-Mazerat | 3060 L | 52,5 %vol | — |
| T346 | Zitronenmelisse-Mazerat | 3910 L | 54,0 %vol | — |

Ziel-ABV für den fertigen GFKC-neu-Bestand: **53,5 %vol** (Korrektur mit Primasprit oder Wasser, je nachdem ob der Zwischenwert über oder unter Ziel liegt).

### Finales, vom Nutzer bestätigtes Verfahren

**Operation 1 — GFKC-N1 (in Tank 349):**
1. GFKC aus T349 (3190 L @ 53,5 %) und T342 (460 L @ 55,5 %) im selben Tank poolen.
2. ZM-Mazerat-Bedarf im festen Verhältnis 0,65 (GFKC) : 0,35 (ZM-Mazerat) berechnen: `Bedarf = GFKC-Pool × (0,35 / 0,65)`.
3. Bedarf zuerst aus **T345** decken (3060 L @ 52,5 %); Reihenfolge ist bindend (T345 vor T346).
4. Auf 53,5 %vol einstellen — Korrekturrichtung dynamisch per Formel: `=IF(Zwischenstand-ABV > Ziel; "Wasser"; "Primasprit")`, Korrekturmenge je nach Richtung über die passende Verdünnungs- bzw. Aufspritungsformel.
5. Ergebnis: **GFKC-N1**, verbleibt in Tank 349.
6. Davon werden 4 IBC-Container (je ca. 1000 L) zu Mozart verbracht (externe Verwendung/Lohnabfüllung).

**Operation 2 — GFKC-N2 (in Tank 342), "analog Operation 1", gleiches Mischverhältnis 0,65:0,35:**
1. GFKC-M kommt von Mozart retour: 4061 L @ 53,5 %vol, wird in den (nun leeren) Tank 342 gefüllt.
2. ZM-Mazerat-Bedarf nach demselben 0,65:0,35-Verhältnis berechnen.
3. Sourcing-Reihenfolge: zuerst **T345-Restmenge** (nach Entnahme durch Operation 1), erst danach bei Bedarf **T346**.
4. Auf 53,5 %vol einstellen (gleiche dynamische Wasser/Primasprit-Korrekturlogik wie Operation 1).
5. Ergebnis: **GFKC-N2**, verbleibt in Tank 342.

**Finalisierung:**
- GFKC-N1-Restmenge (Tank 349, nach Abzug der 4 IBC) + GFKC-N2 (Tank 342) werden zu einem **Endpool** zusammengeführt.
- Endpool-ABV-Kontrolle als Gegenrechnung.

### Erstellte Datei: `gfkc_auffrischung_op1_op2.xlsx`

Vollständig formelgetrieben (openpyxl, `recalc.py` bestätigt: 40 Formeln, 0 Fehler). Struktur:
- Zielwerte & Parameter (Ziel-ABV 53,5 %, Primasprit-ABV 60 %, Primasprit-Dichte 0,9112, Mischverhältnis 0,65/0,35).
- Ausgangsbestand-Tabelle mit LA-Formel je Zeile (`Menge × ABV`).
- Operation-1-Sektion: Pool-Summe, LA, ABV, ZM-Mazerat-Bedarfsformel, Sourcing aus T345 (`=MIN(Bedarf; T345-Bestand)`), T345-Restformel, Zwischenstand, dynamische Korrekturrichtung + Korrekturmenge.
- Operation-2-Sektion: gleiche Struktur, Sourcing zuerst aus T345-Rest, dann T346 (T346-Restformel als "ungenutzt" markiert, siehe unten).
- Finalisierungs-Sektion: IBC-Parameter, GFKC-N1-Rest, Endpool-Summe, Endpool-ABV-Kontrolle.

**Rechenergebnis (verifiziert, Endwert exakt auf Ziel-ABV):**

| Größe | Wert |
|---|---|
| GFKC-N1 (Tank 349) | 5776,21 L @ 53,5 %vol |
| GFKC-N2 (Tank 342) | 6332,09 L @ 53,5 %vol |
| **Endpool (nach 4× IBC-Abzug aus GFKC-N1, gepoolt mit GFKC-N2)** | **8108,30 L @ 53,5 %vol** |

### Offene Punkte zu dieser Rechnung (nicht abschließend vom Nutzer bestätigt)

- In einer früheren Rechenrunde (vor der finalen "gesamte-Restmenge"-Klärung für Operation 2) ergab sich für die GFKC-N1-Restmenge nach IBC-Abzug ein Wert von 1776,21 L, während der Nutzer selbst von "ca. 1560 L" ausgegangen war. Diese Diskrepanz wurde im Gespräch ausdrücklich benannt und der Nutzer um Prüfung gebeten — eine explizite Bestätigung/Auflösung dieser konkreten Zahl ist im sichtbaren Gesprächsverlauf nicht erfolgt; der Nutzer ist stattdessen zur Verfeinerung der ZM-Mazerat-Sourcing-Logik übergegangen. Ob dieser Punkt durch die spätere, auf echten Bestandsdaten basierende Rechnung bereits implizit erledigt ist, sollte bei Bedarf nochmals gegengeprüft werden.
- Unter dem finalen, fixen 0,65:0,35-Verfahren für Operation 2 bleiben **2817,92 L Zitronenmelissen-Mazerat in Tank T346 ungenutzt** (T346 wird nicht vollständig verbraucht, da Operation 2 den ZM-Mazerat-Bedarf bereits größtenteils aus dem T345-Rest deckt). Dieser Punkt wurde vom Chat ausdrücklich als Konsequenz benannt; eine explizite Bestätigung, ob das für den Nutzer akzeptabel ist (oder ob T346 anderweitig/zeitversetzt verwendet werden soll), liegt nicht vor.
- Das Projektprotokoll `2026-06_gurktaler-mild_abv-reduktion.md` (im `claude-skills`-Repo) wurde bis einschließlich der 1-L-Pilot-Ergebnisse aktualisiert, **aber nicht mehr** mit dieser detaillierten Operation-1/2-Tankrechnung nachgezogen. Das ist eine offene Lücke, sollte aber gezielt nachgeholt werden, falls das Protokoll als vollständige Historie dienen soll.

---

## 6. ABV- und Dichte-Spezifikationen der Kernkomponenten

Auf Nutzeranfrage explizit aus den dokumentierten Spezifikationen (nicht geschätzt) herausgesucht, Quelle `portfolio/references/kernprodukt.md`:

| Mat-Nr | Bezeichnung | ABV-Spezifikation |
|---|---|---|
| 70046 | Underberg-Kräuterauszug | 56,5 %vol (Fixpunkt) |
| 70047 | Kräuterdestillat 161 | 49,7–50,3 %vol (Spanne, kein fixer Punkt) |
| 70048 | GFKC | 52,5 %vol (Fixpunkt) |

**Dichtewerte:** Für 70046/70047/70048 liegen **keine** dokumentierten spezifischen Dichtewerte in den Spezifikationen vor. Verwendet werden die generischen Anhaltswerte aus `mazeration-destillation/SKILL.md` (Mazerate ≈ 0,915–0,93 g/ml, Default 0,9225; Destillate/Ethanol nach der Standard-Ethanol/Wasser-Tabelle bei 20 °C).

**Nutzerentscheidung zur Dichte:** Der Nutzer wird die tatsächlichen Dichtewerte selbst **spindeln** und nachtragen. Begründung: Einwiegen ist praktischer als eine Umrechnung über Volumen und entspricht der bereits etablierten Praxis bei der Ausmischung des 96.000-Liter-Großansatzes. Die dazu laufende Messreihe (STAMM-26) ist in `mazeration-destillation/references/eigenmessungen-dichte-abv.md` dokumentiert; für GFKC, Underberg-Kräuterauszug, Kräuterdestillat 161 und ZM-Mazerat liegen dort aktuell noch keine echten Messwerte vor (Stand dieses Gesprächs) — die Anhaltswerte sind also ein Platzhalter, bis reale Messungen nachgetragen werden.

---

## 7. Ausmischvorschrift 2 Liter (finale, "ursprüngliche" Rezeptur ohne ZM-Destillat)

Nach dem 1-L-Pilot und der Tankrechnung wurde eine praxistaugliche **2-Liter-Ausmischvorschrift** für Gurktaler Mild angefordert.

**Wichtige Klärung im Gesprächsverlauf:** Auf die erste Anfrage hin wurde fälschlich eine Variante MIT separatem ZM-Destillat-Zusatz gebaut (Verwechslung mit der alten QI-Behelfslösung). Der Nutzer stellte klar: *"Wenn ich sage ursprüngliche, dann meine ich das auch so, OHNE einen ZM-Destillatzusatz. Das ZM-Destillat war ein Hilfsmittel für die QI, wird in der Form nie mehr benötigt, da ich ja den GFKC umbaue und den ZM-Mazerat-Anteil erhöhe."* — Die "ursprüngliche" Rezeptur meint also schlicht die **Grundrezeptur von Gurktaler Mild mit 0,7 % GFKC neu** (Einzelposition, kein separater Destillat-Zusatz).

### Erstellte Datei: `ausmischvorschrift_gurktaler_mild_2L.xlsx` (finale, korrekte Datei)

- Batchgrößen-parametrisiert (Zelle `$C$6` = 2 L, alle Mengen über `=C{row}*$C$6`-Formeln skaliert, damit die Datei auch für andere Ansatzgrößen wiederverwendbar ist).
- Einzelposition "GFKC neu" (0,7 % Basis, 7,000 ml bei 1-L-Basis), **kein** separater ZM-Destillat-Zusatz.
- Dichte- und Masse-Spalten (Einwiegen) entsprechend der vom Nutzer bevorzugten Dosierpraxis.
- ABV-Kontrolle-Sektion: 26,92 %vol, Status "OK" (innerhalb Toleranz 26,7–27,4 %vol).
- Verfahrenshinweise (Textsektion mit den Ansatzschritten) am Ende der Datei.

Diese Datei wurde nach der Klarstellung erneut als die korrekte Ausmischvorschrift bestätigt und versendet.

Eine versehentlich zuerst erstellte Variante MIT separatem ZM-Destillat (`ausmischvorschrift_gurktaler_mild_2L_original.xlsx`) ist für den gestellten Zweck **nicht** relevant/benötigt — sie ist nur als Beleg für die Fehlinterpretation und deren Korrektur im Gesprächsverlauf dokumentiert (inkl. einer während der Erstellung selbst korrigierten Dichteschätzung: 0,870 g/ml grob geschätzt → korrekt 0,834 g/ml laut Ethanol/Wasser-Tabelle bei 80 %vol).

**Funktionaler Unterschied GFKC neu vs. GFKC alt** (auf Nutzerfrage erläutert): Bei gleicher Dosierung (0,7 %) unterscheidet sich die Wirkung primär durch die veränderte Zusammensetzung des GFKC selbst — der höhere ZM-Mazerat-Anteil in "GFKC neu" ersetzt die frühere separate Destillat-Frische, mit vermutlich [Vermutung] leicht abweichender (tendenziell schwächerer, da mazerat- statt destillatbasierter) Aromaintensität pro eingesetzter Volumeneinheit, was gerade Gegenstand der laufenden Sensorik ist.

---

## 8. Explizit zurückgestellter nächster Schritt

Nach Vorliegen der Sensorikergebnisse aus Teil 1 (0,7/0,9/1,1 %-Dosierreihe gegen Destillat-Referenz) soll — **erst dann, nicht jetzt** — folgender Schritt bearbeitet werden:

> Wird eine Dosierungserhöhung des GFKC neu nötig (geschätzt ca. +0,3 bis +0,4 %-Punkte), soll diese Differenz durch entsprechende Verminderung von Alkohol neutral und Wasser enthärtet kompensiert werden. Erwartung: Der Gesamt-ABV ändert sich dadurch nur unwesentlich, die Kostensteigerung bleibt moderat.

Dieser Schritt ist bewusst **nicht** Teil der aktuellen Dateien und wurde vom Nutzer ausdrücklich auf "nach erfolgter Sensorik von Teil 1" vertagt.

---

## 9. Sonstige Klärungen im Gesprächsverlauf

- **"cocktailbuchung"-Datei:** Auf Nachfrage bestätigt: Es wurde im gesamten sichtbaren Gesprächsverlauf **keine** Datei mit diesem Namen hochgeladen.
- **Einpflegung in einen Skill:** Auf Nachfrage geprüft (Suche in `gag-skill/references/app-suite.md` und `gag-skill/references/fuehrungen-detail.md`) — es existiert **kein** Skill-Eintrag zu "cocktailbuchung"/"Cocktail"/"Buchung" in diesem Sinn; gefunden wurden nur thematisch entfernte Treffer (TerminMeister-Tourbuchungssystem, ein unverbindlicher Ideenpunkt "Kräuter-Cocktail-Mixing" — keine reale Datei/kein realer Skill).

---

## 10. Referenzierte Claude-Skills

Diese Skills wurden im Verlauf des Gesprächs gelesen bzw. für Berechnungen/Konventionen herangezogen (alle im Repo `woku369/claude-skills`, per `git-skill`/GitHub-Contents-API live abgerufen, nicht aus dem lokal gemounteten `/mnt/skills/user/`-Abbild):

| Skill | Verwendung in diesem Gespräch |
|---|---|
| **produktentwicklung** | Orchestrierender Skill für Szenario 1 ("Mehr Frische"); Quelle für CHECK 8 (Pilotansatz-Summenkontrolle) und Querverweise auf andere Skills. |
| **portfolio** | `references/kernprodukt.md` — Quelle der Original-1000-L-Stückliste für Gurktaler Mild sowie der ABV-Spezifikationen für 70046/70047/70048. |
| **mazeration-destillation** | Quelle der Primasprit-Herkunftsklärung (Mozart vs. Gurk, Abschnitt "Herkunft des Mazerationssprits — Stand 21.07.2026"), der Dichte-Anhaltswerte und der Ethanol/Wasser-Interpolationstabelle; zugehörige `references/eigenmessungen-dichte-abv.md` (STAMM-26-Messprojekt) zur Prüfung, ob bereits reale Dichtemesswerte vorliegen. |
| **rezeptur** | Fachliche Konventionen für Rezeptur-Struktur/Berechnung (Grundlage der XLSX-Aufbauten). |
| **sensorik** | Fachlicher Rahmen für den Pilot-/Vergleichsansatz (0,7/0,9/1,1 % gegen Referenzmuster). |
| **gag-skill** | `references/produktion-kraeuter.md` — Dichtekonstanten für Zucker/Glucosesirup; `references/app-suite.md` und `references/fuehrungen-detail.md` — durchsucht zur "cocktailbuchung"-Frage. |
| **xlsx** | Verbindliche Konventionen für alle erzeugten Excel-Dateien: Formeln als Formelstrings (nie hartcodierte Ergebnisse), Pflichtlauf `recalc.py` nach jedem Speichern, Schriftart Arial, Farbcodierung (Blau = Eingabe, Schwarz = Formel, Gelb = Stellhebel/Annahme). |
| **git-skill** | Zugriffs-/Schreibmethodik für das `claude-skills`-Repo (Protokoll-Updates): ausschließlich über die GitHub-Contents-API per curl (`gh_get_raw`/`gh_put`/`gh_check_access`), niemals über die lokal gemountete Sandbox-Kopie, da diese veraltet sein kann. Für dieses Repo (`MazerationsMeister`), das über `add_repo`/`register_repo_root` mit echtem Git-Zugriff angebunden ist, wird dagegen — wie im `git-skill` selbst für "Claude Code"-Sessions mit echtem Dateisystem- und Git-Zugriff vorgesehen — direkt mit `git` gearbeitet statt über die curl/API-Umgehung.

---

## 11. Im Verlauf dieses Gesprächs erzeugte Dateien (in `claude.ai`, nicht in diesem Repo)

| Datei | Inhalt |
|---|---|
| `gurktaler_mild_pilot_1L.xlsx` | 1-L-Pilotrezeptur mit GFKC-neu-Ersetzung, Primasprit-60%-Korrektur, 3-Proben-Sensorikreihe (0,7/0,9/1,1 %). |
| `gfkc_auffrischung_op1_op2.xlsx` | Vollständige Tank-Verschnittrechnung Operation 1 (GFKC-N1) und Operation 2 (GFKC-N2), inkl. dynamischer Wasser/Primasprit-Korrekturlogik und Endpool-Kontrolle. |
| `ausmischvorschrift_gurktaler_mild_2L.xlsx` | Finale 2-L-Ausmischvorschrift, GFKC-neu-Einzelposition, ohne separaten ZM-Destillat-Zusatz — die vom Nutzer bestätigte "ursprüngliche" Rezeptur. |
| `ausmischvorschrift_gurktaler_mild_2L_original.xlsx` | Fehlinterpretierte Variante MIT separatem ZM-Destillat-Zusatz — nicht die angeforderte Datei, nur zur Nachvollziehbarkeit dokumentiert. |

Im `claude-skills`-Repo wurde außerdem das Projektprotokoll `produktentwicklung/references/projekte/2026-06_gurktaler-mild_abv-reduktion.md` über drei Commits aktualisiert (GFKC-Bestandsauffrischung-Abschnitt, ZM-Mazerat-ABV-Bestätigung + Drift-Kontrolle, Pilot-1L-XLSX-Ergebnisse) — siehe Abschnitt 5 zur offenen Lücke bezüglich der Tank-Operation-1/2-Rechnung.

---

## 12. Zusammengefasste offene Punkte

- [ ] Nach Vorliegen der Sensorik Teil 1: Alkohol/Wasser-Kompensation für die gewählte GFKC-neu-Enddosierung berechnen (Abschnitt 8).
- [ ] Protokoll `2026-06_gurktaler-mild_abv-reduktion.md` um die Tank-Operation-1/2-Rechnung (Abschnitt 5) ergänzen.
- [ ] Diskrepanz 1776,21 L (berechnet) vs. "ca. 1560 L" (Nutzerschätzung) für GFKC-N1-Restmenge — Status unklar, ggf. mit Nutzer erneut abgleichen.
- [ ] Bestätigung einholen, ob 2817,92 L ungenutzter ZM-Mazerat-Restbestand in Tank T346 nach Operation 2 akzeptabel ist oder anderweitig verwendet werden soll.
- [ ] Reale Dichtewerte für 70046/70047/70048/ZM-Mazerat nachtragen, sobald der Nutzer sie gespindelt hat (STAMM-26).
