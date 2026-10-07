import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock()-Fabriken werden gehoisted - Variablen, auf die sie zugreifen,
// müssen über vi.hoisted() deklariert werden (gleiches Muster wie
// tank-auto-sync.test.ts).
const { startAuthMock, refreshTokenMock } = vi.hoisted(() => ({
  startAuthMock: vi.fn(),
  refreshTokenMock: vi.fn(),
}));

vi.mock('../electron-bridge', () => ({
  googleCalendarStartAuth: startAuthMock,
  googleCalendarRefreshToken: refreshTokenMock,
}));

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

describe('google-calendar', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    startAuthMock.mockReset();
    refreshTokenMock.mockReset();
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = makeLocalStorage();
    (globalThis as any).CustomEvent = (globalThis as any).CustomEvent || class CustomEvent {
      constructor(public type: string, public detail?: unknown) {}
    };
    (globalThis as any).dispatchEvent = (globalThis as any).dispatchEvent || (() => {});
    (globalThis as any).addEventListener = (globalThis as any).addEventListener || (() => {});
    (globalThis as any).removeEventListener = (globalThis as any).removeEventListener || (() => {});
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).fetch;
    delete (globalThis as any).CustomEvent;
    delete (globalThis as any).dispatchEvent;
    delete (globalThis as any).addEventListener;
    delete (globalThis as any).removeEventListener;
    vi.resetModules();
  });

  it('ensureValidAccessToken liefert null, wenn nicht verbunden', async () => {
    const { ensureValidAccessToken } = await import('../google-calendar');
    expect(await ensureValidAccessToken()).toBeNull();
  });

  it('ensureValidAccessToken liefert den gespeicherten Token, solange er noch gültig ist', async () => {
    const { setGoogleTokens } = await import('../google-calendar-token');
    const { ensureValidAccessToken } = await import('../google-calendar');
    setGoogleTokens({ accessToken: 'tok-123', refreshToken: 'ref-123', expiresAt: Date.now() + 60 * 60 * 1000 });

    expect(await ensureValidAccessToken()).toBe('tok-123');
    expect(refreshTokenMock).not.toHaveBeenCalled();
  });

  it('ensureValidAccessToken erneuert einen abgelaufenen Token automatisch', async () => {
    const { setGoogleTokens, getGoogleTokens } = await import('../google-calendar-token');
    const { ensureValidAccessToken } = await import('../google-calendar');
    setGoogleTokens({ accessToken: 'alt', refreshToken: 'ref-123', expiresAt: Date.now() - 1000 });
    refreshTokenMock.mockResolvedValue({ ok: true, accessToken: 'neu-456', expiresIn: 3600 });

    const token = await ensureValidAccessToken();

    expect(token).toBe('neu-456');
    expect(refreshTokenMock).toHaveBeenCalledWith('ref-123', expect.any(String), expect.any(String));
    expect(getGoogleTokens()?.accessToken).toBe('neu-456');
  });

  it('ensureValidAccessToken liefert null, wenn die Erneuerung fehlschlägt', async () => {
    const { setGoogleTokens } = await import('../google-calendar-token');
    const { ensureValidAccessToken } = await import('../google-calendar');
    setGoogleTokens({ accessToken: 'alt', refreshToken: 'ref-123', expiresAt: Date.now() - 1000 });
    refreshTokenMock.mockResolvedValue({ ok: false, error: 'invalid_grant' });

    expect(await ensureValidAccessToken()).toBeNull();
  });

  it('connectGoogleCalendar speichert Tokens bei Erfolg', async () => {
    const { connectGoogleCalendar } = await import('../google-calendar');
    const { getGoogleTokens, getGoogleClientId } = await import('../google-calendar-token');
    startAuthMock.mockResolvedValue({ ok: true, accessToken: 'a1', refreshToken: 'r1', expiresIn: 3600 });

    const result = await connectGoogleCalendar('client-id-x', 'secret-y');

    expect(result.ok).toBe(true);
    expect(getGoogleClientId()).toBe('client-id-x');
    expect(getGoogleTokens()?.accessToken).toBe('a1');
  });

  it('connectGoogleCalendar speichert keine Tokens bei Fehlschlag', async () => {
    const { connectGoogleCalendar } = await import('../google-calendar');
    const { getGoogleTokens } = await import('../google-calendar-token');
    startAuthMock.mockResolvedValue({ ok: false, error: 'Nutzer hat abgelehnt.' });

    const result = await connectGoogleCalendar('client-id-x', 'secret-y');

    expect(result.ok).toBe(false);
    expect(getGoogleTokens()).toBeNull();
  });

  it('listUpcomingEvents wandelt zeitgebundene und ganztägige Google-Events korrekt um', async () => {
    const { setGoogleTokens } = await import('../google-calendar-token');
    const { listUpcomingEvents } = await import('../google-calendar');
    setGoogleTokens({ accessToken: 'tok', expiresAt: Date.now() + 60 * 60 * 1000 });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: 'e1', summary: 'Meeting', start: { dateTime: '2026-10-10T09:00:00+02:00' }, end: { dateTime: '2026-10-10T10:00:00+02:00' }, htmlLink: 'https://calendar.google.com/e1' },
          { id: 'e2', summary: 'Urlaub', start: { date: '2026-10-12' }, end: { date: '2026-10-13' } },
          { id: 'e3', start: {}, end: {} }, // Ohne Titel
        ],
      }),
    });

    const result = await listUpcomingEvents(14);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.data).toHaveLength(3);
    expect(result.data[0]).toMatchObject({ id: 'e1', summary: 'Meeting', allDay: false });
    expect(result.data[1]).toMatchObject({ id: 'e2', summary: 'Urlaub', allDay: true });
    expect(result.data[2].summary).toBe('(Ohne Titel)');
  });

  it('listUpcomingEvents liefert einen Fehler, wenn nicht verbunden', async () => {
    const { listUpcomingEvents } = await import('../google-calendar');
    const result = await listUpcomingEvents(14);
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('listEventsInRange nutzt genau den übergebenen Zeitraum, nicht "ab jetzt" (Monatsansicht, Aufgabe 75)', async () => {
    const { setGoogleTokens } = await import('../google-calendar-token');
    const { listEventsInRange } = await import('../google-calendar');
    setGoogleTokens({ accessToken: 'tok', expiresAt: Date.now() + 60 * 60 * 1000 });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    // Zeitraum bewusst in der Vergangenheit - fuer Monatsnavigation zurueck
    // muss das moeglich sein, anders als bei listUpcomingEvents ("ab jetzt").
    await listEventsInRange('2020-01-01T00:00:00.000Z', '2020-02-01T00:00:00.000Z');

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('timeMin=2020-01-01');
    expect(String(url)).toContain('timeMax=2020-02-01');
  });

  it('createEvent sendet ganztägige Termine als date, zeitgebundene als dateTime', async () => {
    const { setGoogleTokens } = await import('../google-calendar-token');
    const { createEvent } = await import('../google-calendar');
    setGoogleTokens({ accessToken: 'tok', expiresAt: Date.now() + 60 * 60 * 1000 });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'new1', summary: 'Test', start: { date: '2026-10-20' }, end: { date: '2026-10-21' } }) });

    await createEvent({ summary: 'Test', startIso: '2026-10-20', endIso: '2026-10-21', allDay: true });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.start).toEqual({ date: '2026-10-20' });
    expect(body.end).toEqual({ date: '2026-10-21' });
  });

  it('deleteEvent behandelt 410 (bereits gelöscht) als Erfolg', async () => {
    const { setGoogleTokens } = await import('../google-calendar-token');
    const { deleteEvent } = await import('../google-calendar');
    setGoogleTokens({ accessToken: 'tok', expiresAt: Date.now() + 60 * 60 * 1000 });
    fetchMock.mockResolvedValue({ ok: false, status: 410, text: async () => 'Gone' });

    const result = await deleteEvent('already-gone');
    expect(result.ok).toBe(true);
  });

  it('deleteEvent meldet einen echten Fehler bei anderen Statuscodes', async () => {
    const { setGoogleTokens } = await import('../google-calendar-token');
    const { deleteEvent } = await import('../google-calendar');
    setGoogleTokens({ accessToken: 'tok', expiresAt: Date.now() + 60 * 60 * 1000 });
    fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' });

    const result = await deleteEvent('no-permission');
    expect(result.ok).toBe(false);
  });
});
