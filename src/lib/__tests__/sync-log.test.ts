import { describe, it, expect, beforeEach } from 'vitest';
import { logSyncEvent, readSyncLog, clearSyncLog } from '../sync-log';

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

describe('sync-log', () => {
  beforeEach(() => {
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = makeLocalStorage();
  });

  it('liefert eine leere Liste, wenn noch nie geloggt wurde', () => {
    expect(readSyncLog()).toEqual([]);
  });

  it('trägt ein Ereignis ein und kann es wieder auslesen', () => {
    logSyncEvent('full-data-sync', 'ok', 'Lokale Änderungen hochgeladen');
    const log = readSyncLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ source: 'full-data-sync', outcome: 'ok', message: 'Lokale Änderungen hochgeladen' });
    expect(log[0].id).toBeTruthy();
    expect(log[0].timestamp).toBeTruthy();
  });

  it('neueste Einträge stehen zuerst', () => {
    logSyncEvent('full-data-sync', 'ok', 'Erstes Ereignis');
    logSyncEvent('tank-auto-sync', 'error', 'Zweites Ereignis');
    const log = readSyncLog();
    expect(log[0].message).toBe('Zweites Ereignis');
    expect(log[1].message).toBe('Erstes Ereignis');
  });

  it('begrenzt die Historie auf eine Obergrenze, statt unbegrenzt zu wachsen', () => {
    for (let i = 0; i < 1005; i++) {
      logSyncEvent('full-data-sync', 'skipped', `Ereignis ${i}`);
    }
    expect(readSyncLog().length).toBeLessThanOrEqual(1000);
    // Die neuesten Ereignisse bleiben erhalten, die ältesten fallen heraus.
    expect(readSyncLog()[0].message).toBe('Ereignis 1004');
  });

  it('clearSyncLog() leert das Protokoll', () => {
    logSyncEvent('full-data-sync', 'ok', 'Ereignis');
    clearSyncLog();
    expect(readSyncLog()).toEqual([]);
  });

  it('wirft nicht, wenn localStorage fehlt (z.B. SSR-Kontext)', () => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    expect(() => logSyncEvent('full-data-sync', 'ok', 'Ereignis')).not.toThrow();
    expect(readSyncLog()).toEqual([]);
  });
});
