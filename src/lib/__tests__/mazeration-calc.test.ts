import { describe, it, expect } from 'vitest';
import { toVolumeLiters, calcLA, korrDichte20, calcVolumeFromMassAndDensity } from '../mazeration-calc';

describe('toVolumeLiters', () => {
  it('converts ml to liters', () => {
    expect(toVolumeLiters(500, 'ml')).toBeCloseTo(0.5);
  });
  it('leaves liters unchanged', () => {
    expect(toVolumeLiters(10, 'l')).toBe(10);
  });
  it('leaves liters unchanged for unknown unit', () => {
    expect(toVolumeLiters(10, 'L')).toBe(10);
  });
});

describe('calcLA', () => {
  it('calculates Liter Absolutalkohol', () => {
    expect(calcLA(100, 40)).toBeCloseTo(40);
  });
  it('returns 0 for 0% alcohol', () => {
    expect(calcLA(100, 0)).toBe(0);
  });
  it('returns 0 for 0 volume', () => {
    expect(calcLA(0, 40)).toBe(0);
  });
});

describe('korrDichte20', () => {
  it('returns rhoT unchanged at 20°C', () => {
    expect(korrDichte20(0.9500, 20)).toBe(0.9500);
  });
  it('returns rhoT unchanged if tempC is NaN', () => {
    expect(korrDichte20(0.9500, NaN)).toBe(0.9500);
  });
  it('applies correction below 20°C', () => {
    // rhoT + 0.00066 * (15 - 20) = 0.9500 - 0.0033 = 0.9467
    expect(korrDichte20(0.9500, 15)).toBeCloseTo(0.9467, 4);
  });
  it('applies correction above 20°C', () => {
    // 0.9500 + 0.00066 * (25 - 20) = 0.9500 + 0.0033 = 0.9533
    expect(korrDichte20(0.9500, 25)).toBeCloseTo(0.9533, 4);
  });
});

describe('calcVolumeFromMassAndDensity', () => {
  it('computes volume without temperature correction', () => {
    expect(calcVolumeFromMassAndDensity(0.95, 0.95)).toBeCloseTo(1.0, 5);
  });
  it('applies temperature correction when tempC provided', () => {
    const rho20 = korrDichte20(0.9500, 15);
    expect(calcVolumeFromMassAndDensity(rho20, 0.9500, 15)).toBeCloseTo(1.0, 5);
  });
  it('skips correction when tempC is undefined', () => {
    expect(calcVolumeFromMassAndDensity(0.95, 0.95, undefined)).toBeCloseTo(1.0, 5);
  });
});
