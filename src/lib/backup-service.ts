/**
 * Vollständige Datensicherung & -wiederherstellung, lokal als Datei oder über
 * GitHub (Nutzer-Anfrage 30.09.2026): Zwei getrennte Probleme in einer Lösung.
 *
 * 1. Nach einer Neuinstallation war der gesamte Datenstand weg - der einzige
 *    bisherige "Backup erstellen"-Knopf sicherte nur 3 von ~13 tatsächlich
 *    relevanten localStorage-Töpfen (Artikelstamm, Lagerbestand, Journal),
 *    und es gab überhaupt keine Funktion, eine solche Datei wieder
 *    einzuspielen.
 * 2. Der Nutzer arbeitet abwechselnd an zwei Rechnern (Heimrechner und Büro
 *    Gurk) und braucht denselben Datenstand auf beiden - dafür wurde die
 *    GitHub-Integration ursprünglich gebaut, bisher synchronisiert sie aber
 *    nur einen Tank-Daten-Auszug für die QR-Codes, nicht den vollständigen
 *    Datenstand.
 *
 * Jeder Schlüssel wird unverändert als Roh-String aus localStorage kopiert
 * und beim Wiederherstellen exakt so zurückgeschrieben - keine erneute
 * JSON-(De-)Serialisierung, die Formatunterschiede riskieren würde (z.B.
 * "taraPerCrateKg" ist bewusst kein JSON, sondern ein reiner Zahl-String).
 *
 * Bewusst NICHT enthalten: GitHub-Token, Auto-Sync-Konfiguration,
 * Speicherpfade (dataPath/oneDrivePath/exportPath) - das sind
 * maschinenspezifische bzw. sicherheitsrelevante Einstellungen, die beim
 * Übertragen auf einen anderen Rechner eher schaden als nützen würden (z.B.
 * würde der Export-Pfad vom Heimrechner am Bürorechner ins Leere zeigen,
 * und ein im Backup enthaltener GitHub-Token würde bei einem Upload zu
 * GitHub versehentlich in die eigene Versionshistorie geschrieben).
 */

import { GitHubService } from './github-service';
import { getGithubToken } from './github-token';
import { isElectron, writeToExportDir } from './electron-bridge';

// Alle tatsächlich zu sichernden Datentöpfe an einer zentralen Stelle, statt
// einzelne Schlüssel über mehrere Backup-Funktionen verteilt aufzuzählen -
// genau das Vergessen einzelner Schlüssel war die Ursache des bisherigen,
// unvollständigen Backups.
export const BACKUP_KEYS = [
  'artikelDefinitionen',
  'inventoryItems',
  'inventoryTransactions',
  'tankDefinitions',
  'mazerationProtocols',
  'rezepturen',
  'lohnbrandAuftraege',
  'lohnabfuellerVersaende',
  'leergebinde',
  'taraPerCrateKg',
  'inventoryCategories',
  'sammellisteIds',
  'dashboardTasks',
  'simple-tasks',
] as const;

export type BackupKey = (typeof BACKUP_KEYS)[number];

/** Menschenlesere Beschriftung je Datentopf, für die Vorschau vor dem Wiederherstellen. */
export const BACKUP_KEY_LABELS: Record<BackupKey, string> = {
  artikelDefinitionen: 'Artikelstamm',
  inventoryItems: 'Lagerbestand (Chargen)',
  inventoryTransactions: 'Buchungsjournal',
  tankDefinitions: 'Tank-Definitionen',
  mazerationProtocols: 'Mazerationsprotokolle',
  rezepturen: 'Rezepturen (GFKC)',
  lohnbrandAuftraege: 'Lohnbrand-Aufträge',
  lohnabfuellerVersaende: 'Versand an Lohnabfüller',
  leergebinde: 'Leergebinde',
  taraPerCrateKg: 'Tara je Kiste (Einstellung)',
  inventoryCategories: 'Kategorien',
  sammellisteIds: 'Sammelliste-Auswahl',
  dashboardTasks: 'Dashboard-Aufgaben',
  'simple-tasks': 'Dashboard-Aufgaben (einfach)',
};

export interface FullBackup {
  backupFormat: 'mazerationsmeister-full-backup';
  backupVersion: 2;
  createdAt: string;
  values: Partial<Record<BackupKey, string>>;
}

const GITHUB_USERNAME = 'woku369';
const GITHUB_REPOSITORY = 'MazerationsMeister';
// Dieselbe Branch wie der Tank-Daten-Sync (Aufgabe 36) - existiert
// tatsächlich und ist unabhängig vom hier gesicherten Datenstand.
const GITHUB_BRANCH = 'fresh-main';
const GITHUB_BACKUP_PATH = 'app-data-backup.json';

/** Liest alle bekannten Datentöpfe unverändert aus localStorage. */
export function collectFullBackup(): FullBackup {
  const values: Partial<Record<BackupKey, string>> = {};
  for (const key of BACKUP_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) values[key] = raw;
  }
  return {
    backupFormat: 'mazerationsmeister-full-backup',
    backupVersion: 2,
    createdAt: new Date().toISOString(),
    values,
  };
}

