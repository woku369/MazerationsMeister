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
