
import { z } from 'zod';

// Helper function to combine Date and Time string - needed for schema refinement
const combineDateTime = (date: Date | undefined | null, timeString: string | undefined): Date | undefined => {
  if (!date) return undefined;
  const newDate = new Date(date); // Create a new Date object to avoid mutating the original
  if (timeString && timeString !== "" && /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/.test(timeString)) {
    const [hours, minutes] = timeString.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
  } else {
    // Default to 00:00 if time is missing or invalid, but only if date itself is present
    // For time tracking, if time is not set, we probably don't want to default it, but rather let it be undefined.
    // The calculation logic will handle undefined time as 0 hours.
    return undefined; // Return undefined if timeString is not valid, allows partial input for calculation
  }
  return newDate;
};

const numberPreprocess = (val: unknown) => {
  if (typeof val === 'string') return val.replace(',', '.');
  if (typeof val === 'number') return String(val);
  return val;
};

const timeStringSchema = z.string().refine(val => val === "" || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), "Ungültige Uhrzeit (HH:MM)").optional(); // Allows empty string or valid time
const dateSchema = z.date({invalid_type_error: "Ungültiges Datum."}).optional().nullable();

export const mazerationFormSchema = z.object({
  macerationName: z.string().min(1, 'Name der Mazeration ist erforderlich'),
  batchNumber: z.string()
    .min(4, 'Chargennummer muss mind. 4-stellig sein')
    .max(5, 'Chargennummer darf max. 5-stellig sein')
    .regex(/^\d+$/, 'Chargennummer darf nur Ziffern enthalten'),
  creationDate: z.date({invalid_type_error: "Ungültiges Datum."}).optional().nullable(),
  plantName: z.string().min(1, 'Pflanzenname ist erforderlich'),
  plantDescription: z.string().optional(),
  plantPart: z.string().min(1, 'Pflanzenteil ist erforderlich'),
  harvestDate: z.date({invalid_type_error: "Ungültiges Datum."}).optional().nullable(),
  qualityAssessment: z.string().optional(),
  plantWeight: z.preprocess(
    numberPreprocess,
    // allow missing/null initially; when provided, it must be a positive number
    z.union([
      z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Pflanzengewicht."}).positive('Pflanzengewicht muss positiv sein'),
      z.null(),
      z.undefined(),
    ])
  ),
  plantWeightUnit: z.enum(['g', 'kg'], { required_error: "Einheit für Pflanzengewicht ist erforderlich."}),
  numberOfCrates: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Anzahl Kisten."}).positive('Anzahl Kisten muss eine positive Zahl sein.').optional().nullable()
  ),
  grossWeightKg: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Bruttogewicht."}).positive('Bruttogewicht muss eine positive Zahl sein.').optional().nullable()
  ),
  // Tara pro Kiste (kg) - optional, Standard wird im Form gesetzt
  tarePerCrateKg: z.preprocess(
    numberPreprocess,
    z.union([
      z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Tara pro Kiste."}).min(0, 'Tara darf nicht negativ sein'),
      z.null(),
      z.undefined(),
    ])
  ),
  alcoholType: z.string().min(1, 'Alkoholtyp ist erforderlich'),
  alcoholConcentration: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Alkoholkonzentration."}).min(0, 'Konzentration muss mind. 0 sein.').max(100, 'Konzentration darf max. 100 sein.')
  ),
  alcoholVolume: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Alkoholvolumen."}).positive('Alkoholvolumen muss positiv sein')
  ),
  alcoholVolumeUnit: z.enum(['ml', 'l'], { required_error: "Einheit für Alkoholvolumen ist erforderlich."}),
  tankStartL: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert."}).optional().nullable()
  ),
  tankEndL: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert."}).optional().nullable()
  ),
  macerationStart: z.date({invalid_type_error: "Ungültiges Datum."}).optional().nullable(),
  macerationStartTime: z.string().refine(val => val === "" || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), "Ungültige Uhrzeit (HH:MM)").optional(), // Allows empty string or valid time
  macerationEnd: z.date({invalid_type_error: "Ungültiges Datum."}).optional().nullable(),
  macerationEndTime: z.string().refine(val => val === "" || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), "Ungültige Uhrzeit (HH:MM)").optional(), // Allows empty string or valid time
  roomTemperature: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Raumtemperatur."}).optional().nullable()
  ),
  yieldVolume: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Ausbeute."}).min(0,'Ausbeute darf nicht negativ sein').optional().nullable()
  ),
  yieldMassKg: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert."}).min(0).optional().nullable()
  ),
  yieldDensityAt: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert."}).min(0).optional().nullable()
  ),
  yieldSpindelTemp: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert."}).optional().nullable()
  ),
  endConcentration: z.preprocess(
    numberPreprocess,
    z.coerce.number({invalid_type_error: "Ungültiger Zahlenwert für Endkonzentration."}).min(0, 'Konzentration muss mind. 0 sein.').max(100, 'Konzentration darf max. 100 sein.').optional().nullable()
  ),
  remarks: z.string().optional(),

  // Zeitaufzeichnung fields
  vorbereitungDate: dateSchema,
  vorbereitungStartTime: timeStringSchema,
  vorbereitungEndTime: timeStringSchema,

  verarbeitungKraeuterDate: dateSchema,
  verarbeitungKraeuterStartTime: timeStringSchema,
  verarbeitungKraeuterEndTime: timeStringSchema,

  verarbeitungMazeratDate: dateSchema,
  verarbeitungMazeratStartTime: timeStringSchema,
  verarbeitungMazeratEndTime: timeStringSchema,

  reinigungDate: dateSchema,
  reinigungStartTime: timeStringSchema,
  reinigungEndTime: timeStringSchema,

  sonstigesDate: dateSchema,
  sonstigesStartTime: timeStringSchema,
  sonstigesEndTime: timeStringSchema,

}).refine(data => {
  const startDateTime = combineDateTime(data.macerationStart, data.macerationStartTime);
  const endDateTime = combineDateTime(data.macerationEnd, data.macerationEndTime);
  // Allow if start or end time is not fully defined yet (e.g. date set, but not time string)
  if (startDateTime && endDateTime) {
    return endDateTime > startDateTime;
  }
  return true; // Bypass if not enough info to compare
}, {
  message: "Enddatum/-zeit muss nach Startdatum/-zeit liegen.",
  path: ["macerationEnd"],
}).refine(data => {
  if (data.plantWeightUnit === 'kg') {
    if (data.numberOfCrates && data.grossWeightKg) {
        const tare = data.tarePerCrateKg ?? 2.00;
        const netWeight = Number(data.grossWeightKg) - (Number(data.numberOfCrates) * Number(tare));
        return netWeight > 0;
    }
  }
  return true;
}, {
    message: "Berechnetes Nettogewicht muss positiv sein, wenn Kisten-Details ausgefüllt sind.",
    path: ["grossWeightKg"],
})
.refine(data => {
  if (data.vorbereitungDate && data.vorbereitungStartTime && data.vorbereitungEndTime) {
    const start = combineDateTime(data.vorbereitungDate, data.vorbereitungStartTime);
    const end = combineDateTime(data.vorbereitungDate, data.vorbereitungEndTime);
    return !start || !end || end > start;
  }
  return true;
}, { message: "Vorbereitung: Endzeit muss nach Startzeit liegen.", path: ["vorbereitungEndTime"] })
.refine(data => {
  if (data.verarbeitungKraeuterDate && data.verarbeitungKraeuterStartTime && data.verarbeitungKraeuterEndTime) {
    const start = combineDateTime(data.verarbeitungKraeuterDate, data.verarbeitungKraeuterStartTime);
    const end = combineDateTime(data.verarbeitungKraeuterDate, data.verarbeitungKraeuterEndTime);
    return !start || !end || end > start;
  }
  return true;
}, { message: "Verarbeitung Kräuter: Endzeit muss nach Startzeit liegen.", path: ["verarbeitungKraeuterEndTime"] })
.refine(data => {
  if (data.verarbeitungMazeratDate && data.verarbeitungMazeratStartTime && data.verarbeitungMazeratEndTime) {
    const start = combineDateTime(data.verarbeitungMazeratDate, data.verarbeitungMazeratStartTime);
    const end = combineDateTime(data.verarbeitungMazeratDate, data.verarbeitungMazeratEndTime);
    return !start || !end || end > start;
  }
  return true;
}, { message: "Verarbeitung Mazerat: Endzeit muss nach Startzeit liegen.", path: ["verarbeitungMazeratEndTime"] })
.refine(data => {
  if (data.reinigungDate && data.reinigungStartTime && data.reinigungEndTime) {
    const start = combineDateTime(data.reinigungDate, data.reinigungStartTime);
    const end = combineDateTime(data.reinigungDate, data.reinigungEndTime);
    return !start || !end || end > start;
  }
  return true;
}, { message: "Reinigung: Endzeit muss nach Startzeit liegen.", path: ["reinigungEndTime"] })
.refine(data => {
  if (data.sonstigesDate && data.sonstigesStartTime && data.sonstigesEndTime) {
    const start = combineDateTime(data.sonstigesDate, data.sonstigesStartTime);
    const end = combineDateTime(data.sonstigesDate, data.sonstigesEndTime);
    return !start || !end || end > start;
  }
  return true;
}, { message: "Sonstiges: Endzeit muss nach Startzeit liegen.", path: ["sonstigesEndTime"] });


export type MazerationFormData = z.infer<typeof mazerationFormSchema>;
