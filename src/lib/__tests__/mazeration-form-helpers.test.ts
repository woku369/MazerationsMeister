import { describe, it, expect } from 'vitest';
import { calculateLADetails } from '../mazeration-form-helpers';
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
