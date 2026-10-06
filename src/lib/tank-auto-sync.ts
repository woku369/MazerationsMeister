/**
 * Automatische Tank-Daten Synchronisation zu GitHub Pages
 * Lädt Tank-Daten automatisch bei Änderungen hoch
 */

import { GitHubService, TankDataGitHubSync } from './github-service';
import { getGithubToken } from './github-token';
import { getTankDefinitions } from './tank-sync';
import * as StockService from './stock-service';
import { toast } from '@/hooks/use-toast';

export interface AutoSyncConfig {
  enabled: boolean;
  interval: number; // Minuten
  githubToken: string;
  githubUsername: string;
  githubRepository: string;
}

export class TankAutoSync {
  private config: AutoSyncConfig | null = null;
  private githubSync: TankDataGitHubSync | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSync: Date | null = null;
  private isUploading: boolean = false; // MUTEX für parallele Uploads
  // Ergebnis des letzten Sync-Versuchs - null (noch keiner), true oder false.
  // Verhindert, dass bei einem andauernden Fehler (z.B. abgelaufener Token)
  // JEDER einzelne Intervall-Versuch erneut einen Toast auslöst; nur der
  // Wechsel des Zustands (funktioniert -> kaputt, kaputt -> funktioniert
  // wieder) wird gemeldet.
  private lastSyncOk: boolean | null = null;

  constructor() {
    this.loadConfig();
  }

  /**
   * Baut den GitHubService mit der Branch, die den Deploy-Workflow
   * (.github/workflows/deploy.yml) tatsächlich auslöst. War lange fest auf
   * "main-pages" codiert - eine Branch, die im Repo nie existiert hat.
   * Dadurch schlug jeder Sync-Versuch seit Oktober 2025 fehl, nur leise in
   * der Konsole geloggt (Nutzer-Meldung 30.09.2026: die GitHub-Pages-
   * Tankübersicht zeigte noch den Stand von damals).
   */
  private buildGithubService(config: AutoSyncConfig): GitHubService {
    return new GitHubService({
      username: config.githubUsername,
      repository: config.githubRepository,
      token: config.githubToken,
      branch: 'fresh-main',
    });
  }

  /**
   * Initialisiert Auto-Sync mit Konfiguration
   */
  async initialize(config: AutoSyncConfig): Promise<boolean> {
    try {
      this.config = config;
      // Konfiguration in localStorage speichern - OHNE Token (der lebt nur an
      // einer Stelle, in github-token.ts, um Drift zwischen den beiden Kopien
      // zu vermeiden; siehe loadConfig()).
      if (typeof window !== 'undefined') {
        const { githubToken: _githubToken, ...persistable } = config;
        localStorage.setItem('autoSyncConfig', JSON.stringify(persistable));
      }

      if (config.enabled && config.githubToken) {
        const githubService = this.buildGithubService(config);

        // Test GitHub Verbindung
        const connectionOk = await githubService.testConnection();
        if (!connectionOk) {
          console.error('❌ GitHub Verbindung fehlgeschlagen');
          return false;
        }

        this.githubSync = new TankDataGitHubSync(githubService);
        this.startAutoSync();

        console.log(`✅ Tank Auto-Sync aktiviert (alle ${config.interval} Minuten)`);
        return true;
      }

      return true;
    } catch (error) {
      console.error('❌ Auto-Sync Initialisierung fehlgeschlagen:', error);
      return false;
    }
  }

  /**
   * Startet automatische Synchronisation
   */
  private startAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    if (!this.config?.enabled || !this.githubSync) return;

    // Sofort synchronisieren
    this.syncNow();

