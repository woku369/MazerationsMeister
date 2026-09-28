/** Ein Gebinde, das im Rahmen eines Versands an den Lohnabfüller das Haus verlässt. */
export type VersandContainer = {
  inventoryItemId: string;   // Referenz auf das StoredInventoryItem, aus dem die Menge abgebucht wird
  tankNr: string;            // denormalisiert für Anzeige: welches Gebinde geht raus
  produktName: string;       // denormalisiert
  chargenNummer?: string;
  mengeLiter: number;        // Ausgangsmenge (kann eine Teilmenge des Lagerpostens sein)
  alkoholVolProzent: number; // Ausgangskonzentration
};

/**
 * Versand von fertiger Ware (z.B. GFKC bulk) an einen Lohnabfüller zur
 * Abfüllung/Etikettierung. Bewusst kein Rücklauf-Tracking wie beim
 * Lohnbrand-Auftrag: was zurückkommt sind fertig abgefüllte Flaschen (Stück),
 * keine Bulk-Flüssigkeit mehr - das liegt außerhalb dessen, was diese App
 * sonst trackt (Tanks/Gebinde in Litern). Nur der Versand (Abgang) wird
 * strukturiert festgehalten.
 */
export type LohnabfuellerVersand = {
  id: string;
  versandNummer: string;       // fortlaufend, z.B. "LF-2026-003"
  lohnabfuellerName: string;   // z.B. "Mozart"
  versanddatum: string;        // ISO-Datum
  container: VersandContainer[];
  versandLA: number;           // Summe LA über alle Gebinde beim Versand - rein informativ für die
                                // Alkohol-Bilanz, KEIN Steuerbetrag (Buchungen laufen steuerfrei)
  bemerkungen?: string;
  createdAt: string;
};
