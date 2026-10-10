import { v4 as uuidv4 } from 'uuid';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { ArtikelDefinition } from '@/schemas/artikelDefinitionSchema';

function defKey(produktName: string, category: string): string {
  return `${produktName}::${category}`;
}

/**
 * Ermittelt Artikeldefinitionen, die aus dem Lagerbestand übernommen werden
 * müssten, aber im Artikelstamm noch fehlen. Schlüssel aus Produktname +
 * Kategorie, NICHT nur Produktname (Nutzer-Meldung 10.10.2026, nach einem
 * Echtdaten-Test): Mazerat und Destillat derselben Pflanze (z.B.
 * Zitronenmelisse) tragen denselben Produktnamen, sind aber zwei
 * grundverschiedene Artikel - mit reinem Produktnamen als Schlüssel wurde
 * die zweite Kategorie nie nachgezogen, sobald die erste einmal im
 * Artikelstamm existierte. Gleicher Lückentyp wie in `generateSummaryXlsx()`
 * (inventory-management.tsx, Nutzer-Meldung 30.09.2026) bereits behoben -
 * dort aber übersehen, dass diese zweite Stelle denselben Fehler hatte.
 */
export function computeMissingArtikelDefinitionen(
  inventoryItems: StoredInventoryItem[],
  artikelDefinitionen: ArtikelDefinition[],
): ArtikelDefinition[] {
  const existierendeSchluessel = new Set(artikelDefinitionen.map(a => defKey(a.produktName, a.category)));
  const kombinationenAusInventar = new Map<string, StoredInventoryItem>();
  inventoryItems.forEach(item => {
    const name = (item.produktName || '').toString().trim();
    if (!name) return;
    const key = defKey(name, item.category || '');
    if (!kombinationenAusInventar.has(key)) kombinationenAusInventar.set(key, item);
  });

  return Array.from(kombinationenAusInventar.entries())
    .filter(([key]) => !existierendeSchluessel.has(key))
    .map(([, item]) => {
      const name = (item.produktName || '').toString().trim();
      return {
        id: uuidv4(),
        artikelNummer: '',
        produktName: name,
        category: item.category || '',
        beschreibung: '',
        alcoholVolProzent: item.alcoholVolProzent,
        dichte20C: item.dichte20C,
        // Kennzeichen ist produktweit (nicht kategorieabhängig) - von einer
        // bereits vorhandenen Kategorie-Variante desselben Produkts
        // übernehmen, falls es eine gibt.
        kennzeichen: artikelDefinitionen.find(a => a.produktName === name)?.kennzeichen || '',
      } as ArtikelDefinition;
    });
}
