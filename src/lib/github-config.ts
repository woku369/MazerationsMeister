/**
 * Zentrale GitHub-Konfiguration
 * Singleton-Service für einmalige GitHub-Verbindung
 * Wird von TankAutoSync und AppAutoSync verwendet
 */

import { hybridStorage } from './hybrid-storage';
import { GitHubService } from './github-service';

export interface GitHubConfig {
  token: string;
  username: string;
  repository: string;
  branch: string;
}

export interface GitHubStatus {
  configured: boolean;
  connected: boolean;
  config: GitHubConfig | null;
  lastTest: Date | null;
}

/**
 * Zentrale GitHub-Konfigurationsverwaltung
 */
class GitHubConfigManager {
  private static instance: GitHubConfigManager;
  private config: GitHubConfig | null = null;
  private lastTest: Date | null = null;
  private connected: boolean = false;

  private constructor() {
    // Privater Constructor für Singleton
  }

  /**
   * Singleton-Instanz holen
   */
  static getInstance(): GitHubConfigManager {
    if (!GitHubConfigManager.instance) {
      GitHubConfigManager.instance = new GitHubConfigManager();
    }
    return GitHubConfigManager.instance;
  }

  /**
   * Lädt Konfiguration aus Environment-Variablen UND Hybrid Storage
   * Priority: Hybrid Storage > Environment Variables
   */
  async loadConfig(): Promise<GitHubConfig | null> {
    try {
      // 1. Versuche aus Hybrid Storage zu laden (User-Eingabe)
      const storedToken = await hybridStorage.get('github-token');
      const storedUsername = await hybridStorage.get('github-username');
      const storedRepo = await hybridStorage.get('github-repository');

      // 2. Fallback: Environment Variables (.env.local)
      const envToken = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GITHUB_TOKEN;
      const envUsername = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GITHUB_USERNAME;
      const envRepo = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GITHUB_REPOSITORY;
      const envBranch = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GITHUB_BRANCH;

      const token = storedToken || envToken || '';
      const username = storedUsername || envUsername || 'woku369';
      const repository = storedRepo || envRepo || 'MazerationsMeister';
      const branch = envBranch || 'pages-clean';

      if (!token) {
        console.warn('[GitHubConfig] ⚠️ Kein GitHub Token gefunden (weder Storage noch .env.local)');
        return null;
      }

      this.config = {
        token,
        username,
        repository,
        branch
      };

      console.log('[GitHubConfig] ✅ Config geladen:', {
        username,
        repository,
        branch,
        tokenLength: token.length,
        source: storedToken ? 'Hybrid Storage' : 'Environment'
      });

      return this.config;
    } catch (error) {
      console.error('[GitHubConfig] ❌ Fehler beim Laden:', error);
      return null;
    }
  }

  /**
   * Speichert Konfiguration in Hybrid Storage
   */
  async saveConfig(config: Partial<GitHubConfig>): Promise<void> {
    try {
      if (config.token) {
        await hybridStorage.set('github-token', config.token);
      }
      if (config.username) {
        await hybridStorage.set('github-username', config.username);
      }
      if (config.repository) {
        await hybridStorage.set('github-repository', config.repository);
      }

      // Reload config
      await this.loadConfig();

      // Event für andere Komponenten
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('githubConfigUpdated', {
          detail: { config: this.config }
        }));
      }

      console.log('[GitHubConfig] ✅ Config gespeichert und Event gefeuert');
    } catch (error) {
      console.error('[GitHubConfig] ❌ Fehler beim Speichern:', error);
      throw error;
    }
  }

  /**
   * Testet GitHub-Verbindung
   */
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config) {
      console.error('[GitHubConfig] ❌ Keine Config vorhanden zum Testen');
      return false;
    }

    try {
      console.log('[GitHubConfig] 🔍 Teste GitHub-Verbindung...');
      
      const githubService = new GitHubService({
        username: this.config.username,
        repository: this.config.repository,
        token: this.config.token,
        branch: this.config.branch
      });

      const ok = await githubService.testConnection();
      
      this.connected = ok;
      this.lastTest = new Date();

      console.log(`[GitHubConfig] ${ok ? '✅' : '❌'} Verbindungstest: ${ok ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
      
      return ok;
    } catch (error) {
      console.error('[GitHubConfig] ❌ Verbindungstest fehlgeschlagen:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Gibt aktuelle Konfiguration zurück
   */
  getConfig(): GitHubConfig | null {
    return this.config;
  }

  /**
   * Prüft ob GitHub konfiguriert ist
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.token.length > 0;
  }

  /**
   * Gibt Status zurück
   */
  getStatus(): GitHubStatus {
    return {
      configured: this.isConfigured(),
      connected: this.connected,
      config: this.config,
      lastTest: this.lastTest
    };
  }

  /**
   * Reset Config (z.B. bei Logout)
   */
  async resetConfig(): Promise<void> {
    this.config = null;
    this.connected = false;
    this.lastTest = null;

    await hybridStorage.remove('github-token');
    await hybridStorage.remove('github-username');
    await hybridStorage.remove('github-repository');

    console.log('[GitHubConfig] 🔄 Config zurückgesetzt');

    // Event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('githubConfigUpdated', {
        detail: { config: null }
      }));
    }
  }
}

// Singleton-Instanz exportieren
export const githubConfigManager = GitHubConfigManager.getInstance();

// Helper-Funktion für einfachen Zugriff
export async function getGitHubConfig(): Promise<GitHubConfig | null> {
  return await githubConfigManager.loadConfig();
}

export function isGitHubConfigured(): boolean {
  return githubConfigManager.isConfigured();
}
