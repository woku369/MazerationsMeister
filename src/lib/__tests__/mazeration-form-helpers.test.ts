import { describe, it, expect } from 'vitest';
import { calculateLADetails, buildCalculatedValuesForImportedProtocol } from '../mazeration-form-helpers';
import { calcLA, toVolumeLiters } from '../mazeration-calc';

describe('calculateLADetails', () => {
  it('delegates eingesetzteLA to calcLA/toVolumeLiters (kg-Fall, Alkohol in ml)', () => {
    // plantWeightUnit 'kg' => yieldUnit 'l', unabhängig von alcoholVolumeUnit
    const result = calculateLADetails('kg', 5000, 60, 'ml', 3, 70);
    const expectedEingesetzt = parseFloat(calcLA(toVolumeLiters(5000, 'ml'), 60).toFixed(4));
    const expectedAusbeute = parseFloat(calcLA(toVolumeLiters(3, 'l'), 70).toFixed(4));
    expect(result.eingesetzteLA).toBeCloseTo(expectedEingesetzt, 4);
    expect(result.ausbeuteLA).toBeCloseTo(expectedAusbeute, 4);
    expect(result.verlustLA).toBeCloseTo(expectedEingesetzt - expectedAusbeute, 4);
  });

  it('delegates eingesetzteLA to calcLA/toVolumeLiters (g-Fall, Alkohol in l)', () => {
    // plantWeightUnit 'g' => yieldUnit 'ml'
    const result = calculateLADetails('g', 5, 60, 'l', 3000, 70);
    const expectedEingesetzt = parseFloat(calcLA(toVolumeLiters(5, 'l'), 60).toFixed(4));
    const expectedAusbeute = parseFloat(calcLA(toVolumeLiters(3000, 'ml'), 70).toFixed(4));
    expect(result.eingesetzteLA).toBeCloseTo(expectedEingesetzt, 4);
    expect(result.ausbeuteLA).toBeCloseTo(expectedAusbeute, 4);
  });

  it('returns null values when inputs are missing', () => {
    const result = calculateLADetails('kg', null, null, 'l', null, null);
    expect(result.eingesetzteLA).toBeNull();
    expect(result.ausbeuteLA).toBeNull();
    expect(result.verlustLA).toBeNull();
  });
});

describe('buildCalculatedValuesForImportedProtocol (Aufgabe 12 - PWA-Import-Absturz)', () => {
  it('berechnet Ratio und LA aus einem rohen, importierten Protokoll-Objekt', () => {
    const raw = {
      plantWeight: 5000, plantWeightUnit: 'kg',
      alcoholVolume: 3, alcoholVolumeUnit: 'l', alcoholConcentration: 60,
      yieldVolume: 2.5, endConcentration: 55,
    };
    const result = buildCalculatedValuesForImportedProtocol(raw);
    expect(result.ratio).not.toBe('1:X');
    expect(result.eingesetzteLA).toBeCloseTo(calcLA(3, 60), 4);
    expect(result.ausbeuteLA).toBeCloseTo(calcLA(2.5, 55), 4);
    expect(result.verlustLA).not.toBeNull();
  });

  it('liefert sichere Defaults (kein Crash) bei komplett leerem/fremdem Objekt', () => {
    const result = buildCalculatedValuesForImportedProtocol({});
    expect(result.macerationDuration).toBe('0 Tage, 0 Stunden');
    expect(result.vorbereitungHours).toBeNull();
    expect(result.summeZeitaufzeichnungStunden).toBeNull();
    // Struktur muss vollständig sein, damit generateCumulativeXlsx nicht auf undefined zugreift
    expect(result).toHaveProperty('yieldDisplayUnit');
    expect(result).toHaveProperty('lossUnitDisplay');
  });
});
