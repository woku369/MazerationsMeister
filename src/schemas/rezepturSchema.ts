import { z } from 'zod';

/**
 * Rezeptur-/Verschnitt-Datenmodell (GFKC-Ausmischung, Aufgabe 17).
 *
 * Portiert und erweitert aus Branch `pages-clean` (dort: src/schemas/rezepturSchema.ts).
 * Hintergrund und fachlicher Kontext: docs/GFKC-VERSCHNITT-BESTANDSAUFNAHME.md,
 * docs/GFKC-FACHKONTEXT-REZEPTUR-2026-09.md.
 *
 * ⚠️ Namenskonvention: "GFKC-M"/"GFKC-O" (Wert von zielProduktName) sind
 * Chargen-/Serienbezeichnungen der GFKC-Ausmischung selbst - NICHT zu verwechseln
 * mit dem Produkt-Code "M" = Mazerat / "Dest" = Destillat, der auf den einzelnen
 * StoredInventoryItem-Komponenten (category-Feld) steht.
 */

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

  // Fix/reduzierbar-Unterscheidung für Verschnitte mit mehreren Komponentengruppen
  // (z.B. GFKC-O: manche Sorten bleiben immer voll drin, andere werden mit einem
  // Faktor reduziert). Siehe docs/GFKC-FACHKONTEXT-REZEPTUR-2026-09.md Abschnitt 6+8.3.
  istFix: z.boolean().default(true),   // true = Reduktionsfaktor immer 1, nicht skalierbar
  reduktionsfaktor: z.number().min(0).max(1).default(1), // nur relevant wenn istFix = false

  // Produkt-Eigenschaften (aus Inventory)
  alkoholgehalt: z.number().min(0).max(100),  // %vol der Komponente
  alkoholgehaltManuell: z.number().min(0).max(100).optional(), // Manuell korrigiert
  messmethode: z.enum(['spindel', 'alex501', 'probedestillation']).optional(), // ab 2026 relevant (Alex 501)
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

  geruch: z.number().min(1).max(10).optional(),
  geschmack: z.number().min(1).max(10).optional(),
  nachgeschmack: z.number().min(1).max(10).optional(),
  gesamteindruck: z.number().min(1).max(10).optional(),

  notizen: z.string(),
  verbesserungsvorschlaege: z.string().optional(),

  freigegeben: z.boolean().default(false), // Zur Produktion freigegeben?
});

/**
 * Schema für eine Rezeptur (z.B. GFKC-O Variante A)
 */
export const RezepturSchema = z.object({
  id: z.string(),

  // Grundinformationen
  name: z.string().min(1, 'Name ist erforderlich'),
  zielProduktId: z.string().optional(), // Referenz zu Artikel-Definition (z.B. GFKC)
  zielProduktName: z.string(),          // z.B. "GFKC-O" (Chargen-/Serienbezeichnung, siehe Namenskonvention oben)
  variantenName: z.string().optional(), // z.B. "Muster 1"

  // Mengen
  basisMenge: z.number().min(0).default(1.0), // Testmenge, z.B. 1L
  produktionsMenge: z.number().min(0).optional(), // z.B. 500L

  // Komponenten
  komponenten: z.array(RezepturKomponenteSchema).min(1, 'Mindestens eine Komponente erforderlich'),

  // Verschnitt-Zielverhältnis für fix/reduzierbar-Aufteilung (optional, nur bei Bedarf genutzt)
  verschnittZiel: z.object({
    basisAnteil: z.number().min(0).max(1), // z.B. 0,65 (Anteil "Basis"/fixe+reduzierbare Komponenten)
    zusatzKomponenteId: z.string().optional(), // z.B. frisches ZM-Mazerat, das den Rest auffüllt
    zusatzAnteil: z.number().min(0).max(1),    // z.B. 0,35
    hinweis: z.string().optional(),      // z.B. "unverifizierter Richtwert, siehe Sensorik"
  }).optional(),

  // Berechnete Ergebnisse
  ergebnis: z.object({
    gesamtMengeLiter: z.number().min(0),
    durchschnittAlkohol: z.number().min(0).max(100), // Gewichteter Durchschnitt %vol - tatsächlich erreichter ABV
    gesamtLiterAlkohol: z.number().min(0),
    summeKomponenten: z.number().min(0), // Sollte = basisMenge sein
    komponentenVerfuegbar: z.boolean(),
    fehlendeKomponenten: z.array(z.string()),
    tankKapazitaetVerfuegbar: z.boolean().optional(),
    empfohlenerTank: z.string().optional(),
  }).optional(),

  // Alkohol-Korrektur (nach Mischung) - zielAlkohol ist ein gelebter Richtwert,
  // KEIN technisches Gate (Korrektur 27.09.2026, siehe GFKC-FACHKONTEXT-REZEPTUR-2026-09.md
  // Abschnitt 9). Bleibt frei editierbar, keine Sperre/Vorbelegung.
  alkoholKorrektur: z.object({
    gemessenerAlkohol: z.number().min(0).max(100).optional(), // Gemessener %vol
    zielAlkohol: z.number().min(0).max(100).optional(),       // Gewünschter %vol (frei wählbar)
    korrekturBerechnet: z.boolean().default(false),
    wasserZugabe: z.number().min(0).optional(),               // Liter Wasser
    spritZugabeId: z.string().optional(),                     // Referenz auf echten Sprit-Lagerposten
    spritZugabe: z.number().min(0).optional(),                // Liter Sprit
    spritZugabeAlkoholgehalt: z.number().min(0).max(100).optional(), // ABV des verwendeten Sprits (aus Inventory, nicht hartcodiert)
    korrekturDurchgefuehrt: z.boolean().default(false),
  }).optional(),

  // Sensorik & Bewertung
  sensorikBewertungen: z.array(SensorikBewertungSchema).default([]),

  // Status-Workflow
  status: z.enum([
    'entwurf',        // Wird noch bearbeitet
    'test',           // Testmischung hergestellt
    'freigegeben',    // Sensorik OK, bereit für Produktion
    'produziert',     // Wurde produziert UND gebucht
    'archiviert'      // Alte Version
  ]).default('entwurf'),

  // Metadaten
  erstelltAm: z.string(),
  geaendertAm: z.string(),
  erstelltVon: z.string().optional(),

  // Produktions-/Buchungs-Info (wird von der Buchungsfunktion befüllt, siehe rezeptur-service.ts)
  produktionsDaten: z.object({
    produziertAm: z.string(),
    produzierteMenge: z.number(),
    tatsaechlicherAlkohol: z.number(), // erreichter ABV dieser Charge - für Lohnabfüller-Neuberechnung wichtig
    zielTankNr: z.string(),
    chargenNummer: z.string().optional(),
    neuesInventoryItemId: z.string().optional(), // Referenz auf den gebuchten GFKC-Lagerposten
    notizen: z.string().optional(),
  }).optional(),

  // Notizen & Dokumentation
  rezepturNotizen: z.string().optional(),
  herstellungshinweise: z.string().optional(),

  // Versionierung
  version: z.number().default(1),
  vorgaengerRezepturId: z.string().optional(), // Link zur vorherigen Version
});

export const RezepturenSchema = z.array(RezepturSchema);

export type RezepturKomponente = z.infer<typeof RezepturKomponenteSchema>;
export type SensorikBewertung = z.infer<typeof SensorikBewertungSchema>;
export type Rezeptur = z.infer<typeof RezepturSchema>;
export type Rezepturen = z.infer<typeof RezepturenSchema>;

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
