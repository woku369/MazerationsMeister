import { describe, it, expect } from 'vitest';
import { addEntry, updateEntry, applyTransaction, recordTransaction, recordNewEntry, recordRemoveEntry, poolIntoTank, recordPoolIntoTank, recordCorrection, findAehnlichenWert } from '../stock-service';
import { calcLA } from '../mazeration-calc';
import type { StoredInventoryItem, InventoryTransaction } from '@/schemas/inventorySchema';

// Entpackt ein {ok:true,...}|{ok:false,error} Ergebnis - wirft, falls das
// Erwartete (ok:true) nicht eintritt, damit Tests für den Erfolgsfall knapp
// bleiben und der Misserfolgsfall trotzdem nicht stillschweigend durchrutscht.
function expectOk<T extends { ok: boolean }>(result: T): Exclude<T, { ok: false }> {
  if (!result.ok) throw new Error(`Erwartetes ok:true, aber: ${JSON.stringify(result)}`);
  return result as Exclude<T, { ok: false }>;
}

function makeItem(overrides: Partial<StoredInventoryItem> = {}): StoredInventoryItem {
  return {
    id: 'item-1',
    artikelNummer: 'A1',
    produktName: 'Testprodukt',
    chargenNummer: 'C1',
    category: 'M',
    tankNr: 'T341',
    currentQuantityLiters: 1000,
    alcoholVolProzent: 60,
    lastInventoryDate: new Date('2026-01-01'),
    bemerkungen: '',
    kennzeichen: 'S',
    ...overrides,
  };
}

describe('stock-service: literAbsolutalkohol bleibt konsistent', () => {
  it('addEntry berechnet LA beim Anlegen, auch wenn nicht mitgegeben', () => {
    const items = addEntry([], makeItem({ literAbsolutalkohol: undefined }));
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(1000, 60), 2);
  });

  it('applyTransaction (Zugang) erhöht Menge UND aktualisiert LA', () => {
    const { items } = expectOk(applyTransaction([makeItem()], 'item-1', 'Zugang', 500));
    expect(items[0].currentQuantityLiters).toBe(1500);
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(1500, 60), 2);
  });

  it('applyTransaction (Abgang) verringert Menge UND aktualisiert LA', () => {
    const { items } = expectOk(applyTransaction([makeItem()], 'item-1', 'Abgang', 300));
    expect(items[0].currentQuantityLiters).toBe(700);
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(700, 60), 2);
  });

  it('applyTransaction lehnt einen Abgang über dem verfügbaren Bestand ab, statt still auf 0 zu klemmen (externes Audit, 30.09.2026)', () => {
    const result = applyTransaction([makeItem({ currentQuantityLiters: 100 })], 'item-1', 'Abgang', 500);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('100');
    expect(result.error).toContain('500');
  });

  it('updateEntry (manuelle Bearbeitung) aktualisiert LA nach geändertem Alkoholgehalt', () => {
    const edited = makeItem({ alcoholVolProzent: 75, literAbsolutalkohol: 999 /* veralteter Wert */ });
    const items = updateEntry([makeItem()], edited);
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(1000, 75), 2);
  });

  it('mehrere Buchungen hintereinander halten LA konsistent mit currentQuantityLiters (keine Veralterung)', () => {
    let items = [makeItem()];
    items = expectOk(applyTransaction(items, 'item-1', 'Zugang', 200)).items; // 1200
    items = expectOk(applyTransaction(items, 'item-1', 'Abgang', 700)).items; // 500
    items = expectOk(applyTransaction(items, 'item-1', 'Zugang', 100)).items; // 600
    expect(items[0].currentQuantityLiters).toBe(600);
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(600, 60), 2);
  });
});

