import { v4 as uuidv4 } from 'uuid';
import * as StockService from './stock-service';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { LohnbrandAuftrag, LohnbrandContainer, LohnbrandStatus } from '@/schemas/lohnbrandSchema';

const STORAGE_KEY = 'lohnbrandAuftraege';

// ---------------------------------------------------------------------------
// Pure transformation functions — no side effects, fully testable
// ---------------------------------------------------------------------------

/** Nächste fortlaufende Auftragsnummer im Format LB-<Jahr>-<001>. */
export function generateAuftragsNummer(existing: LohnbrandAuftrag[], year: number = new Date().getFullYear()): string {
  const prefix = `LB-${year}-`;
  const numbers = existing
    .map(a => a.auftragsNummer)
    .filter(nr => nr.startsWith(prefix))
    .map(nr => parseInt(nr.slice(prefix.length), 10))
    .filter(n => Number.isFinite(n));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Legt einen neuen Lohnbrand-Auftrag an und bucht sofort den Abgang für jedes
 * enthaltene Gebinde. Das Material verlässt zu diesem Zeitpunkt real das Haus.
 */
export function createAuftrag(
  auftraege: LohnbrandAuftrag[],
  inventoryItems: StoredInventoryItem[],
  params: {
    lohnbrennerName: string;
    ausgangsdatum: string;
    container: LohnbrandContainer[];
    bemerkungen?: string;
  },
): { auftraege: LohnbrandAuftrag[]; inventoryItems: StoredInventoryItem[]; auftrag: LohnbrandAuftrag } {
  const now = new Date().toISOString();
  const auftrag: LohnbrandAuftrag = {
    id: uuidv4(),
    auftragsNummer: generateAuftragsNummer(auftraege),
    lohnbrennerName: params.lohnbrennerName,
    status: 'unterwegs',
    ausgangsdatum: params.ausgangsdatum,
    container: params.container,
    bemerkungen: params.bemerkungen,
    createdAt: now,
    updatedAt: now,
  };

  let items = inventoryItems;
  for (const c of params.container) {
    items = StockService.applyTransaction(items, c.inventoryItemId, 'Abgang', c.mengeLiter);
  }

  return { auftraege: [...auftraege, auftrag], inventoryItems: items, auftrag };
}

/**
 * Schließt einen Auftrag ab: bucht das zurückgekommene Destillat als neuen
 * Lagerposten im Zieltank ein und markiert den Auftrag als abgeschlossen.
 * Immer die Gesamtmenge auf einmal (keine Teilrückläufe, siehe Aufgabe 15).
 */
export function completeAuftrag(
  auftraege: LohnbrandAuftrag[],
  inventoryItems: StoredInventoryItem[],
  auftragId: string,
  ergebnis: {
    ruecklaufdatum: string;
    ergebnisProduktName: string;
    ergebnisMengeLiter: number;
    ergebnisAlkoholVolProzent: number;
    zielTankNr: string;
  },
): { auftraege: LohnbrandAuftrag[]; inventoryItems: StoredInventoryItem[] } {
  const now = new Date().toISOString();
  const auftrag = auftraege.find(a => a.id === auftragId);
  if (!auftrag || auftrag.status !== 'unterwegs') return { auftraege, inventoryItems };

  const neuesItem: StoredInventoryItem = {
    id: uuidv4(),
    artikelNummer: auftrag.auftragsNummer,
    produktName: ergebnis.ergebnisProduktName,
    chargenNummer: Array.from(new Set(auftrag.container.map(c => c.chargenNummer).filter(Boolean))).join('/') || auftrag.auftragsNummer,
    category: 'Dest',
    tankNr: ergebnis.zielTankNr,
    currentQuantityLiters: ergebnis.ergebnisMengeLiter,
    alcoholVolProzent: ergebnis.ergebnisAlkoholVolProzent,
    lastInventoryDate: new Date(ergebnis.ruecklaufdatum),
    bemerkungen: `Rücklauf Lohnbrand ${auftrag.auftragsNummer} (${auftrag.lohnbrennerName})`,
    kennzeichen: 'S',
  };

  const updatedItems = StockService.addEntry(inventoryItems, neuesItem);

  const updatedAuftraege = auftraege.map(a => a.id === auftragId ? {
    ...a,
    status: 'abgeschlossen' as LohnbrandStatus,
    ruecklaufdatum: ergebnis.ruecklaufdatum,
    ergebnisProduktName: ergebnis.ergebnisProduktName,
    ergebnisMengeLiter: ergebnis.ergebnisMengeLiter,
    ergebnisAlkoholVolProzent: ergebnis.ergebnisAlkoholVolProzent,
    zielTankNr: ergebnis.zielTankNr,
    updatedAt: now,
  } : a);

  return { auftraege: updatedAuftraege, inventoryItems: updatedItems };
}

// ---------------------------------------------------------------------------
// localStorage I/O — für Verwendung außerhalb von React-Komponenten
// ---------------------------------------------------------------------------

export function readAll(): LohnbrandAuftrag[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LohnbrandAuftrag[]) : [];
  } catch {
    return [];
  }
}

export function writeAll(auftraege: LohnbrandAuftrag[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auftraege));
}

/** Read → createAuftrag → write (beide Stores). Gibt den neuen Auftrag zurück. */
export function persistCreateAuftrag(params: {
  lohnbrennerName: string;
  ausgangsdatum: string;
  container: LohnbrandContainer[];
  bemerkungen?: string;
}): LohnbrandAuftrag {
  const result = createAuftrag(readAll(), StockService.readAll(), params);
  writeAll(result.auftraege);
  StockService.writeAll(result.inventoryItems);
  return result.auftrag;
}

/** Read → completeAuftrag → write (beide Stores). */
export function persistCompleteAuftrag(auftragId: string, ergebnis: {
  ruecklaufdatum: string;
  ergebnisProduktName: string;
  ergebnisMengeLiter: number;
  ergebnisAlkoholVolProzent: number;
  zielTankNr: string;
}): void {
  const result = completeAuftrag(readAll(), StockService.readAll(), auftragId, ergebnis);
  writeAll(result.auftraege);
  StockService.writeAll(result.inventoryItems);
}
