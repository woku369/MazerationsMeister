export type LohnbrandStatus = 'unterwegs' | 'abgeschlossen';

/** Ein Gebinde, das im Rahmen eines Lohnbrand-Auftrags das Haus verlässt. */
export type LohnbrandContainer = {
  inventoryItemId: string;   // Referenz auf das StoredInventoryItem, aus dem die Menge abgebucht wird
  tankNr: string;            // denormalisiert für Anzeige: welches Gebinde geht raus
  produktName: string;       // denormalisiert
  chargenNummer?: string;
  mengeLiter: number;        // Ausgangsmenge (kann eine Teilmenge des Lagerpostens sein)
  alkoholVolProzent: number; // Ausgangskonzentration
};

export type LohnbrandAuftrag = {
  id: string;
  auftragsNummer: string;    // fortlaufend, z.B. "LB-2026-003"
  lohnbrennerName: string;
  status: LohnbrandStatus;

  ausgangsdatum: string;     // ISO-Datum
  container: LohnbrandContainer[];

  // Erst bei Abschluss befüllt:
  ruecklaufdatum?: string;
  ergebnisProduktName?: string;
  ergebnisMengeLiter?: number;
  ergebnisAlkoholVolProzent?: number;
  zielTankNr?: string;

  bemerkungen?: string;
  createdAt: string;
  updatedAt: string;
};
