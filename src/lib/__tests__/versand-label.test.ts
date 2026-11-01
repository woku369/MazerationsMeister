import { describe, it, expect } from 'vitest';
import {
  buildVersandLabelData, generateVersandLabelsPdf, layoutA4, a4SlotOrigin, versandLabelFileName,
} from '../versand-label';
import type { LohnabfuellerVersand } from '@/schemas/versandSchema';

const versand: LohnabfuellerVersand = {
  id: 'v1',
  versandNummer: 'LF-2026-003',
  lohnabfuellerName: 'Mozart',
  versanddatum: '2026-11-03',
  versandLA: 0,
  createdAt: '2026-11-03T08:00:00.000Z',
  container: [
    { inventoryItemId: 'i1', leergebindeId: 'g1', tankNr: 'IBC-A', produktName: 'GFKC-N', chargenNummer: 'GFKC-N', mengeLiter: 1000, alkoholVolProzent: 53.5, dichte20C: 0.93, taraKg: 62 },
    { inventoryItemId: 'i2', leergebindeId: 'g2', tankNr: 'IBC-B', produktName: 'GFKC-N', chargenNummer: 'GFKC-N', mengeLiter: 980, alkoholVolProzent: 53.5, dichte20C: 0.93 },
    { inventoryItemId: 'i3', leergebindeId: 'g3', tankNr: 'IBC-C', produktName: 'GFKC-N', mengeLiter: 500, alkoholVolProzent: 53.5, taraKg: 60 },
  ],
};

function pdfPageSizesMm(base64: string): number[][] {
  const text = Buffer.from(base64, 'base64').toString('latin1');
  return [...text.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map(m => [parseFloat(m[1]) / 72 * 25.4, parseFloat(m[2]) / 72 * 25.4]);
}

describe('versand-label (Gebinde-Etiketten Versand an Lohnabfüller, Nutzer-Anfrage 31.10.2026)', () => {
  it('ein Etikett je Gebinde mit LA, Netto, Brutto und "Gebinde i von x"', () => {
    const labels = buildVersandLabelData(versand);
    expect(labels).toHaveLength(3);
    expect(labels[0]).toMatchObject({ artikel: 'GFKC-N', charge: 'GFKC-N', datum: '03.11.2026', liter: 1000, la: 535, taraKg: 62, gebindeNr: 1, gebindeGesamt: 3 });
    expect(labels[0].nettoKg).toBeCloseTo(930);
    expect(labels[0].bruttoKg).toBeCloseTo(992);
  });

  it('fehlende Tara oder Dichte: kein erfundener Wert, Brutto bleibt leer', () => {
    const [, ohneTara, ohneDichte] = buildVersandLabelData(versand);
    expect(ohneTara.taraKg).toBeNull();
    expect(ohneTara.nettoKg).toBeCloseTo(911.4);
    expect(ohneTara.bruttoKg).toBeNull();
    expect(ohneDichte.nettoKg).toBeNull();
    expect(ohneDichte.bruttoKg).toBeNull();
    expect(ohneDichte.charge).toBe('–');
  });

  it('A4-Bogen: Kacheln 1 2 / 3 4 à 105 × 148,5 mm', () => {
    expect(a4SlotOrigin(1)).toEqual({ x: 0, y: 0 });
    expect(a4SlotOrigin(2)).toEqual({ x: 105, y: 0 });
    expect(a4SlotOrigin(3)).toEqual({ x: 0, y: 148.5 });
    expect(a4SlotOrigin(4)).toEqual({ x: 105, y: 148.5 });
  });

  it('A4-Bogen: Startposition für angebrochene Bögen, Umbruch auf neue Seite', () => {
    expect(layoutA4(3, 1)).toEqual([{ page: 0, slot: 1 }, { page: 0, slot: 2 }, { page: 0, slot: 3 }]);
    expect(layoutA4(3, 3)).toEqual([{ page: 0, slot: 3 }, { page: 0, slot: 4 }, { page: 1, slot: 1 }]);
    expect(layoutA4(1, 9)).toEqual([{ page: 0, slot: 4 }]);
  });

  it('Thermo-PDF: eine Seite je Gebinde in 80 × 105 mm', () => {
    const { base64, pages } = generateVersandLabelsPdf(buildVersandLabelData(versand), 'thermo');
    expect(pages).toBe(3);
    for (const [w, h] of pdfPageSizesMm(base64)) {
      expect(w).toBeCloseTo(80, 0);
      expect(h).toBeCloseTo(105, 0);
    }
  });

  it('A4-PDF: 3 Etiketten ab Position 3 ergeben 2 A4-Seiten', () => {
    const { base64, pages } = generateVersandLabelsPdf(buildVersandLabelData(versand), 'a4', 3);
    expect(pages).toBe(2);
    for (const [w, h] of pdfPageSizesMm(base64)) {
      expect(w).toBeCloseTo(210, 0);
      expect(h).toBeCloseTo(297, 0);
    }
  });

  it('Dateinamen', () => {
    expect(versandLabelFileName('LF-2026-003', 'thermo')).toBe('Versand_LF-2026-003_Thermo_80x105.pdf');
    expect(versandLabelFileName('LF-2026-003', 'a4')).toBe('Versand_LF-2026-003_A4_4er_105x148.pdf');
  });

  // Sichtprüfung: LABEL_SAMPLE_DIR=<Ordner> npx vitest run versand-label
  it.runIf(!!process.env.LABEL_SAMPLE_DIR)('schreibt Beispiel-PDFs zur Sichtprüfung', async () => {
    const { writeFileSync } = await import('fs');
    const { join } = await import('path');
    const dir = process.env.LABEL_SAMPLE_DIR as string;
    const labels = buildVersandLabelData(versand);
    writeFileSync(join(dir, 'thermo.pdf'), Buffer.from(generateVersandLabelsPdf(labels, 'thermo').base64, 'base64'));
    writeFileSync(join(dir, 'a4.pdf'), Buffer.from(generateVersandLabelsPdf(labels, 'a4', 1).base64, 'base64'));
  });
});
