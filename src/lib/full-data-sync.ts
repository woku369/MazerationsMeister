/**
 * Automatischer Abgleich des vollständigen Datenstands über GitHub, damit
 * Heimrechner und Büro Gurk ohne manuelles Klicken denselben Stand zeigen
 * (Nutzer-Anfrage 30.09.2026, Fortsetzung von Aufgabe 39).
 *
 * Push (lokale Änderungen hochladen) ist unkritisch - im schlimmsten Fall
 * ein überflüssiger Commit. Pull (einen fremden Stand übernehmen) kann
 * dagegen lokale, noch nicht hochgeladene Arbeit stillschweigend
 * überschreiben - genau das darf eine Automatisierung nicht tun.
 *
 * Deshalb ein Drei-Wege-Abgleich statt eines blinden "immer den neuesten
 * gewinnen lassen": lokal vs. der zuletzt bekannte gemeinsame Stand
 * (lastSyncedSnapshot) vs. GitHub.
 *   - lokal == zuletzt bekannt, GitHub != zuletzt bekannt
 *     -> lokal hat nichts zu verlieren, GitHub sicher automatisch übernehmen.
 *   - lokal != zuletzt bekannt, GitHub == zuletzt bekannt
 *     -> GitHub hat sich nicht bewegt, lokale Änderungen sicher hochladen.
 *   - beide != zuletzt bekannt (und voneinander verschieden)
 *     -> an beiden Rechnern wurde seit dem letzten Abgleich gearbeitet,
 *        ohne dazwischen zu synchronisieren. Das kann nur der Nutzer
 *        auflösen (Tab "Datensicherung" in den Einstellungen) - hier wird
 *        NICHTS automatisch überschrieben.
 */

import {
  collectFullBackup,
  applyFullBackup,
  uploadBackupToGithub,
  fetchBackupFromGithub,
  BACKUP_KEYS,
  type FullBackup,
} from './backup-service';
import { getGithubToken } from './github-token';
import { registerBeforeQuit } from './electron-bridge';
import { toast } from '@/hooks/use-toast';

export interface FullDataSyncConfig {
  enabled: boolean;
  interval: number; // Minuten
}

const CONFIG_KEY = 'fullDataAutoSyncConfig';
const LAST_SYNCED_SNAPSHOT_KEY = 'fullDataLastSyncedSnapshot';
const PENDING_CONFLICT_KEY = 'fullDataPendingConflict';

/** Stabiler Vergleichswert: sortierte Einträge, damit reine Objekt-/Schlüsselreihenfolge keinen falschen Unterschied vortäuscht. */
function snapshotOf(backup: FullBackup): string {
  const sortedEntries = Object.entries(backup.values).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(sortedEntries);
}

/**
 * Kein echtes Geschäftsdaten vorhanden (z.B. ganz frische Installation) -
 * dann ist ein automatisches Übernehmen von GitHub beim allerersten
 * Abgleich (lastSyncedSnapshot existiert noch gar nicht) ebenfalls
 * gefahrlos, weil es lokal nichts Wertvolles zu verlieren gibt.
 */
function isEffectivelyEmpty(backup: FullBackup): boolean {
  const geschaeftsdaten: (typeof BACKUP_KEYS)[number][] = [
    'artikelDefinitionen', 'inventoryItems', 'inventoryTransactions', 'tankDefinitions',
    'mazerationProtocols', 'rezepturen', 'lohnbrandAuftraege', 'lohnabfuellerVersaende',
  ];
  return geschaeftsdaten.every(key => {
    const raw = backup.values[key];
    if (raw === undefined) return true;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length === 0 : !parsed;
    } catch {
      return false;
    }
  });
}

export class FullDataSync {
  private config: FullDataSyncConfig = { enabled: false, interval: 15 };
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isBusy = false;
  private lastReconcileOk: boolean | null = null;
  private beforeQuitRegistered = false;

  constructor() {
    this.loadConfig();
  }

