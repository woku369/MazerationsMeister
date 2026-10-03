import { describe, it, expect } from 'vitest';
import { createLeergebinde, markAngekommen, befuellen, markVersendet } from '../leergebinde-service';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { Leergebinde } from '@/schemas/leergebindeSchema';

function expectOk<T extends { ok: boolean }>(result: T): Exclude<T, { ok: false }> {
  if (!result.ok) throw new Error(`Erwartetes ok:true, aber: ${JSON.stringify(result)}`);
  return result as Exclude<T, { ok: false }>;
}

function makeGebinde(overrides: Partial<Leergebinde> = {}): Leergebinde {
  return {
    id: 'gb-1',
    bezeichnung: 'IBC-A',
    taraKg: 60,
    status: 'leer',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeInventoryItem(overrides: Partial<StoredInventoryItem> = {}): StoredInventoryItem {
  return {
    id: 'item-1',
    artikelNummer: 'A1',
    produktName: 'GFKC-M',
    chargenNummer: 'GFKC-M',
    category: 'GFKC',
    tankNr: 'T 341',
    currentQuantityLiters: 3000,
    alcoholVolProzent: 53.5,
    dichte20C: 0.92,
    lastInventoryDate: new Date('2026-01-01'),
    bemerkungen: '',
    kennzeichen: 'S',
    ...overrides,
  };
}

describe('createLeergebinde', () => {
  it('legt ein neues Gebinde mit Status "leer" als Default an', () => {
    const result = expectOk(createLeergebinde([], { bezeichnung: 'IBC-A', taraKg: 60 }));
    expect(result.gebinde.status).toBe('leer');
    expect(result.gebinde.bezeichnung).toBe('IBC-A');
    expect(result.list).toHaveLength(1);
  });

  it('kann mit Status "erwartet" angelegt werden, bevor das Gebinde physisch da ist', () => {
    const result = expectOk(createLeergebinde([], { bezeichnung: 'IBC-B', taraKg: 60, status: 'erwartet', herkunft: 'Mozart' }));
    expect(result.gebinde.status).toBe('erwartet');
    expect(result.gebinde.herkunft).toBe('Mozart');
  });

  it('lehnt eine bereits vergebene Bezeichnung ab (würde sonst denselben Lagerposten teilen)', () => {
    const existing = [makeGebinde({ bezeichnung: 'IBC-A' })];
    const result = createLeergebinde(existing, { bezeichnung: 'ibc-a', taraKg: 55 });
    expect(result.ok).toBe(false);
  });
});

describe('markAngekommen', () => {
  it('wechselt von "erwartet" zu "leer"', () => {
    const list = [makeGebinde({ status: 'erwartet' })];
    const updated = markAngekommen(list, 'gb-1');
    expect(updated[0].status).toBe('leer');
  });

  it('ist ein No-op, wenn das Gebinde nicht im Status "erwartet" ist', () => {
    const list = [makeGebinde({ status: 'befuellt' })];
    const updated = markAngekommen(list, 'gb-1');
    expect(updated[0].status).toBe('befuellt');
  });
});

describe('befuellen', () => {
  it('bucht Abgang beim Quellposten und Zugang in den Gebinde-Tank, markiert das Gebinde als befuellt', () => {
    const gebinde = [makeGebinde()];
    const inventory = [makeInventoryItem()];
    const result = expectOk(befuellen(gebinde, inventory, [], 'gb-1', { quellItemId: 'item-1', mengeLiter: 1000 }));

    const quelle = result.inventoryItems.find(i => i.id === 'item-1')!;
    expect(quelle.currentQuantityLiters).toBe(2000);

    const neuerPosten = result.inventoryItems.find(i => i.tankNr === 'IBC-A')!;
    expect(neuerPosten.currentQuantityLiters).toBe(1000);
    expect(neuerPosten.produktName).toBe('GFKC-M');
    expect(neuerPosten.dichte20C).toBe(0.92); // Dichte bleibt beim Poolen erhalten (stock-service.ts Fix)

    const aktualisiertesGebinde = result.gebinde.find(g => g.id === 'gb-1')!;
    expect(aktualisiertesGebinde.status).toBe('befuellt');
    expect(aktualisiertesGebinde.inventoryItemId).toBe(neuerPosten.id);
  });

  it('kann dasselbe Quellposten mehrfach anzapfen (3 Gebinde aus einem Tank)', () => {
    const gebinde = [makeGebinde({ id: 'gb-1', bezeichnung: 'IBC-A' }), makeGebinde({ id: 'gb-2', bezeichnung: 'IBC-B' })];
    const inventory = [makeInventoryItem()];
    const erste = expectOk(befuellen(gebinde, inventory, [], 'gb-1', { quellItemId: 'item-1', mengeLiter: 1000 }));
    const zweite = expectOk(befuellen(erste.gebinde, erste.inventoryItems, erste.transactions, 'gb-2', { quellItemId: 'item-1', mengeLiter: 1000 }));

    const quelle = zweite.inventoryItems.find(i => i.id === 'item-1')!;
    expect(quelle.currentQuantityLiters).toBe(1000);
    expect(zweite.inventoryItems.find(i => i.tankNr === 'IBC-A')!.currentQuantityLiters).toBe(1000);
    expect(zweite.inventoryItems.find(i => i.tankNr === 'IBC-B')!.currentQuantityLiters).toBe(1000);
    expect(zweite.gebinde.every(g => g.status === 'befuellt')).toBe(true);
  });

  it('lehnt Befüllen ab, wenn die Menge den verfügbaren Bestand übersteigt', () => {
    const gebinde = [makeGebinde()];
    const inventory = [makeInventoryItem({ currentQuantityLiters: 500 })];
    const result = befuellen(gebinde, inventory, [], 'gb-1', { quellItemId: 'item-1', mengeLiter: 1000 });
    expect(result.ok).toBe(false);
  });

  it('lehnt Befüllen ab, wenn das Gebinde nicht im Status "leer" ist', () => {
    const gebinde = [makeGebinde({ status: 'erwartet' })];
    const inventory = [makeInventoryItem()];
    const result = befuellen(gebinde, inventory, [], 'gb-1', { quellItemId: 'item-1', mengeLiter: 1000 });
    expect(result.ok).toBe(false);
  });

  it('schreibt für Abgang und Zugang je einen Journal-Eintrag', () => {
    const gebinde = [makeGebinde()];
    const inventory = [makeInventoryItem()];
    const result = expectOk(befuellen(gebinde, inventory, [], 'gb-1', { quellItemId: 'item-1', mengeLiter: 1000 }));
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.some(t => t.type === 'Abgang' && t.notes.includes('IBC-A'))).toBe(true);
    expect(result.transactions.some(t => t.type === 'Zugang')).toBe(true);
  });
});

describe('markVersendet', () => {
  it('wechselt von "befuellt" zu "versendet"', () => {
    const list = [makeGebinde({ status: 'befuellt' })];
    const updated = markVersendet(list, 'gb-1');
    expect(updated[0].status).toBe('versendet');
  });

  it('ist ein No-op, wenn das Gebinde noch nicht befuellt ist', () => {
    const list = [makeGebinde({ status: 'leer' })];
    const updated = markVersendet(list, 'gb-1');
    expect(updated[0].status).toBe('leer');
  });
});