describe('stock-service: Buchungsjournal (recordTransaction/recordNewEntry)', () => {
  it('recordTransaction bucht die Menge UND schreibt einen Journal-Eintrag mit Referenz', () => {
    const { items, transactions } = expectOk(recordTransaction([makeItem()], [], 'item-1', 'Abgang', 300, { notes: 'Versand LF-2026-001' }));
    expect(items[0].currentQuantityLiters).toBe(700);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      itemId: 'item-1', artikelNummer: 'A1', produktName: 'Testprodukt', chargenNummer: 'C1',
      type: 'Abgang', quantityLiters: 300, notes: 'Versand LF-2026-001',
    });
  });

  it('recordTransaction reiht sich chronologisch an bereits vorhandene Journal-Einträge an', () => {
    const first = expectOk(recordTransaction([makeItem()], [], 'item-1', 'Zugang', 100, { notes: 'Erste Buchung' }));
    const second = expectOk(recordTransaction(first.items, first.transactions, 'item-1', 'Abgang', 50, { notes: 'Zweite Buchung' }));
    expect(second.transactions).toHaveLength(2);
    expect(second.transactions.map(t => t.notes)).toEqual(['Erste Buchung', 'Zweite Buchung']);
  });

  it('recordTransaction ist ein No-Op für einen unbekannten Posten, aendert aber nichts am Journal', () => {
    const { items, transactions } = expectOk(recordTransaction([makeItem()], [], 'unbekannt', 'Abgang', 50));
    expect(items).toEqual([makeItem()]);
    expect(transactions).toEqual([]);
  });

  it('recordTransaction lehnt einen Abgang über dem verfügbaren Bestand zentral ab (externes Audit, 30.09.2026 - Härtung der Kernfunktion statt Verlass auf jeden einzelnen Aufrufer)', () => {
    const result = recordTransaction([makeItem({ currentQuantityLiters: 500 })], [], 'item-1', 'Abgang', 600);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('500');
    expect(result.error).toContain('600');
  });

  it('recordNewEntry legt den Posten an UND schreibt einen Zugang-Journal-Eintrag', () => {
    const neuerPosten = makeItem({ id: 'item-2', produktName: 'GFKC-O', currentQuantityLiters: 917.58, chargenNummer: 'GFKC-O' });
    const { items, transactions } = recordNewEntry([], [], neuerPosten, { notes: 'Rezeptur GFKC-O Produktion' });
    expect(items).toHaveLength(1);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      itemId: 'item-2', produktName: 'GFKC-O', type: 'Zugang', quantityLiters: 917.58, notes: 'Rezeptur GFKC-O Produktion',
    });
  });

  it('Journal-Eintrag speichert Tank und ABV als Snapshot zum Buchungszeitpunkt (Aufgabe 26, Punkt 6 - Export braucht LA-genaue Historie)', () => {
    const posten = makeItem({ id: 'item-3', tankNr: 'T341', alcoholVolProzent: 53.5 });
    const { transactions } = expectOk(recordTransaction([posten], [], 'item-3', 'Abgang', 200, { notes: 'Versand LF-2026-002' }));
    expect(transactions[0]).toMatchObject({ tankNr: 'T341', alcoholVolProzent: 53.5 });
  });

  it('transactionDate (frei wählbares Vorgangsdatum) und erfasstAm (immer "jetzt") sind unabhängig voneinander (Nutzer-Anfrage 10.10.2026, Nachbuchen vergangener Vorgänge)', () => {
    const posten = makeItem({ id: 'item-4' });
    const historischesDatum = new Date('2026-07-15T00:00:00.000Z');
    const vorJetzt = new Date();
    const { transactions } = expectOk(recordTransaction([posten], [], 'item-4', 'Zugang', 100, { date: historischesDatum }));
    expect(transactions[0].transactionDate).toEqual(historischesDatum);
    expect(transactions[0].erfasstAm).toBeInstanceOf(Date);
    expect(transactions[0].erfasstAm!.getTime()).toBeGreaterThanOrEqual(vorJetzt.getTime());
    // erfasstAm darf sich NICHT ueber opts.date faelschen lassen - sonst waere es nur ein zweiter Name fuer dasselbe Feld.
    expect(transactions[0].erfasstAm!.getTime()).not.toBe(historischesDatum.getTime());
  });
});

