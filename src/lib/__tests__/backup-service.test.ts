import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock()-Fabriken werden gehoisted - Variablen, auf die sie zugreifen,
// müssen deshalb über vi.hoisted() deklariert werden.
const { uploadFileMock, lastGithubServiceConfig, getGithubTokenMock, fetchMock } = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  lastGithubServiceConfig: { current: null as any },
  getGithubTokenMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('../github-service', () => ({
  GitHubService: class {
    config: any;
    constructor(config: any) {
      this.config = config;
      lastGithubServiceConfig.current = config;
    }
    uploadFile = uploadFileMock;
  },
}));

vi.mock('../github-token', () => ({ getGithubToken: getGithubTokenMock }));

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

import {
  BACKUP_KEYS,
  collectFullBackup,
  applyFullBackup,
  summarizeBackup,
  parseBackupFile,
  uploadBackupToGithub,
  fetchBackupFromGithub,
} from '../backup-service';

describe('backup-service', () => {
  beforeEach(() => {
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = makeLocalStorage();
    uploadFileMock.mockReset().mockResolvedValue(true);
    getGithubTokenMock.mockReset().mockReturnValue('');
    fetchMock.mockReset();
    lastGithubServiceConfig.current = null;
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).fetch;
  });

  describe('collectFullBackup / applyFullBackup', () => {
    it('sichert jeden bekannten Datentopf unverändert als Roh-String und schreibt ihn beim Wiederherstellen exakt so zurück', () => {
      localStorage.setItem('inventoryItems', JSON.stringify([{ id: 'i1', produktName: 'Zitronenmelisse' }]));
      localStorage.setItem('artikelDefinitionen', JSON.stringify([{ id: 'a1' }]));
      // Bewusst KEIN JSON, sondern ein reiner Zahl-String (siehe mazeration-form.tsx) -
      // eine erneute JSON-(De-)Serialisierung müsste das exakt erhalten.
      localStorage.setItem('taraPerCrateKg', '1.35');
      // Ein nicht in BACKUP_KEYS enthaltener Schlüssel darf nicht mitgesichert werden
      // (z.B. maschinenspezifisch oder sicherheitsrelevant, siehe github-token).
      localStorage.setItem('github-token', 'geheim-123');

      const backup = collectFullBackup();

      expect(backup.values['inventoryItems']).toBe(JSON.stringify([{ id: 'i1', produktName: 'Zitronenmelisse' }]));
      expect(backup.values['taraPerCrateKg']).toBe('1.35');
      expect(backup.values).not.toHaveProperty('github-token');

      localStorage.clear();
      applyFullBackup(backup);

      expect(localStorage.getItem('inventoryItems')).toBe(JSON.stringify([{ id: 'i1', produktName: 'Zitronenmelisse' }]));
      expect(localStorage.getItem('artikelDefinitionen')).toBe(JSON.stringify([{ id: 'a1' }]));
      expect(localStorage.getItem('taraPerCrateKg')).toBe('1.35');
    });

    it('lässt einen Datentopf, der im Backup fehlt, beim Wiederherstellen unangetastet', () => {
      localStorage.setItem('inventoryItems', '[]');
      const backup = collectFullBackup(); // rezepturen etc. waren nie gesetzt, fehlen im Backup

      localStorage.setItem('rezepturen', JSON.stringify([{ id: 'bestehend' }]));
      applyFullBackup(backup);

      expect(localStorage.getItem('rezepturen')).toBe(JSON.stringify([{ id: 'bestehend' }]));
    });

    it('sichert alle in BACKUP_KEYS gelisteten Schlüssel, sobald sie gesetzt sind', () => {
      for (const key of BACKUP_KEYS) {
        localStorage.setItem(key, JSON.stringify([{ marker: key }]));
      }
      const backup = collectFullBackup();
      for (const key of BACKUP_KEYS) {
        expect(backup.values[key]).toBe(JSON.stringify([{ marker: key }]));
      }
    });
  });

  describe('summarizeBackup', () => {
    it('zählt die Einträge je Datentopf für die Vorschau vor dem Wiederherstellen', () => {
      localStorage.setItem('inventoryItems', JSON.stringify([{ id: '1' }, { id: '2' }, { id: '3' }]));
      localStorage.setItem('artikelDefinitionen', JSON.stringify([{ id: '1' }]));
      const backup = collectFullBackup();

      const summary = summarizeBackup(backup);
      expect(summary.find(s => s.key === 'inventoryItems')?.count).toBe(3);
      expect(summary.find(s => s.key === 'artikelDefinitionen')?.count).toBe(1);
      expect(summary.find(s => s.key === 'mazerationProtocols')?.count).toBe(0);
    });
  });

  describe('parseBackupFile', () => {
    it('lehnt eine Datei ab, die kein gültiges JSON ist', () => {
      expect(() => parseBackupFile('{ das ist kein json')).toThrow();
    });

    it('lehnt eine Datei ab, die zwar JSON, aber kein MazerationsMeister-Backup ist', () => {
      expect(() => parseBackupFile(JSON.stringify({ irgendwas: 'anderes' }))).toThrow(/Format/);
    });

    it('akzeptiert ein selbst erzeugtes Backup wieder', () => {
      localStorage.setItem('inventoryItems', '[]');
      const backup = collectFullBackup();
      const reparsed = parseBackupFile(JSON.stringify(backup));
      expect(reparsed.values['inventoryItems']).toBe('[]');
    });
  });

  describe('uploadBackupToGithub', () => {
    it('lehnt ohne konfigurierten Token ab, statt einen sinnlosen Request zu versuchen', async () => {
      getGithubTokenMock.mockReturnValue('');
      const result = await uploadBackupToGithub();
      expect(result.ok).toBe(false);
      expect(uploadFileMock).not.toHaveBeenCalled();
    });

    it('lädt den aktuellen Datenstand auf die Branch "fresh-main" hoch (dieselbe wie der Tank-Sync aus Aufgabe 36)', async () => {
      getGithubTokenMock.mockReturnValue('tok');
      localStorage.setItem('inventoryItems', '[]');
      const result = await uploadBackupToGithub();
      expect(result.ok).toBe(true);
      expect(lastGithubServiceConfig.current.branch).toBe('fresh-main');
      expect(uploadFileMock).toHaveBeenCalledWith(expect.objectContaining({ path: 'app-data-backup.json' }));
    });

    it('meldet einen Fehler, wenn der Upload fehlschlägt', async () => {
      getGithubTokenMock.mockReturnValue('tok');
      uploadFileMock.mockResolvedValue(false);
      const result = await uploadBackupToGithub();
      expect(result.ok).toBe(false);
    });
  });

  describe('fetchBackupFromGithub', () => {
    it('lehnt ohne konfigurierten Token ab', async () => {
      getGithubTokenMock.mockReturnValue('');
      const result = await fetchBackupFromGithub();
      expect(result.ok).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('meldet verständlich, wenn am anderen Rechner noch nie gesichert wurde (404)', async () => {
      getGithubTokenMock.mockReturnValue('tok');
      fetchMock.mockResolvedValue({ ok: false, status: 404 });
      const result = await fetchBackupFromGithub();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('noch keine Datensicherung');
    });

    it('lädt und dekodiert ein von GitHub geliefertes Backup korrekt (inkl. Umlaute)', async () => {
      getGithubTokenMock.mockReturnValue('tok');
      const backup = { backupFormat: 'mazerationsmeister-full-backup', backupVersion: 2, createdAt: '2026-09-30T00:00:00.000Z', values: { inventoryItems: JSON.stringify([{ produktName: 'Königskerze' }]) } };
      const content = JSON.stringify(backup);
      const base64 = Buffer.from(unescape(encodeURIComponent(content)), 'binary').toString('base64');
      fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ content: base64 }) });

      const result = await fetchBackupFromGithub();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.backup.values.inventoryItems).toBe(JSON.stringify([{ produktName: 'Königskerze' }]));
      }
    });
  });
});
