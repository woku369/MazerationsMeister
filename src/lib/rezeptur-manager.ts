/**
 * Rezeptur-Manager
 * Zentrale Logik für Rezeptur-Berechnungen, Skalierung und Validierung (GFKC-Ausmischung, Aufgabe 17).
 *
 * Portiert und erweitert aus Branch `pages-clean` (dort: src/lib/rezeptur-manager.ts).
 * Reine Funktionen ohne React/Persistenz-Abhängigkeit - für Persistenz siehe rezeptur-service.ts.
 */

import { Rezeptur, RezepturKomponente } from '@/schemas/rezepturSchema';
import { StoredInventoryItem } from '@/schemas/inventorySchema';
import { calcLA } from './mazeration-calc';

/**
 * Berechnet alle Werte einer Rezeptur-Komponente.
 * Konvertiert zwischen Liter ↔ Prozent und berechnet LA.
 */
export function berechneKomponente(
  komponente: RezepturKomponente,
  basisMenge: number
): RezepturKomponente {
  const updated = { ...komponente };

  if (komponente.eingabeTyp === 'prozent') {
    updated.anteilProzent = komponente.eingabeWert;
    updated.mengeInLiter = (komponente.eingabeWert / 100) * basisMenge;
  } else {
    updated.mengeInLiter = komponente.eingabeWert;
    updated.anteilProzent = basisMenge > 0 ? (komponente.eingabeWert / basisMenge) * 100 : 0;
  }

  const verwendeterAlkoholgehalt = komponente.alkoholgehaltManuell ?? komponente.alkoholgehalt;
  updated.literAlkohol = calcLA(updated.mengeInLiter, verwendeterAlkoholgehalt);

  updated.istVerfuegbar = updated.verfuegbareMenge >= updated.mengeInLiter;

  return updated;
}

/**
 * Berechnet das Ergebnis einer kompletten Rezeptur (gewichteter Durchschnitts-ABV etc.)
 */
