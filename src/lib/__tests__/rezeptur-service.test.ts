import { describe, it, expect } from 'vitest';
import { produziereRezeptur } from '../rezeptur-service';
import { erstelleNeueRezeptur, fuegeKomponenteHinzu, berechneRezeptur } from '../rezeptur-manager';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { Rezeptur } from '@/schemas/rezepturSchema';

function makeInventoryItem(overrides: Partial<StoredInventoryItem> = {}): StoredInventoryItem {
  return {
    id: 'item-1', artikelNummer: 'A1', produktName: 'Testsorte', chargenNummer: 'C1',
    category: 'M', tankNr: 'T1', currentQuantityLiters: 1000, alcoholVolProzent: 50,
    lastInventoryDate: new Date(), bemerkungen: '', kennzeichen: 'S',
    ...overrides,
  };
}

function buildFertigeRezeptur(inventory: StoredInventoryItem[]): Rezeptur {
  let rezeptur = erstelleNeueRezeptur('GFKC-O Muster 1', 'GFKC-O');
  for (const item of inventory) {
    rezeptur = fuegeKomponenteHinzu(rezeptur, item, 'liter', item.currentQuantityLiters * 0.1); // 10% jeder Komponente
  }
  rezeptur.basisMenge = rezeptur.komponenten.reduce((s, k) => s + k.eingabeWert, 0);
  rezeptur = berechneRezeptur(rezeptur);
  rezeptur.status = 'freigegeben';
  return rezeptur;
}

