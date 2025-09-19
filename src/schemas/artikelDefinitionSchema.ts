import { z } from 'zod';
// Kategorie ist jetzt dynamisch, Validierung im UI

// Schema for the form in AddEditArtikelDefinitionDialog
export const artikelDefinitionFormSchema = z.object({
  id: z.string().optional(), // Present if editing
  artikelNummer: z.string().optional(), // Artikelnummer ist immer optional und darf leer sein
  produktName: z.string().min(1, "Produktname ist erforderlich."),
  category: z.string().min(1, "Kategorie ist erforderlich."),
  beschreibung: z.string().optional(),
  dichte20C: z.coerce.number().optional(),
  kennzeichen: z.string().min(1).default('S'),
});

export type ArtikelDefinitionFormInput = z.infer<typeof artikelDefinitionFormSchema>;

// Schema for the stored/displayed article definition data
export type ArtikelDefinition = {
  id: string; // UUID
  artikelNummer: string;
  produktName: string;
  category: string;
  beschreibung: string;
  dichte20C?: number;
  kennzeichen: string;
};
