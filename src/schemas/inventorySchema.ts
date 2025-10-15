
import { z } from 'zod';


// Dynamische Kategorien: Typ nur noch string, Validierung erfolgt im UI
export type InventoryItemCategory = string;

const numberPreprocessInventory = (val: unknown) => {
  if (typeof val === 'string') return val.replace(',', '.');
  if (typeof val === 'number') return String(val);
  return val;
};

// Schema for the form in AddInventoryItemDialog
export const inventoryItemFormSchema = z.object({
  literAbsolutalkohol: z.preprocess(
    numberPreprocessInventory,
    z.coerce.number().optional()
  ),
  dichte20C: z.preprocess(
    numberPreprocessInventory,
    z.coerce.number().optional()
  ),
  id: z.string().optional(), // Present if editing
  artikelNummer: z.string().optional(),
  produktName: z.string().min(1, "Produktname ist erforderlich."),
  chargenNummer: z.string().optional(),
  category: z.string().min(1, "Kategorie ist erforderlich."),
  tankNr: z.string().min(1, "Tanknummer/Lagerort ist erforderlich."),
  quantityLiters: z.preprocess(
    numberPreprocessInventory,
    z.coerce.number({ required_error: "Menge ist erforderlich.", invalid_type_error: "Ungültige Mengenangabe."})
      .min(0, "Menge muss nicht-negativ sein")
  ),
  alcoholVolProzent: z.preprocess(
    numberPreprocessInventory,
    z.coerce.number({ required_error: "Alkoholgehalt ist erforderlich.", invalid_type_error: "Ungültiger Alkoholgehalt."})
      .min(0, "Alkoholgehalt muss nicht-negativ sein")
      .max(100, "Alkoholgehalt darf 100% nicht überschreiten")
  ),
  inventoryDate: z.date({ required_error: "Inventur-/Erfassungsdatum ist erforderlich.", invalid_type_error: "Ungültiges Datum." }),
  bemerkungen: z.string().optional(),
  kennzeichen: z.string().min(1).default('S'),
});

export type InventoryItemFormInput = z.infer<typeof inventoryItemFormSchema>;

// Schema for the stored/displayed inventory item data (representing a batch)
export type StoredInventoryItem = {
  dichte20C?: number; // Dichte bei 20°C
  literAbsolutalkohol?: number; // Liter Absolutalkohol (optional, für Import)
  id: string; // UUID for the batch entry
  artikelNummer: string; // User-defined item number for the product type
  produktName: string; // Descriptive name of the product
  chargenNummer: string; // Batch number, if applicable
  category: InventoryItemCategory;
  tankNr: string;
  currentQuantityLiters: number;
  alcoholVolProzent: number;
  lastInventoryDate: Date; // Date this batch/stock was recorded or last transaction occurred
  bemerkungen: string;
  kennzeichen: string;
};

// Schema for the transaction form in RecordTransactionDialog
export const transactionFormSchema = z.object({
  quantityLiters: z.preprocess(
    numberPreprocessInventory,
    z.coerce.number({ required_error: "Menge ist erforderlich.", invalid_type_error: "Ungültige Mengenangabe."})
      .positive("Menge muss positiv sein.")
  ),
  transactionDate: z.date({ required_error: "Transaktionsdatum ist erforderlich.", invalid_type_error: "Ungültiges Datum."}),
  notes: z.string().optional(),
});
export type TransactionFormInput = z.infer<typeof transactionFormSchema>;


// Core data for a transaction (passed from dialog to handler)
export type InventoryTransactionCoreData = {
    quantityLiters: number;
    transactionDate: Date;
    notes?: string;
};

// Full transaction schema for storing transactions separately
export const inventoryTransactionSchema = z.object({
  id: z.string(), // UUID for the transaction itself
  itemId: z.string(), // Refers to StoredInventoryItem.id (batch id)
  artikelNummer: z.string(), // Denormalized for easier display/filtering
  produktName: z.string(), // Denormalized for easier display/filtering
  chargenNummer: z.string(), // Denormalized, use empty string if not applicable
  type: z.enum(['Zugang', 'Abgang']), 
  quantityLiters: z.number().positive("Menge muss positiv sein"),
  transactionDate: z.date(),
  notes: z.string(), // Use empty string if not applicable
});

export type InventoryTransaction = z.infer<typeof inventoryTransactionSchema>;
