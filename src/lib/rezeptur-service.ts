/**
 * Rezeptur-Service: Persistenz + Buchungsfunktion für die GFKC-Ausmischung (Aufgabe 17).
 *
 * Das war die zentrale Lücke aus docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md: Auf
 * pages-clean gab es keine einzige Funktion, die beim Abschluss einer Rezeptur
 * tatsächlich bucht. produziereRezeptur() schließt diese Lücke - bucht Abgang für
 * jede Komponente (+ Sprit-Korrektur), legt den fertigen Posten im Zieltank an,
 * und befüllt produktionsDaten.
 */

import { v4 as uuidv4 } from 'uuid';
import * as StockService from './stock-service';
import { calcLA } from './mazeration-calc';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { Rezeptur } from '@/schemas/rezepturSchema';

const STORAGE_KEY = 'rezepturen';

// ---------------------------------------------------------------------------
// Pure transformation functions — no side effects, fully testable
// ---------------------------------------------------------------------------

export interface LaBilanz {
  eingesetzteLA: number;   // Summe LA aller gebuchten Komponenten + ggf. Sprit-Korrektur
  ergebnisLA: number;      // LA des fertigen, gebuchten Postens
  differenzLA: number;     // sollte bei reinem Verschnitt (kein Destillieren) ~0 sein
}

export type ProduziereRezepturErgebnis =
  | { ok: true; rezepturen: Rezeptur[]; inventoryItems: StoredInventoryItem[]; laBilanz: LaBilanz }
  | { ok: false; error: string };

/**
 * Bucht eine freigegebene Rezeptur: Abgang für jede Komponente (+ Sprit-Korrektur
 * falls durchgeführt), Zugang des fertigen Postens im Zieltank. Wasser hat keinen
 * Lagerbezug und wird nicht gebucht, erhöht aber die Endmenge.
 *
 * Reine Funktion über die Arrays - für Tests und den localStorage-Wrapper darunter.
 */