/** Schreibt alle im Backup enthaltenen Datentöpfe unverändert zurück. */
export function applyFullBackup(backup: FullBackup): void {
  for (const key of BACKUP_KEYS) {
    const raw = backup.values[key];
    if (raw !== undefined) {
      localStorage.setItem(key, raw);
    }
  }
}

/**
 * Anzahl der Einträge je Datentopf - für eine Vorschau im Wiederherstellen-
 * Dialog, damit vor dem (überschreibenden!) Wiederherstellen sichtbar ist,
 * was in der Datei steckt, statt blind zu vertrauen.
 */
export function summarizeBackup(backup: FullBackup): Array<{ key: BackupKey; count: number }> {
  return BACKUP_KEYS.map(key => {
    const raw = backup.values[key];
    if (raw === undefined) return { key, count: 0 };
    try {
      const parsed = JSON.parse(raw);
      return { key, count: Array.isArray(parsed) ? parsed.length : 1 };
    } catch {
      return { key, count: 1 };
    }
  });
}

/** Wirft, wenn der Inhalt kein gültiges Backup dieses Formats ist. */
export function parseBackupFile(content: string): FullBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as any).backupFormat !== 'mazerationsmeister-full-backup' ||
    typeof (parsed as any).values !== 'object'
  ) {
    throw new Error('Die Datei ist kein MazerationsMeister-Backup (falsches Format).');
  }
  return parsed as FullBackup;
}

function backupFileName(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `MazerationsMeister_Vollbackup_${stamp}.json`;
}

/**
 * Speichert ein Backup als Datei - im konfigurierten Exportverzeichnis über
 * die Electron-Bridge (Aufgabe 40), sonst als Browser-Download. Gibt den
 * Zielpfad zurück, wenn bekannt (nur Electron), sonst null.
 */
export async function saveBackupToFile(): Promise<string | null> {
  const backup = collectFullBackup();
  const json = JSON.stringify(backup, null, 2);
  const fileName = backupFileName();

  if (isElectron()) {
    const result = await writeToExportDir(fileName, json, 'utf-8');
    if (result.ok) return result.path;
    // Fällt durch zum Browser-Download.
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return null;
}

function buildGithubService(): GitHubService | null {
  const token = getGithubToken();
  if (!token) return null;
  return new GitHubService({
    username: GITHUB_USERNAME,
    repository: GITHUB_REPOSITORY,
    token,
    branch: GITHUB_BRANCH,
  });
}

export type BackupResult = { ok: true } | { ok: false; error: string };

/** Lädt den aktuellen Datenstand als eine Datei zu GitHub hoch (überschreibt eine vorherige Sicherung dort). */
export async function uploadBackupToGithub(): Promise<BackupResult> {
  const service = buildGithubService();
  if (!service) return { ok: false, error: 'Kein GitHub-Token konfiguriert. Bitte zuerst im Tab "GitHub Integration" einrichten.' };

  const backup = collectFullBackup();
  const ok = await service.uploadFile({
    path: GITHUB_BACKUP_PATH,
    content: JSON.stringify(backup, null, 2),
    message: `Datensicherung - ${new Date().toLocaleString('de-DE')}`,
  });
  return ok ? { ok: true } : { ok: false, error: 'Upload zu GitHub fehlgeschlagen. Details in der Konsole (F12).' };
}

export type FetchBackupResult = { ok: true; backup: FullBackup } | { ok: false; error: string };

/** Lädt die zuletzt zu GitHub gesicherte Datei (vom jeweils ANDEREN Rechner) herunter. */
export async function fetchBackupFromGithub(): Promise<FetchBackupResult> {
  const token = getGithubToken();
  if (!token) return { ok: false, error: 'Kein GitHub-Token konfiguriert. Bitte zuerst im Tab "GitHub Integration" einrichten.' };

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPOSITORY}/contents/${GITHUB_BACKUP_PATH}?ref=${GITHUB_BRANCH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } },
    );
    if (response.status === 404) {
      return { ok: false, error: 'Auf GitHub ist noch keine Datensicherung vorhanden. Zuerst am anderen Rechner "Zu GitHub sichern" ausführen.' };
    }
    if (!response.ok) {
      return { ok: false, error: `GitHub-Fehler beim Laden (${response.status}).` };
    }
    const data = await response.json();
    // GitHub liefert den Dateiinhalt base64-kodiert; atob() dekodiert nur auf
    // Byte-Ebene, daher der Umweg über escape/decodeURIComponent für
    // korrekte UTF-8-Zeichen (Umlaute etc. im Backup-Inhalt).
    const content = decodeURIComponent(escape(atob(data.content)));
    const backup = parseBackupFile(content);
    return { ok: true, backup };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden von GitHub.' };
  }
}
