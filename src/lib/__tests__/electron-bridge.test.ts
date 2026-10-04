import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isElectron, writeToExportDir, openPath, registerBeforeQuit } from '../electron-bridge';

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

describe('electron-bridge', () => {
  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  describe('ohne window.electronAPI (Browser/PWA/Dev-Server)', () => {
    beforeEach(() => {
      (globalThis as any).window = {};
      (globalThis as any).localStorage = makeLocalStorage();
    });

    it('isElectron() ist false', () => {
      expect(isElectron()).toBe(false);
    });

    it('writeToExportDir() lehnt ab, statt eine Exception zu werfen', async () => {
      const result = await writeToExportDir('test.json', '{}');
      expect(result.ok).toBe(false);
    });

    it('openPath() tut nichts (wirft nicht)', async () => {
      await expect(openPath('/irgendein/pfad')).resolves.toBeUndefined();
    });

    it('registerBeforeQuit() registriert nichts (kein Fehler)', () => {
      expect(() => registerBeforeQuit(() => {})).not.toThrow();
    });
  });

  describe('mit window.electronAPI (echtes Electron-Programm)', () => {
    const writeFileMock = vi.fn();
    const openPathMock = vi.fn();
    const getDefaultExportDirMock = vi.fn();
    const onBeforeQuitMock = vi.fn();
    const notifyQuitReadyMock = vi.fn();

    beforeEach(() => {
      writeFileMock.mockReset();
      openPathMock.mockReset();
      getDefaultExportDirMock.mockReset().mockResolvedValue('/arbeitsverzeichnis');
      onBeforeQuitMock.mockReset();
      notifyQuitReadyMock.mockReset();

      (globalThis as any).window = {
        electronAPI: {
          isElectron: true,
          appDataDir: 'C:/Users/wolfg/AppData/Roaming',
          getDefaultExportDir: getDefaultExportDirMock,
          writeFile: writeFileMock,
          openPath: openPathMock,
          onBeforeQuit: onBeforeQuitMock,
          notifyQuitReady: notifyQuitReadyMock,
        },
      };
      (globalThis as any).localStorage = makeLocalStorage();
    });

    it('isElectron() ist true', () => {
      expect(isElectron()).toBe(true);
    });

    it('writeToExportDir() nutzt den konfigurierten Exportpfad, wenn gesetzt', async () => {
      localStorage.setItem('exportPath', 'D:/Exporte');
      writeFileMock.mockResolvedValue({ ok: true, path: 'D:/Exporte/test.json' });

      const result = await writeToExportDir('test.json', '{"a":1}');
      expect(result).toEqual({ ok: true, path: 'D:/Exporte/test.json', dir: 'D:/Exporte' });
      expect(writeFileMock).toHaveBeenCalledWith('D:/Exporte', 'test.json', '{"a":1}', 'utf-8');
      expect(getDefaultExportDirMock).not.toHaveBeenCalled();
    });

    it('writeToExportDir() fällt auf den stabilen Default-Exportordner zurück, wenn kein Exportpfad konfiguriert ist (nicht mehr process.cwd(), siehe Aufgabe 59)', async () => {
      writeFileMock.mockResolvedValue({ ok: true, path: '/arbeitsverzeichnis/test.json' });

      const result = await writeToExportDir('test.json', 'inhalt', 'base64');
      expect(result).toEqual({ ok: true, path: '/arbeitsverzeichnis/test.json', dir: '/arbeitsverzeichnis' });
      expect(writeFileMock).toHaveBeenCalledWith('/arbeitsverzeichnis', 'test.json', 'inhalt', 'base64');
      expect(getDefaultExportDirMock).toHaveBeenCalled();
    });

    it('writeToExportDir() gibt den Fehler durch, statt ihn zu verschlucken', async () => {
      writeFileMock.mockResolvedValue({ ok: false, error: 'Disk voll' });
      const result = await writeToExportDir('test.json', '{}');
      expect(result).toEqual({ ok: false, error: 'Disk voll' });
    });

    it('openPath() ruft die Bridge mit dem übergebenen Pfad auf', async () => {
      await openPath('/mein/pfad');
      expect(openPathMock).toHaveBeenCalledWith('/mein/pfad');
    });

    it('registerBeforeQuit() meldet nach dem Callback Fertigstellung zurück', async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      registerBeforeQuit(callback);

      expect(onBeforeQuitMock).toHaveBeenCalledTimes(1);
      const registeredHandler = onBeforeQuitMock.mock.calls[0][0];
      await registeredHandler();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(notifyQuitReadyMock).toHaveBeenCalledTimes(1);
    });

    it('registerBeforeQuit() meldet Fertigstellung auch dann, wenn der Callback fehlschlägt - sonst bliebe die App unschließbar', async () => {
      const callback = vi.fn().mockRejectedValue(new Error('kein Internet'));
      registerBeforeQuit(callback);

      const registeredHandler = onBeforeQuitMock.mock.calls[0][0];
      await registeredHandler();

      expect(notifyQuitReadyMock).toHaveBeenCalledTimes(1);
    });
  });
});
