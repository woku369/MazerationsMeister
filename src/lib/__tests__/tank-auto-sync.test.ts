import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TankAutoSync } from '../tank-auto-sync';

// vi.mock()-Fabriken werden von vitest an den Dateianfang gehoisted - Variablen,
// auf die sie zugreifen, müssen deshalb über vi.hoisted() deklariert werden,
// sonst schlägt der Zugriff mit einem "temporal dead zone"-Fehler fehl.
const { testConnectionMock, syncTankDataMock, toastMock, getTankDefinitionsMock, stockServiceReadAllMock, lastGithubServiceConfig } = vi.hoisted(() => ({
  testConnectionMock: vi.fn(),
  syncTankDataMock: vi.fn(),
  toastMock: vi.fn(),
  getTankDefinitionsMock: vi.fn(),
  stockServiceReadAllMock: vi.fn(),
  lastGithubServiceConfig: { current: null as any },
}));

vi.mock('../github-service', () => ({
  GitHubService: class {
    config: any;
    constructor(config: any) {
      this.config = config;
      lastGithubServiceConfig.current = config;
    }
    testConnection = testConnectionMock;
  },
  TankDataGitHubSync: class {
    constructor(public githubService: any) {}
    syncTankData = syncTankDataMock;
    getTankUrl(id: string) { return `https://example.invalid/${id}`; }
  },
}));

vi.mock('../github-token', () => ({ getGithubToken: () => 'test-token' }));
vi.mock('@/hooks/use-toast', () => ({ toast: toastMock }));
// Aufgabe 70: liest Tank-Daten jetzt direkt/frisch statt über den
// potenziell veralteten universalStorage-Singleton-Cache, siehe tank-auto-sync.ts.
vi.mock('../tank-sync', () => ({ getTankDefinitions: () => getTankDefinitionsMock() }));
vi.mock('../stock-service', () => ({ readAll: () => stockServiceReadAllMock() }));

// In-Memory localStorage-Polyfill: vitest läuft standardmäßig im node-
// Environment (kein window/localStorage), tank-auto-sync.ts unterscheidet
// damit aber gezielt Browser/Electron von SSR/Build-Zeit.
function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

const BASE_CONFIG = {
  enabled: true,
  interval: 60,
  githubToken: 'tok',
  githubUsername: 'woku369',
  githubRepository: 'MazerationsMeister',
};

