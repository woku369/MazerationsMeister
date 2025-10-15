export type ContainerType = 
  | 'tank'        // Nummerierte Tanks (T 341, T 431, etc.)
  | 'bottle'      // Flaschen
  | 'barrel'      // Fässer  
  | 'ibc'         // IBC-Container
  | 'balloon'     // Ballons
  | 'other';      // Sonstige Behältnisse

export type ContainerStatus = 
  | 'empty'       // Leer
  | 'filled'      // Befüllt
  | 'shipped'     // Versandt
  | 'returned';   // Retour

export type ContainerMovement = {
  timestamp: string; // ISO-8601 Zeitstempel
  type: 'fill' | 'ship' | 'return' | 'empty' | 'note'; // Art der Bewegung
  note: string; // z.B. "Versandt an Brennerei XY" oder "1000L Produkt X eingefüllt"
  fromTank?: string; // Quell-Tank (bei fill)
  amount?: number; // Menge in Litern (bei fill)
  product?: string; // Produkt-Name
};

export type TankDefinition = {
  id: string; // UUID
  tankNr: string; // z.B. T01 oder "Container 1" oder "Fass 3"
  bezeichnung: string; // z.B. "Edelstahl 1000L" oder "Glasflasche 750ml"
  volumenLiter: number; // z.B. 1000
  containerType: ContainerType; // Behältnistyp
  hasUniqueNumber: boolean; // true für T 341, false für Container/Fässer mit dynamischer Nummer
  
  // Neue Felder für dynamisches Behälter-Management
  status?: ContainerStatus; // Aktueller Status (nur für dynamische Behälter)
  currentContent?: string; // Aktueller Inhalt (Referenz zu inventoryItems)
  movements?: ContainerMovement[]; // Historie aller Bewegungen
  notes?: string; // Zusätzliche Notizen
};

export const initialTankDefinitions: TankDefinition[] = [
  // Tanks werden automatisch aus dem Inventar geladen
  // Falls keine vorhanden, können manuell welche hinzugefügt werden
];
