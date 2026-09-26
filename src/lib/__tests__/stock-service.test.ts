import { describe, it, expect } from 'vitest';
import { addEntry, updateEntry, applyTransaction } from '../stock-service';
import { calcLA } from '../mazeration-calc';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';

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
