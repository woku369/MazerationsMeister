/**
 * Gebinde-Etiketten für den Versand an den Lohnabfüller (Nutzer-Anfrage
 * 31.10.2026): Beklebung der IBCs, die an Mozart gehen. Je Gebinde ein
 * Etikett mit Artikel, Charge, Datum, Liter/%vol./LA, Tara/Netto/Brutto und
 * "Gebinde i von x".
 *
 * Zwei Formate, beide als PDF zum direkten Drucken:
 * - Thermotransfer 80 × 105 mm hochformat (gleiche Etikettenrolle wie die
 *   QR-Etiketten), ein Etikett je Seite
 * - A4-Bogen mit 4 Etiketten 105 × 148 mm (2 × 2, z.B. Avery Zweckform 3483)
 *   für den schnellen Druck am Büro-Drucker, mit Startposition für
 *   angebrochene Bögen
 */
import jsPDF from 'jspdf';
import { calcLA } from './mazeration-calc';
import type { LohnabfuellerVersand } from '@/schemas/versandSchema';

export type VersandLabelFormat = 'thermo' | 'a4';

export interface VersandLabelData {
  artikel: string;
  charge: string;
  datum: string;          // bereits formatiert (TT.MM.JJJJ)
  liter: number;
  volProzent: number;
  la: number;
  taraKg: number | null;
  nettoKg: number | null;
  bruttoKg: number | null;
  gebindeNr: number;      // 1-basiert
  gebindeGesamt: number;
}

function fmtDateDe(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('de-DE');
}

/** Ein Etikett je Gebinde, in der Reihenfolge des Versands. */
export function buildVersandLabelData(versand: LohnabfuellerVersand): VersandLabelData[] {
  const gesamt = versand.container.length;
  return versand.container.map((c, idx) => {
    const nettoKg = c.dichte20C != null ? c.mengeLiter * c.dichte20C : null;
    const taraKg = c.taraKg ?? null;
    return {
      artikel: c.produktName,
      charge: c.chargenNummer || '–',
      datum: fmtDateDe(versand.versanddatum),
      liter: c.mengeLiter,
      volProzent: c.alkoholVolProzent,
      la: calcLA(c.mengeLiter, c.alkoholVolProzent),
      taraKg,
      nettoKg,
      bruttoKg: nettoKg != null && taraKg != null ? nettoKg + taraKg : null,
      gebindeNr: idx + 1,
      gebindeGesamt: gesamt,
    };
  });
}

// --- Geometrie --------------------------------------------------------------

export const THERMO_LABEL = { widthMm: 80, heightMm: 105 };
export const A4_LABEL = { widthMm: 105, heightMm: 148.5 };
const A4 = { widthMm: 210, heightMm: 297 };

/** Position (oben links, mm) der Etiketten-Kachel 1–4 auf dem A4-Bogen: 1 2 / 3 4. */
export function a4SlotOrigin(slot: number): { x: number; y: number } {
  const i = slot - 1;
  return { x: (i % 2) * A4_LABEL.widthMm, y: Math.floor(i / 2) * A4_LABEL.heightMm };
}

/**
 * Verteilt n Etiketten auf A4-Seiten ab Startposition (1–4) - für einen
 * bereits angebrochenen Bogen. Liefert je Etikett Seite (0-basiert) und Kachel.
 */
export function layoutA4(n: number, startSlot: number = 1): { page: number; slot: number }[] {
  const start = Math.min(4, Math.max(1, Math.floor(startSlot)));
  return Array.from({ length: n }, (_, i) => {
    const pos = start - 1 + i;
    return { page: Math.floor(pos / 4), slot: (pos % 4) + 1 };
  });
}

// --- Zeichnen ---------------------------------------------------------------

const num = (v: number, digits: number) => v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const kg = (v: number | null) => (v != null ? num(v, 1) : '–');

/** Schriftgröße (pt), bei der `text` höchstens `maxWidthMm` breit ist. */
function fitFontSize(doc: jsPDF, text: string, maxWidthMm: number, startPt: number, minPt: number): number {
  let size = startPt;
  doc.setFontSize(size);
  while (size > minPt && doc.getTextWidth(text) > maxWidthMm) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
}

/**
 * Zeichnet ein Etikett in die Box (x, y, w, h) in mm. Alle Maße relativ zur
 * Boxgröße, damit dasselbe Layout für 80 × 105 und 105 × 148 passt. Nur
 * Schwarz (Thermotransfer).
 */
