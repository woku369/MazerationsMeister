import { describe, it, expect } from 'vitest';
import { computeMissingArtikelDefinitionen } from '../artikel-definition-sync';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { ArtikelDefinition } from '@/schemas/artikelDefinitionSchema';

function makeItem(overrides: Partial<StoredInventoryItem>): StoredInventoryItem {
  return {
    id: 'item-1',
    artikelNummer: '',
    produktName: 'Zitronenmelisse',
    chargenNummer: '',
    category: 'M',
    tankNr: 'T1',
    currentQuantityLiters: 100,
    alcoholVolProzent: 60,
    lastInventoryDate: new Date(),
    bemerkungen: '',
    kennzeichen: 'S',
    ...overrides,
  } as StoredInventoryItem;
}

function makeDef(overrides: Partial<ArtikelDefinition>): ArtikelDefinition {
  return {
    id: 'def-1',
    artikelNummer: '',
    produktName: 'Zitronenmelisse',
    category: 'M',
    beschreibung: '',
    kennzeichen: 'S',
    ...overrides,
  };
}

describe('computeMissingArtikelDefinitionen()', () => {
  it('erkennt Mazerat und Destillat derselben Pflanze als zwei getrennt fehlende Artikel (Nutzer-Meldung 10.10.2026)', () => {
    const inventory = [
      makeItem({ id: 'i1', produktName: 'Zitronenmelisse', category: 'M' }),
      makeItem({ id: 'i2', produktName: 'Zitronenmelisse', category: 'Dest' }),
    ];
    const result = computeMissingArtikelDefinitionen(inventory, []);
    const keys = result.map(d => `${d.produktName}::${d.category}`).sort();
    expect(keys).toEqual(['Zitronenmelisse::Dest', 'Zitronenmelisse::M']);
  });

  it('übernimmt nur die noch fehlende Kategorie, wenn eine Kategorie bereits im Artikelstamm existiert', () => {
    const inventory = [
      makeItem({ id: 'i1', produktName: 'Zitronenmelisse', category: 'M' }),
      makeItem({ id: 'i2', produktName: 'Zitronenmelisse', category: 'Dest' }),
    ];
    const bestehend = [makeDef({ produktName: 'Zitronenmelisse', category: 'M' })];
    const result = computeMissingArtikelDefinitionen(inventory, bestehend);
    expect(result).toHaveLength(1);
    expect(result[0].produktName).toBe('Zitronenmelisse');
    expect(result[0].category).toBe('Dest');
  });

  it('erzeugt keine neuen Artikel, wenn beide Kategorien bereits vorhanden sind', () => {
    const inventory = [
      makeItem({ id: 'i1', produktName: 'Zitronenmelisse', category: 'M' }),
      makeItem({ id: 'i2', produktName: 'Zitronenmelisse', category: 'Dest' }),
    ];
    const bestehend = [
      makeDef({ produktName: 'Zitronenmelisse', category: 'M' }),
      makeDef({ produktName: 'Zitronenmelisse', category: 'Dest' }),
    ];
    expect(computeMissingArtikelDefinitionen(inventory, bestehend)).toHaveLength(0);
  });

  it('übernimmt das Kennzeichen von einer bereits vorhandenen Kategorie-Variante desselben Produkts', () => {
    const inventory = [makeItem({ id: 'i2', produktName: 'Zitronenmelisse', category: 'Dest' })];
    const bestehend = [makeDef({ produktName: 'Zitronenmelisse', category: 'M', kennzeichen: 'Z' })];
    const result = computeMissingArtikelDefinitionen(inventory, bestehend);
    expect(result[0].kennzeichen).toBe('Z');
  });

  it('dedupliziert mehrere Lagerposten derselben Produkt/Kategorie-Kombination zu einer Artikeldefinition', () => {
    const inventory = [
      makeItem({ id: 'i1', produktName: 'Thymian', category: 'M', chargenNummer: '1001' }),
      makeItem({ id: 'i2', produktName: 'Thymian', category: 'M', chargenNummer: '1002' }),
    ];
    expect(computeMissingArtikelDefinitionen(inventory, [])).toHaveLength(1);
  });

  it('ignoriert Lagerposten ohne Produktname', () => {
    const inventory = [makeItem({ id: 'i1', produktName: '' })];
    expect(computeMissingArtikelDefinitionen(inventory, [])).toHaveLength(0);
  });
});
