/**
 * Rezeptur-Manager
 * Zentrale Logik für Rezeptur-Berechnungen, Skalierung und Validierung
 */

import { Rezeptur, RezepturKomponente } from '@/schemas/rezepturSchema';
import { StoredInventoryItem } from '@/schemas/inventorySchema';

/**
 * Berechnet alle Werte einer Rezeptur-Komponente
 * Konvertiert zwischen Liter ↔ Prozent und berechnet LA
 */
export function berechneKomponente(
  komponente: RezepturKomponente,
  basisMenge: number
): RezepturKomponente {
  const updated = { ...komponente };

  // 1. Konvertierung je nach Eingabe-Typ
  if (komponente.eingabeTyp === 'prozent') {
    // Prozent → Liter
    updated.anteilProzent = komponente.eingabeWert;
    updated.mengeInLiter = (komponente.eingabeWert / 100) * basisMenge;
  } else {
    // Liter → Prozent
    updated.mengeInLiter = komponente.eingabeWert;
    updated.anteilProzent = basisMenge > 0 ? (komponente.eingabeWert / basisMenge) * 100 : 0;
  }

  // 2. Liter Alkohol berechnen (LA = Menge * %vol / 100)
  // Verwende manuellen Alkoholgehalt falls vorhanden
  const verwendeterAlkoholgehalt = komponente.alkoholgehaltManuell ?? komponente.alkoholgehalt;
  updated.literAlkohol = updated.mengeInLiter * (verwendeterAlkoholgehalt / 100);

  // 3. Verfügbarkeit prüfen
  updated.istVerfuegbar = updated.verfuegbareMenge >= updated.mengeInLiter;

  return updated;
}

/**
 * Berechnet das Ergebnis einer kompletten Rezeptur
 */
export function berechneRezeptur(rezeptur: Rezeptur): Rezeptur {
  const updated = { ...rezeptur };

  // 1. Alle Komponenten neu berechnen
  updated.komponenten = rezeptur.komponenten.map(k =>
    berechneKomponente(k, rezeptur.basisMenge)
  );

  // 2. Summen berechnen
  let gesamtMenge = 0;
  let gesamtLA = 0;
  const fehlendeKomponenten: string[] = [];

  for (const komp of updated.komponenten) {
    gesamtMenge += komp.mengeInLiter;
    gesamtLA += komp.literAlkohol;

    // Verfügbarkeit prüfen
    if (!komp.istVerfuegbar) {
      fehlendeKomponenten.push(
        `${komp.produktName}: ${komp.mengeInLiter.toFixed(2)}L benötigt, nur ${komp.verfuegbareMenge.toFixed(2)}L verfügbar`
      );
    }
  }

  // 3. Durchschnittliche %vol berechnen (gewichtet!)
  const durchschnittAlkohol = gesamtMenge > 0 ? (gesamtLA / gesamtMenge) * 100 : 0;

  // 4. Ergebnis speichern
  updated.ergebnis = {
    gesamtMengeLiter: gesamtMenge,
    durchschnittAlkohol,
    gesamtLiterAlkohol: gesamtLA,
    summeKomponenten: gesamtMenge,
    komponentenVerfuegbar: fehlendeKomponenten.length === 0,
    fehlendeKomponenten,
    tankKapazitaetVerfuegbar: true, // TODO: Tank-Kapazität prüfen
  };

  updated.geaendertAm = new Date().toISOString();

  return updated;
}

/**
 * Skaliert eine Rezeptur von Testmenge auf Produktionsmenge
 * und prüft Verfügbarkeit
 */
export function skaliereRezeptur(
  rezeptur: Rezeptur,
  produktionsMenge: number,
  verfuegbareInventoryItems: StoredInventoryItem[]
): Rezeptur {
  const updated = { ...rezeptur };
  updated.produktionsMenge = produktionsMenge;

  const skalierungsFaktor = produktionsMenge / rezeptur.basisMenge;

  // Komponenten skalieren und Verfügbarkeit prüfen
  const fehlendeKomponenten: string[] = [];

  updated.komponenten = rezeptur.komponenten.map(komp => {
    const skaliert = { ...komp };

    // Hochskalierte Menge berechnen
    skaliert.mengeFuerProduktion = komp.mengeInLiter * skalierungsFaktor;

    // Verfügbarkeit für Produktion prüfen
    const inventoryItem = verfuegbareInventoryItems.find(
      item => item.id === komp.produktId
    );

    if (inventoryItem) {
      const verfuegbar = inventoryItem.currentQuantityLiters || 0;
      skaliert.verfuegbareMenge = verfuegbar;
      skaliert.istVerfuegbar = verfuegbar >= skaliert.mengeFuerProduktion!;

      if (!skaliert.istVerfuegbar) {
        fehlendeKomponenten.push(
          `${komp.produktName}: ${skaliert.mengeFuerProduktion!.toFixed(2)}L benötigt, nur ${verfuegbar.toFixed(2)}L verfügbar`
        );
      }
    } else {
      skaliert.istVerfuegbar = false;
      fehlendeKomponenten.push(`${komp.produktName}: Nicht im Lager gefunden`);
    }

    return skaliert;
  });

  // Ergebnis aktualisieren
  if (updated.ergebnis) {
    updated.ergebnis.fehlendeKomponenten = fehlendeKomponenten;
    updated.ergebnis.komponentenVerfuegbar = fehlendeKomponenten.length === 0;
  }

  return updated;
}

