/** Ein Gebinde, das im Rahmen eines Versands an den Lohnabfüller das Haus verlässt. */
export type VersandContainer = {
  inventoryItemId: string;   // Referenz auf das StoredInventoryItem, aus dem die Menge abgebucht wird
  tankNr: string;            // denormalisiert für Anzeige: welches Gebinde geht raus
  produktName: string;       // denormalisiert
  chargenNummer?: string;
  mengeLiter: number;        // Ausgangsmenge (kann eine Teilmenge des Lagerpostens sein)
  alkoholVolProzent: number; // Ausgangskonzentration
  dichte20C?: number;        // denormalisiert, für die Nettogewicht-Berechnung fürs Lieferschein-Formular
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
  // Die folgenden Felder dienen nur dazu, alle Werte für das externe (auf
  // Schlumberger-Briefkopf ausgestellte) Lieferschein-Papierformular an einer
  // Stelle griffbereit zu haben - die App erzeugt kein eigenes Lieferschein-PDF,
  // dafür fehlt die Berechtigung (Schlumberger hält die Zolllager-Bewilligung).
  // Brutto-, Tara- und (daraus) das tatsächliche Nettogewicht werden laut Nutzer
  // ohnehin händisch mit der Waage ermittelt - beide hier eingetragen ergeben
  // das reale, gewogene Netto (Brutto - Tara), zusätzlich zur rein rechnerischen
  // Schätzung über Menge x Dichte (siehe calcContainerNettogewichtKg).
  bruttogewichtKg?: number;      // inkl. Gebinde, per Waage ermittelt - manuell
  taragewichtKg?: number;        // Eigengewicht der leeren Gebinde, per Waage ermittelt - manuell
  plombenNummern?: string;       // z.B. "2762725-2762730" (je IBC 2 Plomben aus einem Vorratsbehälter), frei erfasst
  externeLieferscheinNr?: string; // Schlumbergers eigene Nummerierung, z.B. "1/2026" - unabhängig von versandNummer
  bemerkungen?: string;
  createdAt: string;
};
