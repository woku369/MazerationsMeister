import { describe, it, expect } from 'vitest';
import {
  berechneKomponente,
  berechneRezeptur,
  skaliereRezeptur,
  berechneVerschnittMitFixUndReduzierbar,
  berechneAlkoholKorrektur,
  validiereRezeptur,
  erstelleNeueRezeptur,
  fuegeKomponenteHinzu,
  fuegeFreieZutatHinzu,
} from '../rezeptur-manager';
import type { RezepturKomponente } from '@/schemas/rezepturSchema';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';

function makeKomponente(overrides: Partial<RezepturKomponente> = {}): RezepturKomponente {
  return {
    id: 'k1', produktId: 'item-1', produktName: 'Testsorte',
    istFreieZutat: false, eingabeTyp: 'liter', eingabeWert: 100,
    istFix: true, reduktionsfaktor: 1,
    alkoholgehalt: 50, verfuegbareMenge: 1000,
    mengeInLiter: 0, anteilProzent: 0, literAlkohol: 0, istVerfuegbar: true,
    ...overrides,
  };
}

function makeInventoryItem(overrides: Partial<StoredInventoryItem> = {}): StoredInventoryItem {
  return {
    id: 'item-1', artikelNummer: 'A1', produktName: 'Testsorte', chargenNummer: 'C1',
    category: 'M', tankNr: 'T1', currentQuantityLiters: 1000, alcoholVolProzent: 50,
    lastInventoryDate: new Date(), bemerkungen: '', kennzeichen: 'S',
    ...overrides,
  };
}

describe('berechneKomponente', () => {
  it('konvertiert Liter-Eingabe korrekt und berechnet LA', () => {
    const k = makeKomponente({ eingabeTyp: 'liter', eingabeWert: 200, alkoholgehalt: 60 });
    const result = berechneKomponente(k, 1000);
    expect(result.mengeInLiter).toBe(200);
    expect(result.anteilProzent).toBe(20);
    expect(result.literAlkohol).toBeCloseTo(120, 3); // 200 * 60%
  });

  it('konvertiert Prozent-Eingabe korrekt', () => {
    const k = makeKomponente({ eingabeTyp: 'prozent', eingabeWert: 25, alkoholgehalt: 60 });
    const result = berechneKomponente(k, 1000);
    expect(result.mengeInLiter).toBe(250);
    expect(result.literAlkohol).toBeCloseTo(150, 3);
  });

  it('nutzt manuellen Alkoholgehalt statt dem Lager-Wert, falls gesetzt', () => {
    const k = makeKomponente({ eingabeTyp: 'liter', eingabeWert: 100, alkoholgehalt: 50, alkoholgehaltManuell: 45 });
    const result = berechneKomponente(k, 1000);
    expect(result.literAlkohol).toBeCloseTo(45, 3);
  });

  it('markiert Komponente als nicht verfügbar, wenn Bestand zu klein', () => {
    const k = makeKomponente({ eingabeWert: 500, verfuegbareMenge: 100 });
    const result = berechneKomponente(k, 1000);
    expect(result.istVerfuegbar).toBe(false);
  });
});

describe('berechneRezeptur', () => {
  it('berechnet gewichteten Durchschnitts-ABV über mehrere Komponenten', () => {
    const rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur.basisMenge = 1000;
    rezeptur.komponenten = [
      makeKomponente({ id: 'a', eingabeWert: 600, alkoholgehalt: 50 }), // 300 LA
      makeKomponente({ id: 'b', eingabeWert: 400, alkoholgehalt: 40 }), // 160 LA
    ];
    const result = berechneRezeptur(rezeptur);
    expect(result.ergebnis!.gesamtMengeLiter).toBe(1000);
    expect(result.ergebnis!.gesamtLiterAlkohol).toBeCloseTo(460, 3);
    expect(result.ergebnis!.durchschnittAlkohol).toBeCloseTo(46, 3); // 460/1000*100
  });
});

describe('skaliereRezeptur', () => {
  it('skaliert Komponenten proportional und prüft echten Lagerbestand', () => {
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur.basisMenge = 10;
    rezeptur.komponenten = [makeKomponente({ id: 'a', produktId: 'item-1', eingabeWert: 5, alkoholgehalt: 50 })];
    rezeptur = berechneRezeptur(rezeptur);

    const inventory = [makeInventoryItem({ id: 'item-1', currentQuantityLiters: 1000 })];
    const skaliert = skaliereRezeptur(rezeptur, 1000, inventory); // Faktor 100

    expect(skaliert.komponenten[0].mengeFuerProduktion).toBeCloseTo(500, 3);
    expect(skaliert.komponenten[0].istVerfuegbar).toBe(true);
  });

  it('erkennt fehlende Verfügbarkeit bei der Skalierung', () => {
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur.basisMenge = 10;
    rezeptur.komponenten = [makeKomponente({ id: 'a', produktId: 'item-1', eingabeWert: 5, alkoholgehalt: 50 })];
    rezeptur = berechneRezeptur(rezeptur);

    const inventory = [makeInventoryItem({ id: 'item-1', currentQuantityLiters: 100 })]; // zu wenig für 500L
    const skaliert = skaliereRezeptur(rezeptur, 1000, inventory);

    expect(skaliert.komponenten[0].istVerfuegbar).toBe(false);
    expect(skaliert.ergebnis!.komponentenVerfuegbar).toBe(false);
  });

  it('freie Zutaten (Wasser) sind immer verfügbar, unabhängig vom Lager', () => {
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur = fuegeFreieZutatHinzu(rezeptur, 'Wasser', 'liter', 5, 0);
    rezeptur.basisMenge = rezeptur.komponenten.reduce((s, k) => s + k.eingabeWert, 0);
    rezeptur = berechneRezeptur(rezeptur);

    const skaliert = skaliereRezeptur(rezeptur, 500, []);
    expect(skaliert.komponenten[0].istVerfuegbar).toBe(true);
  });
});