/**
 * Validiert ob eine Rezeptur konsistent ist
 */
export function validiereRezeptur(rezeptur: Rezeptur): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Mindestens eine Komponente
  if (!rezeptur.komponenten || rezeptur.komponenten.length === 0) {
    errors.push('Mindestens eine Komponente erforderlich');
  }

  // 2. Summe sollte der Basis-Menge entsprechen (mit Toleranz)
  if (rezeptur.ergebnis) {
    const differenz = Math.abs(rezeptur.ergebnis.gesamtMengeLiter - rezeptur.basisMenge);
    const toleranz = rezeptur.basisMenge * 0.01; // 1% Toleranz

    if (differenz > toleranz) {
      errors.push(
        `Summe der Komponenten (${rezeptur.ergebnis.gesamtMengeLiter.toFixed(2)}L) weicht von Basismenge (${rezeptur.basisMenge.toFixed(2)}L) ab`
      );
    }
  }

  // 3. Alle Komponenten haben gültige Werte
  for (const komp of rezeptur.komponenten) {
    if (komp.eingabeWert <= 0) {
      errors.push(`${komp.produktName}: Ungültiger Wert (${komp.eingabeWert})`);
    }
    if (komp.alkoholgehalt < 0 || komp.alkoholgehalt > 100) {
      errors.push(`${komp.produktName}: Ungültiger Alkoholgehalt (${komp.alkoholgehalt}%)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Erstellt eine neue leere Rezeptur
 */
export function erstelleNeueRezeptur(name: string, zielProduktName: string): Rezeptur {
  const now = new Date().toISOString();

  return {
    id: `rez_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    zielProduktName,
    basisMenge: 1.0,
    komponenten: [],
    sensorikBewertungen: [],
    status: 'entwurf',
    erstelltAm: now,
    geaendertAm: now,
    version: 1,
  };
}

/**
 * Fügt eine Komponente zur Rezeptur hinzu
 */
export function fuegeKomponenteHinzu(
  rezeptur: Rezeptur,
  inventoryItem: StoredInventoryItem,
  eingabeTyp: 'liter' | 'prozent' = 'liter',
  wert: number = 0
): Rezeptur {
  const neueKomponente: RezepturKomponente = {
    id: `komp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    produktId: inventoryItem.id,
    produktName: inventoryItem.produktName,
    istFreieZutat: false,
    eingabeTyp,
    eingabeWert: wert,
    alkoholgehalt: inventoryItem.alcoholVolProzent || 0,
    verfuegbareMenge: inventoryItem.currentQuantityLiters || 0,
    tankNr: inventoryItem.tankNr,
    mengeInLiter: 0,
    anteilProzent: 0,
    literAlkohol: 0,
    istVerfuegbar: true,
  };

  const updated = { ...rezeptur };
  updated.komponenten = [...rezeptur.komponenten, neueKomponente];

  return berechneRezeptur(updated);
}

/**
 * Entfernt eine Komponente aus der Rezeptur
 */
export function entferneKomponente(rezeptur: Rezeptur, komponenteId: string): Rezeptur {
  const updated = { ...rezeptur };
  updated.komponenten = rezeptur.komponenten.filter(k => k.id !== komponenteId);
  return berechneRezeptur(updated);
}

/**
 * Aktualisiert eine Komponente in der Rezeptur
 */
export function aktualisiereKomponente(
  rezeptur: Rezeptur,
  komponenteId: string,
  updates: Partial<RezepturKomponente>
): Rezeptur {
  const updated = { ...rezeptur };
  updated.komponenten = rezeptur.komponenten.map(k =>
    k.id === komponenteId ? { ...k, ...updates } : k
  );
  return berechneRezeptur(updated);
}

/**
 * Erstellt eine neue Variante einer bestehenden Rezeptur
 */
export function erstelleVariante(
  original: Rezeptur,
  variantenName: string
): Rezeptur {
  const now = new Date().toISOString();

  return {
    ...original,
    id: `rez_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: original.name,
    variantenName,
    status: 'entwurf',
    erstelltAm: now,
    geaendertAm: now,
    version: original.version + 1,
    vorgaengerRezepturId: original.id,
    sensorikBewertungen: [], // Neue Variante = neue Bewertungen
    produktionsDaten: undefined, // Noch nicht produziert
  };
}

/**
 * Formatiert Zahlen für Anzeige
 */
export function formatiereRezepturWert(wert: number, nachkommastellen: number = 2): string {
  return wert.toFixed(nachkommastellen);
}

/**
 * Prüft ob eine Rezeptur zur Produktion freigegeben werden kann
 */
export function kannFreigebenWerden(rezeptur: Rezeptur): {
  kannFreigeben: boolean;
  gruende: string[];
} {
  const gruende: string[] = [];

  // 1. Muss getestet sein
  if (rezeptur.status === 'entwurf') {
    gruende.push('Rezeptur muss erst getestet werden');
  }

  // 2. Mindestens eine positive Sensorik-Bewertung
  const positiveBewertungen = rezeptur.sensorikBewertungen.filter(b => b.freigegeben);
  if (positiveBewertungen.length === 0) {
    gruende.push('Mindestens eine positive Sensorik-Bewertung erforderlich');
  }

  // 3. Rezeptur muss valide sein
  const validierung = validiereRezeptur(rezeptur);
  if (!validierung.valid) {
    gruende.push(...validierung.errors);
  }

  return {
    kannFreigeben: gruende.length === 0,
    gruende,
  };
}
