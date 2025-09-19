export type TankDefinition = {
  id: string; // UUID
  tankNr: string; // z.B. T01
  bezeichnung: string; // z.B. "Edelstahl 1000L"
  volumenLiter: number; // z.B. 1000
};

export const initialTankDefinitions: TankDefinition[] = [
  // Tanks werden automatisch aus dem Inventar geladen
  // Falls keine vorhanden, können manuell welche hinzugefügt werden
];
