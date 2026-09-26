import { describe, it, expect } from 'vitest';
import { generateAuftragsNummer, createAuftrag, completeAuftrag, calcContainerLA } from '../lohnbrand-service';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { LohnbrandAuftrag } from '@/schemas/lohnbrandSchema';

function makeInventoryItem(overrides: Partial<StoredInventoryItem> = {}): StoredInventoryItem {
  return {
    id: 'item-1',
    artikelNummer: 'A1',
    produktName: 'Mazerat Zitronenmelisse',
    chargenNummer: 'C1',
    category: 'M',
    tankNr: 'Fass-2',
    currentQuantityLiters: 500,
    alcoholVolProzent: 60,
    lastInventoryDate: new Date('2026-01-01'),
    bemerkungen: '',
    kennzeichen: 'S',
    ...overrides,
  };
}

describe('generateAuftragsNummer', () => {
  it('startet bei 001 für ein neues Jahr', () => {
    expect(generateAuftragsNummer([], 2026)).toBe('LB-2026-001');
  });

  it('zählt fortlaufend hoch, ignoriert andere Jahre', () => {
    const existing: LohnbrandAuftrag[] = [
      { id: '1', auftragsNummer: 'LB-2026-001', lohnbrennerName: 'X', status: 'abgeschlossen', ausgangsdatum: '', container: [], ausgangsLA: 0, createdAt: '', updatedAt: '' },
      { id: '2', auftragsNummer: 'LB-2026-002', lohnbrennerName: 'X', status: 'unterwegs', ausgangsdatum: '', container: [], ausgangsLA: 0, createdAt: '', updatedAt: '' },
      { id: '3', auftragsNummer: 'LB-2025-005', lohnbrennerName: 'X', status: 'abgeschlossen', ausgangsdatum: '', container: [], ausgangsLA: 0, createdAt: '', updatedAt: '' },
    ];
    expect(generateAuftragsNummer(existing, 2026)).toBe('LB-2026-003');
  });
});

describe('createAuftrag', () => {
  it('bucht Abgang für jedes Gebinde und legt den Auftrag mit Status "unterwegs" an', () => {
    const inventory = [makeInventoryItem()];
    const { auftraege, inventoryItems, auftrag } = createAuftrag([], inventory, {
      lohnbrennerName: 'Destillerie Beispiel',
      ausgangsdatum: '2026-09-01',
      container: [{
        inventoryItemId: 'item-1', tankNr: 'Fass-2', produktName: 'Mazerat Zitronenmelisse',
        chargenNummer: 'C1', mengeLiter: 300, alkoholVolProzent: 60,
      }],
    });

    expect(auftraege).toHaveLength(1);
    expect(auftrag.status).toBe('unterwegs');
    expect(auftrag.auftragsNummer).toMatch(/^LB-\d{4}-001$/);
    expect(inventoryItems[0].currentQuantityLiters).toBe(200); // 500 - 300
  });

  it('bucht mehrere Gebinde in einem Auftrag ab', () => {
    const inventory = [
      makeInventoryItem({ id: 'item-1', currentQuantityLiters: 500 }),
      makeInventoryItem({ id: 'item-2', currentQuantityLiters: 300, tankNr: 'Fass-3' }),
    ];
    const { inventoryItems } = createAuftrag([], inventory, {
      lohnbrennerName: 'X',
      ausgangsdatum: '2026-09-01',
      container: [
        { inventoryItemId: 'item-1', tankNr: 'Fass-2', produktName: 'A', mengeLiter: 500, alkoholVolProzent: 60 },
        { inventoryItemId: 'item-2', tankNr: 'Fass-3', produktName: 'B', mengeLiter: 300, alkoholVolProzent: 55 },
      ],
    });
    expect(inventoryItems.find(i => i.id === 'item-1')!.currentQuantityLiters).toBe(0);
    expect(inventoryItems.find(i => i.id === 'item-2')!.currentQuantityLiters).toBe(0);
  });
});