describe('produziereRezeptur (Kernlücke aus der Bestandsaufnahme - die eigentliche Buchung)', () => {
  it('bucht Abgang für jede Komponente und legt den fertigen GFKC-Posten im Zieltank an', () => {
    const inventory = [
      makeInventoryItem({ id: 'zm', produktName: 'Mazerat ZM', currentQuantityLiters: 1000, alcoholVolProzent: 50 }),
      makeInventoryItem({ id: 'sa', produktName: 'Mazerat SA', currentQuantityLiters: 500, alcoholVolProzent: 40 }),
    ];
    const rezeptur = buildFertigeRezeptur(inventory);

    const result = produziereRezeptur([rezeptur], inventory, rezeptur.id, {
      zielTankNr: 'T 341',
      chargenNummer: 'GFKC-O-001',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Komponenten abgebucht: 100L von ZM (10% von 1000), 50L von SA (10% von 500)
    expect(result.inventoryItems.find(i => i.id === 'zm')!.currentQuantityLiters).toBeCloseTo(900, 3);
    expect(result.inventoryItems.find(i => i.id === 'sa')!.currentQuantityLiters).toBeCloseTo(450, 3);

    // Neuer GFKC-Posten wurde angelegt
    const neuerPosten = result.inventoryItems.find(i => i.produktName === 'GFKC-O');
    expect(neuerPosten).toBeDefined();
    expect(neuerPosten!.tankNr).toBe('T 341');
    expect(neuerPosten!.currentQuantityLiters).toBeCloseTo(150, 3); // 100 + 50

    // Rezeptur-Status + produktionsDaten befüllt
    const updatedRezeptur = result.rezepturen.find(r => r.id === rezeptur.id)!;
    expect(updatedRezeptur.status).toBe('produziert');
    expect(updatedRezeptur.produktionsDaten).toBeDefined();
    expect(updatedRezeptur.produktionsDaten!.zielTankNr).toBe('T 341');
    expect(updatedRezeptur.produktionsDaten!.neuesInventoryItemId).toBe(neuerPosten!.id);
  });

  it('LA-Bilanz geht bei reinem Verschnitt ohne Verlust auf (keine Destillation)', () => {
    const inventory = [
      makeInventoryItem({ id: 'zm', currentQuantityLiters: 1000, alcoholVolProzent: 50 }),
      makeInventoryItem({ id: 'sa', produktName: 'SA', currentQuantityLiters: 500, alcoholVolProzent: 40 }),
    ];
    const rezeptur = buildFertigeRezeptur(inventory);
    const result = produziereRezeptur([rezeptur], inventory, rezeptur.id, { zielTankNr: 'T 1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Math.abs(result.laBilanz.differenzLA)).toBeLessThan(0.01); // minimale Rundungsdifferenz durch toFixed() ist ok
  });

  it('bucht die Sprit-Korrektur (Aufspriten) mit ab, falls durchgeführt', () => {
    const sprit = makeInventoryItem({ id: 'sprit', produktName: 'Primasprit', currentQuantityLiters: 1000, alcoholVolProzent: 96 });
    const zm = makeInventoryItem({ id: 'zm', currentQuantityLiters: 1000, alcoholVolProzent: 50 });
    let rezeptur = buildFertigeRezeptur([zm]);
    rezeptur.alkoholKorrektur = {
      gemessenerAlkohol: 50,
      zielAlkohol: 53.5,
      korrekturBerechnet: true,
      korrekturDurchgefuehrt: false,
      spritZugabe: 10,
      spritZugabeId: 'sprit',
      spritZugabeAlkoholgehalt: 96,
    };

    const result = produziereRezeptur([rezeptur], [zm, sprit], rezeptur.id, { zielTankNr: 'T 1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.inventoryItems.find(i => i.id === 'sprit')!.currentQuantityLiters).toBeCloseTo(990, 3);
    // Endmenge = 100 (10% von zm) + 10 (Sprit)
    const neuerPosten = result.inventoryItems.find(i => i.produktName === 'GFKC-O');
    expect(neuerPosten!.currentQuantityLiters).toBeCloseTo(110, 3);
  });

  it('bricht mit Fehler ab, wenn nicht genug Lagerbestand vorhanden ist', () => {
    const inventory = [makeInventoryItem({ id: 'zm', currentQuantityLiters: 50 })];
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur = fuegeKomponenteHinzu(rezeptur, inventory[0], 'liter', 100); // mehr als vorhanden
    rezeptur.basisMenge = 100;
    rezeptur = berechneRezeptur(rezeptur);

    const result = produziereRezeptur([rezeptur], inventory, rezeptur.id, { zielTankNr: 'T 1' });
    expect(result.ok).toBe(false);
  });

  it('bricht mit Fehler ab, wenn kein Zieltank angegeben ist', () => {
    const inventory = [makeInventoryItem()];
    const rezeptur = buildFertigeRezeptur(inventory);
    const result = produziereRezeptur([rezeptur], inventory, rezeptur.id, { zielTankNr: '' });
    expect(result.ok).toBe(false);
  });

  it('bricht mit Fehler ab, wenn die Rezeptur bereits produziert wurde', () => {
    const inventory = [makeInventoryItem()];
    const rezeptur = { ...buildFertigeRezeptur(inventory), status: 'produziert' as const };
    const result = produziereRezeptur([rezeptur], inventory, rezeptur.id, { zielTankNr: 'T 1' });
    expect(result.ok).toBe(false);
  });

  it('freie Zutaten (Wasser) werden nicht als Lagerabgang gebucht', () => {
    const inventory = [makeInventoryItem({ id: 'zm', currentQuantityLiters: 1000, alcoholVolProzent: 60 })];
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur = fuegeKomponenteHinzu(rezeptur, inventory[0], 'liter', 100);
    // Wasser als freie Zutat manuell hinzufügen
    rezeptur.komponenten.push({
      id: 'wasser', produktId: 'FREITEXT', produktName: 'Wasser', istFreieZutat: true, freitextZutat: 'Wasser',
      eingabeTyp: 'liter', eingabeWert: 20, istFix: true, reduktionsfaktor: 1,
      alkoholgehalt: 0, verfuegbareMenge: Infinity, mengeInLiter: 0, anteilProzent: 0, literAlkohol: 0, istVerfuegbar: true,
    });
    rezeptur.basisMenge = 120;
    rezeptur = berechneRezeptur(rezeptur);

    const result = produziereRezeptur([rezeptur], inventory, rezeptur.id, { zielTankNr: 'T 1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Nur die 100L Mazerat wurden abgebucht, Wasser ist nicht im Inventar
    expect(result.inventoryItems.find(i => i.id === 'zm')!.currentQuantityLiters).toBeCloseTo(900, 3);
    expect(result.inventoryItems).toHaveLength(2); // zm + neuer GFKC-Posten, kein Wasser-Item
  });
});
