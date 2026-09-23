# MazerationsMeister — Review Lagerbestandsverwaltung & Buchungslogik

**Kontext:** Unvoreingenommene Architektur-Review der Lagerbestand-/Tank-/Buchungslogik, angefordert weil sich das System "umständlich, organisch gewachsen" anfühlte. Ergebnis: Verdacht bestätigt — schwerwiegender als reine Unordnung, es gibt einen funktionalen Kernbug in der Buchungslogik.

Repo: `MazerationsMeister` (Next.js Desktop-App + Electron + statische PWA/HTML-Tools).
Stand der Analyse: Branch `fresh-main`.

---

## TEIL A — Befunde (Ist-Zustand)

### 🔴 A1. KRITISCH: Buchungsdialog verändert den Bestand nicht

**Datei:** `src/components/inventory/inventory-management.tsx:604-623`

```ts
const handleSaveTransaction = (transaction: InventoryTransactionCoreData) => {
  const newTransaction: InventoryTransaction = {
    ...transaction, id: uuidv4(), transactionDate: new Date(),
    type: currentTransactionType || 'Zugang',
    itemId: itemForTransaction?.id || '', ...
  };
  setInventoryTransactions(prev => [...prev, newTransaction]);  // NUR Log-Eintrag
  toast({ title: 'Transaktion gespeichert', ... });
  handleCloseTransactionDialog();
};
```

`RecordTransactionDialog` (`src/components/inventory/record-transaction-dialog.tsx`) sammelt Menge/Datum/Notiz und ruft `onSaveTransaction` auf — es gibt keinen Aufruf von `setInventoryItems(...)`, der `currentQuantityLiters` des betroffenen `StoredInventoryItem` anpasst.

**Konsequenz:** Das Buchungsjournal (`InventoryTransaction[]`) ist von der tatsächlich angezeigten/exportierten Bestandsmenge komplett entkoppelt. Der einzige Weg, den Bestand zu ändern, ist die manuelle Überschreibung über „Artikel bearbeiten" (`AddInventoryItemDialog` → `handleSaveItem`, `inventory-management.tsx:479-525`) — also Overwrite eines Totals, keine Bewegungsbuchung.

**Zusätzlich:** Mazeration → Lager ist ebenfalls nicht verbunden. Weder `src/components/mazeration-form.tsx` (0 Referenzen auf `inventoryItems`/`tankNr`/`StoredInventoryItem`) noch die neue PWA-Tankzuordnung (`public/mazeration-pwa.html`, `collectTargetTanks()`, Feld `targetTanks`) schreiben das fertige Mazerat zurück in `inventoryItems` oder `tank-data.json`. Ein fertiges Mazerat landet nur im PDF/Protokoll; das Einbuchen in den Ziel-Tank ist ein manueller Zusatzschritt, den niemand erzwingt.

---

### 🟠 A2. Fünf unabhängige, unsynchronisierte Persistenz-Mechanismen

Für dieselben Bestandsdaten existieren parallel:

1. **Direktes `localStorage`** — Keys `inventoryItems`, `artikelDefinitionen`, `inventoryTransactions`, `tankDefinitions` werden aus mind. 4 unabhängigen Stellen in `inventory-management.tsx` geschrieben (Zeilen 121-137, 435-442, 657-664, 667-709) sowie aus `tank-sync.ts`, `tank-management.tsx`, `tank-content-manager.tsx`.
2. **„Universal Storage"-Schicht** (`src/lib/universal-storage-simple.ts`, `app-data-manager.ts`, `hooks/use-app-data.ts`) — eigene Singleton-Kopie derselben Keys. Wird über `app-data-initializer.tsx` bei **jedem** Seitenaufruf initialisiert (`src/app/layout.tsx:62-73`) und erzeugt bei jedem Laden ein komplettes Backup nach `localStorage['appDataBackup']`. **Kein einziger Verbraucher** in den echten Inventory-/Tank-Seiten (`useTanks`/`useInventory`/`useProtocols` — 0 Treffer außerhalb der Hook-Datei selbst). Reiner Overhead, tote Infrastruktur.
3. **XLSX/JSON-Export** — Einbahnstraße, kein funktionierender Re-Import-Pfad zurück in die App.
4. **`tank-data.json` / `tank-data-live.json`** (GitHub-synced) — eigene, manuell rekonstruierte Serialisierung, ASCII-bereinigt (`toAsciiSafe`, `github-service.ts:4-14`). Umlaute gehen dabei verloren → nicht byte-identisch mit dem localStorage-Original, selbst „synchron".
5. **IndexedDB in der PWA** (`mazeration-pwa.html`, `indexedDB.open('MazerationPWA', 1)`) — komplett separater Datentopf für Mazerationsprotokolle, nur per manuellem Button-Klick in Desktop-`localStorage` gemergt.