  initialize(config: FullDataSyncConfig): void {
    this.config = config;
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
    if (config.enabled && getGithubToken()) {
      this.start();
    } else {
      this.stop();
    }
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) this.config = JSON.parse(raw);
    } catch {
      // Keine gespeicherte Konfiguration - Default bleibt deaktiviert.
    }
    // Reaktiviert den Timer beim (Neu-)Start, wenn zuvor aktiviert - siehe
    // dieselbe Lücke, die in tank-auto-sync.ts unter Aufgabe 36 behoben
    // wurde (sonst zeigt "Aktiv" in den Einstellungen nur die gespeicherte
    // Absicht, ohne dass tatsächlich ein Timer läuft).
    if (this.config.enabled && getGithubToken()) {
      this.start();
    }
  }

  private start(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.reconcileNow();
    this.intervalId = setInterval(() => this.reconcileNow(), this.config.interval * 60 * 1000);

    // "Vor dem Beenden synchronisieren" (Aufgabe 40 bereitet die Bridge vor,
    // hier tatsächlich verdrahtet) - nur einmal registrieren, auch wenn
    // start() durch ein erneutes initialize() mehrfach läuft.
    if (!this.beforeQuitRegistered) {
      this.beforeQuitRegistered = true;
      registerBeforeQuit(() => this.pushOnly());
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStatus(): { enabled: boolean; interval: number; hasPendingConflict: boolean } {
    return { enabled: this.config.enabled, interval: this.config.interval, hasPendingConflict: getPendingConflict() !== null };
  }

  /** Nur hochladen, ohne den vollen Drei-Wege-Abgleich - für den Beenden-Hook, wo Zeit knapp ist. */
  private async pushOnly(): Promise<void> {
    if (!getGithubToken()) return;
    const local = collectFullBackup();
    const localSnap = snapshotOf(local);
    if (localSnap === localStorage.getItem(LAST_SYNCED_SNAPSHOT_KEY)) return; // nichts Neues
    const result = await uploadBackupToGithub();
    if (result.ok) localStorage.setItem(LAST_SYNCED_SNAPSHOT_KEY, localSnap);
  }

  async reconcileNow(): Promise<void> {
    if (this.isBusy || !getGithubToken() || typeof window === 'undefined') return;
    this.isBusy = true;
    try {
      const lastSynced = localStorage.getItem(LAST_SYNCED_SNAPSHOT_KEY);
      const localBackup = collectFullBackup();
      const localSnap = snapshotOf(localBackup);

      const remoteResult = await fetchBackupFromGithub();
      if (!remoteResult.ok) {
        // Noch nie auf GitHub gesichert (oder Netzwerkfehler) - kein Konflikt
        // möglich, einfach hochladen, wenn lokal etwas Neues da ist.
        if (localSnap !== lastSynced) {
          const upload = await uploadBackupToGithub();
          if (upload.ok) {
            localStorage.setItem(LAST_SYNCED_SNAPSHOT_KEY, localSnap);
            this.reportOk();
          } else {
            this.reportFailure(upload.error);
          }
        }
        return;
      }

      const remoteSnap = snapshotOf(remoteResult.backup);
      const firstEverSync = lastSynced === null;
      const localChanged = !firstEverSync && localSnap !== lastSynced;
      const remoteChanged = !firstEverSync && remoteSnap !== lastSynced;

      if (localSnap === remoteSnap) {
        // Bereits identisch (z.B. ganz erster Abgleich, beide leer) - nur den Referenzpunkt setzen.
        localStorage.setItem(LAST_SYNCED_SNAPSHOT_KEY, localSnap);
        this.reportOk();
        return;
      }

      if (firstEverSync) {
        // Noch nie ein gemeinsamer Referenzpunkt bekannt. Nur automatisch
        // entscheiden, wenn eine Seite nachweislich nichts Wertvolles zu
        // verlieren hat - sonst raten wir, welche Seite "richtig" ist.
        if (isEffectivelyEmpty(localBackup)) {
          applyFullBackup(remoteResult.backup);
          localStorage.setItem(LAST_SYNCED_SNAPSHOT_KEY, remoteSnap);
          toast({ title: 'Datenstand geladen', description: 'Der auf GitHub gesicherte Datenstand wurde automatisch übernommen.' });
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
        // Lokal hat bereits Daten, aber noch nie synchronisiert, und GitHub
        // hat einen abweichenden Stand - kann nicht automatisch entschieden
        // werden, ohne möglicherweise echte Arbeit zu verlieren.
        this.flagConflict(remoteResult.backup);
        return;
      }

      if (!localChanged && remoteChanged) {
        applyFullBackup(remoteResult.backup);
        localStorage.setItem(LAST_SYNCED_SNAPSHOT_KEY, remoteSnap);
        toast({ title: 'Datenstand aktualisiert', description: 'Ein neuerer Stand vom anderen Rechner wurde automatisch geladen.' });
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      if (localChanged && !remoteChanged) {
        const upload = await uploadBackupToGithub();
        if (upload.ok) {
          localStorage.setItem(LAST_SYNCED_SNAPSHOT_KEY, localSnap);
          this.reportOk();
        } else {
          this.reportFailure(upload.error);
        }
        return;
      }

      // Beide verändert - echter Konflikt, nicht automatisch auflösbar.
      this.flagConflict(remoteResult.backup);
    } catch (error) {
      this.reportFailure(error instanceof Error ? error.message : 'Unbekannter Fehler beim Datenabgleich.');
    } finally {
      this.isBusy = false;
    }
  }

  private flagConflict(remoteBackup: FullBackup): void {
    localStorage.setItem(PENDING_CONFLICT_KEY, JSON.stringify(remoteBackup));
    toast({
      title: 'Sync-Konflikt',
      description: 'An diesem UND am anderen Rechner wurde seit dem letzten Abgleich gearbeitet. Bitte in den Einstellungen → Datensicherung manuell auflösen.',
      variant: 'destructive',
    });
  }

  private reportOk(): void {
    if (this.lastReconcileOk === false) {
      toast({ title: 'Datenabgleich wiederhergestellt', description: 'Der automatische Abgleich mit GitHub funktioniert wieder.' });
    }
    this.lastReconcileOk = true;
  }

  private reportFailure(error: string): void {
    if (this.lastReconcileOk !== false) {
      toast({ title: 'Datenabgleich fehlgeschlagen', description: error, variant: 'destructive' });
    }
    this.lastReconcileOk = false;
  }
}

let instance: FullDataSync | null = null;

export function getFullDataSync(): FullDataSync {
  if (!instance) instance = new FullDataSync();
  return instance;
}

/** Der bei einem erkannten Konflikt gespeicherte Fremdstand, oder null wenn kein Konflikt offen ist. */
export function getPendingConflict(): FullBackup | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PENDING_CONFLICT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingConflict(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(PENDING_CONFLICT_KEY);
}

/** Nach einer manuellen Konfliktauflösung (egal welche Seite gewählt wurde) den neuen gemeinsamen Referenzpunkt festhalten. */
export function markResolved(resultingBackup: FullBackup): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_SYNCED_SNAPSHOT_KEY, snapshotOf(resultingBackup));
  }
  clearPendingConflict();
}
