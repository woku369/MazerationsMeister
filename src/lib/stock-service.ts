import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import { calcLA } from '@/lib/mazeration-calc';

const STORAGE_KEY = 'inventoryItems';

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
