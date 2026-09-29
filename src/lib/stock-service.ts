import { v4 as uuidv4 } from 'uuid';
import type { StoredInventoryItem, InventoryTransaction } from '@/schemas/inventorySchema';
import { calcLA } from '@/lib/mazeration-calc';

const STORAGE_KEY = 'inventoryItems';
const TRANSACTIONS_KEY = 'inventoryTransactions';

/**
 * Findet einen bereits bekannten Wert (Chargennummer oder Tank-Nr.), der sich vom
 * eingegebenen Text nur in Groß-/Kleinschreibung oder Leerzeichen unterscheidet
 * (z.B. "GFKC-N" vs. "GFKC-n") - ein echter neuer Wert (der Normalfall bei neuen
 * Chargen) löst dabei bewusst KEINE Warnung aus, nur der Verdacht auf denselben,
 * nur leicht anders geschriebenen Datensatz (Aufgabe 26 Punkt 5 / Aufgabe 27 Punkt 3).
 */
export function findAehnlichenWert(eingabe: string, bekannt: string[]): string | undefined {
  const normalisiert = eingabe.trim().toLowerCase();
  if (!normalisiert) return undefined;
  return bekannt.find(c => c !== eingabe.trim() && c.trim().toLowerCase() === normalisiert);
}

/**
 * literAbsolutalkohol muss bei jeder Mengen-/Konzentrationsänderung neu
 * berechnet werden, sonst läuft er gegenüber currentQuantityLiters auseinander
 * (siehe docs/REVIEW-2026-09-cross-modul-kohaerenz.md, Befund B3/B4).
 */
function withRecalculatedLA(item: StoredInventoryItem): StoredInventoryItem {
  return {
    ...item,
    literAbsolutalkohol: parseFloat(
      calcLA(item.currentQuantityLiters ?? 0, item.alcoholVolProzent ?? 0).toFixed(2)
    ),
  };
}

// ---------------------------------------------------------------------------
// Pure transformation functions — no side effects, fully testable
// ---------------------------------------------------------------------------

export function addEntry(
  items: StoredInventoryItem[],
  item: StoredInventoryItem,
): StoredInventoryItem[] {
  return [...items, withRecalculatedLA(item)];
}

export function removeEntry(
  items: StoredInventoryItem[],
  id: string,
): StoredInventoryItem[] {
  return items.filter(i => i.id !== id);
}

export function updateEntry(
  items: StoredInventoryItem[],
  updated: StoredInventoryItem,
): StoredInventoryItem[] {
  const recalculated = withRecalculatedLA(updated);
  return items.map(i => (i.id === recalculated.id ? recalculated : i));
}

export function applyTransaction(
  items: StoredInventoryItem[],
  id: string,
  type: 'Zugang' | 'Abgang',
  qty: number,
): StoredInventoryItem[] {
  return items.map(item => {
    if (item.id !== id) return item;
    const current = item.currentQuantityLiters ?? 0;
    const next = type === 'Zugang' ? current + qty : current - qty;
    return withRecalculatedLA({
      ...item,
      currentQuantityLiters: Math.max(0, next),
      lastInventoryDate: new Date(),
    });
  });
}

function makeTransactionEntry(
  item: StoredInventoryItem,
  type: InventoryTransaction['type'],
  qty: number,
  opts: { notes?: string; date?: Date } = {},
): InventoryTransaction {
  return {
    id: uuidv4(),
    itemId: item.id,
    artikelNummer: item.artikelNummer,
    produktName: item.produktName,
    chargenNummer: item.chargenNummer || '',
    tankNr: item.tankNr || '',
    alcoholVolProzent: item.alcoholVolProzent ?? 0,
    type,
    quantityLiters: qty,
    transactionDate: opts.date ?? new Date(),
    notes: opts.notes || '',
  };
}

/**
 * Wie applyTransaction, aber schreibt zusätzlich einen Journal-Eintrag ins
 * Buchungsjournal (dasselbe, das die manuelle Zugang/Abgang-Buchung in der
 * Lagerverwaltung befüllt). Das ist die einzige Stelle, über die jede Buchung
 * - egal ob manuell, Lohnbrand, Versand oder Rezeptur - chronologisch und
 * belegbar im Journal landet, statt nur die Bestandsmenge zu ändern.
 */