**Kein bidirektionaler, automatischer Sync irgendwo.** Prinzip überall: „letzter Schreibvorgang gewinnt".

---

### 🟠 A3. Tank-ID-Inkonsistenz: nur zugepflastert, nie an der Wurzel behoben

`src/lib/tank-sync.ts` enthält eine explizite Selbstdiagnose:

```ts
// tank-sync.ts:25-29
// KRITISCHE KORREKTUR: Bestehende Tank-IDs zu tankNr korrigieren
const correctedTanks = currentTanks.map(tank => ({
  ...tank,
  id: tank.tankNr // Setze ID gleich tankNr für Konsistenz
}));
```

Und eine dedizierte Reparaturfunktion (`fixTankIds()`, `tank-sync.ts:93-120`), die bei **jedem Mount** von `TankManagement` läuft (`tank-management.tsx:163-166`) — eine Live-Datenmigration statt einer einmaligen Korrektur an der Quelle.

Weil die eigentliche Ursache nie beseitigt wurde, hat jede Konsumentenstelle ihre eigene Krücke:

- Simples `tankNr === tankNr`-Matching (setzt Konsistenz voraus): `github-service.ts:403,419`, `tank-sync.ts:86`, `tank-content-manager.tsx:69,106`, `tank-management.tsx:394`
- Dual `id`-oder-`tankNr`-Fallback: `hooks/use-app-data.ts:60,69`, `app/tank-offline/page.tsx:49`
- **Schlimmster Fall — `public/tank-viewer.html:279-294`:** 7-fache OR-Verkettung inkl. Leerzeichen-Stripping und hartcodiertem `"T "`-Präfix-Raten:
  ```js
  const matches = [
      t.id === tankId, t.tankNr === tankId, t.bezeichnung === tankId,
      t.id === tankId.replace(/\s+/g, ''), t.tankNr === tankId.replace(/\s+/g, ''),
      t.id === `T ${tankId}`, t.tankNr === `T ${tankId}`
  ];
  ```
  Plus ein zweiter Fallback (`:305-323`), der bei fehlendem Tank-Datensatz aus Inventory-Zeilen einen synthetischen Tank zusammenbastelt.

Das ist exakt das Muster, das schon in `tank-data.json` auffiel (Fässer teilen sich `tankNr="Fass"`, haben aber `id="Fass-4"` etc.) — gepatcht statt normalisiert.

---

### 🟡 A4. Berechnungsformeln 4–5× dupliziert statt zentral

`src/lib/mazeration-calc.ts` ist die einzige echte Shared-Lib — enthält aber nur **eine** Funktion (Nettogewicht aus Kisten), korrekt zentral genutzt und als einzige getestet.

Alles andere ist mehrfach unabhängig implementiert:

- **LA (Liter Absolutalkohol):** eigenständig in `mazeration-form.tsx:178-214`, `inventory-table.tsx:65`, `inventory-summary.tsx:46`, `inventory-management.tsx:348` und `:975-981`, `tank-content-manager.tsx:72-74,363`, sowie **nochmal komplett separat** in `public/mazeration-pwa.html` (`calcAusbeute()`, Sammelliste-Summen) und ein **fünftes Mal** im Desktop-Sammelliste-Äquivalent (`src/app/mazerationen/sammelliste/page.tsx`).
- **Ausbeute-% & Kraut:Sprit-Verhältnis:** nur in der PWA implementiert (`mazeration-pwa.html`), keine gemeinsame TS-Funktion mit dem Desktop-Äquivalent in `mazeration-form.tsx`.
- **Dichte-/Temperaturkorrektur:** nachweislich im *selben Commit* zweimal geschrieben — einmal in `mazeration-pwa.html` (Vanilla JS), einmal in `mazeration-form.tsx` (TSX) — statt einmal in `mazeration-calc.ts`.

