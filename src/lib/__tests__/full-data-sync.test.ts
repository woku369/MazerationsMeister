import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock()-Fabriken werden gehoisted - Variablen, auf die sie zugreifen,
// müssen deshalb über vi.hoisted() deklariert werden.
const { uploadBackupMock, fetchBackupMock, toastMock, getGithubTokenMock, registerBeforeQuitMock } = vi.hoisted(() => ({
  uploadBackupMock: vi.fn(),
  fetchBackupMock: vi.fn(),
  toastMock: vi.fn(),
  getGithubTokenMock: vi.fn(),
  registerBeforeQuitMock: vi.fn(),
}));

vi.mock('../github-token', () => ({ getGithubToken: getGithubTokenMock }));
vi.mock('@/hooks/use-toast', () => ({ toast: toastMock }));
vi.mock('../electron-bridge', () => ({ registerBeforeQuit: registerBeforeQuitMock }));

// backup-service.ts: collectFullBackup/applyFullBackup bleiben echt (reine
// localStorage-Funktionen), nur die Netzwerk-Funktionen werden gemockt.
vi.mock('../backup-service', async () => {
  const actual = await vi.importActual<typeof import('../backup-service')>('../backup-service');
  return {
    ...actual,
    uploadBackupToGithub: uploadBackupMock,
    fetchBackupFromGithub: fetchBackupMock,
  };
});

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

import { FullDataSync, getPendingConflict } from '../full-data-sync';
import { collectFullBackup } from '../backup-service';

function seedLocal(inventoryItems: unknown[]) {
  localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
}