export function recordTransaction(
  items: StoredInventoryItem[],
  transactions: InventoryTransaction[],
  id: string,
  type: 'Zugang' | 'Abgang',
  qty: number,
  opts: { notes?: string; date?: Date } = {},
): { items: StoredInventoryItem[]; transactions: InventoryTransaction[] } {
  const item = items.find(i => i.id === id);
  const updatedItems = applyTransaction(items, id, type, qty);
  if (!item) return { items: updatedItems, transactions };
  return { items: updatedItems, transactions: [...transactions, makeTransactionEntry(item, type, qty, opts)] };
}

/**
 * Wie addEntry (neuen Lagerposten anlegen), aber schreibt zusätzlich einen
 * "Zugang"-Journal-Eintrag für den neuen Posten. Für Fälle wie Lohnbrand-
 * Rücklauf oder Rezeptur-Produktion, wo ein komplett neuer Posten entsteht,
 * statt eine Menge auf einen bestehenden Posten zu buchen.
 */
export function recordNewEntry(
  items: StoredInventoryItem[],
  transactions: InventoryTransaction[],
  item: StoredInventoryItem,
  opts: { notes?: string; date?: Date } = {},
): { items: StoredInventoryItem[]; transactions: InventoryTransaction[] } {
  const updatedItems = addEntry(items, item);
  const entry = makeTransactionEntry(item, 'Zugang', item.currentQuantityLiters, opts);
  return { items: updatedItems, transactions: [...transactions, entry] };
}

/**
 * Wie updateEntry (bestehenden Posten direkt bearbeiten), aber schreibt
 * zusätzlich einen "Korrektur"-Journal-Eintrag mit dem Vorher/Nachher-Wert.
 *
 * Für Inventur-Korrekturen: der rechnerische Misch-ABV aus dem Poolen ist
 * eine gute Näherung, aber bei der Inventur wird pro Tank gespindelt bzw.
 * die tatsächliche Menge per Steigrohr-Differenz (vorher/nachher) ermittelt -
 * das reale Ergebnis kann vom rechnerischen abweichen und muss korrigierbar
 * sein, OHNE dass die Korrektur im Buchungsjournal verschwindet (derselbe
 * Lückentyp wie Aufgabe 23, hier für den direkten "Bearbeiten"-Weg).
 */
export function recordCorrection(
  items: StoredInventoryItem[],
  transactions: InventoryTransaction[],
  updated: StoredInventoryItem,
  opts: { notes?: string; date?: Date } = {},
): { items: StoredInventoryItem[]; transactions: InventoryTransaction[] } {
  const before = items.find(i => i.id === updated.id);
  const updatedItems = updateEntry(items, updated);
  if (!before) return { items: updatedItems, transactions };

  const mengeDelta = Math.abs((updated.currentQuantityLiters ?? 0) - (before.currentQuantityLiters ?? 0));
  const vorherText = `${before.currentQuantityLiters.toFixed(2)} L @ ${before.alcoholVolProzent}%`;
  const nachherText = `${updated.currentQuantityLiters.toFixed(2)} L @ ${updated.alcoholVolProzent}%`;
  const detailNote = `Inventur-Korrektur: ${vorherText} → ${nachherText}${opts.notes ? ` (${opts.notes})` : ''}`;

  const entry = makeTransactionEntry(updated, 'Korrektur', parseFloat(mengeDelta.toFixed(3)), { ...opts, notes: detailNote });
  return { items: updatedItems, transactions: [...transactions, entry] };
}

export type NeueMenge = {
  produktName: string;
  chargenNummer?: string;
  category: string;
  alkoholVolProzent: number;
  mengeLiter: number;
};

// Ein Bestandteil, der beim Poolen in den konsolidierten Posten eingeflossen ist -
// hält die Chargenherkunft fest, die sonst beim Verschmelzen verloren ginge
// (siehe Aufgabe 27, Punkt 2 - externes Audit).
export type PoolKomponente = { chargenNummer: string; mengeLiter: number };

export type PoolIntoTankResult =
  | { ok: true; items: StoredInventoryItem[]; konsolidiertesItem: StoredInventoryItem; vorherMenge: number; vorherAbv: number; komponenten: PoolKomponente[] }
  | { ok: false; error: string };