**Konsequenz:** Jede Formeländerung (Rundung, Korrekturfaktor) muss an 4–5 Stellen nachgezogen werden. Passiert erfahrungsgemäß nicht zuverlässig.

---

### 🟡 A5. GitHub-Sync: kein Konflikthandling, Snapshot-Bloat nicht wirklich behoben

`TankDataGitHubSync.syncTankData()` (`src/lib/github-service.ts:267-340`) legt bei **jedem** Sync zusätzlich zur `tank-data.json` eine neue Datei `tank-data-<timestamp>.json` an — **ohne Rotation/Pruning**.

Verifiziert im Repo-Root:
```
$ ls tank-data-*.json | wc -l          → 118
$ git ls-files | grep -c '^tank-data-[0-9]'   → 117
```

Die ROADMAP.md listet dies als „✅ behoben" (nur weil `.gitignore` seither neue Snapshots verhindert) — **die 117 bereits committeten Altlasten wurden nie mit `git rm --cached` entfernt.** Das eigentliche Repo-Bloat-Problem besteht weiter.

**Konflikthandling:** Bei 409-Konflikt (SHA-Mismatch) wird die Datei per DELETE+CREATE brachial neu angelegt (`github-service.ts:93-145`) — kein Merge der `inventory`/`tanks`-Arrays. Zwei gleichzeitige Schreibvorgänge (z.B. zwei Desktop-Instanzen, oder PWA-Export + Desktop-Push) überschreiben sich lautlos gegenseitig.

Zusätzlich: `out/` (Next.js-Build-Output, 73 Dateien) ist ebenfalls im Git getrackt — trägt zum „6GB Portable EXE"-Bloat aus der Roadmap bei.

---

### 🟡 A6. XSS-Fix nicht systemisch — in neuem Feature bereits wieder aufgetreten

Der von ROADMAP.md als offen/erledigt vermerkte XSS-Fix (`textContent` statt `innerHTML` für den `tankId`-Fallback) wurde nur für den ursprünglichen Einzeltank-Pfad in `tank-viewer.html` gemacht (Zeilen 369-411, korrekt mit `.textContent`).

Die **neue** `?view=all`-Ansicht (aus dieser Session, Commits `97f715c`/`b63b7e1`) hat den exakt gleichen Fehlertyp erneut eingeführt:

```js
// tank-viewer.html:505-557
grid.innerHTML = tanks.map(t => ...).join('');  // unescaped t.bezeichnung, i.produktName, t.currentContent
```

Auch der Inline-Fallback in `github-service.ts:406-436` baut Tank-Karten per `innerHTML` mit unescapten Nutzerdaten.

→ **Ohne eine zentrale Escaping-Regel/Helper-Funktion wiederholt sich der Fehler bei jedem neuen Feature.**

---

### 🟢 A7. Weitere Code-Smells (niedrigere Priorität, aber leicht zu beheben)

