import { v4 as uuidv4 } from 'uuid';
import type { StoredInventoryItem, InventoryTransaction } from '@/schemas/inventorySchema';
import { calcLA } from '@/lib/mazeration-calc';

const STORAGE_KEY = 'inventoryItems';
const TRANSACTIONS_KEY = 'inventoryTransactions';

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
  type: 'Zugang' | 'Abgang',
  qty: number,
  opts: { notes?: string; date?: Date } = {},
): InventoryTransaction {
  return {
    id: uuidv4(),
    itemId: item.id,
    artikelNummer: item.artikelNummer,
    produktName: item.produktName,
    chargenNummer: item.chargenNummer || '',
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