describe('FullDataSync', () => {
  let sync: FullDataSync | null = null;

  beforeEach(() => {
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = makeLocalStorage();
    uploadBackupMock.mockReset().mockResolvedValue({ ok: true });
    fetchBackupMock.mockReset();
    toastMock.mockReset();
    getGithubTokenMock.mockReset().mockReturnValue('tok');
    registerBeforeQuitMock.mockReset();
  });

  afterEach(() => {
    sync?.stop();
    sync = null;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  it('tut nichts ohne konfigurierten GitHub-Token', async () => {
    getGithubTokenMock.mockReturnValue('');
    sync = new FullDataSync();
    await sync.reconcileNow();
    expect(uploadBackupMock).not.toHaveBeenCalled();
    expect(fetchBackupMock).not.toHaveBeenCalled();
  });

  it('erster Abgleich überhaupt: lokal und Remote bereits identisch (beide leer) - setzt nur den Referenzpunkt, kein Push/Pull', async () => {
    fetchBackupMock.mockResolvedValue({ ok: true, backup: collectFullBackup() });
    sync = new FullDataSync();
    await sync.reconcileNow();
    expect(uploadBackupMock).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('erster Abgleich, lokal leer, Remote hat Daten: sicher automatisch übernehmen, da lokal nichts zu verlieren ist', async () => {
    const remoteBackup = { backupFormat: 'mazerationsmeister-full-backup' as const, backupVersion: 2 as const, createdAt: '', values: { inventoryItems: JSON.stringify([{ id: 'vom-anderen-rechner' }]) } };
    fetchBackupMock.mockResolvedValue({ ok: true, backup: remoteBackup });
    sync = new FullDataSync();
    await sync.reconcileNow();

    expect(localStorage.getItem('inventoryItems')).toBe(JSON.stringify([{ id: 'vom-anderen-rechner' }]));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Datenstand geladen' }));
  });

  it('erster Abgleich, lokal UND Remote haben unterschiedliche Daten: Konflikt, kein automatisches Überschreiben', async () => {
    seedLocal([{ id: 'lokal-schon-vorhanden' }]);
    const remoteBackup = { backupFormat: 'mazerationsmeister-full-backup' as const, backupVersion: 2 as const, createdAt: '', values: { inventoryItems: JSON.stringify([{ id: 'anderer-rechner' }]) } };
    fetchBackupMock.mockResolvedValue({ ok: true, backup: remoteBackup });
    sync = new FullDataSync();
    await sync.reconcileNow();

    // Lokaler Bestand bleibt unangetastet.
    expect(localStorage.getItem('inventoryItems')).toBe(JSON.stringify([{ id: 'lokal-schon-vorhanden' }]));
    expect(getPendingConflict()).not.toBeNull();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sync-Konflikt' }));
  });

  it('nach einem etablierten Referenzpunkt: lokal unverändert, Remote neuer -> automatisch übernehmen (Rechnerwechsel-Fall)', async () => {
    seedLocal([{ id: 'stand-1' }]);
    const gemeinsamerStand = collectFullBackup();
    fetchBackupMock.mockResolvedValue({ ok: true, backup: gemeinsamerStand });
    sync = new FullDataSync();
    await sync.reconcileNow(); // etabliert den Referenzpunkt
    toastMock.mockClear();

    const neuererRemoteStand = { ...gemeinsamerStand, values: { ...gemeinsamerStand.values, inventoryItems: JSON.stringify([{ id: 'stand-2-vom-anderen-rechner' }]) } };
    fetchBackupMock.mockResolvedValue({ ok: true, backup: neuererRemoteStand });
    await sync.reconcileNow();

    expect(localStorage.getItem('inventoryItems')).toBe(JSON.stringify([{ id: 'stand-2-vom-anderen-rechner' }]));
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Datenstand aktualisiert' }));
  });

  it('nach einem etablierten Referenzpunkt: lokal verändert, Remote unverändert -> automatisch hochladen', async () => {
    seedLocal([{ id: 'stand-1' }]);
    const gemeinsamerStand = collectFullBackup();
    fetchBackupMock.mockResolvedValue({ ok: true, backup: gemeinsamerStand });
    sync = new FullDataSync();
    await sync.reconcileNow(); // etabliert den Referenzpunkt
    uploadBackupMock.mockClear();

    seedLocal([{ id: 'stand-1' }, { id: 'neu-hinzugefuegt' }]);
    await sync.reconcileNow();

    expect(uploadBackupMock).toHaveBeenCalledTimes(1);
  });

  it('nach einem etablierten Referenzpunkt: BEIDE verändert -> Konflikt, kein automatisches Überschreiben', async () => {
    seedLocal([{ id: 'stand-1' }]);
    const gemeinsamerStand = collectFullBackup();
    fetchBackupMock.mockResolvedValue({ ok: true, backup: gemeinsamerStand });
    sync = new FullDataSync();
    await sync.reconcileNow();
    toastMock.mockClear();

    seedLocal([{ id: 'stand-1' }, { id: 'lokal-neu' }]);
    const remoteWeiterentwickelt = { ...gemeinsamerStand, values: { ...gemeinsamerStand.values, inventoryItems: JSON.stringify([{ id: 'stand-1' }, { id: 'remote-neu' }]) } };
    fetchBackupMock.mockResolvedValue({ ok: true, backup: remoteWeiterentwickelt });
    await sync.reconcileNow();

    // Lokaler Bestand bleibt die eigene, neue Version - nicht überschrieben.
    expect(localStorage.getItem('inventoryItems')).toBe(JSON.stringify([{ id: 'stand-1' }, { id: 'lokal-neu' }]));
    expect(uploadBackupMock).not.toHaveBeenCalled();
    expect(getPendingConflict()).not.toBeNull();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sync-Konflikt' }));
  });

  it('meldet einen Fehlschlag beim Hochladen nur beim Zustandswechsel, nicht bei jedem weiteren Versuch', async () => {
    seedLocal([{ id: 'stand-1' }]);
    fetchBackupMock.mockResolvedValue({ ok: false, error: 'noch nichts auf GitHub' });
    uploadBackupMock.mockResolvedValue({ ok: false, error: 'Netzwerkfehler' });
    sync = new FullDataSync();

    await sync.reconcileNow();
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][0]).toMatchObject({ title: 'Datenabgleich fehlgeschlagen', variant: 'destructive' });

    seedLocal([{ id: 'stand-1' }, { id: 'stand-2' }]);
    await sync.reconcileNow();
    expect(toastMock).toHaveBeenCalledTimes(1); // kein zweiter Toast für denselben andauernden Fehler
  });
});
