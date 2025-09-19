/**
 * GitHub Service für automatische Tank-Daten Synchronisation
 * Lädt Tank-Daten automatisch zu GitHub Pages hoch
 */

export interface GitHubConfig {
  username: string;
  repository: string;
  token: string;
  branch?: string;
}

export interface GitHubFile {
  path: string;
  content: string;
  message: string;
}

export class GitHubService {
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
   * Lädt eine Datei zu GitHub hoch oder aktualisiert sie
   */
  async uploadFile(file: GitHubFile): Promise<boolean> {
    try {
      console.log(`📤 Uploading to GitHub: ${file.path}`);

      // Erst prüfen, ob Datei bereits existiert
      const existingSha = await this.getFileSha(file.path);

      const payload = {
        message: file.message,
        content: typeof window !== 'undefined' && typeof btoa !== 'undefined' 
          ? btoa(unescape(encodeURIComponent(file.content))) 
          : typeof Buffer !== 'undefined' 
            ? Buffer.from(file.content, 'utf-8').toString('base64')
            : btoa(file.content), // Fallback
        branch: this.config.branch,
        ...(existingSha && { sha: existingSha })
      };

      const response = await fetch(`${this.baseUrl}/contents/${file.path}`, {
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

      const result = await response.json();
      console.log(`✅ GitHub Upload erfolgreich: ${file.path}`, result.content?.html_url);
      return true;

    } catch (error) {
      console.error(`❌ GitHub Upload Fehler für ${file.path}:`, error);
      return false;
    }
  }

  /**
   * Lädt mehrere Dateien gleichzeitig hoch
   */
  async uploadMultipleFiles(files: GitHubFile[]): Promise<{ success: boolean; results: boolean[] }> {
    console.log(`📦 Uploading ${files.length} files to GitHub...`);
    
    const uploadPromises = files.map(file => this.uploadFile(file));
    const results = await Promise.all(uploadPromises);
    
    const success = results.every(result => result);
    console.log(`📊 GitHub Upload Results: ${results.filter(r => r).length}/${results.length} erfolgreich`);
    
    return { success, results };
  }

  /**
   * Holt die SHA einer existierenden Datei
   */
  private async getFileSha(path: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/contents/${path}?ref=${this.config.branch}`, {
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.sha;
      }
      return null;
    } catch (error) {
      console.log(`ℹ️ Datei ${path} existiert noch nicht (wird neu erstellt)`);
      return null;
    }
  }

  /**
   * Generiert die GitHub Pages URL für eine Datei
   */
  getGitHubPagesUrl(path: string): string {
    return `https://${this.config.username}.github.io/${this.config.repository}/${path}`;
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
}

/**
 * Tank-Daten spezifische GitHub-Operationen
 */
export class TankDataGitHubSync {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  /**
   * Synchronisiert alle Tank-Daten zu GitHub
   */
  async syncTankData(tankData: any, inventoryData: any): Promise<boolean> {
    try {
      console.log('🔄 Starte Tank-Daten Synchronisation zu GitHub...');

      const files: GitHubFile[] = [
        {
          path: 'tank-data.json',
          content: JSON.stringify({
            tanks: tankData,
            inventory: inventoryData,
            lastUpdated: new Date().toISOString()
          }, null, 2),
          message: `Update tank data - ${new Date().toLocaleString()}`
        },
        {
          path: 'tank-viewer.html',
          content: await this.getTankViewerHTML(),
          message: `Update tank viewer - ${new Date().toLocaleString()}`
        }
      ];

      const result = await this.githubService.uploadMultipleFiles(files);
      
      if (result.success) {
        console.log('✅ Tank-Daten erfolgreich zu GitHub synchronisiert!');
        console.log(`🔗 Tank-Viewer URL: ${this.githubService.getGitHubPagesUrl('tank-viewer.html')}`);
      } else {
        console.error('❌ Tank-Daten Synchronisation teilweise fehlgeschlagen');
      }

      return result.success;

    } catch (error) {
      console.error('❌ Tank-Daten Synchronisation Fehler:', error);
      return false;
    }
  }

  /**
   * Holt die Tank-Viewer HTML (aus public/tank-viewer.html)
   */
  private async getTankViewerHTML(): Promise<string> {
    try {
      // In Electron/Browser: Lade die Datei aus dem public Ordner
      const response = await fetch('/tank-viewer.html');
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn('Konnte tank-viewer.html nicht laden, verwende Fallback');
    }

    // Fallback: Minimale Tank-Viewer HTML
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tank Information</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .tank-card { border: 1px solid #ccc; padding: 20px; margin: 10px 0; border-radius: 8px; }
        .loading { text-align: center; padding: 50px; }
        .error { color: red; text-align: center; padding: 20px; }
    </style>
</head>
<body>
    <div id="content">
        <div class="loading">Lade Tank-Daten...</div>
    </div>
    
    <script>
        async function loadTankData() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const tankId = urlParams.get('tank');
                
                const response = await fetch('./tank-data.json');
                const data = await response.json();
                
                if (tankId) {
                    displayTankData(data, tankId);
                } else {
                    displayAllTanks(data);
                }
            } catch (error) {
                document.getElementById('content').innerHTML = 
                    '<div class="error">Fehler beim Laden der Tank-Daten: ' + error.message + '</div>';
            }
        }
        
        function displayTankData(data, tankId) {
            const tank = data.tanks?.find(t => t.id === tankId);
            if (!tank) {
                document.getElementById('content').innerHTML = 
                    '<div class="error">Tank nicht gefunden: ' + tankId + '</div>';
                return;
            }
            
            const inventory = data.inventory?.filter(item => item.tankNr === tank.tankNr) || [];
            const totalQuantity = inventory.reduce((sum, item) => sum + (item.menge || 0), 0);
            
            document.getElementById('content').innerHTML = \`
                <div class="tank-card">
                    <h2>Tank \${tank.tankNr}: \${tank.bezeichnung}</h2>
                    <p><strong>Kapazität:</strong> \${tank.volumenLiter} Liter</p>
                    <p><strong>Aktueller Inhalt:</strong> \${totalQuantity} Liter</p>
                    <p><strong>Frei:</strong> \${tank.volumenLiter - totalQuantity} Liter</p>
                    <p><strong>Letztes Update:</strong> \${new Date(data.lastUpdated).toLocaleString()}</p>
                </div>
            \`;
        }
        
        function displayAllTanks(data) {
            const tanksHtml = data.tanks?.map(tank => {
                const inventory = data.inventory?.filter(item => item.tankNr === tank.tankNr) || [];
                const totalQuantity = inventory.reduce((sum, item) => sum + (item.menge || 0), 0);
                
                return \`
                    <div class="tank-card">
                        <h3>Tank \${tank.tankNr}: \${tank.bezeichnung}</h3>
                        <p><strong>Kapazität:</strong> \${tank.volumenLiter} Liter</p>
                        <p><strong>Aktueller Inhalt:</strong> \${totalQuantity} Liter</p>
                        <p><strong>Frei:</strong> \${tank.volumenLiter - totalQuantity} Liter</p>
                    </div>
                \`;
            }).join('') || '<p>Keine Tanks gefunden</p>';
            
            document.getElementById('content').innerHTML = \`
                <h1>Alle Tanks</h1>
                \${tanksHtml}
                <p><small>Letztes Update: \${new Date(data.lastUpdated).toLocaleString()}</small></p>
            \`;
        }
        
        loadTankData();
    </script>
</body>
</html>`;
  }

  /**
   * Generiert GitHub Pages URL für einen Tank
   */
  getTankUrl(tankId: string): string {
    return `${this.githubService.getGitHubPagesUrl('tank-viewer.html')}?tank=${tankId}`;
  }
}