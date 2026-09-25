export type TankDefinition = {
  id: string;        // Eindeutiger Schlüssel = tankNr (z.B. "T 341", "Fass-3"); wird von QR-Codes als URL-Parameter verwendet
  tankNr: string;    // Anzeigename, identisch mit id
  bezeichnung: string; // z.B. "Edelstahl 1000L"
  volumenLiter: number; // z.B. 1000
};

export const initialTankDefinitions: TankDefinition[] = [
  // Tanks werden automatisch aus dem Inventar geladen
  // Falls keine vorhanden, können manuell welche hinzugefügt werden
];