function formatKomponente(k: PoolKomponente): string {
  return `${k.mengeLiter.toFixed(2)} L${k.chargenNummer ? ` (Charge ${k.chargenNummer})` : ''}`;
}

/**
 * Bucht eine neue Menge in einen Tank ein und verschmilzt sie mit bereits
 * vorhandenem Inhalt desselben Produkts zu EINEM Posten mit neu berechnetem
 * Misch-ABV (gewichtet über LA) - statt wie addEntry() einfach eine weitere,
 * separate Zeile im selben Tank anzulegen.
 *
 * Hintergrund: In einem fest verrohrten Tank vermischt sich neu eingebrachte
 * Flüssigkeit physisch vollständig mit dem Bestand - mehrere Chargen aus
 * verschiedenen Mazerationen im selben Tank sind danach EIN homogenes
 * Gemisch mit einem tatsächlichen ABV, nicht mehrere Posten mit je eigenem
 * ABV nebeneinander. Bereits vorhandene, nicht zusammengeführte Altzeilen
 * desselben Produkts im Zieltank werden dabei gleich mit konsolidiert.
 *
 * Gibt einen Fehler zurück, wenn der Zieltank bereits ein ANDERES Produkt
 * enthält (kein stilles Vermischen unterschiedlicher Produkte) - außer
 * `allowMismatch` ist gesetzt.
 */
export function poolIntoTank(
  items: StoredInventoryItem[],
  tankNr: string,
  neu: NeueMenge,
  opts: { allowMismatch?: boolean } = {},
): PoolIntoTankResult {
  const inTank = items.filter(i => i.tankNr === tankNr);
  const fremdprodukt = inTank.find(i => i.produktName !== neu.produktName);
  if (fremdprodukt && !opts.allowMismatch) {
    return { ok: false, error: `Tank ${tankNr} enthält bereits "${fremdprodukt.produktName}" - ein anderes Produkt als "${neu.produktName}".` };
  }

  const bestehende = inTank.filter(i => i.produktName === neu.produktName);
  const vorherMenge = bestehende.reduce((s, i) => s + i.currentQuantityLiters, 0);
  const vorherLA = bestehende.reduce((s, i) => s + calcLA(i.currentQuantityLiters, i.alcoholVolProzent), 0);
  const vorherAbv = vorherMenge > 0 ? (vorherLA / vorherMenge) * 100 : 0;

  const neueLA = calcLA(neu.mengeLiter, neu.alkoholVolProzent);
  const gesamtMenge = vorherMenge + neu.mengeLiter;
  const gesamtLA = vorherLA + neueLA;
  const gesamtAbv = gesamtMenge > 0 ? (gesamtLA / gesamtMenge) * 100 : 0;

  // Chargenherkunft sammeln, statt beim Verschmelzen stillschweigend nur eine
  // Chargennummer zu übernehmen: alle tatsächlich beteiligten Chargen (aus den
  // bestehenden Zeilen und der neuen Menge) fließen in die Komponenten-Liste
  // ein, die recordPoolIntoTank() für den Journal-Eintrag nutzt. Sind sie alle
  // gleich (Normalfall bei der realen Chargenvergabe, siehe Aufgabe 22), bleibt
  // die Chargennummer wie bisher ein einzelner, sauberer Wert - nur wenn sich
  // tatsächlich unterschiedliche Chargen mischen, wird das im Feld selbst sichtbar.
  const komponenten: PoolKomponente[] = [
    ...bestehende.map(i => ({ chargenNummer: i.chargenNummer || '', mengeLiter: i.currentQuantityLiters })),
    { chargenNummer: neu.chargenNummer || '', mengeLiter: neu.mengeLiter },
  ];
  const distinkteChargen = Array.from(new Set(komponenten.map(k => k.chargenNummer).filter(Boolean)));
  const kombinierteChargenNummer = distinkteChargen.length > 1 ? distinkteChargen.join(' + ') : (distinkteChargen[0] ?? '');

  const basis = bestehende[0];
  const konsolidiertesItem: StoredInventoryItem = withRecalculatedLA({
    id: basis?.id ?? uuidv4(),
    artikelNummer: basis?.artikelNummer ?? neu.produktName,
    produktName: neu.produktName,
    chargenNummer: kombinierteChargenNummer,
    category: neu.category || basis?.category || '',
    tankNr,
    currentQuantityLiters: parseFloat(gesamtMenge.toFixed(3)),
    alcoholVolProzent: parseFloat(gesamtAbv.toFixed(3)),
    lastInventoryDate: new Date(),
    bemerkungen: basis?.bemerkungen ?? '',
    kennzeichen: basis?.kennzeichen ?? 'S',
  });

  const ersetzteIds = new Set(bestehende.map(i => i.id));
  const updatedItems = [...items.filter(i => !ersetzteIds.has(i.id)), konsolidiertesItem];

  return { ok: true, items: updatedItems, konsolidiertesItem, vorherMenge, vorherAbv, komponenten };
}

