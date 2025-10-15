import { describe, it, expect } from 'vitest';
import { calculateNetWeightDetailsForProtocol } from '../../lib/mazeration-calc';

describe('calculateNetWeightDetailsForProtocol', () => {
  it('returns nulls for invalid inputs', () => {
    expect(calculateNetWeightDetailsForProtocol(null, null)).toEqual({ calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null });
    expect(calculateNetWeightDetailsForProtocol(0, 10)).toEqual({ calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null });
    expect(calculateNetWeightDetailsForProtocol(10, 0)).toEqual({ calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null });
  });

  it('calculates correct net and average', () => {
    const res = calculateNetWeightDetailsForProtocol(10, 120, 2);
    // gross 120 - (10*2) = 100 net -> avg 10
    expect(res.calculatedNetWeightKg).toBeCloseTo(100, 2);
    expect(res.averageNetWeightPerCrateKg).toBeCloseTo(10, 2);
  });
});
