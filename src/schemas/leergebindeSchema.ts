/**
 * Leergebinde-Verwaltung (z.B. IBCs, Fässer), die für den Versand an einen
 * Lohnabfüller aus einem Bulk-Tank befüllt werden. Lebenszyklus:
 *
 *   erwartet  -> leer  -> befuellt  -> versendet
 *  (angelegt,   (vor Ort,  (enthält     (Teil eines
 *   noch nicht   befüllbar) Produkt,     gebuchten
 *   vor Ort)                verknüpft    Versands -
 *                            mit einem    Endzustand)
 *                            Lagerposten)
 *
 * Sobald ein Gebinde befüllt ist, ist es einfach ein weiterer Tank im
 * bestehenden Sinn (bezeichnung wird zu tankNr, siehe tank-sync.ts
 * "Auto-erkannt") - die eigentliche Mengen-/ABV-Buchung läuft über die
 * bestehende StockService-Maschinerie, nicht über ein eigenes Parallelsystem.
 */
export type LeergebindeStatus = 'erwartet' | 'leer' | 'befuellt' | 'versendet';

export type Leergebinde = {
  id: string;
  bezeichnung: string;        // frei vergeben (z.B. "IBC-A"), wird zu tankNr sobald befüllt
  taraKg: number;
  volumenLiter?: number;      // optional, nur für die Kapazitäts-Warnung beim Befüllen
  status: LeergebindeStatus;
  herkunft?: string;          // z.B. "Mozart"
  inventoryItemId?: string;   // gesetzt sobald befuellt - Referenz auf den StoredInventoryItem-Posten mit diesem Inhalt
  bemerkungen?: string;
  createdAt: string;
  updatedAt: string;
};