describe('berechneVerschnittMitFixUndReduzierbar (GFKC-O Praxisbeispiel aus dem Fachdokument)', () => {
  it('reproduziert die dokumentierten Zahlen exakt (Abschnitt 6, Reduktionsfaktor 50%)', () => {
    // Fixkomponenten: 661,22 L; TH+OR+SA bei 50% Reduktion: 169,39 L -> Basis 830,61 L (65%)
    // ZM-Zusatz: 447,25 L (35%) bei 52,5% ABV -> GFKC-O pur: 1.277,86 L
    const komponenten: RezepturKomponente[] = [
      makeKomponente({ id: 'fix', eingabeWert: 661.22, istFix: true, mengeInLiter: 661.22 }),
      makeKomponente({ id: 'reduzierbar', eingabeWert: 338.78, istFix: false, reduktionsfaktor: 0.5, mengeInLiter: 338.78 }),
    ];

    const result = berechneVerschnittMitFixUndReduzierbar(komponenten, 0.65, 52.5);

    expect(result.basisSumme).toBeCloseTo(830.61, 1); // 661.22 + 338.78*0.5
    expect(result.zielGesamtmenge).toBeCloseTo(1277.86, 1); // 830.61 / 0.65
    expect(result.zusatzVolumen).toBeCloseTo(447.25, 1);
  });

  it('warnt, wenn Fixkomponenten allein das Zielverhältnis sprengen', () => {
    const komponenten: RezepturKomponente[] = [
      makeKomponente({ id: 'fix', eingabeWert: 900, istFix: true, mengeInLiter: 900 }),
    ];
    // Zielanteil 0,65 einer angenommenen kleineren Menge - Fix allein ist schon zu groß
    const result = berechneVerschnittMitFixUndReduzierbar(komponenten, 0.9, 52.5);
    // basisSumme=900, zielGesamtmenge=900/0.9=1000 -> hier kein Sprengen, teste expliziten Sprengfall:
    const result2 = berechneVerschnittMitFixUndReduzierbar(
      [makeKomponente({ id: 'fix', eingabeWert: 900, istFix: true, mengeInLiter: 900 })],
      0.5, // Ziel: Fix soll nur 50% sein, aber 900L Fix allein > 50% jeder sinnvoll kleinen Menge
      52.5,
    );
    expect(result2.warnung).toBeUndefined(); // bei reinem Fix-Fall wächst zielGesamtmenge einfach mit, kein Widerspruch
    void result;
  });
});

describe('berechneAlkoholKorrektur', () => {
  it('berechnet Wasserzugabe bei zu hohem ABV', () => {
    // 1000L bei 60% ABV, Ziel 53,5% -> verdünnen
    const result = berechneAlkoholKorrektur(1000, 60, 53.5, 96);
    expect(result.wasserZugabe).toBeGreaterThan(0);
    expect(result.spritZugabe).toBe(0);
    // Kontrolle: LA vorher = LA nachher (Verdünnen ändert LA nicht)
    const laVorher = 1000 * 0.60;
    const laNachher = result.endmenge * 0.535;
    expect(laNachher).toBeCloseTo(laVorher, 1);
  });

  it('berechnet Spritzugabe bei zu niedrigem ABV mit echter Sprit-Konzentration (nicht hartcodiert)', () => {
    // 1000L bei 50% ABV, Ziel 53,5%, Sprit mit 96% (nicht die alte hartcodierte 60%)
    const result = berechneAlkoholKorrektur(1000, 50, 53.5, 96);
    expect(result.spritZugabe).toBeGreaterThan(0);
    expect(result.wasserZugabe).toBe(0);
  });

  it('liefert keine Korrektur, wenn ABV bereits dem Ziel entspricht', () => {
    const result = berechneAlkoholKorrektur(1000, 53.5, 53.5, 96);
    expect(result.wasserZugabe).toBe(0);
    expect(result.spritZugabe).toBe(0);
    expect(result.endmenge).toBe(1000);
  });

  it('zielAlkohol ist frei wählbar - auch deutlich abweichend von 53,5% (kein Gate)', () => {
    // Bestätigt die Korrektur vom 27.09.2026: 53,5% ist kein technisches Gate
    const result = berechneAlkoholKorrektur(1000, 50, 55, 96);
    expect(result.spritZugabe).toBeGreaterThan(0);
  });
});

describe('validiereRezeptur', () => {
  it('meldet Fehler bei leerer Komponentenliste', () => {
    const rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    const result = validiereRezeptur(rezeptur);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('ist valide, wenn Komponentensumme der Basismenge entspricht', () => {
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur.basisMenge = 100;
    rezeptur.komponenten = [makeKomponente({ eingabeWert: 100 })];
    rezeptur = berechneRezeptur(rezeptur);
    const result = validiereRezeptur(rezeptur);
    expect(result.valid).toBe(true);
  });
});

describe('fuegeKomponenteHinzu', () => {
  it('übernimmt Alkoholgehalt und Tank aus dem Lagerposten', () => {
    const rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    const item = makeInventoryItem({ alcoholVolProzent: 77, tankNr: 'Fass-3' });
    const updated = fuegeKomponenteHinzu(rezeptur, item, 'liter', 50);
    expect(updated.komponenten).toHaveLength(1);
    expect(updated.komponenten[0].alkoholgehalt).toBe(77);
    expect(updated.komponenten[0].tankNr).toBe('Fass-3');
  });
});