export function berechneRezeptur(rezeptur: Rezeptur): Rezeptur {
  const updated = { ...rezeptur };

  updated.komponenten = rezeptur.komponenten.map(k =>
    berechneKomponente(k, rezeptur.basisMenge)
  );

  let gesamtMenge = 0;
  let gesamtLA = 0;
  const fehlendeKomponenten: string[] = [];

  for (const komp of updated.komponenten) {
    gesamtMenge += komp.mengeInLiter;
    gesamtLA += komp.literAlkohol;

    if (!komp.istVerfuegbar) {
      fehlendeKomponenten.push(
        `${komp.produktName}: ${komp.mengeInLiter.toFixed(2)}L benötigt, nur ${komp.verfuegbareMenge.toFixed(2)}L verfügbar`
      );
    }
  }

  const durchschnittAlkohol = gesamtMenge > 0 ? (gesamtLA / gesamtMenge) * 100 : 0;

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
 * Skaliert eine Rezeptur von Testmenge auf Produktionsmenge und prüft Verfügbarkeit.
 */
export function skaliereRezeptur(
  rezeptur: Rezeptur,
  produktionsMenge: number,
  verfuegbareInventoryItems: StoredInventoryItem[]
): Rezeptur {
  const updated = { ...rezeptur };
  updated.produktionsMenge = produktionsMenge;

  const skalierungsFaktor = rezeptur.basisMenge > 0 ? produktionsMenge / rezeptur.basisMenge : 0;
  const fehlendeKomponenten: string[] = [];

  updated.komponenten = rezeptur.komponenten.map(komp => {
    const skaliert = { ...komp };
    skaliert.mengeFuerProduktion = komp.mengeInLiter * skalierungsFaktor;

    if (komp.istFreieZutat) {
      // Freie Zutaten (Wasser etc.) haben keinen Lagerbezug - immer verfügbar
      skaliert.istVerfuegbar = true;
      return skaliert;
    }

    const inventoryItem = verfuegbareInventoryItems.find(item => item.id === komp.produktId);

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

  if (updated.ergebnis) {
    updated.ergebnis.fehlendeKomponenten = fehlendeKomponenten;
    updated.ergebnis.komponentenVerfuegbar = fehlendeKomponenten.length === 0;
  }

  return updated;
}

/**
 * Verschnitt-Auflösung mit fixen und reduzierbaren Komponentengruppen (GFKC-O-Fall).
 *
 * Anders als eine einfache Skalierung bleiben "fixe" Komponenten unverändert, während
 * "reduzierbare" Komponenten mit einem frei wählbaren Faktor (0-1, NICHT nur an/aus)
 * reduziert werden. Die Gesamtmenge der Basis ergibt sich daraus - und kann größer
 * werden als ursprünglich angenommen, wenn die Fixkomponenten allein schon einen
 * größeren Anteil ausmachen als das Zielverhältnis vorsieht.
 *
 * Siehe docs/GFKC-FACHKONTEXT-REZEPTUR-2026-09.md Abschnitt 6+8.3 für die Herleitung.
 */
export interface VerschnittAufloesung {
  basisSumme: number;              // Summe aller Basis-Komponenten (fix + reduziert)
  zielGesamtmenge: number;         // Basis / basisAnteil - kann von einer angenommenen Zielmenge abweichen!
  zusatzVolumen: number;           // zielGesamtmenge - basisSumme
  zusatzLA: number;                // zusatzVolumen * zusatzAlkoholgehalt / 100
  gesamtLA: number;                // Summe LA aller Basis-Komponenten + zusatzLA
  gesamtAlkohol: number;           // gewichteter ABV der vollen Mischung (vor Wasser/Korrektur)
  warnung?: string;                // z.B. wenn Fixkomponenten allein das Zielverhältnis sprengen
}

export function berechneVerschnittMitFixUndReduzierbar(
  komponenten: RezepturKomponente[],
  basisAnteil: number,       // z.B. 0,65
  zusatzAlkoholgehalt: number, // ABV der Zusatzkomponente (z.B. frisches ZM-Mazerat)
): VerschnittAufloesung {
  let basisSumme = 0;
  let basisLA = 0;

  for (const k of komponenten) {
    const faktor = k.istFix ? 1 : (k.reduktionsfaktor ?? 1);
    const menge = k.mengeInLiter * faktor;
    basisSumme += menge;
    basisLA += calcLA(menge, k.alkoholgehaltManuell ?? k.alkoholgehalt);
  }

  const zielGesamtmenge = basisAnteil > 0 ? basisSumme / basisAnteil : basisSumme;
  const zusatzVolumen = Math.max(0, zielGesamtmenge - basisSumme);
  const zusatzLA = calcLA(zusatzVolumen, zusatzAlkoholgehalt);
  const gesamtLA = basisLA + zusatzLA;
  const gesamtAlkohol = zielGesamtmenge > 0 ? (gesamtLA / zielGesamtmenge) * 100 : 0;

  // Warnung, falls die Fixkomponenten allein schon mehr als basisAnteil einer
  // eigentlich angenommenen (fixen) Zielmenge ausmachen würden - siehe Fachdokument
  // Abschnitt 6: das ist kein Rechenfehler, die Gesamtmenge muss dann wachsen.
  let warnung: string | undefined;
  const fixSumme = komponenten
    .filter(k => k.istFix)
    .reduce((sum, k) => sum + k.mengeInLiter, 0);
  if (basisAnteil > 0 && fixSumme > 0 && fixSumme / basisAnteil > zielGesamtmenge * 1.001) {
    warnung = `Fixkomponenten allein (${fixSumme.toFixed(1)} L) übersteigen bei einem Zielanteil von ${(basisAnteil * 100).toFixed(0)}% bereits die berechnete Gesamtmenge - Gesamtmenge wächst entsprechend, exaktes Zielverhältnis UND eine kleinere Gesamtmenge sind gleichzeitig nicht erreichbar.`;
  }

  return { basisSumme, zielGesamtmenge, zusatzVolumen, zusatzLA, gesamtLA, gesamtAlkohol, warnung };
}

/**
 * Berechnet die Alkoholkorrektur (Verdünnen mit Wasser oder Aufspriten), analog zum
 * bisherigen Editor auf pages-clean - ABER mit der tatsächlichen ABV des ausgewählten
 * Sprit-Lagerpostens statt einer hartcodierten Konstante (Korrektur laut Fachdokument
 * Abschnitt 13).
 */
export interface AlkoholKorrekturErgebnis {
  wasserZugabe: number;
  spritZugabe: number;
  endmenge: number;
}

export function berechneAlkoholKorrektur(
  aktuelleMenge: number,
  gemessenerAlkohol: number,
  zielAlkohol: number,
  spritAlkoholgehalt: number, // ABV des tatsächlich verwendeten Sprit-Lagerpostens
): AlkoholKorrekturErgebnis {
  if (gemessenerAlkohol > zielAlkohol) {
    // Zu stark -> mit Wasser verdünnen
    const wasserZugabe = (aktuelleMenge * gemessenerAlkohol / zielAlkohol) - aktuelleMenge;
    return { wasserZugabe: Math.max(0, wasserZugabe), spritZugabe: 0, endmenge: aktuelleMenge + Math.max(0, wasserZugabe) };
  }
  if (gemessenerAlkohol < zielAlkohol) {
    // Zu schwach -> mit Sprit aufspriten
    if (spritAlkoholgehalt <= zielAlkohol) {
      // Sprit ist nicht stark genug, um auf das Ziel zu heben - keine Lösung möglich
      return { wasserZugabe: 0, spritZugabe: 0, endmenge: aktuelleMenge };
    }
    const spritZugabe = (aktuelleMenge * (zielAlkohol - gemessenerAlkohol)) / (spritAlkoholgehalt - zielAlkohol);
    return { wasserZugabe: 0, spritZugabe: Math.max(0, spritZugabe), endmenge: aktuelleMenge + Math.max(0, spritZugabe) };
  }
  return { wasserZugabe: 0, spritZugabe: 0, endmenge: aktuelleMenge };
}

/**
 * Validiert ob eine Rezeptur konsistent ist.
 */
export function validiereRezeptur(rezeptur: Rezeptur): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!rezeptur.komponenten || rezeptur.komponenten.length === 0) {
    errors.push('Mindestens eine Komponente erforderlich');
  }

  if (rezeptur.ergebnis) {
    const differenz = Math.abs(rezeptur.ergebnis.gesamtMengeLiter - rezeptur.basisMenge);
    const toleranz = rezeptur.basisMenge * 0.01; // 1% Toleranz

    if (differenz > toleranz) {
      errors.push(
        `Summe der Komponenten (${rezeptur.ergebnis.gesamtMengeLiter.toFixed(2)}L) weicht von Basismenge (${rezeptur.basisMenge.toFixed(2)}L) ab`
      );
    }
  }

  for (const komp of rezeptur.komponenten) {
    if (komp.eingabeWert <= 0) {
      errors.push(`${komp.produktName}: Ungültiger Wert (${komp.eingabeWert})`);
    }
    if (komp.alkoholgehalt < 0 || komp.alkoholgehalt > 100) {
      errors.push(`${komp.produktName}: Ungültiger Alkoholgehalt (${komp.alkoholgehalt}%)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Erstellt eine neue leere Rezeptur.
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
 * Fügt eine Komponente zur Rezeptur hinzu (aus echtem Lagerbestand).
 */
export function fuegeKomponenteHinzu(
  rezeptur: Rezeptur,
  inventoryItem: StoredInventoryItem,
  eingabeTyp: 'liter' | 'prozent' = 'liter',
  wert: number = 0,
  istFix: boolean = true,
): Rezeptur {
  const neueKomponente: RezepturKomponente = {
    id: `komp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    produktId: inventoryItem.id,
    produktName: inventoryItem.produktName,
    istFreieZutat: false,
    eingabeTyp,
    eingabeWert: wert,
    istFix,
    reduktionsfaktor: 1,
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
 * Fügt eine freie Zutat (z.B. Wasser) ohne Lagerbezug hinzu.
 */
export function fuegeFreieZutatHinzu(
  rezeptur: Rezeptur,
  freitextZutat: string,
  eingabeTyp: 'liter' | 'prozent' = 'liter',
  wert: number = 0,
  alkoholgehalt: number = 0,
): Rezeptur {
  const neueKomponente: RezepturKomponente = {
    id: `komp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    produktId: 'FREITEXT',
    produktName: freitextZutat,
    istFreieZutat: true,
    freitextZutat,
    eingabeTyp,
    eingabeWert: wert,
    istFix: true,
    reduktionsfaktor: 1,
    alkoholgehalt,
    verfuegbareMenge: Number.POSITIVE_INFINITY,
    mengeInLiter: 0,
    anteilProzent: 0,
    literAlkohol: 0,
    istVerfuegbar: true,
  };

  const updated = { ...rezeptur };
  updated.komponenten = [...rezeptur.komponenten, neueKomponente];

  return berechneRezeptur(updated);
}

export function entferneKomponente(rezeptur: Rezeptur, komponenteId: string): Rezeptur {
  const updated = { ...rezeptur };
  updated.komponenten = rezeptur.komponenten.filter(k => k.id !== komponenteId);
  return berechneRezeptur(updated);
}

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
 * Erstellt eine neue Variante einer bestehenden Rezeptur (z.B. "Muster 2").
 */
export function erstelleVariante(original: Rezeptur, variantenName: string): Rezeptur {
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
    sensorikBewertungen: [],
    produktionsDaten: undefined,
  };
}

export function formatiereRezepturWert(wert: number, nachkommastellen: number = 2): string {
  return wert.toFixed(nachkommastellen);
}

/**
 * Prüft ob eine Rezeptur zur Produktion freigegeben werden kann.
 */
export function kannFreigebenWerden(rezeptur: Rezeptur): {
  kannFreigeben: boolean;
  gruende: string[];
} {
  const gruende: string[] = [];

  if (rezeptur.status === 'entwurf') {
    gruende.push('Rezeptur muss erst getestet werden');
  }

  const positiveBewertungen = rezeptur.sensorikBewertungen.filter(b => b.freigegeben);
  if (positiveBewertungen.length === 0) {
    gruende.push('Mindestens eine positive Sensorik-Bewertung erforderlich');
  }

  const validierung = validiereRezeptur(rezeptur);
  if (!validierung.valid) {
    gruende.push(...validierung.errors);
  }

  return { kannFreigeben: gruende.length === 0, gruende };
}