/**
 * Wie poolIntoTank, aber schreibt zusätzlich einen "Zugang"-Journal-Eintrag
 * über die tatsächlich neu hinzugekommene Menge (nicht über den neuen
 * Tank-Gesamtstand).
 */
export function recordPoolIntoTank(
  items: StoredInventoryItem[],
  transactions: InventoryTransaction[],
  tankNr: string,
  neu: NeueMenge,
  opts: { notes?: string; date?: Date; allowMismatch?: boolean } = {},
): { ok: true; items: StoredInventoryItem[]; transactions: InventoryTransaction[]; konsolidiertesItem: StoredInventoryItem; vorherMenge: number; vorherAbv: number; komponenten: PoolKomponente[] } | { ok: false; error: string } {
  const result = poolIntoTank(items, tankNr, neu, { allowMismatch: opts.allowMismatch });
  if (!result.ok) return result;

  // Nur bei einer tatsächlichen Verschmelzung (Tank hatte schon Inhalt) die
  // Zusammensetzung im Journal festhalten - bei der ersten Einlagerung in
  // einen leeren Tank gibt es nichts zu erklären.
  const kompositionsNote = result.komponenten.length > 1
    ? `Zusammensetzung: ${result.komponenten.map(formatKomponente).join(' + ')} → ${formatKomponente({ chargenNummer: result.konsolidiertesItem.chargenNummer, mengeLiter: result.konsolidiertesItem.currentQuantityLiters })}`
    : undefined;
  const notes = [opts.notes, kompositionsNote].filter(Boolean).join(' — ');

  const entry = makeTransactionEntry(result.konsolidiertesItem, 'Zugang', neu.mengeLiter, { ...opts, notes });
  return { ...result, transactions: [...transactions, entry] };
}

// ---------------------------------------------------------------------------
// localStorage I/O — for use outside React components (e.g. mazeration-form)
// ---------------------------------------------------------------------------

export function readAll(): StoredInventoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredInventoryItem[]) : [];
  } catch {
    return [];
  }
}

export function writeAll(items: StoredInventoryItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Read → add → write. Returns the new full list. */
export function persistAddEntry(item: StoredInventoryItem): StoredInventoryItem[] {
  const updated = addEntry(readAll(), item);
  writeAll(updated);
  return updated;
}

export function readTransactions(): InventoryTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? (JSON.parse(raw) as InventoryTransaction[]) : [];
  } catch {
    return [];
  }
}

export function writeTransactions(transactions: InventoryTransaction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

/** Read → recordTransaction → write (beide Stores). Für einzelne Buchungen außerhalb von React-Komponenten. */
export function persistRecordTransaction(
  id: string,
  type: 'Zugang' | 'Abgang',
  qty: number,
  opts: { notes?: string; date?: Date } = {},
): { items: StoredInventoryItem[]; transactions: InventoryTransaction[] } {
  const result = recordTransaction(readAll(), readTransactions(), id, type, qty, opts);
  writeAll(result.items);
  writeTransactions(result.transactions);
  return result;
}

/** Read → recordPoolIntoTank → write (beide Stores). */
export function persistPoolIntoTank(
  tankNr: string,
  neu: NeueMenge,
  opts: { notes?: string; date?: Date; allowMismatch?: boolean } = {},
): ReturnType<typeof recordPoolIntoTank> {
  const result = recordPoolIntoTank(readAll(), readTransactions(), tankNr, neu, opts);
  if (result.ok) {
    writeAll(result.items);
    writeTransactions(result.transactions);
  }
  return result;
}
