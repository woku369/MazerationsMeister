import { describe, it, expect } from 'vitest';
import { filterTransactionsByDateRange } from '../transaction-filter';

type Item = { id: string; transactionDate: Date | string };

describe('filterTransactionsByDateRange() - Regressionstest für den NaN-Vergleichsbug (Nutzer-Meldung 10.10.2026)', () => {
  // transactionDate als ECHTER STRING, nicht als Date-Objekt - exakt das, was
  // nach einem localStorage.getItem()+JSON.parse() zur Laufzeit ankommt (die
  // konkrete Ursache des Bugs: ein Date-Objekt im Test hätte ihn nicht erkannt).
  const items: Item[] = [
    { id: 'alt', transactionDate: '2025-12-30T10:00:00.000Z' },
    { id: 'grenzwertig-fruh', transactionDate: '2026-10-10T00:00:00.000Z' },
    { id: 'heute', transactionDate: '2026-10-10T13:51:11.705Z' },
    { id: 'spaeter', transactionDate: '2026-10-15T08:00:00.000Z' },
  ];

  it('OHNE Filter: alle Einträge bleiben erhalten', () => {
    expect(filterTransactionsByDateRange(items, '', '')).toHaveLength(4);
  });

  it('MIT "Von"-Filter: Einträge ab dem Stichtag bleiben erhalten (vorher: IMMER leer wegen des String/Date-NaN-Vergleichsbugs)', () => {
    const result = filterTransactionsByDateRange(items, '2026-10-10', '');
    expect(result.map(i => i.id)).toEqual(['grenzwertig-fruh', 'heute', 'spaeter']);
  });

  it('MIT "Bis"-Filter: der Stichtag selbst ist bis 23:59:59.999 eingeschlossen', () => {
    const result = filterTransactionsByDateRange(items, '', '2026-10-10');
    expect(result.map(i => i.id)).toEqual(['alt', 'grenzwertig-fruh', 'heute']);
  });

  it('MIT Von+Bis kombiniert: nur der genau eingegrenzte Bereich', () => {
    const result = filterTransactionsByDateRange(items, '2026-10-10', '2026-10-10');
    expect(result.map(i => i.id)).toEqual(['grenzwertig-fruh', 'heute']);
  });

  it('funktioniert identisch, wenn transactionDate (untypisch) tatsächlich ein echtes Date-Objekt ist', () => {
    const asDateObjects: Item[] = items.map(i => ({ ...i, transactionDate: new Date(i.transactionDate) }));
    const result = filterTransactionsByDateRange(asDateObjects, '2026-10-10', '');
    expect(result.map(i => i.id)).toEqual(['grenzwertig-fruh', 'heute', 'spaeter']);
  });
});
