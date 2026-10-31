import { describe, it, expect } from 'vitest';
import { crc32 as nodeCrc32 } from 'zlib';
import {
  buildNiceLabelCsv, labelPngFileName, labelQrUrl, buildTankQrUrls, mmToPx, setPngDpi, readPngDpi,
  LABEL_WIDTH_MM, LABEL_HEIGHT_MM,
} from '../tank-label';

// 1×1-Pixel-PNG ohne pHYs-Chunk
const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const tank = { tankNr: 'T 341', bezeichnung: 'Zitronenmelisse', volumenLiter: 5000, fuellstandLiter: 1200, sorte: 'Zitronenmelisse [M]' };

function chunks(b64: string): { type: string; data: Buffer; crc: number }[] {
  const buf = Buffer.from(b64, 'base64');
  const out = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    out.push({ type: buf.toString('ascii', off + 4, off + 8), data: buf.subarray(off + 8, off + 8 + len), crc: buf.readUInt32BE(off + 8 + len) });
    off += 12 + len;
  }
  return out;
}

describe('tank-label (QR-Etiketten, Nutzer-Anfrage 31.10.2026)', () => {
  it('Etikettengröße 80 × 105 mm ergibt bei 300 dpi 945 × 1240 Pixel', () => {
    expect(mmToPx(LABEL_WIDTH_MM)).toBe(945);
    expect(mmToPx(LABEL_HEIGHT_MM)).toBe(1240);
  });

  it('Etikett: mit GitHub kurzer Live-Link ohne Schnappschuss, ohne GitHub Schnappschuss-Link', () => {
    expect(labelQrUrl(tank, true)).toBe('https://woku369.github.io/MazerationsMeister/tank-viewer.html?tank=T%20341&mode=github');
    expect(labelQrUrl(tank, false)).toContain('/tank-offline/?tank=T%20341&fallback=');
    expect(buildTankQrUrls(tank, false).liveUrl).toBeNull();
  });

  it('Tanknummer im Link ist kodiert (kein rohes Leerzeichen) und liest sich zurück wie das Original', () => {
    for (const url of [labelQrUrl(tank, true), buildTankQrUrls(tank, true).offlineUrl, buildTankQrUrls(tank, true).liveUrl!]) {
      expect(url).not.toContain(' ');
      expect(new URL(url).searchParams.get('tank')).toBe('T 341');
    }
  });

  it('NiceLabel-CSV: BOM, Kopfzeile, Semikolon, Windows-Zeilenenden, Sonderzeichen korrekt maskiert', () => {
    const csv = buildNiceLabelCsv([
      { gebindenummer: 'T 341', qrLink: 'https://x/a?b=1' },
      { gebindenummer: 'Fass;"A"', qrLink: 'https://x/c' },
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Gebindenummer;QR_Link');
    expect(lines[1]).toBe('T 341;https://x/a?b=1');
    expect(lines[2]).toBe('"Fass;""A""";https://x/c');
    expect(lines[3]).toBe('');
  });

  it('Dateinamen sind Windows-tauglich', () => {
    expect(labelPngFileName('T 341')).toBe('Etikett_T_341.png');
    expect(labelPngFileName('IBC-GFKC-M-A')).toBe('Etikett_IBC-GFKC-M-A.png');
    expect(labelPngFileName('K-2012-2 / FEHLT')).toBe('Etikett_K-2012-2_FEHLT.png');
  });

  it('setPngDpi trägt 300 dpi mit gültiger Prüfsumme direkt nach IHDR ein', () => {
    const out = setPngDpi(TINY_PNG, 300);
    expect(readPngDpi(TINY_PNG)).toBeNull();
    expect(readPngDpi(out)).toBe(300);

    const list = chunks(out);
    expect(list.map(c => c.type)).toEqual(['IHDR', 'pHYs', 'IDAT', 'IEND']);
    for (const c of list) {
      expect(c.crc).toBe(nodeCrc32(Buffer.concat([Buffer.from(c.type, 'ascii'), c.data])));
    }
  });

  it('setPngDpi ersetzt einen vorhandenen pHYs-Chunk statt einen zweiten anzuhängen', () => {
    const twice = setPngDpi(setPngDpi(TINY_PNG, 96), 300);
    const types = chunks(twice).map(c => c.type);
    expect(types.filter(t => t === 'pHYs')).toHaveLength(1);
    expect(readPngDpi(twice)).toBe(300);
  });
});
