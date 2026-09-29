import { v4 as uuidv4 } from 'uuid';
import * as StockService from './stock-service';
import { calcLA } from './mazeration-calc';
import type { StoredInventoryItem, InventoryTransaction } from '@/schemas/inventorySchema';
import type { LohnabfuellerVersand, VersandContainer } from '@/schemas/versandSchema';

/** Summe LA über alle Gebinde eines Versands. */
export function calcContainerLA(container: VersandContainer[]): number {
  return container.reduce((sum, c) => sum + calcLA(c.mengeLiter, c.alkoholVolProzent), 0);
}

/**
 * Summe Nettogewicht (kg) über alle Gebinde, für das externe Lieferschein-
 * Formular (siehe versandSchema.ts). `null`, wenn für mindestens ein Gebinde
 * keine Dichte vorliegt - dann wäre eine Teilsumme irreführend statt hilfreich.
 */
export function calcContainerNettogewichtKg(container: VersandContainer[]): number | null {
  if (container.length === 0 || container.some(c => c.dichte20C == null)) return null;
  return container.reduce((sum, c) => sum + c.mengeLiter * (c.dichte20C as number), 0);
}

const STORAGE_KEY = 'lohnabfuellerVersaende';

// ---------------------------------------------------------------------------
// Pure transformation functions — no side effects, fully testable
// ---------------------------------------------------------------------------

/** Nächste fortlaufende Versandnummer im Format LF-<Jahr>-<001>. */
export function generateVersandNummer(existing: LohnabfuellerVersand[], year: number = new Date().getFullYear()): string {
  const prefix = `LF-${year}-`;
  const numbers = existing
    .map(v => v.versandNummer)
    .filter(nr => nr.startsWith(prefix))
    .map(nr => parseInt(nr.slice(prefix.length), 10))
    .filter(n => Number.isFinite(n));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Bucht einen Versand an den Lohnabfüller: legt den Versand-Datensatz an und
 * bucht sofort den Abgang für jedes enthaltene Gebinde. Kein Rücklauf-Schritt -
 * fertig abgefüllte Ware wird nicht als Bulk-Bestand in dieser App geführt.
 */
export function createVersand(
  versaende: LohnabfuellerVersand[],
  inventoryItems: StoredInventoryItem[],
  transactions: InventoryTransaction[],
  params: {
    lohnabfuellerName: string;
    versanddatum: string;
    container: VersandContainer[];
    bemerkungen?: string;
    bruttogewichtKg?: number;
    plombenNummern?: string;
    externeLieferscheinNr?: string;
  },
): { versaende: LohnabfuellerVersand[]; inventoryItems: StoredInventoryItem[]; transactions: InventoryTransaction[]; versand: LohnabfuellerVersand } {
  const versand: LohnabfuellerVersand = {
    id: uuidv4(),
    versandNummer: generateVersandNummer(versaende),
    lohnabfuellerName: params.lohnabfuellerName,
    versanddatum: params.versanddatum,
    container: params.container,
    versandLA: parseFloat(calcContainerLA(params.container).toFixed(3)),
    bruttogewichtKg: params.bruttogewichtKg,
    plombenNummern: params.plombenNummern,
    externeLieferscheinNr: params.externeLieferscheinNr,
    bemerkungen: params.bemerkungen,
    createdAt: new Date().toISOString(),
  };

  let items = inventoryItems;
  let txs = transactions;
  for (const c of params.container) {
    const result = StockService.recordTransaction(items, txs, c.inventoryItemId, 'Abgang', c.mengeLiter, {
      notes: `Versand ${versand.versandNummer} (${params.lohnabfuellerName})`,
      date: new Date(params.versanddatum),
    });
    items = result.items;
    txs = result.transactions;
  }

  return { versaende: [...versaende, versand], inventoryItems: items, transactions: txs, versand };
}

// ---------------------------------------------------------------------------
// localStorage I/O — für Verwendung außerhalb von React-Komponenten
// ---------------------------------------------------------------------------

export function readAll(): LohnabfuellerVersand[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LohnabfuellerVersand[]) : [];
  } catch {
    return [];
  }
}

export function writeAll(versaende: LohnabfuellerVersand[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(versaende));
}

/** Read → createVersand → write (alle 3 Stores). Gibt den neuen Versand zurück. */
export function persistCreateVersand(params: {
  lohnabfuellerName: string;
  versanddatum: string;
  container: VersandContainer[];
  bemerkungen?: string;
  bruttogewichtKg?: number;
  plombenNummern?: string;
  externeLieferscheinNr?: string;
}): LohnabfuellerVersand {
  const result = createVersand(readAll(), StockService.readAll(), StockService.readTransactions(), params);
  writeAll(result.versaende);
  StockService.writeAll(result.inventoryItems);
  StockService.writeTransactions(result.transactions);
  return result.versand;
}
