import { describe, it, expect } from 'vitest';
import { getYieldUnit, type Protocol } from '@/app/mazerationen/sammelliste/page';

function makeProtocol(overrides: Partial<Protocol> = {}): Protocol {
  return { ...overrides };
}

describe('getYieldUnit (Sammelliste Faktor-1000-Bug, Aufgabe 11)', () => {
  it('nutzt yieldVolumeUnit, wenn vorhanden (z.B. importierte PWA-Protokolle)', () => {
    expect(getYieldUnit(makeProtocol({ yieldVolumeUnit: 'ml', plantWeightUnit: 'kg' }))).toBe('ml');
    expect(getYieldUnit(makeProtocol({ yieldVolumeUnit: 'l', plantWeightUnit: 'g' }))).toBe('l');
  });

  it('leitet die Einheit aus plantWeightUnit ab, wenn yieldVolumeUnit fehlt (Altprotokolle)', () => {
    // Kleinmengen-Protokoll (g) -> Ausbeute wurde in ml erfasst, NICHT Liter
    expect(getYieldUnit(makeProtocol({ plantWeightUnit: 'g' }))).toBe('ml');
    // Großmengen-Protokoll (kg) -> Ausbeute wurde in Liter erfasst
    expect(getYieldUnit(makeProtocol({ plantWeightUnit: 'kg' }))).toBe('l');
  });

  it('fällt bei komplett fehlenden Angaben auf ml zurück (Default von getDerivedUnitsForProtocol)', () => {
    expect(getYieldUnit(makeProtocol({}))).toBe('ml');
  });
});