export function produziereRezeptur(
  rezepturen: Rezeptur[],
  inventoryItems: StoredInventoryItem[],
  rezepturId: string,
  params: {
    zielTankNr: string;
    chargenNummer?: string;
    produktionsdatum?: string; // ISO-Datum, Default: jetzt
    notizen?: string;
  },
): ProduziereRezepturErgebnis {
  const rezeptur = rezepturen.find(r => r.id === rezepturId);
  if (!rezeptur) return { ok: false, error: 'Rezeptur nicht gefunden.' };
  if (rezeptur.status === 'produziert') return { ok: false, error: 'Rezeptur wurde bereits produziert.' };
  if (!rezeptur.ergebnis) return { ok: false, error: 'Rezeptur hat noch kein berechnetes Ergebnis (Komponenten prüfen).' };
  if (!params.zielTankNr?.trim()) return { ok: false, error: 'Zieltank ist erforderlich.' };

  let items = [...inventoryItems];
  let eingesetzteLA = 0;

  // 1. Jede nicht-freie Komponente abbuchen (Menge = mengeFuerProduktion, falls
  //    skaliert, sonst mengeInLiter für einen 1:1-Testansatz)
  for (const komp of rezeptur.komponenten) {
    if (komp.istFreieZutat) continue; // Wasser etc. - kein Lagerbezug

    const menge = komp.mengeFuerProduktion ?? komp.mengeInLiter;
    const item = items.find(i => i.id === komp.produktId);
    if (!item) return { ok: false, error: `Komponente "${komp.produktName}" nicht im Lagerbestand gefunden.` };
    if (item.currentQuantityLiters < menge) {
      return {
        ok: false,
        error: `Nicht genug "${komp.produktName}" auf Lager: ${menge.toFixed(2)} L benötigt, nur ${item.currentQuantityLiters.toFixed(2)} L verfügbar.`,
      };
    }

    const alkoholgehalt = komp.alkoholgehaltManuell ?? komp.alkoholgehalt;
    eingesetzteLA += calcLA(menge, alkoholgehalt);
    items = StockService.applyTransaction(items, komp.produktId, 'Abgang', menge);
  }

  // 2. Alkoholkorrektur: Sprit-Zugabe muss ebenfalls von einem echten Lagerposten
  //    gebucht werden (Wasser nicht, hat keinen Lagerbezug). War in der Vorlage
  //    auf pages-clean komplett vergessen - nur berechnet, nie gebucht.
  let wasserZugabe = 0;
  let spritZugabe = 0;
  if (rezeptur.alkoholKorrektur?.korrekturBerechnet) {
    wasserZugabe = rezeptur.alkoholKorrektur.wasserZugabe ?? 0;
    spritZugabe = rezeptur.alkoholKorrektur.spritZugabe ?? 0;

    if (spritZugabe > 0) {
      const spritId = rezeptur.alkoholKorrektur.spritZugabeId;
      if (!spritId) return { ok: false, error: 'Alkoholkorrektur mit Sprit-Zugabe berechnet, aber kein Sprit-Lagerposten ausgewählt.' };
      const spritItem = items.find(i => i.id === spritId);
      if (!spritItem) return { ok: false, error: 'Ausgewählter Sprit-Lagerposten für die Korrektur nicht gefunden.' };
      if (spritItem.currentQuantityLiters < spritZugabe) {
        return {
          ok: false,
          error: `Nicht genug Sprit für die Korrektur: ${spritZugabe.toFixed(2)} L benötigt, nur ${spritItem.currentQuantityLiters.toFixed(2)} L verfügbar.`,
        };
      }
      eingesetzteLA += calcLA(spritZugabe, spritItem.alcoholVolProzent);
      items = StockService.applyTransaction(items, spritId, 'Abgang', spritZugabe);
    }
  }

  // 3. Endmenge und tatsächlichen ABV aus LA berechnen (nicht einfach zielAlkohol
  //    übernehmen - so bleibt die LA-Bilanz in sich konsistent und nachvollziehbar,
  //    siehe docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md Punkt 4/Aufgabe 19-Prinzip).
  const produzierteMenge = rezeptur.ergebnis.gesamtMengeLiter + wasserZugabe + spritZugabe;
  const tatsaechlicherAlkohol = produzierteMenge > 0 ? (eingesetzteLA / produzierteMenge) * 100 : 0;

  // 4. Fertigen Posten einbuchen
  const neuesItem: StoredInventoryItem = {
    id: uuidv4(),
    artikelNummer: rezeptur.zielProduktName,
    produktName: rezeptur.zielProduktName,
    chargenNummer: params.chargenNummer || rezeptur.variantenName || rezeptur.name,
    category: 'GFKC',
    tankNr: params.zielTankNr,
    currentQuantityLiters: parseFloat(produzierteMenge.toFixed(3)),
    alcoholVolProzent: parseFloat(tatsaechlicherAlkohol.toFixed(2)),
    lastInventoryDate: params.produktionsdatum ? new Date(params.produktionsdatum) : new Date(),
    bemerkungen: params.notizen || `Ausmischung ${rezeptur.name}${rezeptur.variantenName ? ' – ' + rezeptur.variantenName : ''}`,
    kennzeichen: 'S',
  };
  items = StockService.addEntry(items, neuesItem);

  const ergebnisLA = calcLA(neuesItem.currentQuantityLiters, neuesItem.alcoholVolProzent);

  // 5. Rezeptur aktualisieren: Status + produktionsDaten befüllen
  const now = new Date().toISOString();
  const updatedRezepturen = rezepturen.map(r => r.id === rezepturId ? {
    ...r,
    status: 'produziert' as const,
    geaendertAm: now,
    produktionsDaten: {
      produziertAm: params.produktionsdatum || now,
      produzierteMenge: neuesItem.currentQuantityLiters,
      tatsaechlicherAlkohol: neuesItem.alcoholVolProzent,
      zielTankNr: params.zielTankNr,
      chargenNummer: neuesItem.chargenNummer,
      neuesInventoryItemId: neuesItem.id,
      notizen: params.notizen,
    },
  } : r);

  return {
    ok: true,
    rezepturen: updatedRezepturen,
    inventoryItems: items,
    laBilanz: {
      eingesetzteLA: parseFloat(eingesetzteLA.toFixed(3)),
      ergebnisLA: parseFloat(ergebnisLA.toFixed(3)),
      differenzLA: parseFloat((eingesetzteLA - ergebnisLA).toFixed(3)),
    },
  };
}

// ---------------------------------------------------------------------------
// localStorage I/O — für Verwendung außerhalb von React-Komponenten
// ---------------------------------------------------------------------------

export function readAll(): Rezeptur[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Rezeptur[]) : [];
  } catch {
    return [];
  }
}

export function writeAll(rezepturen: Rezeptur[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rezepturen));
}

/** Read → produziereRezeptur → write (beide Stores). */
export function persistProduziereRezeptur(
  rezepturId: string,
  params: { zielTankNr: string; chargenNummer?: string; produktionsdatum?: string; notizen?: string },
): ProduziereRezepturErgebnis {
  const result = produziereRezeptur(readAll(), StockService.readAll(), rezepturId, params);
  if (result.ok) {
    writeAll(result.rezepturen);
    StockService.writeAll(result.inventoryItems);
  }
  return result;
}
