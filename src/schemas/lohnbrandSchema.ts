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
  ausgangsLA: number;        // Summe LA über alle Gebinde beim Ausgang (unversteuert, zoll-/buchungsrelevant) - zum
                              // Erstellungszeitpunkt berechnet und fest gespeichert, damit der Wert auch dann noch
                              // stimmt, wenn sich die Quell-Lagerposten später ändern

  // Erst bei Abschluss befüllt:
  ruecklaufdatum?: string;
  ergebnisProduktName?: string;
  ergebnisMengeLiter?: number;
  ergebnisAlkoholVolProzent?: number;
  ergebnisLA?: number;       // LA des zurückgekommenen Destillats
  verlustLA?: number;        // ausgangsLA - ergebnisLA (Brennverlust, muss dokumentiert werden -
                              // fehlt sonst unerklärt im Gesamt-LA-Bestand)
  zielTankNr?: string;

  bemerkungen?: string;
  createdAt: string;
  updatedAt: string;
};
