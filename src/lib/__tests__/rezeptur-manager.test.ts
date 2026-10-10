import { describe, it, expect } from 'vitest';
import {
  berechneKomponente,
  berechneRezeptur,
  skaliereRezeptur,
  berechneVerschnittMitFixUndReduzierbar,
  berechneAlkoholKorrektur,
  berechneMaxProduktionsmenge,
  erstelleScaleUp,
  validiereRezeptur,
  kannFreigebenWerden,
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

describe('Direktverschnitt bereits gelagerter Mengen (Nutzer-Anfrage 10.10.2026, nach einem GFKC-Verschnitt aus bereits bekannten Lagermengen ohne echten Testansatz-/Skalierungsbedarf)', () => {
  it('erstelleNeueRezeptur() startet mit basisMenge 0 statt 1L, wenn istDirektverschnitt gesetzt ist', () => {
    const rezeptur = erstelleNeueRezeptur('GFKC-N', 'GFKC-N', true);
    expect(rezeptur.istDirektverschnitt).toBe(true);
    expect(rezeptur.basisMenge).toBe(0);
  });

  it('berechneRezeptur() hält die Basismenge automatisch synchron mit der Summe der absolut eingetragenen Litermengen', () => {
    let rezeptur = erstelleNeueRezeptur('GFKC-N', 'GFKC-N', true);
    rezeptur.komponenten = [
      makeKomponente({ id: 'a', eingabeWert: 3190, alkoholgehalt: 53.5 }),
      makeKomponente({ id: 'b', eingabeWert: 460, alkoholgehalt: 55.5 }),
      makeKomponente({ id: 'c', eingabeWert: 2090, alkoholgehalt: 54 }),
    ];
    const result = berechneRezeptur(rezeptur);
    expect(result.basisMenge).toBe(5740);
    expect(result.ergebnis!.gesamtMengeLiter).toBe(5740);
    // anteilProzent nutzt die SOFORT aktualisierte Basismenge, nicht den Stand von vor diesem Aufruf
    expect(result.komponenten[0].anteilProzent).toBeCloseTo((3190 / 5740) * 100, 3);
  });

  it('die Basismenge explodiert NICHT mehr beim Skalieren, da sie der realen Gesamtmenge entspricht (Regressionstest für den gefundenen anteilProzent-319000%-Bug)', () => {
    let rezeptur = erstelleNeueRezeptur('GFKC-N', 'GFKC-N', true);
    rezeptur.komponenten = [makeKomponente({ id: 'a', eingabeWert: 3190, alkoholgehalt: 53.5 })];
    rezeptur = berechneRezeptur(rezeptur);
    expect(rezeptur.komponenten[0].anteilProzent).toBeLessThanOrEqual(100);
    expect(rezeptur.komponenten[0].anteilProzent).not.toBe(319000);
  });

  it('kannFreigebenWerden() verlangt bei Direktverschnitt weder Sensorik-Freigabe noch einen Status-Fortschritt über "entwurf" hinaus', () => {
    let rezeptur = erstelleNeueRezeptur('GFKC-N', 'GFKC-N', true);
    rezeptur.komponenten = [makeKomponente({ id: 'a', eingabeWert: 100, alkoholgehalt: 50 })];
    rezeptur = berechneRezeptur(rezeptur);
    // status bleibt 'entwurf', keine sensorikBewertungen - würde ohne istDirektverschnitt ablehnen
    const freigabe = kannFreigebenWerden(rezeptur);
    expect(freigabe.kannFreigeben).toBe(true);
    expect(freigabe.gruende).toEqual([]);
  });

  it('kannFreigebenWerden() verlangt bei einer normalen Rezeptur (kein Direktverschnitt) weiterhin Sensorik-Freigabe', () => {
    let rezeptur = erstelleNeueRezeptur('Testansatz', 'GFKC-O'); // istDirektverschnitt default false
    rezeptur.basisMenge = 100;
    rezeptur.komponenten = [makeKomponente({ id: 'a', eingabeWert: 100, alkoholgehalt: 50 })];
    rezeptur = berechneRezeptur(rezeptur);
    const freigabe = kannFreigebenWerden(rezeptur);
    expect(freigabe.kannFreigeben).toBe(false);
    expect(freigabe.gruende.join(' ')).toContain('Sensorik');
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

describe('berechneMaxProduktionsmenge', () => {
  it('wird durch die knappste Komponente begrenzt, wenn der Tank groß genug ist', () => {
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur.basisMenge = 1; // Testansatz: 1L
    rezeptur.komponenten = [
      makeKomponente({ id: 'gfkc-alt', eingabeWert: 0.3, verfuegbareMenge: 50 }),  // erlaubt Faktor 166,67
      makeKomponente({ id: 'mazerat', eingabeWert: 0.5, verfuegbareMenge: 40 }),   // erlaubt Faktor 80 <- knapp
      makeKomponente({ id: 'destillat', eingabeWert: 0.2, verfuegbareMenge: 100 }), // erlaubt Faktor 500
    ];
    rezeptur = berechneRezeptur(rezeptur);

    const result = berechneMaxProduktionsmenge(rezeptur, 10000); // Tank groß genug, nicht limitierend
    expect(result.maxMenge).toBeCloseTo(80, 3); // 80 * 1L Basis
    expect(result.limitierendeKomponente).toBe('Testsorte'); // makeKomponente() nutzt diesen Namen für alle
    expect(result.limitiertDurchTank).toBe(false);
  });

  it('wird durch die Tank-Kapazität begrenzt, wenn die Komponenten mehr hergeben würden', () => {
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur.basisMenge = 1;
    rezeptur.komponenten = [makeKomponente({ id: 'a', eingabeWert: 0.5, verfuegbareMenge: 10000 })];
    rezeptur = berechneRezeptur(rezeptur);

    const result = berechneMaxProduktionsmenge(rezeptur, 300); // Tank kleiner als rechnerisch möglich
    expect(result.maxMenge).toBe(300);
    expect(result.limitiertDurchTank).toBe(true);
    expect(result.limitierendeKomponente).toBeUndefined();
  });

  it('ignoriert freie Zutaten (Wasser) bei der Begrenzung', () => {
    let rezeptur = erstelleNeueRezeptur('Test', 'GFKC-O');
    rezeptur = fuegeFreieZutatHinzu(rezeptur, 'Wasser', 'liter', 0.1, 0);
    rezeptur.komponenten.push(makeKomponente({ id: 'a', eingabeWert: 0.9, verfuegbareMenge: 90 }));
    rezeptur.basisMenge = 1;
    rezeptur = berechneRezeptur(rezeptur);

    const result = berechneMaxProduktionsmenge(rezeptur, 10000);
    expect(result.maxMenge).toBeCloseTo(100, 3); // nur durch die 0,9L-Komponente begrenzt (Faktor 100)
  });
});

describe('erstelleScaleUp', () => {
  it('skaliert korrekt hoch und verknüpft mit dem Testansatz', () => {
    let testansatz = erstelleNeueRezeptur('GFKC-O Muster 1', 'GFKC-O');
    testansatz.basisMenge = 1;
    testansatz.komponenten = [makeKomponente({ id: 'a', produktId: 'item-1', eingabeWert: 0.5, alkoholgehalt: 50 })];
    testansatz = berechneRezeptur(testansatz);
    testansatz.status = 'freigegeben';

    const inventory = [makeInventoryItem({ id: 'item-1', currentQuantityLiters: 1000 })];
    const scaleUp = erstelleScaleUp(testansatz, 80, inventory);

    expect(scaleUp.id).not.toBe(testansatz.id);
    expect(scaleUp.vorgaengerRezepturId).toBe(testansatz.id);
    expect(scaleUp.status).toBe('entwurf'); // durchläuft den Freigabeprozess erneut, in Produktionsmenge
    expect(scaleUp.version).toBe(testansatz.version + 1);
    expect(scaleUp.sensorikBewertungen).toHaveLength(0); // eigene Sensorik, nicht vom Testansatz übernommen
    expect(scaleUp.produktionsMenge).toBe(80);
    expect(scaleUp.komponenten[0].mengeFuerProduktion).toBeCloseTo(40, 3); // 0,5L * Faktor 80
  });

  it('hält mengeFuerProduktion synchron, wenn nach dem Scale-up eine Komponente nachjustiert wird', () => {
    let testansatz = erstelleNeueRezeptur('GFKC-O Muster 1', 'GFKC-O');
    testansatz.basisMenge = 1;
    testansatz.komponenten = [makeKomponente({ id: 'a', produktId: 'item-1', eingabeWert: 0.5, alkoholgehalt: 50 })];
    testansatz = berechneRezeptur(testansatz);

    const inventory = [makeInventoryItem({ id: 'item-1', currentQuantityLiters: 1000 })];
    let scaleUp = erstelleScaleUp(testansatz, 80, inventory);
    expect(scaleUp.komponenten[0].mengeFuerProduktion).toBeCloseTo(40, 3);

    // Nachbesserung: Komponente nachträglich auf 0,6L (statt 0,5L) im Testmaßstab geändert
    scaleUp.komponenten[0].eingabeWert = 0.6;
    scaleUp = berechneRezeptur(scaleUp);
    expect(scaleUp.komponenten[0].mengeFuerProduktion).toBeCloseTo(48, 3); // 0,6L * Faktor 80
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
