import { z } from 'zod';

/**
 * Schema für eine Komponente in einer Rezeptur
 */
export const RezepturKomponenteSchema = z.object({
  id: z.string(),                      // Eindeutige ID der Komponente in der Rezeptur
  produktId: z.string(),               // Referenz zu inventoryItem (oder 'FREITEXT' für freie Zutaten)
  produktName: z.string(),             // Name des Produkts (Cache)
  
  // Freie Zutaten (Wasser, Zucker, etc.)
  istFreieZutat: z.boolean().default(false),
  freitextZutat: z.string().optional(), // Freitext wenn istFreieZutat = true
  
  // Eingabe (User wählt entweder Liter oder Prozent)
  eingabeTyp: z.enum(['liter', 'prozent']),
  eingabeWert: z.number().min(0),      // Der eingegebene Wert
  
  // Produkt-Eigenschaften (aus Inventory)
  alkoholgehalt: z.number().min(0).max(100),  // %vol der Komponente
  alkoholgehaltManuell: z.number().min(0).max(100).optional(), // Manuell korrigiert
  verfuegbareMenge: z.number().min(0), // Aktueller Lagerbestand in Litern
  tankNr: z.string().optional(),       // In welchem Tank liegt die Komponente
  
  // Berechnete Werte (werden automatisch berechnet)
  mengeInLiter: z.number().min(0),     // Immer in Liter
  anteilProzent: z.number().min(0).max(100), // Immer in %
  literAlkohol: z.number().min(0),     // Reine LA (Liter Alkohol)
  
  // Skalierung
  mengeFuerProduktion: z.number().min(0).optional(), // Hochskalierte Menge
  istVerfuegbar: z.boolean(),          // Genug auf Lager für Produktion?
  
  notizen: z.string().optional(),
});

/**
 * Schema für Sensorik-Bewertung einer Rezeptur
 */
export const SensorikBewertungSchema = z.object({
  id: z.string(),
  datum: z.string(),                   // ISO-Datum
  testerName: z.string().optional(),   // Wer hat getestet?
  
  // Bewertungsskala (1-10 oder 1-5?)
  geruch: z.number().min(1).max(10).optional(),
  geschmack: z.number().min(1).max(10).optional(),
  nachgeschmack: z.number().min(1).max(10).optional(),
  gesamteindruck: z.number().min(1).max(10).optional(),
  
  // Freitext
  notizen: z.string(),
  verbesserungsvorschlaege: z.string().optional(),
  
  // Status
  freigegeben: z.boolean().default(false), // Zur Produktion freigegeben?
});

/**
 * Schema für eine Rezeptur (z.B. GFKC 2025 Variante A)
 */
export const RezepturSchema = z.object({
  id: z.string(),
  
  // Grundinformationen
  name: z.string().min(1, 'Name ist erforderlich'),
  zielProduktId: z.string().optional(), // Referenz zu Artikel-Definition (z.B. GFKC)
  zielProduktName: z.string(),          // z.B. "GFKC"
  variantenName: z.string().optional(), // z.B. "Variante A - mehr Zitrone"
  
  // Mengen
  basisMenge: z.number().min(0).default(1.0), // 1L für Tests
  produktionsMenge: z.number().min(0).optional(), // z.B. 500L
  
  // Komponenten
  komponenten: z.array(RezepturKomponenteSchema).min(1, 'Mindestens eine Komponente erforderlich'),
  
  // Berechnete Ergebnisse
  ergebnis: z.object({
    gesamtMengeLiter: z.number().min(0),
    durchschnittAlkohol: z.number().min(0).max(100), // Gewichteter Durchschnitt %vol
    gesamtLiterAlkohol: z.number().min(0),
    summeKomponenten: z.number().min(0), // Sollte = basisMenge sein
    komponentenVerfuegbar: z.boolean(),
    fehlendeKomponenten: z.array(z.string()),
    tankKapazitaetVerfuegbar: z.boolean().optional(),
    empfohlenerTank: z.string().optional(),
  }).optional(),
  
  // Alkohol-Korrektur (nach Mischung)
  alkoholKorrektur: z.object({
    gemessenerAlkohol: z.number().min(0).max(100).optional(), // Gemessener %vol
    zielAlkohol: z.number().min(0).max(100).optional(),       // Gewünschter %vol
    korrekturBerechnet: z.boolean().default(false),
    wasserZugabe: z.number().min(0).optional(),               // Liter Wasser
    spritZugabe: z.number().min(0).optional(),                // Liter Sprit (60%vol)
    korrekturDurchgefuehrt: z.boolean().default(false),
  }).optional(),
  
  // Sensorik & Bewertung
  sensorikBewertungen: z.array(SensorikBewertungSchema).default([]),
  
  // Status-Workflow
  status: z.enum([
    'entwurf',        // Wird noch bearbeitet
    'test',           // 1L Testmischung hergestellt
    'freigegeben',    // Sensorik OK, bereit für Produktion
    'produziert',     // Wurde produziert
    'archiviert'      // Alte Version
  ]).default('entwurf'),
  
  // Metadaten
  erstelltAm: z.string(),
  geaendertAm: z.string(),
  erstelltVon: z.string().optional(),
  
  // Produktions-Info (wenn produziert)
  produktionsDaten: z.object({
    produziertAm: z.string(),
    produzierteMenge: z.number(),
    zielTankNr: z.string(),
    chargenNummer: z.string().optional(),
    notizen: z.string().optional(),
  }).optional(),
  
  // Notizen & Dokumentation
  rezepturNotizen: z.string().optional(),
  herstellungshinweise: z.string().optional(),
  
  // Versionierung
  version: z.number().default(1),
  vorgaengerRezepturId: z.string().optional(), // Link zur vorherigen Version
});

/**
 * Array von Rezepturen
 */
export const RezepturenSchema = z.array(RezepturSchema);

/**
 * TypeScript-Typen (automatisch von Zod abgeleitet)
 */
export type RezepturKomponente = z.infer<typeof RezepturKomponenteSchema>;
export type SensorikBewertung = z.infer<typeof SensorikBewertungSchema>;
export type Rezeptur = z.infer<typeof RezepturSchema>;
export type Rezepturen = z.infer<typeof RezepturenSchema>;

/**
 * Produktions-Status für UI
 */
export const REZEPTUR_STATUS_LABELS: Record<Rezeptur['status'], string> = {
  'entwurf': 'Entwurf',
  'test': 'In Test',
  'freigegeben': 'Freigegeben',
  'produziert': 'Produziert',
  'archiviert': 'Archiviert',
};

export const REZEPTUR_STATUS_COLORS: Record<Rezeptur['status'], string> = {
  'entwurf': 'bg-gray-100 text-gray-800',
  'test': 'bg-blue-100 text-blue-800',
  'freigegeben': 'bg-green-100 text-green-800',
  'produziert': 'bg-purple-100 text-purple-800',
  'archiviert': 'bg-gray-200 text-gray-600',
};