describe('TankAutoSync', () => {
  let autoSync: TankAutoSync | null = null;

  beforeEach(() => {
    testConnectionMock.mockReset().mockResolvedValue(true);
    syncTankDataMock.mockReset();
    toastMock.mockReset();
    getTankDefinitionsMock.mockReset().mockReturnValue([{ id: 't1' }]);
    stockServiceReadAllMock.mockReset().mockReturnValue([{ id: 'i1' }]);
    lastGithubServiceConfig.current = null;

    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = makeLocalStorage();
  });

  afterEach(() => {
    autoSync?.stopAutoSync();
    autoSync = null;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  it('Regressionstest (Nutzer-Meldung 30.09.2026): synct auf die tatsächlich existierende Deploy-Branch "fresh-main", nicht mehr auf die nie existierte "main-pages"', async () => {
    syncTankDataMock.mockResolvedValue({ success: true });
    autoSync = new TankAutoSync();
    await autoSync.initialize(BASE_CONFIG);

    expect(lastGithubServiceConfig.current.branch).toBe('fresh-main');
  });

  it('reaktiviert einen zuvor aktivierten Sync automatisch beim (simulierten) App-Neustart, statt nur die "Aktiv"-Absicht zu speichern', async () => {
    const { githubToken: _t, ...persistable } = BASE_CONFIG;
    localStorage.setItem('autoSyncConfig', JSON.stringify(persistable));
    syncTankDataMock.mockResolvedValue({ success: true });

    // Simuliert eine neue Session: eine frische TankAutoSync-Instanz liest die
    // gespeicherte Konfiguration im Konstruktor über loadConfig() und muss den
    // Sync-Timer selbst reaktivieren, ohne dass initialize() erneut aufgerufen wird.
    autoSync = new TankAutoSync();
    await vi.waitFor(() => expect(syncTankDataMock).toHaveBeenCalledTimes(1));
    expect(lastGithubServiceConfig.current.branch).toBe('fresh-main');
  });

  it('lässt den Sync-Timer inaktiv, wenn zuvor keine Konfiguration gespeichert war', async () => {
    autoSync = new TankAutoSync();
    await new Promise(r => setTimeout(r, 10));
    expect(syncTankDataMock).not.toHaveBeenCalled();
  });

  it('meldet einen fehlgeschlagenen Sync per Toast, aber nicht bei jedem weiteren Fehlversuch erneut - nur beim Zustandswechsel', async () => {
    syncTankDataMock.mockResolvedValue({ success: false });
    autoSync = new TankAutoSync();
    await autoSync.initialize(BASE_CONFIG);
    await vi.waitFor(() => expect(syncTankDataMock).toHaveBeenCalledTimes(1));

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][0]).toMatchObject({ variant: 'destructive' });

    await autoSync.syncNow();
    expect(syncTankDataMock).toHaveBeenCalledTimes(2);
    expect(toastMock).toHaveBeenCalledTimes(1); // kein zusätzlicher Toast für denselben andauernden Fehler
  });

  it('meldet die Wiederherstellung per Toast, wenn ein Sync nach vorherigem Fehler wieder erfolgreich ist', async () => {
    syncTankDataMock.mockResolvedValueOnce({ success: false });
    autoSync = new TankAutoSync();
    await autoSync.initialize(BASE_CONFIG);
    await vi.waitFor(() => expect(syncTankDataMock).toHaveBeenCalledTimes(1));
    expect(toastMock).toHaveBeenCalledTimes(1);

    syncTankDataMock.mockResolvedValueOnce({ success: true });
    await autoSync.syncNow();

    expect(toastMock).toHaveBeenCalledTimes(2);
    expect(toastMock.mock.calls[1][0].title).toContain('wiederhergestellt');
  });

  it('meldet keinen Toast, solange jeder Sync erfolgreich bleibt', async () => {
    syncTankDataMock.mockResolvedValue({ success: true });
    autoSync = new TankAutoSync();
    await autoSync.initialize(BASE_CONFIG);
    await vi.waitFor(() => expect(syncTankDataMock).toHaveBeenCalledTimes(1));

    await autoSync.syncNow();
    await autoSync.syncNow();

    expect(toastMock).not.toHaveBeenCalled();
  });

  it('Regressionstest (Nutzer-Meldung 06.10.2026): synct bei jedem Aufruf den aktuellen Stand, nicht einen veralteten Snapshot vom App-Start', async () => {
    // Reproduziert das gemeldete Muster: tank-data.json auf GitHub zeigte für
    // mehrere per "Splitten" aufgeteilte Gebinde noch den Stand von vor dem
    // Split, weil der frühere Code über universalStorage.getData() einen beim
    // App-Start einmalig geladenen In-Memory-Snapshot sync'te, der von
    // direkten StockService/localStorage-Schreibzugriffen (z.B. in
    // tank-management.tsx) nie aktualisiert wurde.
    syncTankDataMock.mockResolvedValue({ success: true });
    autoSync = new TankAutoSync();
    await autoSync.initialize(BASE_CONFIG);
    await vi.waitFor(() => expect(syncTankDataMock).toHaveBeenCalledTimes(1));
    expect(syncTankDataMock).toHaveBeenNthCalledWith(1, [{ id: 't1' }], [{ id: 'i1' }]);

    // Simuliert eine zwischenzeitliche Änderung (z.B. ein Split), die NICHT
    // über diesen Mock, sondern direkt in echtem Code passieren würde.
    getTankDefinitionsMock.mockReturnValue([{ id: 't1-A' }, { id: 't1-B' }]);
    stockServiceReadAllMock.mockReturnValue([{ id: 'i1-A' }, { id: 'i1-B' }]);

    await autoSync.syncNow();
    expect(syncTankDataMock).toHaveBeenNthCalledWith(2, [{ id: 't1-A' }, { id: 't1-B' }], [{ id: 'i1-A' }, { id: 'i1-B' }]);
  });
});
