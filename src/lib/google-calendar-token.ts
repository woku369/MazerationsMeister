/**
 * Speicherung der Google-Calendar-Zugangsdaten und -Tokens, analog zu
 * github-token.ts. Client-ID/-Secret kommen vom Nutzer aus den Einstellungen
 * (Google Cloud Console, Aufgabe 73) - nie im Repo hinterlegt.
 */

const CLIENT_ID_KEY = 'googleCalendarClientId';
const CLIENT_SECRET_KEY = 'googleCalendarClientSecret';
const TOKENS_KEY = 'googleCalendarTokens';
const AUTH_EXPIRED_KEY = 'googleCalendarAuthExpired';
const CONFIG_EVENT = 'googleCalendarConfigUpdated';

export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken?: string;
  /** Unix-Zeitstempel (ms), ab dem der Access-Token als abgelaufen gilt. */
  expiresAt: number;
}

export function getGoogleClientId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CLIENT_ID_KEY) || '';
}

export function getGoogleClientSecret(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CLIENT_SECRET_KEY) || '';
}

export function setGoogleClientConfig(clientId: string, clientSecret: string): void {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
  localStorage.setItem(CLIENT_SECRET_KEY, clientSecret.trim());
}

export function getGoogleTokens(): GoogleCalendarTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as GoogleCalendarTokens) : null;
  } catch {
    return null;
  }
}

export function setGoogleTokens(tokens: GoogleCalendarTokens | null): void {
  if (typeof window === 'undefined') return;
  if (tokens) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(TOKENS_KEY);
  }
  window.dispatchEvent(new CustomEvent(CONFIG_EVENT));
}

/**
 * Google hat den Refresh-Token abgelehnt (abgelaufen/widerrufen). Tokens
 * verwerfen und den Grund merken, damit Einstellungen und Dashboard
 * übereinstimmend "Anmeldung abgelaufen" zeigen statt hier "verbunden" und
 * dort einen Fehler (Nutzer-Meldung 31.10.2026, Aufgabe 105).
 */
export function markGoogleAuthExpired(reason: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_EXPIRED_KEY, reason);
  setGoogleTokens(null);
}

/** Grund, falls die Anmeldung abgelaufen ist und noch nicht neu verbunden wurde. */
export function getGoogleAuthExpiredReason(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_EXPIRED_KEY);
}

export function clearGoogleAuthExpired(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_EXPIRED_KEY);
}

export function isGoogleCalendarConnected(): boolean {
  return getGoogleTokens() !== null;
}

export function onGoogleCalendarConfigChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CONFIG_EVENT, handler);
  return () => window.removeEventListener(CONFIG_EVENT, handler);
}
