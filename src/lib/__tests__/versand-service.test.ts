import { describe, it, expect } from 'vitest';
import { generateVersandNummer, createVersand, calcContainerLA, calcContainerNettogewichtKg } from '../versand-service';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { LohnabfuellerVersand } from '@/schemas/versandSchema';

// Entpackt ein {ok:true,...}|{ok:false,error} Ergebnis - wirft, falls das
// Erwartete (ok:true) nicht eintritt.
function expectOk<T extends { ok: boolean }>(result: T): Exclude<T, { ok: false }> {
  if (!result.ok) throw new Error(`Erwartetes ok:true, aber: ${JSON.stringify(result)}`);
  return result as Exclude<T, { ok: false }>;
}

function makeInventoryItem(overrides: Partial<StoredInventoryItem> = {}): StoredInventoryItem {
  return {
    id: 'item-1',
    artikelNummer: 'A1',
    produktName: 'GFKC-M',
    chargenNummer: 'GFKC-M',
    category: 'GFKC',
    tankNr: 'T 342',
    currentQuantityLiters: 3000,
    alcoholVolProzent: 53.5,
    lastInventoryDate: new Date('2026-01-01'),
    bemerkungen: '',
    kennzeichen: 'S',
    ...overrides,
  };
}

describe('generateVersandNummer', () => {
  it('startet bei 001 für ein neues Jahr', () => {
    expect(generateVersandNummer([], 2026)).toBe('LF-2026-001');
  });

  it('zählt fortlaufend hoch, ignoriert andere Jahre', () => {
    const existing: LohnabfuellerVersand[] = [
      { id: '1', versandNummer: 'LF-2026-001', lohnabfuellerName: 'Mozart', versanddatum: '', container: [], versandLA: 0, createdAt: '' },
      { id: '2', versandNummer: 'LF-2026-002', lohnabfuellerName: 'Mozart', versanddatum: '', container: [], versandLA: 0, createdAt: '' },
      { id: '3', versandNummer: 'LF-2025-005', lohnabfuellerName: 'Mozart', versanddatum: '', container: [], versandLA: 0, createdAt: '' },
    ];
    expect(generateVersandNummer(existing, 2026)).toBe('LF-2026-003');
  });
});

describe('createVersand', () => {
  it('bucht Abgang für jedes Gebinde und legt den Versand-Datensatz an', () => {
    const inventory = [makeInventoryItem()];
    const { versaende, inventoryItems, versand } = expectOk(createVersand([], inventory, [], {
      lohnabfuellerName: 'Mozart',
      versanddatum: '2026-10-05',
      container: [{
        inventoryItemId: 'item-1', tankNr: 'T 342', produktName: 'GFKC-M',
        chargenNummer: 'GFKC-M', mengeLiter: 3000, alkoholVolProzent: 53.5,
      }],
    }));

    expect(versaende).toHaveLength(1);
    expect(versand.versandNummer).toMatch(/^LF-\d{4}-001$/);
    expect(versand.lohnabfuellerName).toBe('Mozart');
    expect(inventoryItems[0].currentQuantityLiters).toBe(0);
  });

  it('bucht mehrere Gebinde (z.B. 3 IBCs) in einem Versand ab', () => {
    const inventory = [
      makeInventoryItem({ id: 'ibc-1', currentQuantityLiters: 1000, tankNr: 'IBC-1' }),
      makeInventoryItem({ id: 'ibc-2', currentQuantityLiters: 1000, tankNr: 'IBC-2' }),
      makeInventoryItem({ id: 'ibc-3', currentQuantityLiters: 1000, tankNr: 'IBC-3' }),
    ];
    const { inventoryItems, versand } = expectOk(createVersand([], inventory, [], {
      lohnabfuellerName: 'Mozart',
      versanddatum: '2026-10-05',
      container: [
        { inventoryItemId: 'ibc-1', tankNr: 'IBC-1', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5 },
        { inventoryItemId: 'ibc-2', tankNr: 'IBC-2', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5 },
        { inventoryItemId: 'ibc-3', tankNr: 'IBC-3', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5 },
      ],
    }));
    expect(inventoryItems.every(i => i.currentQuantityLiters === 0)).toBe(true);
    expect(versand.versandLA).toBeCloseTo(3000 * 0.535, 3);
  });
});

describe('Buchungsjournal', () => {
  it('createVersand schreibt für jedes Gebinde einen Journal-Eintrag mit Referenz auf die Versandnummer', () => {
    const inventory = [
      makeInventoryItem({ id: 'ibc-1', currentQuantityLiters: 1000, tankNr: 'IBC-1' }),
      makeInventoryItem({ id: 'ibc-2', currentQuantityLiters: 1000, tankNr: 'IBC-2' }),
    ];
    const { versand, transactions } = expectOk(createVersand([], inventory, [], {
      lohnabfuellerName: 'Mozart',
      versanddatum: '2026-10-05',
      container: [
        { inventoryItemId: 'ibc-1', tankNr: 'IBC-1', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5 },
        { inventoryItemId: 'ibc-2', tankNr: 'IBC-2', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5 },
      ],
    }));
    expect(transactions).toHaveLength(2);
    expect(transactions.every(t => t.type === 'Abgang')).toBe(true);
    expect(transactions.every(t => t.notes.includes(versand.versandNummer))).toBe(true);
  });
});

describe('calcContainerLA', () => {
  it('summiert LA über mehrere Gebinde', () => {
    expect(calcContainerLA([
      { inventoryItemId: 'a', tankNr: 'IBC-1', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5 },
      { inventoryItemId: 'b', tankNr: 'IBC-2', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5 },
    ])).toBeCloseTo(1070, 3);
  });
});

describe('calcContainerNettogewichtKg (Aufgabe 30 - Werte fürs externe Lieferschein-Formular)', () => {
  it('summiert Nettogewicht über mehrere Gebinde via Menge x Dichte', () => {
    const kg = calcContainerNettogewichtKg([
      { inventoryItemId: 'a', tankNr: 'IBC-1', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5, dichte20C: 0.92 },
      { inventoryItemId: 'b', tankNr: 'IBC-2', produktName: 'GFKC-M', mengeLiter: 500, alkoholVolProzent: 53.5, dichte20C: 0.90 },
    ]);
    expect(kg).toBeCloseTo(1000 * 0.92 + 500 * 0.90, 3);
  });

  it('gibt null zurück, wenn bei mindestens einem Gebinde die Dichte fehlt - eine Teilsumme wäre irreführend', () => {
    const kg = calcContainerNettogewichtKg([
      { inventoryItemId: 'a', tankNr: 'IBC-1', produktName: 'GFKC-M', mengeLiter: 1000, alkoholVolProzent: 53.5, dichte20C: 0.92 },
      { inventoryItemId: 'b', tankNr: 'IBC-2', produktName: 'GFKC-M', mengeLiter: 500, alkoholVolProzent: 53.5 },
    ]);
    expect(kg).toBeNull();
  });

  it('gibt null zurück für eine leere Gebinde-Liste', () => {
    expect(calcContainerNettogewichtKg([])).toBeNull();
  });
});
