/**
 * Google Calendar: Termine lesen/anlegen/ändern/löschen direkt im Dashboard
 * (Nutzer-Anfrage 07.10.2026, Aufgabe 73).
 *
 * Verbindungsaufbau (OAuth) läuft über den Hauptprozess (siehe
 * electron-bridge.ts/electron/google-calendar.ts) - die eigentlichen
 * Kalender-API-Aufrufe hier laufen dagegen direkt im Renderer: Googles
 * Calendar-REST-API erlaubt (anders als z.B. GitHubs Contents-API, siehe
 * Aufgabe 49) echte Browser-Aufrufe mit Bearer-Token.
 */
import {
  getGoogleClientId, getGoogleClientSecret, getGoogleTokens, setGoogleTokens,
  setGoogleClientConfig, markGoogleAuthExpired, clearGoogleAuthExpired, type GoogleCalendarTokens,
} from './google-calendar-token';
import { googleCalendarStartAuth, googleCalendarRefreshToken } from './electron-bridge';

const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export const AUTH_EXPIRED_MESSAGE = 'Die Google-Anmeldung ist abgelaufen. Bitte in den Einstellungen neu verbinden.';

export type CalendarResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Grund des letzten gescheiterten Token-Abrufs, für eine verständliche Fehlermeldung. */
let lastTokenError: string | null = null;

/**
 * Liefert einen gültigen Access-Token, erneuert ihn bei Bedarf über den
 * Refresh-Token. null, wenn gar nicht (mehr) verbunden - der Nutzer muss
 * sich dann in den Einstellungen neu verbinden.
 *
 * Lehnt Google den Refresh-Token ab (invalid_grant - z.B. nach 7 Tagen, wenn
 * der OAuth-Zustimmungsbildschirm noch auf "Testing" steht), werden die
 * Tokens verworfen und als "abgelaufen" markiert. Vorher blieben sie stehen:
 * Einstellungen zeigten "verbunden", das Dashboard nur einen Fehler ohne
 * Grund (Nutzer-Meldung 31.10.2026, Aufgabe 105).
 */
export async function ensureValidAccessToken(): Promise<string | null> {
  lastTokenError = null;
  const tokens = getGoogleTokens();
  if (!tokens) return null;
  // 1 Minute Puffer, damit der Token nicht genau während eines laufenden
  // API-Aufrufs abläuft.
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;
  if (!tokens.refreshToken) {
    markGoogleAuthExpired('Kein Refresh-Token vorhanden');
    lastTokenError = AUTH_EXPIRED_MESSAGE;
    return null;
  }

  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const result = await googleCalendarRefreshToken(tokens.refreshToken, clientId, clientSecret);
  if (!result.ok) {
    // invalid_grant: Refresh-Token abgelaufen/widerrufen; invalid_client /
    // unauthorized_client: OAuth-Client gelöscht oder Secret geändert.
    // In allen drei Fällen hilft nur neu verbinden.
    if (/invalid_grant|invalid_client|unauthorized_client/i.test(result.error)) {
      markGoogleAuthExpired(result.error);
      lastTokenError = AUTH_EXPIRED_MESSAGE;
    } else {
      // z.B. kein Internet: Tokens behalten, beim nächsten Versuch klappt es evtl.
      lastTokenError = `Google-Anmeldung konnte nicht erneuert werden: ${result.error}`;
    }
    return null;
  }

  const updated: GoogleCalendarTokens = {
    accessToken: result.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + result.expiresIn * 1000,
  };
  setGoogleTokens(updated);
  return updated.accessToken;
}

export async function connectGoogleCalendar(clientId: string, clientSecret: string): Promise<{ ok: true } | { ok: false; error: string }> {
  setGoogleClientConfig(clientId, clientSecret);
  const result = await googleCalendarStartAuth(clientId, clientSecret);
  if (!result.ok) return result;
  clearGoogleAuthExpired();
  setGoogleTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + result.expiresIn * 1000,
  });
  return { ok: true };
}

export function disconnectGoogleCalendar(): void {
  clearGoogleAuthExpired();
  setGoogleTokens(null);
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  /** ISO-Datum/Zeit (datetime) oder reines Datum (YYYY-MM-DD) bei ganztägigen Terminen. */
  startIso: string;
  endIso: string;
  allDay: boolean;
  htmlLink?: string;
}

export interface NewCalendarEvent {
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  allDay: boolean;
}

function parseEvent(raw: any): CalendarEvent {
  return {
    id: raw.id,
    summary: raw.summary || '(Ohne Titel)',
    description: raw.description,
    startIso: raw.start?.dateTime || raw.start?.date,
    endIso: raw.end?.dateTime || raw.end?.date,
    allDay: !!raw.start?.date && !raw.start?.dateTime,
    htmlLink: raw.htmlLink,
  };
}

function toGoogleTime(iso: string, allDay: boolean) {
  return allDay
    ? { date: iso.slice(0, 10) }
    : { dateTime: iso, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

async function calendarFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await ensureValidAccessToken();
  if (!token) throw new Error(lastTokenError ?? 'Nicht mit Google Calendar verbunden.');
  return fetch(`${EVENTS_URL}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

async function fetchEvents(timeMin: string, timeMax: string): Promise<CalendarResult<CalendarEvent[]>> {
  try {
    const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '100' });
    const res = await calendarFetch(`?${params.toString()}`);
    if (!res.ok) return { ok: false, error: `Google Calendar antwortete mit ${res.status}: ${await res.text()}` };
    const data = await res.json();
    return { ok: true, data: ((data.items || []) as any[]).map(parseEvent) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function listUpcomingEvents(days: number = 14): Promise<CalendarResult<CalendarEvent[]>> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return fetchEvents(timeMin, timeMax);
}

/** Für die Monatsansicht (Aufgabe 75): alle Termine in einem beliebigen Zeitraum, nicht nur "ab jetzt". */
export async function listEventsInRange(timeMinIso: string, timeMaxIso: string): Promise<CalendarResult<CalendarEvent[]>> {
  return fetchEvents(timeMinIso, timeMaxIso);
}

export async function createEvent(event: NewCalendarEvent): Promise<CalendarResult<CalendarEvent>> {
  try {
    const res = await calendarFetch('', {
      method: 'POST',
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: toGoogleTime(event.startIso, event.allDay),
        end: toGoogleTime(event.endIso, event.allDay),
      }),
    });
    if (!res.ok) return { ok: false, error: `Anlegen fehlgeschlagen (${res.status}): ${await res.text()}` };
    return { ok: true, data: parseEvent(await res.json()) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateEvent(id: string, event: NewCalendarEvent): Promise<CalendarResult<CalendarEvent>> {
  try {
    const res = await calendarFetch(`/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: toGoogleTime(event.startIso, event.allDay),
        end: toGoogleTime(event.endIso, event.allDay),
      }),
    });
    if (!res.ok) return { ok: false, error: `Ändern fehlgeschlagen (${res.status}): ${await res.text()}` };
    return { ok: true, data: parseEvent(await res.json()) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteEvent(id: string): Promise<CalendarResult<void>> {
  try {
    const res = await calendarFetch(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
    // 410 Gone = war bereits gelöscht (z.B. direkt in Google Calendar) - für
    // den Nutzer kein Fehler, das Ergebnis (Termin weg) ist dasselbe.
    if (!res.ok && res.status !== 410) return { ok: false, error: `Löschen fehlgeschlagen (${res.status}): ${await res.text()}` };
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