describe('completeAuftrag', () => {
  it('bucht das Destillat als neuen Lagerposten ein und markiert den Auftrag als abgeschlossen', () => {
    const inventory = [makeInventoryItem()];
    const { auftrag } = createAuftrag([], inventory, {
      lohnbrennerName: 'Destillerie Beispiel',
      ausgangsdatum: '2026-09-01',
      container: [{ inventoryItemId: 'item-1', tankNr: 'Fass-2', produktName: 'Mazerat Zitronenmelisse', chargenNummer: 'C1', mengeLiter: 300, alkoholVolProzent: 60 }],
    });

    const { auftraege, inventoryItems } = completeAuftrag([auftrag], inventory, auftrag.id, {
      ruecklaufdatum: '2026-09-15',
      ergebnisProduktName: 'Destillat Zitronenmelisse',
      ergebnisMengeLiter: 250,
      ergebnisAlkoholVolProzent: 75,
      zielTankNr: 'T 341',
    });

    expect(auftraege[0].status).toBe('abgeschlossen');
    expect(auftraege[0].ergebnisMengeLiter).toBe(250);
    const neuesItem = inventoryItems.find(i => i.produktName === 'Destillat Zitronenmelisse');
    expect(neuesItem).toBeDefined();
    expect(neuesItem!.currentQuantityLiters).toBe(250);
    expect(neuesItem!.tankNr).toBe('T 341');
    expect(neuesItem!.literAbsolutalkohol).toBeCloseTo(250 * 0.75, 2);
  });

  it('ist ein No-Op für bereits abgeschlossene oder unbekannte Aufträge', () => {
    const auftrag: LohnbrandAuftrag = {
      id: 'a1', auftragsNummer: 'LB-2026-001', lohnbrennerName: 'X', status: 'abgeschlossen',
      ausgangsdatum: '', container: [], ausgangsLA: 0, createdAt: '', updatedAt: '',
    };
    const { auftraege, inventoryItems } = completeAuftrag([auftrag], [], 'a1', {
      ruecklaufdatum: '2026-09-15', ergebnisProduktName: 'X', ergebnisMengeLiter: 100,
      ergebnisAlkoholVolProzent: 70, zielTankNr: 'T 1',
    });
    expect(auftraege).toEqual([auftrag]);
    expect(inventoryItems).toEqual([]);
  });

  it('berechnet Ausgangs-LA aus mehreren Gebinden verschiedener Konzentration korrekt (Praxisbeispiel)', () => {
    // 600L @ 50% = 300 LA, + 300L @ 40% = 120 LA -> 900L Mazerat, 420 LA gesamt
    const inventory = [
      makeInventoryItem({ id: 'item-x', currentQuantityLiters: 600, alcoholVolProzent: 50 }),
      makeInventoryItem({ id: 'item-y', currentQuantityLiters: 300, alcoholVolProzent: 40 }),
    ];
    const { auftrag } = createAuftrag([], inventory, {
      lohnbrennerName: 'Destillerie Beispiel',
      ausgangsdatum: '2026-09-01',
      container: [
        { inventoryItemId: 'item-x', tankNr: 'T X', produktName: 'Mazerat Z (Charge 1)', mengeLiter: 600, alkoholVolProzent: 50 },
        { inventoryItemId: 'item-y', tankNr: 'T Y', produktName: 'Mazerat Z (Charge 2)', mengeLiter: 300, alkoholVolProzent: 40 },
      ],
    });
    expect(auftrag.ausgangsLA).toBeCloseTo(420, 3);
  });

  it('berechnet den Brennverlust (Verlust-LA) beim Rücklauf korrekt (Praxisbeispiel)', () => {
    // Ausgang: 420 LA. Rücklauf: 500L @ 80% = 400 LA. Verlust: 20 LA.
    const inventory = [
      makeInventoryItem({ id: 'item-x', currentQuantityLiters: 600, alcoholVolProzent: 50 }),
      makeInventoryItem({ id: 'item-y', currentQuantityLiters: 300, alcoholVolProzent: 40 }),
    ];
    const { auftrag } = createAuftrag([], inventory, {
      lohnbrennerName: 'Destillerie Beispiel',
      ausgangsdatum: '2026-09-01',
      container: [
        { inventoryItemId: 'item-x', tankNr: 'T X', produktName: 'Mazerat Z (Charge 1)', mengeLiter: 600, alkoholVolProzent: 50 },
        { inventoryItemId: 'item-y', tankNr: 'T Y', produktName: 'Mazerat Z (Charge 2)', mengeLiter: 300, alkoholVolProzent: 40 },
      ],
    });
    const { auftraege } = completeAuftrag([auftrag], inventory, auftrag.id, {
      ruecklaufdatum: '2026-09-15',
      ergebnisProduktName: 'Destillat Z',
      ergebnisMengeLiter: 500,
      ergebnisAlkoholVolProzent: 80,
      zielTankNr: 'T 341',
    });
    expect(auftraege[0].ergebnisLA).toBeCloseTo(400, 3);
    expect(auftraege[0].verlustLA).toBeCloseTo(20, 3);
  });
});

describe('calcContainerLA', () => {
  it('summiert LA über mehrere Gebinde unterschiedlicher Konzentration', () => {
    expect(calcContainerLA([
      { inventoryItemId: 'a', tankNr: 'T1', produktName: 'A', mengeLiter: 600, alkoholVolProzent: 50 },
      { inventoryItemId: 'b', tankNr: 'T2', produktName: 'B', mengeLiter: 300, alkoholVolProzent: 40 },
    ])).toBeCloseTo(420, 3);
  });
});
