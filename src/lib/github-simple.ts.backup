/**
 * Vereinfachte GitHub-Integration ohne localStorage-Watcher
 * Funktioniert für Electron und Browser
 */

export interface GitHubConfig {
  username: string;
  repository: string;
  token: string;
  branch?: string;
}

// Vereinfachte GitHub-Service ohne problematische Browser-APIs
export class SimpleGitHubService {
  private config: GitHubConfig;
  private baseUrl: string;

  constructor(config: GitHubConfig) {
    this.config = {
      ...config,
      branch: config.branch || 'main'
    };
    this.baseUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repository}`;
  }

  /**
   * Lädt Tank-Daten zu GitHub hoch
   */
  async uploadTankData(tankData: any, inventoryData: any): Promise<boolean> {
    try {
      console.log('🔄 Starte GitHub-Upload...');

      const content = JSON.stringify({
        tanks: tankData,
        inventory: inventoryData,
        lastUpdated: new Date().toISOString()
      }, null, 2);

      // Browser-only base64 encoding
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      const payload = {
        message: `Update tank data - ${new Date().toLocaleString()}`,
        content: base64Content,
        branch: this.config.branch
      };

      const response = await fetch(`${this.baseUrl}/contents/tank-data.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`GitHub API Error:`, response.status, errorData);
        return false;
      }

      console.log('✅ GitHub Upload erfolgreich');
      return true;

    } catch (error) {
      console.error('❌ GitHub Upload Fehler:', error);
      return false;
    }
  }

  /**
   * Testet die GitHub-Verbindung
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('GitHub Connection Test failed:', error);
      return false;
    }
  }

  /**
   * Generiert GitHub Pages URL für einen Tank
   */
  getTankUrl(tankId: string): string {
    return `https://${this.config.username}.github.io/${this.config.repository}/tank-viewer.html?tank=${tankId}`;
  }
}

// Globaler Service
let githubService: SimpleGitHubService | null = null;

/**
 * Initialisiert GitHub-Service
 */
export function initializeGitHubSync(token: string): boolean {
  try {
    githubService = new SimpleGitHubService({
      username: 'woku369',
      repository: 'MazerationsMeister',
      token: token
    });
    
    console.log('✅ GitHub-Service initialisiert');
    return true;
  } catch (error) {
    console.error('❌ GitHub-Service Initialisierung fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Prüft, ob GitHub aktiv ist
 */
export function isGitHubSyncEnabled(): boolean {
  return githubService !== null;
}

/**
 * Testet GitHub-Verbindung
 */
export async function testGitHubConnection(): Promise<boolean> {
  if (!githubService) return false;
  return await githubService.testConnection();
}

/**
 * Synchronisiert Tank-Daten zu GitHub
 */
export async function autoSyncTankData(): Promise<boolean> {
  if (!githubService) return false;

  try {
    // Lade Daten aus localStorage (nur im Browser)
    if (typeof window === 'undefined') return false;
    
    const tanks = JSON.parse(localStorage.getItem('tanks') || '[]');
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');

    if (tanks.length === 0) {
      console.log('ℹ️ Keine Tank-Daten zum Synchronisieren');
      return false;
    }

    const success = await githubService.uploadTankData(tanks, inventory);
    
    if (success && typeof window !== 'undefined') {
      localStorage.setItem('lastGitHubSync', new Date().toISOString());
    }

    return success;
  } catch (error) {
    console.error('❌ Auto-Sync Fehler:', error);
    return false;
  }
}

/**
 * Generiert GitHub-URL für Tank
 */
export function getGitHubTankUrl(tankId: string): string | null {
  if (!githubService) return null;
  return githubService.getTankUrl(tankId);
}

/**
 * Startet Auto-Sync (vereinfacht)
 */
export function startAutoSync() {
  console.log('🎯 GitHub Auto-Sync bereit (manueller Trigger)');
  // Manuelle Synchronisation über Button
}

/**
 * Stoppt Auto-Sync
 */
export function stopAutoSync() {
  console.log('⏹️ GitHub Auto-Sync gestoppt');
}

/**
 * Letzter Sync-Zeitstempel
 */
export function getLastSyncTime(): Date | null {
  if (typeof window === 'undefined') return null;
  const lastSync = localStorage.getItem('lastGitHubSync');
  return lastSync ? new Date(lastSync) : null;
}