/**
 * Zugriff auf die in electron/preload.js über contextBridge freigegebene
 * `window.electronAPI` - der einzige korrekte Weg für den Renderer, echte
 * Dateisystem-/Shell-Operationen auszulösen (Aufgabe 40).
 *
 * Ersetzt `window.require('fs'/'path'/'electron')`, das im echten Programm
 * nie funktioniert hat: `contextIsolation: true` + `nodeIntegration: false`
 * bedeutet, dass `window.require` schlicht undefined ist. Jede Stelle, die
 * das prüfte, nahm lautlos den Browser-Download-Fallback statt wirklich in
 * den konfigurierten Exportordner zu schreiben.
 */

interface ElectronAPI {
  isElectron: true;
  appDataDir: string;
  getAppVersion: () => Promise<string>;
  getDefaultExportDir: () => Promise<string>;
  writeFile: (
    dir: string,
    fileName: string,
    content: string,
    encoding?: 'utf-8' | 'base64',
  ) => Promise<{ ok: true; path: string } | { ok: false; error: string }>;
  openPath: (targetPath: string) => Promise<{ ok: boolean; error?: string }>;
  googleCalendarStartAuth: (
    clientId: string,
    clientSecret: string,
  ) => Promise<{ ok: true; tokens: { access_token: string; refresh_token?: string; expires_in: number } } | { ok: false; error: string }>;
  googleCalendarRefreshToken: (
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ) => Promise<{ ok: true; tokens: { access_token: string; expires_in: number } } | { ok: false; error: string }>;
  onBeforeQuit: (callback: () => void) => void;
  notifyQuitReady: () => void;
}

function getElectronAPI(): ElectronAPI | null {
  if (typeof window === 'undefined') return null;
  const api = (window as any).electronAPI;
  return api?.isElectron ? (api as ElectronAPI) : null;
}

export function isElectron(): boolean {
  return getElectronAPI() !== null;
}

export type WriteToExportDirResult =
  | { ok: true; path: string; dir: string }
  | { ok: false; error: string };

/**
 * Schreibt Inhalt in den in den Einstellungen konfigurierten Exportordner
 * (Fallback: Arbeitsverzeichnis der App). Nur im echten Electron-Programm
 * verfügbar - im Browser (Dev-Server, PWA) gibt es kein Dateisystem, das
 * gezielte Verzeichnis wählen könnte; dort bleibt der Blob-Download der
 * einzig sinnvolle Weg (siehe Aufrufer).
 */
export async function writeToExportDir(
  fileName: string,
  content: string,
  encoding: 'utf-8' | 'base64' = 'utf-8',
): Promise<WriteToExportDirResult> {
  const api = getElectronAPI();
  if (!api) return { ok: false, error: 'Kein Electron-Kontext verfügbar.' };

  const configuredDir = typeof window !== 'undefined' ? localStorage.getItem('exportPath') || '' : '';
  const dir = configuredDir || (await api.getDefaultExportDir());
  const result = await api.writeFile(dir, fileName, content, encoding);
  return result.ok ? { ok: true, path: result.path, dir } : { ok: false, error: result.error };
}

/** Öffnet eine Datei oder einen Ordner mit der Standardanwendung des Betriebssystems. */
export async function openPath(targetPath: string): Promise<void> {
  const api = getElectronAPI();
  if (!api) return;
  await api.openPath(targetPath);
}

/**
 * Startet den Google-Calendar-OAuth-Ablauf (Nutzer-Anfrage 07.10.2026) - nur
 * im echten Electron-Programm verfügbar, siehe electron/google-calendar.ts
 * für die Begründung (lokaler Redirect-Listener + CORS-freier Token-Tausch
 * brauchen den Hauptprozess).
 */
export async function googleCalendarStartAuth(
  clientId: string,
  clientSecret: string,
): Promise<{ ok: true; accessToken: string; refreshToken?: string; expiresIn: number } | { ok: false; error: string }> {
  const api = getElectronAPI();
  if (!api) return { ok: false, error: 'Google-Calendar-Anbindung ist nur im installierten Programm verfügbar, nicht im Browser.' };
  const result = await api.googleCalendarStartAuth(clientId, clientSecret);
  if (!result.ok) return result;
  return {
    ok: true,
    accessToken: result.tokens.access_token,
    refreshToken: result.tokens.refresh_token,
    expiresIn: result.tokens.expires_in,
  };
}

export async function googleCalendarRefreshToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ ok: true; accessToken: string; expiresIn: number } | { ok: false; error: string }> {
  const api = getElectronAPI();
  if (!api) return { ok: false, error: 'Google-Calendar-Anbindung ist nur im installierten Programm verfügbar, nicht im Browser.' };
  const result = await api.googleCalendarRefreshToken(refreshToken, clientId, clientSecret);
  if (!result.ok) return result;
  return { ok: true, accessToken: result.tokens.access_token, expiresIn: result.tokens.expires_in };
}

/**
 * Registriert einen Callback, der aufgerufen wird, bevor die App tatsächlich
 * beendet wird, und meldet danach die Fertigstellung zurück, damit
 * app.quit() im Hauptprozess freigegeben wird. Callback sollte selbst kein
 * Fehler werfen - wird hier abgefangen, damit ein fehlgeschlagener Sync die
 * App nicht am Beenden hindert (der Hauptprozess hat ohnehin ein
 * Sicherheitsnetz mit Timeout).
 */
export function registerBeforeQuit(callback: () => Promise<void> | void): void {
  const api = getElectronAPI();
  if (!api) return;
  api.onBeforeQuit(async () => {
    try {
      await callback();
    } catch (error) {
      console.error('Fehler beim Synchronisieren vor dem Beenden:', error);
    } finally {
      api.notifyQuitReady();
    }
  });
}
