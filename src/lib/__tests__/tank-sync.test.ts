import { describe, it, expect } from 'vitest';
import { formatTankLabel } from '../tank-sync';
import type { TankDefinition } from '@/schemas/tankSchema';

function makeTank(overrides: Partial<TankDefinition>): TankDefinition {
  return {
    id: 'T349',
    tankNr: 'T 349',
    bezeichnung: 'T 349',
    volumenLiter: 5000,
    ...overrides,
  };
}

describe('formatTankLabel()', () => {
  it('entfernt das "Auto-erkannt: "-Präfix und zeigt nur noch die Tanknummer', () => {
    const tank = makeTank({ bezeichnung: 'Auto-erkannt: T 349' });
    expect(formatTankLabel(tank)).toBe('T 349');
  });

  it('haengt die Tanknummer in Klammern an eine echte, abweichende Bezeichnung an', () => {
    const tank = makeTank({ tankNr: 'T342', bezeichnung: 'Edelstahl 6420l' });
    expect(formatTankLabel(tank)).toBe('Edelstahl 6420l (T342)');
  });

  it('haengt die Tanknummer NICHT doppelt an, wenn sie bereits Teil der echten Bezeichnung ist', () => {
    const tank = makeTank({ tankNr: 'T342', bezeichnung: 'Fass T342 Keller' });
    expect(formatTankLabel(tank)).toBe('Fass T342 Keller');
  });
});
