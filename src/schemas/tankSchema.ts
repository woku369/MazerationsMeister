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
  // Eigengewicht des leeren Gebindes, optional (Nutzer-Anfrage 03.10.2026):
  // macht nur für mobile Gebinde (Fässer, IBCs, Ballons) Sinn, nicht für fest
  // installierte Tanks - deshalb kein Pflichtfeld, sondern bei Bedarf
  // nachpflegbar. Keine automatische Tank/Gebinde-Unterscheidung im Schema,
  // da es dafür keine zuverlässige Regel gibt (nur Namenskonvention) - der
  // Nutzer entscheidet selbst, wo das Feld sinnvoll ist.
  taraKg?: number;
};

export const initialTankDefinitions: TankDefinition[] = [
  // Tanks werden automatisch aus dem Inventar geladen
  // Falls keine vorhanden, können manuell welche hinzugefügt werden
];
