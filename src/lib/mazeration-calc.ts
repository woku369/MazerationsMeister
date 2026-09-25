/** Konvertiert ein Volumen von ml oder l nach Liter. */
export function toVolumeLiters(volume: number, unit: string): number {
  return unit === 'ml' ? volume / 1000 : volume;
}

/** Liter Absolutalkohol: Volumen (L) × Alkohol% ÷ 100. */
export function calcLA(volumeLiters: number, alcoholVolProzent: number): number {
  return volumeLiters * (alcoholVolProzent / 100);
}

/**
 * Dichtekorrektur auf 20 °C.
 * Koeffizient 0,00066 g/cm³/°C (lineare Näherung für Ethanollösungen).
 */
export function korrDichte20(rhoT: number, tempC: number): number {
  return isNaN(tempC) || tempC === 20 ? rhoT : rhoT + 0.00066 * (tempC - 20);
}

/** Volumen (L) aus Masse (kg) und Dichte; optional mit Temperaturkorrektur auf 20 °C. */
export function calcVolumeFromMassAndDensity(
  massKg: number,
  rhoT: number,
  tempC?: number,
): number {
  const rho20 = tempC !== undefined ? korrDichte20(rhoT, tempC) : rhoT;
  return massKg / rho20;
}

export const calculateNetWeightDetailsForProtocol = (
  numberOfCrates?: number | null,
  grossWeightKg?: number | null,
  tarePerCrateKg: number = 2.0,
  numberOfPallets?: number | null,
  tarePerPalletKg?: number | null,
): { calculatedNetWeightKg: number | null; averageNetWeightPerCrateKg: number | null } => {
  const grossKg = Number(grossWeightKg);
  if (!Number.isFinite(grossKg) || grossKg <= 0) {
    return { calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null };
  }
  const numCrates = Number(numberOfCrates) || 0;
  const numPallets = Number(numberOfPallets) || 0;
  const palletTare = Number(tarePerPalletKg) || 20.0;
  const crateTaraTotal = numCrates > 0 ? numCrates * tarePerCrateKg : 0;
  const palletTaraTotal = numPallets > 0 ? numPallets * palletTare : 0;
  const netWeight = grossKg - crateTaraTotal - palletTaraTotal;
  if (!Number.isFinite(netWeight) || netWeight <= 0) {
    return { calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null };
  }
  return {
    calculatedNetWeightKg: parseFloat(netWeight.toFixed(2)),
    averageNetWeightPerCrateKg: numCrates > 0 ? parseFloat((netWeight / numCrates).toFixed(2)) : null,
  };
};
