/**
 * Zeichnet ein fertiges QR-Etikett (80 × 105 mm, 300 dpi) im Browser:
 * oben der QR-Code, darunter groß die Gebindenummer, sonst nichts.
 *
 * Der QR-Code wird Modul für Modul in ganzen Pixeln gezeichnet statt als
 * skaliertes Bild - so bleibt er beim Thermotransferdruck scharfkantig.
 */
import QRCode from 'qrcode';
import {
  LABEL_WIDTH_MM, LABEL_HEIGHT_MM, LABEL_MARGIN_MM, LABEL_DPI, mmToPx, setPngDpi,
} from './tank-label';

/** Liefert das Etikett als PNG (Base64 ohne data:-Präfix) mit 300-dpi-Angabe. */
export function renderTankLabelPng(gebindenummer: string, qrLink: string): string {
  const width = mmToPx(LABEL_WIDTH_MM);
  const height = mmToPx(LABEL_HEIGHT_MM);
  const margin = mmToPx(LABEL_MARGIN_MM);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas wird nicht unterstützt.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // QR-Code: so groß wie die Breite abzüglich Rand erlaubt, ganzzahlige Modulgröße.
  const qr = QRCode.create(qrLink, { errorCorrectionLevel: 'M' });
  const modules = qr.modules.size;
  const maxQrPx = width - 2 * margin;
  const modulePx = Math.floor(maxQrPx / modules);
  if (modulePx < 1) throw new Error('QR-Link zu lang für das Etikett.');
  const qrPx = modulePx * modules;
  const qrX = Math.round((width - qrPx) / 2);
  const qrY = margin;

  ctx.fillStyle = '#000000';
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.modules.get(row, col)) {
        ctx.fillRect(qrX + col * modulePx, qrY + row * modulePx, modulePx, modulePx);
      }
    }
  }

  // Gebindenummer: im Raum unter dem QR-Code, so groß wie Breite und Höhe erlauben.
  const textTop = qrY + qrPx + mmToPx(4);
  const textBottom = height - margin;
  const textAreaHeight = textBottom - textTop;
  const text = gebindenummer.trim();
  let fontPx = Math.floor(textAreaHeight * 0.85);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  do {
    ctx.font = `bold ${fontPx}px Arial, Helvetica, sans-serif`;
    if (ctx.measureText(text).width <= maxQrPx) break;
    fontPx -= 4;
  } while (fontPx > 20);
  ctx.fillText(text, width / 2, textTop + textAreaHeight / 2);

  const base64 = canvas.toDataURL('image/png').split(',')[1];
  return setPngDpi(base64, LABEL_DPI);
}
