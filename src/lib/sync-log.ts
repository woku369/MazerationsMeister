/**
 * Mitlaufendes Protokoll aller GitHub-Sync-Vorgänge (Nutzer-Anfrage 10.10.2026,
 * nach einem ungeklärten Fall: Buchungsjournal zeigte direkt nach einer
 * Produktion keine Einträge, obwohl die Buchung kurz danach korrekt
 * synchronisiert war - ohne jede Spur, WANN/WIE oft/mit welchem Ergebnis in
 * der Zwischenzeit synchronisiert wurde, ließ sich das im Nachhinein nicht
 * mehr rekonstruieren). Bisher gab es dafür nur `console.log` (verschwindet
 * beim Neustart, ohne geöffnete DevTools nie sichtbar) und einzelne Toasts
 * (verschwinden nach ein paar Sekunden, keine Historie). Dieses Protokoll
 * bleibt über App-Neustarts hinweg erhalten (localStorage) und ist unter
 * Einstellungen → Datensicherung einsehbar.
 *
 * Bewusst zwei getrennte Sync-Systeme als Quelle (siehe `source`):
 * - 'full-data-sync': der vollständige, bidirektionale Abgleich (full-data-sync.ts)
 * - 'tank-auto-sync': der separate, nur hochladende Tank-Daten-Sync für die
 *   PWA/tank-viewer.html (tank-auto-sync.ts) - eigenständig, eigener Intervall,
 *   eigene Datei (tank-data.json statt app-data-backup.json).
 */

export type SyncLogSource = 'full-data-sync' | 'tank-auto-sync';
export type SyncLogOutcome = 'ok' | 'error' | 'conflict' | 'skipped';

export interface SyncLogEntry {
  id: string;
  timestamp: string; // ISO
  source: SyncLogSource;
  outcome: SyncLogOutcome;
  message: string;
}

const STORAGE_KEY = 'syncActivityLog';
// Bei einem typischen 15-Minuten-Intervall deckt das rund 10 Tage Historie ab -
// lang genug, um einen konkreten Vorfall im Nachhinein noch nachzuvollziehen,
// ohne den Speicher unbegrenzt wachsen zu lassen.
const MAX_ENTRIES = 1000;

/**
 * Trägt ein Sync-Ereignis ein. Darf selbst niemals werfen - ein Logging-Fehler
 * soll den eigentlichen Sync-Vorgang nicht zum Absturz bringen.
 */
export function logSyncEvent(source: SyncLogSource, outcome: SyncLogOutcome, message: string): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: SyncLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      source,
      outcome,
      message,
    };
    const updated = [entry, ...readSyncLog()].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Speicher voll o.ä. - der eigentliche Sync-Vorgang darf trotzdem weiterlaufen.
  }
}

/** Neueste Einträge zuerst. */
export function readSyncLog(): SyncLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearSyncLog(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
