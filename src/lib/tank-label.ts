/**
 * QR-Etiketten für Tanks/Gebinde (Nutzer-Anfrage 31.10.2026): wasserfeste
 * Etiketten, Thermotransfer, NiceLabel auf Avery AP 4.4 (300 dpi), Format
 * 80 × 105 mm hochformat. Auf dem Etikett nur QR-Code und Gebindenummer.
 *
 * Zwei Wege, beide aus derselben URL-Logik gespeist wie der QR-Dialog der
 * Tank-Verwaltung:
 * - CSV für NiceLabel (Serien-Druck, NiceLabel erzeugt den QR selbst)
 * - fertiges PNG je Etikett in exakter Größe mit 300-dpi-Angabe
 */

export const LABEL_WIDTH_MM = 80;
export const LABEL_HEIGHT_MM = 105;
export const LABEL_DPI = 300;
export const LABEL_MARGIN_MM = 5;

/** Ordner im Exportverzeichnis, in den CSV und PNGs geschrieben werden. */
export const LABEL_SUBDIR = 'Etiketten';
/**
 * Fester Dateiname, damit die NiceLabel-Vorlage einmalig auf diese Datei zeigt
 * und jeden neuen Export automatisch übernimmt.
 */
export const NICELABEL_CSV_FILENAME = 'NiceLabel_Etiketten.csv';

const PAGES_BASE = 'https://woku369.github.io/MazerationsMeister';

export function mmToPx(mm: number, dpi: number = LABEL_DPI): number {
  return Math.round((mm / 25.4) * dpi);
}

export interface TankQrInput {
  tankNr: string;
  bezeichnung?: string;
  volumenLiter: number;
  fuellstandLiter: number;
  sorte: string;
}

/**
 * QR-Ziel-URLs eines Tanks. `offlineUrl` funktioniert immer (Daten im Link
 * eingebettet), `liveUrl` zeigt bei aktiver GitHub-Integration den aktuell
 * synchronisierten Stand (der Viewer nimmt die eingebetteten Daten nur als
 * letzten Rückfall).
 */
export function buildTankQrUrls(tank: TankQrInput, githubEnabled: boolean): { offlineUrl: string; liveUrl: string | null } {
  const fallbackData = {
    tankNr: tank.tankNr,
    bezeichnung: tank.bezeichnung,
    volumen: tank.volumenLiter,
    aktuellerFuellstand: tank.fuellstandLiter,
    sorte: tank.sorte || 'Leer',
    batch: githubEnabled ? 'GitHub-Integration aktiv' : 'Offline verfügbar',
    temperatur: 'Siehe Desktop-App',
    alkoholgehalt: 'Siehe Desktop-App',
    ph_wert: 'Nicht gemessen',
    status: githubEnabled ? 'GitHub-verbunden' : 'Offline verfügbar',
    verantwortlicher: githubEnabled ? 'GitHub System' : 'Lokales System',
    naechsteKontrolle: 'Bei nächster Aktualisierung',
    letzteAktualisierung: new Date().toLocaleDateString('de-DE'),
  };
  const encoded = encodeURIComponent(JSON.stringify(fallbackData));
  // Tanknummer kodiert: ein rohes Leerzeichen ("T 341") lässt manche
  // Kamera-Apps den Link dort abschneiden. Der Viewer liest per
  // URLSearchParams, bekommt also denselben Wert.
  const tankParam = encodeURIComponent(tank.tankNr);
  return {
    offlineUrl: `${PAGES_BASE}/tank-offline/?tank=${tankParam}&fallback=${encoded}`,
    liveUrl: githubEnabled ? `${PAGES_BASE}/tank-viewer.html?tank=${tankParam}&fallback=${encoded}&mode=github` : null,
  };
}

