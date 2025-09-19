export const calculateNetWeightDetailsForProtocol = (
  numberOfCrates?: number | null,
  grossWeightKg?: number | null,
  tarePerCrateKg: number = 2.0
): { calculatedNetWeightKg: number | null; averageNetWeightPerCrateKg: number | null } => {
  const numCrates = Number(numberOfCrates);
  const grossKg = Number(grossWeightKg);
  if (!Number.isFinite(numCrates) || !Number.isFinite(grossKg)) {
    return { calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null };
  }
  if (numCrates <= 0 || grossKg <= 0) {
    return { calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null };
  }
  const netWeight = grossKg - numCrates * tarePerCrateKg;
  if (!Number.isFinite(netWeight) || netWeight <= 0) {
    return { calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null };
  }
  return {
    calculatedNetWeightKg: parseFloat(netWeight.toFixed(2)),
    averageNetWeightPerCrateKg: parseFloat((netWeight / numCrates).toFixed(2)),
  };
};
