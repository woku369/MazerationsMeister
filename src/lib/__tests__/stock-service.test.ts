import { describe, it, expect } from 'vitest';
import { addEntry, updateEntry, applyTransaction, recordTransaction, recordNewEntry, poolIntoTank, recordPoolIntoTank } from '../stock-service';
import { calcLA } from '../mazeration-calc';
import type { StoredInventoryItem, InventoryTransaction } from '@/schemas/inventorySchema';

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
    const items = applyTransaction([makeItem()], 'item-1', 'Zugang', 500);
    expect(items[0].currentQuantityLiters).toBe(1500);
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(1500, 60), 2);
  });

  it('applyTransaction (Abgang) verringert Menge UND aktualisiert LA', () => {
    const items = applyTransaction([makeItem()], 'item-1', 'Abgang', 300);
    expect(items[0].currentQuantityLiters).toBe(700);
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(700, 60), 2);
  });

  it('applyTransaction verhindert negativen Bestand und LA folgt korrekt (0)', () => {
    const items = applyTransaction([makeItem({ currentQuantityLiters: 100 })], 'item-1', 'Abgang', 500);
    expect(items[0].currentQuantityLiters).toBe(0);
    expect(items[0].literAbsolutalkohol).toBe(0);
  });

  it('updateEntry (manuelle Bearbeitung) aktualisiert LA nach geändertem Alkoholgehalt', () => {
    const edited = makeItem({ alcoholVolProzent: 75, literAbsolutalkohol: 999 /* veralteter Wert */ });
    const items = updateEntry([makeItem()], edited);
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(1000, 75), 2);
  });

  it('mehrere Buchungen hintereinander halten LA konsistent mit currentQuantityLiters (keine Veralterung)', () => {
    let items = [makeItem()];
    items = applyTransaction(items, 'item-1', 'Zugang', 200); // 1200
    items = applyTransaction(items, 'item-1', 'Abgang', 700); // 500
    items = applyTransaction(items, 'item-1', 'Zugang', 100); // 600
    expect(items[0].currentQuantityLiters).toBe(600);
    expect(items[0].literAbsolutalkohol).toBeCloseTo(calcLA(600, 60), 2);
  });
});

describe('stock-service: Buchungsjournal (recordTransaction/recordNewEntry)', () => {
  it('recordTransaction bucht die Menge UND schreibt einen Journal-Eintrag mit Referenz', () => {
    const { items, transactions } = recordTransaction([makeItem()], [], 'item-1', 'Abgang', 300, { notes: 'Versand LF-2026-001' });
    expect(items[0].currentQuantityLiters).toBe(700);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      itemId: 'item-1', artikelNummer: 'A1', produktName: 'Testprodukt', chargenNummer: 'C1',
      type: 'Abgang', quantityLiters: 300, notes: 'Versand LF-2026-001',
    });
  });

  it('recordTransaction reiht sich chronologisch an bereits vorhandene Journal-Einträge an', () => {
    const first = recordTransaction([makeItem()], [], 'item-1', 'Zugang', 100, { notes: 'Erste Buchung' });
    const second = recordTransaction(first.items, first.transactions, 'item-1', 'Abgang', 50, { notes: 'Zweite Buchung' });
    expect(second.transactions).toHaveLength(2);
    expect(second.transactions.map(t => t.notes)).toEqual(['Erste Buchung', 'Zweite Buchung']);
  });

  it('recordTransaction ist ein No-Op für einen unbekannten Posten, aendert aber nichts am Journal', () => {
    const { items, transactions } = recordTransaction([makeItem()], [], 'unbekannt', 'Abgang', 50);
    expect(items).toEqual([makeItem()]);
    expect(transactions).toEqual([]);
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
    expect(result.transactions[0]).toMatchObject({ type: 'Zugang', quantityLiters: 1500, notes: 'Mazeration Zitronenmelisse (2600) - Einlagerung' });
  });
});
