import { v4 as uuidv4 } from 'uuid';
import * as StockService from './stock-service';
import { syncTankDefinitionsWithInventory } from './tank-sync';
import type { StoredInventoryItem, InventoryTransaction } from '@/schemas/inventorySchema';
import type { Leergebinde, LeergebindeStatus } from '@/schemas/leergebindeSchema';

const STORAGE_KEY = 'leergebinde';

// ---------------------------------------------------------------------------
// Pure transformation functions — no side effects, fully testable
// ---------------------------------------------------------------------------

/**
 * Legt ein neues Leergebinde an. Lehnt eine bereits vergebene Bezeichnung ab,
 * da sie beim Befüllen zur tankNr wird - zwei Gebinde mit derselben
 * Bezeichnung würden sich sonst stillschweigend denselben Lagerposten teilen.
 */
export function createLeergebinde(
  list: Leergebinde[],
  params: {
    bezeichnung: string;
    taraKg: number;
    volumenLiter?: number;
    status?: Extract<LeergebindeStatus, 'leer' | 'erwartet'>;
    herkunft?: string;
    bemerkungen?: string;
  },
): { ok: true; list: Leergebinde[]; gebinde: Leergebinde } | { ok: false; error: string } {
  const bezeichnung = params.bezeichnung.trim();
  if (!bezeichnung) {
    return { ok: false, error: 'Bezeichnung fehlt.' };
  }
  if (list.some(g => g.bezeichnung.trim().toLowerCase() === bezeichnung.toLowerCase())) {
    return { ok: false, error: `Ein Leergebinde mit der Bezeichnung "${bezeichnung}" existiert bereits.` };
  }
  const now = new Date().toISOString();
  const gebinde: Leergebinde = {
    id: uuidv4(),
    bezeichnung,
    taraKg: params.taraKg,
    volumenLiter: params.volumenLiter,
    status: params.status ?? 'leer',
    herkunft: params.herkunft,
    bemerkungen: params.bemerkungen,
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, list: [...list, gebinde], gebinde };
}

/** Markiert ein erwartetes Gebinde als angekommen. No-op bei falschem Status. */
export function markAngekommen(list: Leergebinde[], id: string): Leergebinde[] {
  const gebinde = list.find(g => g.id === id);
  if (!gebinde || gebinde.status !== 'erwartet') return list;
  return list.map(g => (g.id === id ? { ...g, status: 'leer' as const, updatedAt: new Date().toISOString() } : g));
}

/**
 * Befüllt ein leeres Gebinde aus einem bestehenden Lagerposten: bucht den
 * Abgang beim Quellposten und den Zugang in den Gebinde-"Tank" (tankNr =
 * Gebinde-Bezeichnung) über die bestehende StockService-Maschinerie.
 */
export function befuellen(
  gebinde: Leergebinde[],
  inventoryItems: StoredInventoryItem[],
  transactions: InventoryTransaction[],
  gebindeId: string,
  params: { quellItemId: string; mengeLiter: number; datum?: string },
):
  | { ok: true; gebinde: Leergebinde[]; inventoryItems: StoredInventoryItem[]; transactions: InventoryTransaction[] }
  | { ok: false; error: string } {
  const g = gebinde.find(x => x.id === gebindeId);
  if (!g) return { ok: false, error: 'Leergebinde nicht gefunden.' };
  if (g.status !== 'leer') {
    return { ok: false, error: `Gebinde "${g.bezeichnung}" ist nicht befüllbar (Status: ${g.status}).` };
  }
  const quelle = inventoryItems.find(i => i.id === params.quellItemId);
  if (!quelle) return { ok: false, error: 'Quellposten nicht gefunden.' };

  const date = params.datum ? new Date(params.datum) : undefined;

  const abgang = StockService.recordTransaction(inventoryItems, transactions, params.quellItemId, 'Abgang', params.mengeLiter, {
    notes: `Umfüllen in Gebinde ${g.bezeichnung}`,
    date,
  });
  if (!abgang.ok) return { ok: false, error: abgang.error };

  const zugang = StockService.recordPoolIntoTank(
    abgang.items,
    abgang.transactions,
    g.bezeichnung,
    {
      produktName: quelle.produktName,
      chargenNummer: quelle.chargenNummer,
      category: quelle.category,
      alkoholVolProzent: quelle.alcoholVolProzent,
      dichte20C: quelle.dichte20C,
      mengeLiter: params.mengeLiter,
    },
    { notes: `Befüllt aus ${quelle.tankNr}`, date },
  );
  if (!zugang.ok) return { ok: false, error: zugang.error };

  const updatedGebinde = gebinde.map(x =>
    x.id === gebindeId
      ? { ...x, status: 'befuellt' as const, inventoryItemId: zugang.konsolidiertesItem.id, updatedAt: new Date().toISOString() }
      : x,
  );

  return { ok: true, gebinde: updatedGebinde, inventoryItems: zugang.items, transactions: zugang.transactions };
}

/** Markiert ein befülltes Gebinde als versendet. No-op bei falschem Status. */
export function markVersendet(list: Leergebinde[], id: string): Leergebinde[] {
  const gebinde = list.find(g => g.id === id);
  if (!gebinde || gebinde.status !== 'befuellt') return list;
  return list.map(g => (g.id === id ? { ...g, status: 'versendet' as const, updatedAt: new Date().toISOString() } : g));
}

// ---------------------------------------------------------------------------
// localStorage I/O — für Verwendung außerhalb von React-Komponenten
// ---------------------------------------------------------------------------

export function readAll(): Leergebinde[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Leergebinde[]) : [];
  } catch {
    return [];
  }
}

export function writeAll(list: Leergebinde[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function persistCreateLeergebinde(params: {
  bezeichnung: string;
  taraKg: number;
  volumenLiter?: number;
  status?: Extract<LeergebindeStatus, 'leer' | 'erwartet'>;
  herkunft?: string;
  bemerkungen?: string;
}): ReturnType<typeof createLeergebinde> {
  const result = createLeergebinde(readAll(), params);
  if (result.ok) writeAll(result.list);
  return result;
}

export function persistMarkAngekommen(id: string): void {
  writeAll(markAngekommen(readAll(), id));
}

export function persistBefuellen(
  gebindeId: string,
  params: { quellItemId: string; mengeLiter: number; datum?: string },
): ReturnType<typeof befuellen> {
  const result = befuellen(readAll(), StockService.readAll(), StockService.readTransactions(), gebindeId, params);
  if (result.ok) {
    writeAll(result.gebinde);
    StockService.writeAll(result.inventoryItems);
    StockService.writeTransactions(result.transactions);
    // Der neue Gebinde-"Tank" soll sofort überall auftauchen (Einlagern,
    // QR-Codes, Tank-Viewer), nicht erst nach einem Besuch der
    // Lagerverwaltung, die diesen Sync sonst als erste auslösen würde.
    syncTankDefinitionsWithInventory();
  }
  return result;
}

export function persistMarkVersendet(id: string): void {
  writeAll(markVersendet(readAll(), id));
}