function drawLabel(doc: jsPDF, x: number, y: number, w: number, h: number, d: VersandLabelData) {
  const s = Math.min(w / 105, h / 148.5); // Skalierung relativ zum A4-Etikett
  const pad = 7 * s;
  const innerW = w - 2 * pad;
  const left = x + pad;
  let cy = y + pad;

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  // Artikel - groß, auf Breite eingepasst
  doc.setFont('helvetica', 'bold');
  const artikelPt = fitFontSize(doc, d.artikel, innerW, 36 * s, 10 * s);
  cy += artikelPt * 0.3528;
  doc.text(d.artikel, left, cy);
  cy += 4 * s;
  doc.setLineWidth(0.6 * s);
  doc.line(left, cy, left + innerW, cy);
  cy += 8 * s;

  // Charge / Datum
  const labelPt = 11 * s;
  const valuePt = 22 * s;
  const field = (label: string, value: string, fx: number, fy: number, maxW: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(labelPt);
    doc.text(label, fx, fy);
    doc.setFont('helvetica', 'bold');
    fitFontSize(doc, value, maxW, valuePt, 8 * s);
    doc.text(value, fx, fy + valuePt * 0.3528 + 1.2 * s);
  };
  const rowH = (labelPt + valuePt) * 0.3528 + 7 * s;
  const half = innerW / 2;
  field('Charge', d.charge, left, cy, half - 2 * s);
  field('Datum', d.datum, left + half, cy, half);
  cy += rowH;

  // Menge: Liter / %vol. / LA
  const third = innerW / 3;
  const block = (title: string, cells: [string, string][]) => {
    doc.setLineWidth(0.3 * s);
    doc.line(left, cy - 3 * s, left + innerW, cy - 3 * s);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(labelPt);
    doc.text(title.toUpperCase(), left, cy + 0.5 * s);
    cy += 6 * s;
    cells.forEach(([label, value], i) => field(label, value, left + i * third, cy, third - 2 * s));
    cy += rowH;
  };
  block('Menge', [
    ['Liter', num(d.liter, 1)],
    ['% vol.', num(d.volProzent, 2)],
    ['LA', num(d.la, 2)],
  ]);
  // Einheit in der Überschrift statt hinter jedem Wert - sonst stoßen die
  // drei Gewichte bei 80 mm Breite fast aneinander.
  block('Gewicht', [
    ['Tara (kg)', kg(d.taraKg)],
    ['Netto (kg)', kg(d.nettoKg)],
    ['Brutto (kg)', kg(d.bruttoKg)],
  ]);

  // Gebinde i von x - unten, groß
  const gebindeText = `Gebinde ${d.gebindeNr} von ${d.gebindeGesamt}`;
  doc.setFont('helvetica', 'bold');
  const gPt = fitFontSize(doc, gebindeText, innerW, 30 * s, 10 * s);
  const gy = y + h - pad;
  doc.setLineWidth(0.6 * s);
  doc.line(left, gy - gPt * 0.3528 - 3 * s, left + innerW, gy - gPt * 0.3528 - 3 * s);
  doc.text(gebindeText, left, gy);
}

/** Erzeugt das PDF (Base64 ohne data:-Präfix) für alle Etiketten. */
export function generateVersandLabelsPdf(
  labels: VersandLabelData[],
  format: VersandLabelFormat,
  startSlot: number = 1,
): { base64: string; pages: number } {
  if (labels.length === 0) throw new Error('Keine Gebinde im Versand.');

  if (format === 'thermo') {
    const { widthMm: w, heightMm: h } = THERMO_LABEL;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [w, h] });
    labels.forEach((d, i) => {
      if (i > 0) doc.addPage([w, h], 'p');
      drawLabel(doc, 0, 0, w, h, d);
    });
    return { base64: doc.output('datauristring').split(',')[1], pages: doc.getNumberOfPages() };
  }

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const layout = layoutA4(labels.length, startSlot);
  let currentPage = 0;
  layout.forEach(({ page, slot }, i) => {
    while (currentPage < page) {
      doc.addPage('a4', 'p');
      currentPage++;
    }
    const { x, y } = a4SlotOrigin(slot);
    drawLabel(doc, x, y, A4_LABEL.widthMm, A4_LABEL.heightMm, labels[i]);
  });
  return { base64: doc.output('datauristring').split(',')[1], pages: doc.getNumberOfPages() };
}

/** Dateiname, z.B. "Versand_LF-2026-003_Thermo_80x105.pdf". */
export function versandLabelFileName(versandNummer: string, format: VersandLabelFormat): string {
  const safe = versandNummer.replace(/[\\/:*?"<>|\s]+/g, '_');
  return `Versand_${safe}_${format === 'thermo' ? 'Thermo_80x105' : 'A4_4er_105x148'}.pdf`;
}

export { A4 as A4_PAGE };