/**
 * Link für ein dauerhaft aufgeklebtes Etikett. Mit GitHub-Integration ein
 * kurzer Live-Link ohne eingebetteten Schnappschuss: Der wäre auf dem
 * Etikett nach der nächsten Buchung ohnehin veraltet, macht den QR-Code aber
 * sehr dicht (schlechter lesbar im Tankraum). Ohne GitHub bleibt der
 * Schnappschuss drin - dann ist er die einzige Datenquelle.
 */
export function labelQrUrl(tank: TankQrInput, githubEnabled: boolean): string {
  if (githubEnabled) return `${PAGES_BASE}/tank-viewer.html?tank=${encodeURIComponent(tank.tankNr)}&mode=github`;
  return buildTankQrUrls(tank, false).offlineUrl;
}

function csvField(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * CSV für die NiceLabel-Datenbankverbindung: Semikolon-getrennt, Kopfzeile
 * Gebindenummer;QR_Link, UTF-8 mit BOM (damit Umlaute korrekt ankommen),
 * Windows-Zeilenenden.
 */
export function buildNiceLabelCsv(rows: { gebindenummer: string; qrLink: string }[]): string {
  const lines = ['Gebindenummer;QR_Link', ...rows.map(r => `${csvField(r.gebindenummer)};${csvField(r.qrLink)}`)];
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** Windows-taugliche Dateinamen, z.B. "T 341" → "Etikett_T_341.png". */
export function labelPngFileName(tankNr: string): string {
  const safe = tankNr.trim().replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_') || 'Gebinde';
  return `Etikett_${safe}.png`;
}

// --- 300-dpi-Angabe im PNG -------------------------------------------------
// Canvas-PNGs tragen keine Auflösungsangabe; NiceLabel würde das Bild dann mit
// 96 dpi einsetzen (≈ 250 mm breit). Ein pHYs-Chunk sorgt dafür, dass es beim
// Einfügen sofort 80 × 105 mm groß ist.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Setzt die Auflösung eines PNG (Base64 ohne data:-Präfix) auf `dpi`: fügt
 * nach dem IHDR-Chunk einen pHYs-Chunk ein bzw. ersetzt einen vorhandenen.
 */
export function setPngDpi(pngBase64: string, dpi: number): string {
  const src = base64ToBytes(pngBase64);
  const PNG_SIG_LEN = 8;
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  const chunkType = (off: number) => String.fromCharCode(src[off + 4], src[off + 5], src[off + 6], src[off + 7]);

  const ihdrLen = view.getUint32(PNG_SIG_LEN);
  const afterIhdr = PNG_SIG_LEN + 12 + ihdrLen;

  // Vorhandenen pHYs-Chunk überspringen (falls der Browser einen schreibt).
  const parts: Uint8Array[] = [src.subarray(0, afterIhdr)];
  let off = afterIhdr;
  const rest: Uint8Array[] = [];
  while (off < src.length) {
    const len = view.getUint32(off);
    const total = 12 + len;
    if (chunkType(off) !== 'pHYs') rest.push(src.subarray(off, off + total));
    off += total;
  }

  const ppm = Math.round(dpi / 0.0254);
  const phys = new Uint8Array(21);
  const pv = new DataView(phys.buffer);
  pv.setUint32(0, 9);
  phys.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  pv.setUint32(8, ppm);
  pv.setUint32(12, ppm);
  phys[16] = 1; // Einheit: Meter
  pv.setUint32(17, crc32(phys.subarray(4, 17)));

  parts.push(phys, ...rest);
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return bytesToBase64(out);
}

/** Liest die Auflösung aus einem PNG (für Tests); null, wenn kein pHYs-Chunk. */
export function readPngDpi(pngBase64: string): number | null {
  const src = base64ToBytes(pngBase64);
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  let off = 8;
  while (off < src.length) {
    const len = view.getUint32(off);
    const type = String.fromCharCode(src[off + 4], src[off + 5], src[off + 6], src[off + 7]);
    if (type === 'pHYs' && src[off + 16] === 1) return Math.round(view.getUint32(off + 8) * 0.0254);
    off += 12 + len;
  }
  return null;
}