    // Dann regelmäßig
    this.intervalId = setInterval(() => {
      this.syncNow();
    }, this.config.interval * 60 * 1000);
  }

  /**
   * Stoppt automatische Synchronisation
   */
  stopAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 Tank Auto-Sync gestoppt');
  }

  /**
   * Synchronisiert Tank-Daten sofort
   */
  async syncNow(): Promise<boolean> {
    if (!this.config?.enabled || !this.githubSync) {
      console.log('ℹ️ Auto-Sync nicht konfiguriert oder deaktiviert');
      return false;
    }

    // MUTEX: Verhindere parallele Uploads
    if (this.isUploading) {
      console.log('⏳ Upload bereits aktiv, warte auf Abschluss...');
      return false;
    }

    try {
      this.isUploading = true; // LOCK
      console.log('🔄 Starte manuelle Tank-Synchronisation...');

      // Tank-Daten direkt und frisch aus localStorage lesen - NICHT über
      // universalStorage.getData(). Nutzer-Meldung 06.10.2026: tank-data.json
      // auf GitHub zeigte für mehrere Gebinde noch den Stand von vor dem
      // Splitten, obwohl das vollständige Backup (gleiche Sekunde synchronisiert)
      // bereits korrekt war. Ursache: universalStorage ist ein Singleton mit
      // einem einmalig beim App-Start geladenen In-Memory-Snapshot
      // (isInitialized-Guard in initializeAppData()) - Splitten/Löschen in
      // tank-management.tsx schreibt aber direkt über StockService/localStorage,
      // ohne diesen Snapshot zu aktualisieren. Jeder Sync-Lauf danach lud
      // deshalb einen veralteten Stand hoch, unabhängig davon, wie frisch der
      // Intervall-Timer selbst war. getTankDefinitions()/StockService.readAll()
      // lesen dagegen bei jedem Aufruf frisch aus localStorage, wie der Rest
      // der App es bereits tut.
      const tankDefinitions = getTankDefinitions();
      const inventoryItems = StockService.readAll();
      if (!tankDefinitions.length && !inventoryItems.length) {
        console.warn('⚠️ Keine Tank-Daten gefunden zum Synchronisieren');
        return false;
      }

      // Synchronisiere zu GitHub
      const success = await this.githubSync.syncTankData(
        tankDefinitions,
        inventoryItems
      );

      if (success.success) {
        this.lastSync = new Date();
        // Speichere LastSync in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastGitHubSync', this.lastSync.toISOString());
        }
        console.log(`✅ Tank-Daten erfolgreich synchronisiert: ${this.lastSync.toLocaleString()}`);
        // Nur melden, wenn zuvor ein Fehler bestand - sonst bei jedem
        // normalen Erfolg ein überflüssiger Toast alle paar Minuten.
        if (this.lastSyncOk === false) {
          toast({
            title: 'GitHub-Synchronisierung wiederhergestellt',
            description: 'Tank-Daten werden wieder erfolgreich zu GitHub Pages hochgeladen.',
          });
        }
        this.lastSyncOk = true;
      } else {
        console.error('❌ Tank-Synchronisation fehlgeschlagen (GitHub-Upload nicht erfolgreich).');
        // War bisher unsichtbar (nur Konsole) - der Vorjahresstand auf
        // GitHub Pages blieb dadurch monatelang unbemerkt (Nutzer-Meldung
        // 30.09.2026). Nur beim Wechsel in den Fehlerzustand melden, nicht
        // bei jedem einzelnen Intervall-Versuch erneut.
        if (this.lastSyncOk !== false) {
          toast({
            title: 'GitHub-Synchronisierung fehlgeschlagen',
            description: 'Tank-Daten konnten nicht zu GitHub Pages hochgeladen werden. Bitte GitHub-Token und Internetverbindung in den Einstellungen prüfen.',
            variant: 'destructive',
          });
        }
        this.lastSyncOk = false;
      }

      return success.success;

    } catch (error) {
      console.error('❌ Tank-Synchronisation fehlgeschlagen:', error);
      if (this.lastSyncOk !== false) {
        toast({
          title: 'GitHub-Synchronisierung fehlgeschlagen',
          description: 'Unerwarteter Fehler beim Hochladen der Tank-Daten. Details in der Konsole (F12).',
          variant: 'destructive',
        });
      }
      this.lastSyncOk = false;
      return false;
    } finally {
      this.isUploading = false; // UNLOCK
    }
  }

  /**
   * Lädt Konfiguration aus Storage
   */
  private async loadConfig(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const configStr = localStorage.getItem('autoSyncConfig');
        if (configStr) {
          // Token nicht aus der eigenen (bewusst tokenlosen) Kopie lesen,
          // sondern live von der einzigen Quelle - sonst könnte hier ein
          // veralteter Token überleben, wenn er zwischenzeitlich in den
          // Einstellungen geändert/rotiert wurde.
          this.config = { ...JSON.parse(configStr), githubToken: getGithubToken() };
        }

        const lastSyncStr = localStorage.getItem('lastGitHubSync');
        if (lastSyncStr) {
          this.lastSync = new Date(lastSyncStr);
        }

        // War in einer früheren Session aktiviert - den Timer hier aktiv neu
        // starten, sonst bleibt Auto-Sync nach jedem App-Neustart inaktiv,
        // obwohl die Einstellungen-Seite "Aktiv" anzeigt (das Flag ist nur
        // die gespeicherte Absicht, kein Beleg für einen laufenden Timer -
        // Mitursache für die monatelange Sync-Stille, Nutzer-Meldung
        // 30.09.2026).
        if (this.config?.enabled && this.config.githubToken) {
          console.log(`📡 Auto-Sync Konfiguration geladen, reaktiviere Timer (alle ${this.config.interval} Minuten)`);
          this.githubSync = new TankDataGitHubSync(this.buildGithubService(this.config));
          this.startAutoSync();
        }
      }
    } catch (error) {
      console.log('ℹ️ Keine Auto-Sync Konfiguration gefunden');
    }
  }

  /**
   * Generiert GitHub Pages URL für Tank
   */
  getTankUrl(tankId: string): string | null {
    if (!this.githubSync || !this.config) return null;
    return this.githubSync.getTankUrl(tankId);
  }

  /**
   * Status-Informationen
   */
  getStatus(): {
    enabled: boolean;
    lastSync: Date | null;
    nextSync: Date | null;
    config: AutoSyncConfig | null;
  } {
    const nextSync = this.lastSync && this.config?.interval 
      ? new Date(this.lastSync.getTime() + (this.config.interval * 60 * 1000))
      : null;

    return {
      enabled: this.config?.enabled || false,
      lastSync: this.lastSync,
      nextSync,
      config: this.config
    };
  }

  /**
   * Konfiguration aktualisieren
   */
  async updateConfig(newConfig: Partial<AutoSyncConfig>): Promise<boolean> {
    if (!this.config) return false;

    const updatedConfig = { ...this.config, ...newConfig };
    return this.initialize(updatedConfig);
  }
}

// Singleton Instance
let autoSyncInstance: TankAutoSync | null = null;

export function getTankAutoSync(): TankAutoSync {
  if (!autoSyncInstance) {
    autoSyncInstance = new TankAutoSync();
  }
  return autoSyncInstance;
}