describe('poolIntoTank: Einlagern mit Misch-ABV-Berechnung (Grundsatzfrage Tank-Pooling)', () => {
  it('legt einen neuen Posten an, wenn der Zieltank noch leer ist', () => {
    const result = poolIntoTank([], 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', alkoholVolProzent: 52, mengeLiter: 1500,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.konsolidiertesItem.currentQuantityLiters).toBe(1500);
    expect(result.konsolidiertesItem.alcoholVolProzent).toBe(52);
    expect(result.vorherMenge).toBe(0);
  });

  it('verschmilzt neue Menge mit vorhandenem Bestand zu einem gewichteten Misch-ABV (Praxisbeispiel)', () => {
    // 3000L @ 52% + 1500L @ 56% -> 4500L @ 53,333...%
    const inventory = [makeItem({ id: 'bestand-1', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', currentQuantityLiters: 3000, alcoholVolProzent: 52 })];
    const result = poolIntoTank(inventory, 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', alkoholVolProzent: 56, mengeLiter: 1500,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1); // aus 2 Zeilen wird 1
    expect(result.konsolidiertesItem.currentQuantityLiters).toBeCloseTo(4500, 2);
    expect(result.konsolidiertesItem.alcoholVolProzent).toBeCloseTo(53.333, 2);
    expect(result.konsolidiertesItem.tankNr).toBe('T345');
    expect(result.vorherMenge).toBe(3000);
    expect(result.vorherAbv).toBeCloseTo(52, 2);
  });

  it('konsolidiert mehrere bereits vorhandene Altzeilen desselben Produkts im selben Tank zu einer', () => {
    // 3 verschiedene Chargen im selben Tank, wie im Nutzerbeispiel beschrieben
    const inventory = [
      makeItem({ id: 'charge-1', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', currentQuantityLiters: 1000, alcoholVolProzent: 50 }),
      makeItem({ id: 'charge-2', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', currentQuantityLiters: 1000, alcoholVolProzent: 52 }),
      makeItem({ id: 'charge-3', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', currentQuantityLiters: 1000, alcoholVolProzent: 54 }),
    ];
    const result = poolIntoTank(inventory, 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', alkoholVolProzent: 56, mengeLiter: 1500,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.vorherMenge).toBe(3000);
    // (1000*50 + 1000*52 + 1000*54) / 3000 = 52
    expect(result.vorherAbv).toBeCloseTo(52, 2);
    expect(result.konsolidiertesItem.currentQuantityLiters).toBeCloseTo(4500, 2);
  });

  it('lehnt ab, wenn der Zieltank bereits ein anderes Produkt enthält', () => {
    const inventory = [makeItem({ id: 'anderes', tankNr: 'T345', produktName: 'Salbei-Mazerat', currentQuantityLiters: 500, alcoholVolProzent: 50 })];
    const result = poolIntoTank(inventory, 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', alkoholVolProzent: 52, mengeLiter: 1000,
    });
    expect(result.ok).toBe(false);
  });

  it('recordPoolIntoTank schreibt den Journal-Eintrag über die neu hinzugekommene Menge, nicht den Tank-Gesamtstand', () => {
    const inventory = [makeItem({ id: 'bestand-1', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', currentQuantityLiters: 3000, alcoholVolProzent: 52 })];
    const result = recordPoolIntoTank(inventory, [], 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', alkoholVolProzent: 56, mengeLiter: 1500,
    }, { notes: 'Mazeration Zitronenmelisse (2600) - Einlagerung' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({ type: 'Zugang', quantityLiters: 1500 });
    expect(result.transactions[0].notes).toContain('Mazeration Zitronenmelisse (2600) - Einlagerung');
  });

  it('kein Ersatz-Chargennummer-Verlust: bei gleicher Charge bleibt die Chargennummer ein einzelner Wert', () => {
    const inventory = [makeItem({ id: 'bestand-1', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', chargenNummer: '2600', currentQuantityLiters: 3000, alcoholVolProzent: 52 })];
    const result = poolIntoTank(inventory, 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', chargenNummer: '2600', alkoholVolProzent: 56, mengeLiter: 1500,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.konsolidiertesItem.chargenNummer).toBe('2600');
  });

  it('Chargenrückverfolgbarkeit beim Poolen (Aufgabe 27, Punkt 2 - externes Audit): unterschiedliche Chargennummern gehen nicht mehr stillschweigend verloren', () => {
    const inventory = [makeItem({ id: 'rest-vorjahr', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', chargenNummer: '2500', currentQuantityLiters: 200, alcoholVolProzent: 50 })];
    const result = poolIntoTank(inventory, 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', chargenNummer: '2600', alkoholVolProzent: 53, mengeLiter: 1800,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Die kombinierte Chargennummer zeigt jetzt beide Ursprünge, statt nur "2600" zu übernehmen
    expect(result.konsolidiertesItem.chargenNummer).toBe('2500 + 2600');
    expect(result.komponenten).toEqual([
      { chargenNummer: '2500', mengeLiter: 200 },
      { chargenNummer: '2600', mengeLiter: 1800 },
    ]);

    const withJournal = recordPoolIntoTank(inventory, [], 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', chargenNummer: '2600', alkoholVolProzent: 53, mengeLiter: 1800,
    });
    expect(withJournal.ok).toBe(true);
    if (!withJournal.ok) return;
    const note = withJournal.transactions[0].notes;
    expect(note).toContain('200.00 L (Charge 2500)');
    expect(note).toContain('1800.00 L (Charge 2600)');
    expect(note).toContain('2000.00 L (Charge 2500 + 2600)');
  });

  it('Aufgabe 34: die Zusammensetzung wird dauerhaft auf konsolidiertesItem.komponenten gespeichert, nicht nur im Journal', () => {
    const inventory = [makeItem({ id: 'rest-vorjahr', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', chargenNummer: '2500', currentQuantityLiters: 200, alcoholVolProzent: 50 })];
    const result = expectOk(poolIntoTank(inventory, 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', chargenNummer: '2600', alkoholVolProzent: 53, mengeLiter: 1800,
    }));
    expect(result.konsolidiertesItem.komponenten).toEqual([
      { chargenNummer: '2500', mengeLiter: 200 },
      { chargenNummer: '2600', mengeLiter: 1800 },
    ]);
  });

  it('Aufgabe 34: eine zweite Poolung löst die bereits gespeicherte Komponenten-Historie des Postens auf, statt sie durch dessen Chargennummer zu ersetzen', () => {
    // Erste Poolung: Charge 2500 (200L) + Charge 2600 (1800L) -> ein Posten mit komponenten-Historie.
    const nachErsterPoolung = expectOk(poolIntoTank(
      [makeItem({ id: 'rest-vorjahr', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', chargenNummer: '2500', currentQuantityLiters: 200, alcoholVolProzent: 50 })],
      'T345',
      { produktName: 'Zitronenmelisse-Mazerat', category: 'M', chargenNummer: '2600', alkoholVolProzent: 53, mengeLiter: 1800 },
    ));

    // Zweite Poolung: Charge 2700 kommt dazu. Ohne Historien-Auflösung würde hier
    // nur "2500 + 2600" (die Chargennummer des bestehenden Postens) als EIN
    // Bestandteil gezählt - die eigentliche 200L/1800L-Aufteilung wäre verloren.
    const nachZweiterPoolung = expectOk(poolIntoTank(nachErsterPoolung.items, 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', chargenNummer: '2700', alkoholVolProzent: 60, mengeLiter: 1000,
    }));

    expect(nachZweiterPoolung.konsolidiertesItem.chargenNummer).toBe('2500 + 2600 + 2700');
    expect(nachZweiterPoolung.konsolidiertesItem.komponenten).toEqual([
      { chargenNummer: '2500', mengeLiter: 200 },
      { chargenNummer: '2600', mengeLiter: 1800 },
      { chargenNummer: '2700', mengeLiter: 1000 },
    ]);
  });

  it('Aufgabe 34: gleiche Chargennummern werden zu einer Zeile mit Summenmenge zusammengeführt, statt doppelt aufzuscheinen', () => {
    const inventory = [makeItem({ id: 'bestand-1', tankNr: 'T345', produktName: 'Zitronenmelisse-Mazerat', chargenNummer: '2600', currentQuantityLiters: 3000, alcoholVolProzent: 52 })];
    const result = expectOk(poolIntoTank(inventory, 'T345', {
      produktName: 'Zitronenmelisse-Mazerat', category: 'M', chargenNummer: '2600', alkoholVolProzent: 56, mengeLiter: 1500,
    }));
    expect(result.konsolidiertesItem.komponenten).toEqual([
      { chargenNummer: '2600', mengeLiter: 4500 },
    ]);
  });
});

describe('recordCorrection: Inventur-Korrektur (gespindelter ABV / Steigrohr-Differenz weicht vom rechnerischen Wert ab)', () => {
  it('korrigiert Menge und ABV UND schreibt einen "Korrektur"-Journal-Eintrag mit Vorher/Nachher', () => {
    const bestand = makeItem({ tankNr: 'T345', currentQuantityLiters: 4500, alcoholVolProzent: 53.33 });
    const korrigiert = { ...bestand, currentQuantityLiters: 4480, alcoholVolProzent: 53.0 };
    const result = recordCorrection([bestand], [], korrigiert);
    expect(result.items[0]).toMatchObject({ currentQuantityLiters: 4480, alcoholVolProzent: 53.0 });
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].type).toBe('Korrektur');
    expect(result.transactions[0].quantityLiters).toBeCloseTo(20, 2); // |4500 - 4480|
    expect(result.transactions[0].notes).toContain('4500.00 L @ 53.33%');
    expect(result.transactions[0].notes).toContain('4480.00 L @ 53%');
  });

  it('erlaubt eine Korrektur-Buchung mit Mengendifferenz 0, wenn nur der ABV korrigiert wird (gespindelter Wert)', () => {
    const bestand = makeItem({ currentQuantityLiters: 4500, alcoholVolProzent: 53.33 });
    const korrigiert = { ...bestand, alcoholVolProzent: 53.5 }; // nur ABV geaendert, Menge gleich
    const result = recordCorrection([bestand], [], korrigiert);
    expect(result.transactions[0].quantityLiters).toBe(0);
    expect(result.transactions[0].type).toBe('Korrektur');
  });

  it('ist ein No-Op fuer das Journal, wenn der Posten unbekannt ist (aber aendert trotzdem den Bestand ueber updateEntry-Fallback)', () => {
    const fremderPosten = makeItem({ id: 'unbekannt' });
    const result = recordCorrection([], [], fremderPosten);
    expect(result.transactions).toEqual([]);
  });
});

describe('recordRemoveEntry: Lagerposten löschen UND einen Abgang-Journal-Eintrag schreiben (Nutzer-Meldung 10.10.2026 - manuelle Lagerverwaltungs-Korrektur hinterließ bisher keine Spur im Journal)', () => {
  it('entfernt den Posten UND schreibt einen Abgang über die volle vorhandene Menge', () => {
    const posten = makeItem({ id: 'item-9', produktName: 'GFKC-N', currentQuantityLiters: 460, tankNr: 'T342' });
    const result = recordRemoveEntry([posten], [], 'item-9', { notes: 'Lagerposten in der Lagerverwaltung gelöscht' });
    expect(result.items).toEqual([]);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      itemId: 'item-9', produktName: 'GFKC-N', tankNr: 'T342', type: 'Abgang', quantityLiters: 460,
      notes: 'Lagerposten in der Lagerverwaltung gelöscht',
    });
  });

  it('ist ein No-Op fuer das Journal, wenn der Posten unbekannt ist (aber entfernt trotzdem nichts Falsches aus dem Bestand)', () => {
    const posten = makeItem({ id: 'item-9' });
    const result = recordRemoveEntry([posten], [], 'unbekannt');
    expect(result.items).toEqual([posten]);
    expect(result.transactions).toEqual([]);
  });
});

describe('findAehnlichenWert: Tippfehler-Warnung bei Chargennummer/Tank-Nr. (Aufgabe 26 Punkt 5 / Aufgabe 27 Punkt 3)', () => {
  it('findet eine bekannte Charge, die sich nur in der Groß-/Kleinschreibung unterscheidet', () => {
    expect(findAehnlichenWert('GFKC-n', ['GFKC-M', 'GFKC-N'])).toBe('GFKC-N');
  });

  it('meldet keine Ähnlichkeit für bloßes Leerzeichen am Rand (wird beim Speichern ohnehin getrimmt, keine echte Abweichung)', () => {
    expect(findAehnlichenWert('2600 ', ['2600'])).toBeUndefined();
  });

  it('meldet keine Ähnlichkeit für eine tatsächlich neue Chargennummer (Normalfall)', () => {
    expect(findAehnlichenWert('2601', ['2600', 'GFKC-N'])).toBeUndefined();
  });

  it('meldet keine Ähnlichkeit, wenn die Eingabe exakt einer bekannten Charge entspricht', () => {
    expect(findAehnlichenWert('2600', ['2600'])).toBeUndefined();
  });

  it('meldet keine Ähnlichkeit bei leerer Eingabe', () => {
    expect(findAehnlichenWert('', ['2600'])).toBeUndefined();
  });
});