- **~280 Zeilen toter Code** in `inventory-management.tsx`: zwei `return`-Statements im Component-Body (Zeilen 712-953 „live", 955-1237 unerreichbar) — der gleiche ~70-zeilige XLSX-Export-Handler ist **3× dupliziert** im selben File (einmal live, zweimal tot).
- **Modul-globaler Mutable State:** `let lastProduktName = '';` außerhalb der Komponente (`inventory-management.tsx:4`) — klassischer React-Anti-Pattern.
- **Orphaned Komponente:** `src/components/inventory/tank-management-backup.tsx` (308 Zeilen) — 0 Importe irgendwo im Code.
- **3+ parallele Tank-Viewer-HTML-Implementierungen:** `tank-viewer.html`, `tank-viewer-fix.html`, `tank-offline.html`, plus ein 4. Inline-Fallback in `github-service.ts` — mit eigenem Bug: nutzt `item.menge`, ein Feld, das im Schema gar nicht existiert (richtig wäre `currentQuantityLiters`) → zeigt immer 0 L an.
- **Übergroße Komponenten:** `mazeration-form.tsx` (~2700 Zeilen), `inventory-management.tsx` (~1240 Zeilen, inkl. totem Code) — je eine Datei für ein ganzes Fachdomain ohne Trennung von Form-State/PDF-Erzeugung/Persistenz/Berechnung.
- **Token-Verwaltung dupliziert:** `github-token`/`github-enabled` in 4 unabhängigen Komponenten gelesen/geschrieben (`einstellungen/page.tsx`, `tank-management.tsx`, `tank-management-backup.tsx`, `universal-storage-simple.ts`) — funktioniert nur, weil der Key-Name überall gleich ist (Konvention, kein Contract).
- **Navigation:** Tank-/Inventory-Verwaltung nur über Tabs innerhalb der Einstellungen erreichbar, kein eigener Hauptmenüpunkt.
- **Minimale Testabdeckung:** genau 1 Testdatei im gesamten `src/components`-Baum (`calculateNetWeight.test.ts`) — nichts für LA/Ausbeute, Tank-ID-Matching, Buchungslogik oder GitHub-Sync.
- **Leere Platzhalterdateien weiterhin vorhanden:** `electron/main-corrected.js`, `main-fast.js`, `main-optimized.js`, `src/lib/ngrok-qr-generator.ts`, `onedrive-config.ts`, `onedrive-service.ts`, 3 leere `docs/*.md`.
- **`webSecurity: false`** weiterhin in 4 Electron-Dateien (`main.js`, `main-simple.js`, `main.ts`, `main-simple.ts`).

---

## TEIL B — Abgleich mit ROADMAP.md (Phase 3)

| Roadmap-Punkt | Aussage Roadmap | Tatsächlicher Code-Stand |
|---|---|---|
| Inkonsistente Tank-IDs | offen | ✅ bestätigt offen — nur Workarounds, keine Normalisierung |
| Doppelte Token-Verwaltung | offen | ✅ bestätigt — 4 unabhängige Stellen, gleicher Key nur durch Konvention synchron |
| Mehrfache QR-Code-Implementierungen | offen | ✅ bestätigt — 4 Strategien inline in einer Funktion |
| Navigations-Inkonsistenz | offen | ✅ bestätigt — nur Tabs in Einstellungen |
| `webSecurity: false` | offen | ✅ bestätigt, 4 Dateien betroffen |
| 113 Backup-Snapshots | „✅ behoben" (.gitignore) | ❌ **nicht behoben** — 117 Dateien weiterhin im Git-Repo, nie bereinigt |
| XSS-Fix tank-viewer.html | als offen gelistet | ⚠️ alter Fall gefixt, **neuer Fall** durch `?view=all`-Feature reintroduced |
| Leere Platzhalterdateien | „✅ identifiziert" | ✅ zutreffend — identifiziert, aber nicht entfernt |

**Fazit Roadmap-Check:** Die Roadmap ist bei den meisten Punkten ehrlich und akkurat. Zwei Stellen sind zu optimistisch: Der Snapshot-Punkt ist real nicht gelöst, und der XSS-Punkt hätte als „strukturell wiederkehrend" statt als Einzelfall geführt werden sollen.

---

## TEIL C — Vorgeschlagene Vorgangsweise (Aufgabenliste)

**Arbeitsweise:** Pro Aufgabe ein eigener Branch von `fresh-main`, lokal mit `npm run dev` testen, erst dann mergen. Nicht mehrere Themen gleichzeitig anfassen — bei Problemen muss klar sein, welcher Fix schuld ist.

```bash
git checkout fresh-main && git pull
git checkout -b fix/<thema>
```

### Aufgabe 1 — Buchungslogik reparieren (höchste Priorität, kleinster Radius)

- [ ] `handleSaveTransaction` in `inventory-management.tsx` so erweitern, dass eine Buchung (`Zugang`/`Abgang`) tatsächlich `currentQuantityLiters` des zugehörigen `StoredInventoryItem` anpasst (Zugang: `+= quantityLiters`, Abgang: `-= quantityLiters`, mit Prüfung gegen negativen Bestand)
- [ ] Bestehende Einträge in `inventoryTransactions` sind reine Log-Einträge ohne Bestandswirkung — **nicht** rückwirkend verrechnen, nur ab Fix-Zeitpunkt korrekt buchen
- [ ] Test schreiben (Zugang erhöht Bestand, Abgang verringert ihn, Abgang > Bestand wird abgefangen)
- [ ] Manuell in der laufenden App verifizieren: Buchung machen → Bestandsanzeige und XLSX-Export prüfen

### Aufgabe 2 — Mazeration → Lager verbinden

- [ ] Beim Abschluss eines Mazerationsprotokolls (Desktop + perspektivisch PWA) automatisch einen Zugangs-Datensatz in `inventoryItems`/`tankNr` erzeugen, basierend auf `targetTanks` (Menge, Zieltank, Alkoholgehalt aus Ausbeute-Berechnung)
- [ ] Abhängig von Entscheidung: reicht ein Vorschlag mit Bestätigungsdialog, oder soll es vollautomatisch laufen? (Bewusste Entscheidung nötig, nicht einfach durchcoden)

### Aufgabe 3 — Zentralen `stock-service.ts` einführen

- [ ] Einzige Stelle für alle Bestandsmutationen (Zugang, Abgang, Umbuchung, Korrektur) schaffen
- [ ] Alle bisherigen direkten `setInventoryItems(...)`-Aufrufe, die den Bestand verändern, darauf umstellen (`inventory-management.tsx`, ggf. weitere)
- [ ] Dient als Ansatzpunkt, um später auch die GitHub-Sync-Schreibung und die PWA-Buchung anzudocken

### Aufgabe 4 — Tank-ID-Normalisierung an der Quelle

- [ ] Einmalige Migration: `id` und `tankNr` im Datenmodell klar trennen (`id` = eindeutiger Schlüssel, `tankNr`/`bezeichnung` = Anzeige/Gruppierung) — Schema in `tankSchema.ts` entsprechend anpassen
- [ ] `fixTankIds()`/Live-Reparatur aus `tank-sync.ts` nach der Migration entfernen
- [ ] Alle Fallback-Matching-Heuristiken (`tank-viewer.html`, `use-app-data.ts`, `tank-offline/page.tsx`) auf einfaches `id`-Matching reduzieren
- [ ] `tank-data.json` (GitHub-Export) an das bereinigte Modell anpassen

### Aufgabe 5 — Formeln konsolidieren

- [ ] LA-, Ausbeute-%-, K:S-Verhältnis- und Dichte-/Temperaturkorrektur-Berechnung in `mazeration-calc.ts` (bzw. eine neue gemeinsame Datei) zentralisieren
- [ ] Alle Duplikate ersetzen: `mazeration-form.tsx`, `inventory-table.tsx`, `inventory-summary.tsx`, `inventory-management.tsx`, `tank-content-manager.tsx`, `sammelliste/page.tsx`
- [ ] Für die PWA (`mazeration-pwa.html`, reines HTML/JS ohne Build-Step): gleiche Formeln 1:1 in JS nachziehen und mit einem Kommentar verlinken, welche TS-Datei die „Quelle der Wahrheit" ist (technisch keine Code-Teilung möglich, aber Drift vermeiden durch Verweis + evtl. gemeinsamen Test-Fixture-Vergleich)
- [ ] Tests für alle konsolidierten Formeln ergänzen

### Aufgabe 6 — GitHub-Sync aufräumen

- [ ] `git rm --cached tank-data-[0-9]*.json` — alle 117 Alt-Snapshots aus dem Tracking entfernen (Dateien bleiben ggf. lokal/im Backup-Ordner, falls gewünscht)
- [ ] Sync-Logik in `github-service.ts` so ändern, dass **keine** neue Timestamp-Datei pro Sync mehr angelegt wird — stattdessen `tank-data.json` direkt überschreiben, optional mit einer einzigen rollierenden Backup-Datei (z.B. `tank-data.backup.json`)
- [ ] Committed `out/`-Verzeichnis prüfen: wirklich nötig für GitHub Pages, oder kann der Deploy-Workflow das aus dem Build erzeugen statt es zu committen?

### Aufgabe 7 — XSS-Fix systemisch machen

- [ ] Gemeinsame Escape-Helper-Funktion einführen (z.B. `escapeHtml()`), überall verwenden wo Nutzerdaten in `innerHTML`-Template-Strings landen
- [ ] Konkret fixen: `tank-viewer.html:505-557` (`?view=all`-Grid), `github-service.ts:406-436` (Inline-Fallback)
- [ ] Kurzer Vermerk/Kommentar an beiden Stellen, warum Escaping zwingend ist, damit es bei zukünftigen Features nicht wieder vergessen wird

### Aufgabe 8 — Aufräumen (risikoarme Quick Wins, jederzeit zwischendurch machbar)

- [ ] Toten Code in `inventory-management.tsx` entfernen (zweites, unerreichbares `return`-Statement, Zeilen ~955-1237)
- [ ] Modul-globale Variable `let lastProduktName` entfernen oder korrekt in Component-State verschieben
- [ ] `tank-management-backup.tsx` löschen (0 Importe)
- [ ] Leere Platzhalterdateien löschen: `electron/main-corrected.js`, `main-fast.js`, `main-optimized.js`, `src/lib/ngrok-qr-generator.ts`, `onedrive-config.ts`, `onedrive-service.ts`, leere `docs/*.md`
- [ ] `github-service.ts`-Inline-Fallback-Bug fixen (`item.menge` → `item.currentQuantityLiters`) — oder besser: Inline-Fallback ganz entfernen und stattdessen auf die echte `tank-viewer.html` verweisen
- [ ] `webSecurity: false` → `true` in allen 4 Electron-Main-Dateien (separat testen, kann andere Dinge brechen wenn Preload/IPC nicht sauber ist)
- [ ] „Universal Storage"-Schicht (`universal-storage-simple.ts`, `app-data-manager.ts`, `use-app-data.ts`, `app-data-initializer.tsx`) entweder wirklich anbinden oder komplett entfernen — aktuell totes Gewicht, das nur Overhead erzeugt

### Aufgabe 9 — Strukturelle Aufräumarbeit (größer, eher mittelfristig)

- [ ] `mazeration-form.tsx` und `inventory-management.tsx` in kleinere Einheiten aufteilen (Form-State / PDF-Erzeugung / Persistenz / Berechnung als eigene Hooks/Module)
- [ ] Token-Verwaltung (`github-token`) in einen einzigen Service/Hook konsolidieren statt 4 unabhängiger Lese-/Schreibstellen
- [ ] Navigation: Inventory/Tank als eigenen Hauptmenüpunkt statt Tab in Einstellungen

---

## Hinweise für die Bearbeitung in VS Code

- Repo liegt lokal, Branch `fresh-main` ist aktuell (Stand dieser Analyse)
- `npm run dev` zum lokalen Testen der Desktop-App
- Für Aufgabe 1–3 (Buchungslogik) reicht Arbeiten in `src/components/inventory/` und `src/schemas/inventorySchema.ts` — kein Electron-Neustart nötig
- Für Aufgabe 4 (Tank-ID) vorher unbedingt ein Backup von `tank-data.json` und `localStorage`-Export machen, da Migration bestehende Daten umschreibt
- Reihenfolge 1 → 2 → 3 ist sinnvoll, weil 2 und 3 auf dem in 1 etablierten Buchungsmechanismus aufbauen
- Aufgaben 7 und 8 können jederzeit unabhängig zwischendurch als Lückenfüller gemacht werden
