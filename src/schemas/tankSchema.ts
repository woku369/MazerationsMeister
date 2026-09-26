export type TankDefinition = {
  id: string;        // Eindeutiger Schlüssel = tankNr (z.B. "T 341", "Fass-3"); wird von QR-Codes als URL-Parameter verwendet
  tankNr: string;    // Anzeigename, identisch mit id
  bezeichnung: string; // z.B. "Edelstahl 1000L"
  volumenLiter: number; // z.B. 1000
  // Anzeigemodus für tank-viewer.html: true (Standard für neue Tanks) = Füllstand/Inhalt
  // kommt aus dem Inventar (Zeilen mit passendem tankNr summieren). false = Inhalt steht
  // direkt auf diesem Datensatz (currentContent/volumenLiter als Füllstand) - nur für
  // ältere, gruppenweise erfasste Gebinde (Fass/Fl/Ballon-Sammelposten) relevant.
  // Fehlt das Feld (aeltere Daten), wird true angenommen (siehe tank-viewer.html).
  hasUniqueNumber?: boolean;
  currentContent?: string;
  status?: string;
};

export const initialTankDefinitions: TankDefinition[] = [
  // Tanks werden automatisch aus dem Inventar geladen
  // Falls keine vorhanden, können manuell welche hinzugefügt werden
];
