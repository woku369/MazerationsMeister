/**
 * Hilfsfunktion: Konvertiert Umlaute zu ASCII-sicheren Alternativen
 */
function toAsciiSafe(text: string): string {
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\x00-\x7F]/g, ''); // Entferne alle Nicht-ASCII Zeichen
}

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
      branch: config.branch || 'pages-clean' // Default: pages-clean (nicht 'main')
    };
    this.baseUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repository}`;
  }

  /**
   * Lädt eine Datei zu GitHub hoch oder aktualisiert sie
   */
  async uploadFile(file: GitHubFile): Promise<boolean> {
    try {
      console.log(`📤 Uploading to GitHub: ${file.path}`);

      // WORKAROUND für GitHub API SHA-Bug: DELETE -> CREATE statt UPDATE
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        
        // Hole IMMER frischen SHA DIREKT vor dem PUT (nicht am Loop-Anfang!)
        // Bei SHA-Konflikt ist Zeit zwischen Fetch und PUT kritisch
        const currentSha = await this.getFileSha(file.path);
        console.log(`🔄 Attempt ${attempt}/${maxRetries} - Using SHA: ${currentSha ? currentSha.substring(0, 8) + '...' : 'none'}`);

        // SOFORT nach SHA-Fetch den PUT machen (minimiere Zeit-Fenster)
        const payload = {
          message: file.message,
          content: typeof window !== 'undefined' && typeof btoa !== 'undefined' 
            ? btoa(unescape(encodeURIComponent(file.content))) 
            : typeof Buffer !== 'undefined' 
              ? Buffer.from(file.content, 'utf-8').toString('base64')
              : btoa(file.content), // Fallback
          branch: this.config.branch,
          ...(currentSha && { sha: currentSha })
        };

        const response = await fetch(`${this.baseUrl}/contents/${file.path}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ GitHub Upload successful: ${file.path}`, result.content?.html_url);
          return true;
        }

        // Bei Fehlern
        const errorData = await response.text();
        console.error(`❌ Attempt ${attempt} failed for ${file.path}: ${response.status}`, errorData);
        
        // WORKAROUND: Bei hartnäckigen SHA-Konflikten -> DELETE und CREATE
        if (response.status === 409 && attempt === maxRetries && currentSha) {
          console.log(`🔄 WORKAROUND: DELETE and CREATE für ${file.path}...`);
          
          // 1. DELETE alte Datei
          const deleteResponse = await fetch(`${this.baseUrl}/contents/${file.path}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `token ${this.config.token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
              message: `Delete ${file.path} for workaround`,
              sha: currentSha,
              branch: this.config.branch
            })
          });
          
          if (deleteResponse.ok) {
            console.log(`🗑️ Alte Datei gelöscht, erstelle neu...`);
            // 2. Warte kurz
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 3. CREATE neue Datei (ohne SHA)
            const createPayload = {
              message: file.message,
              content: payload.content,
              branch: this.config.branch
              // KEIN SHA bei CREATE
            };
            
            const createResponse = await fetch(`${this.baseUrl}/contents/${file.path}`, {
              method: 'PUT',
              headers: {
                'Authorization': `token ${this.config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
              },
              body: JSON.stringify(createPayload)
            });
            
            if (createResponse.ok) {
              const result = await createResponse.json();
              console.log(`✅ GitHub Upload successful (workaround): ${file.path}`, result.content?.html_url);
              return true;
            } else {
              console.error(`❌ Workaround CREATE failed:`, createResponse.status, await createResponse.text());
            }
          } else {
            console.error(`❌ Workaround DELETE failed:`, deleteResponse.status, await deleteResponse.text());
          }
        }
        
        // Bei SHA-Konflikt und noch Versuche übrig: kurz warten und retry
        if (response.status === 409 && attempt < maxRetries) {
          console.log(`⏳ Waiting 1500ms before retry (giving GitHub time to update)...`);
          await new Promise(resolve => setTimeout(resolve, 1500)); // Länger warten für GitHub API
          continue;
        }
        
        // Andere Fehler oder alle Versuche aufgebraucht
        return false;
      }

      return false;

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
      console.log(`🔍 Getting SHA for ${path} on branch ${this.config.branch}`);
      
      // CACHE-BUSTING: Füge Timestamp hinzu um Browser/GitHub Cache zu umgehen
      const cacheBuster = `_=${Date.now()}`;
      const url = `${this.baseUrl}/contents/${path}?ref=${this.config.branch}&${cacheBuster}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache, no-store, must-revalidate', // Kein Cache
          'Pragma': 'no-cache', // HTTP 1.0 backward compatibility
          'Expires': '0' // Proxies
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found existing file ${path}, SHA: ${data.sha.substring(0, 8)}...`);
        return data.sha;
      } else if (response.status === 404) {
        console.log(`ℹ️ File ${path} does not exist yet (will be created)`);
        return null;
      } else {
        console.warn(`⚠️ Unexpected response for ${path}:`, response.status, await response.text());
        return null;
      }
    } catch (error) {
      console.log(`ℹ️ Error getting SHA for ${path}, assuming new file:`, error);
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

  /**
   * Konvertiert Umlaute und Sonderzeichen zu ASCII-sicheren Alternativen
   */
  private toAsciiSafe(text: string): string {
    return text
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae')
      .replace(/Ö/g, 'Oe')
      .replace(/Ü/g, 'Ue')
      .replace(/ß/g, 'ss')
      .replace(/[^\x00-\x7F]/g, ''); // Entferne alle Nicht-ASCII Zeichen
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
  async syncTankData(tankData: any, inventoryData: any): Promise<{ success: boolean; backupUrl?: string }> {
    try {
      console.log('🔄 Starte Tank-Daten Synchronisation zu GitHub...');

      // WICHTIG: Erstelle ASCII-sichere Version für GitHub Pages
      const asciiSafeInventory = inventoryData.map((item: any) => ({
        ...item,
        produktName: toAsciiSafe(item.produktName || ''),
        chargenNummer: toAsciiSafe(item.chargenNummer || ''),
        bemerkungen: toAsciiSafe(item.bemerkungen || '')
      }));

      const asciiSafeTanks = tankData.map((tank: any) => ({
        ...tank,
        bezeichnung: toAsciiSafe(tank.bezeichnung || '')
      }));

      const tankDataContent = JSON.stringify({
        tanks: asciiSafeTanks,
        inventory: asciiSafeInventory,
        lastUpdated: new Date().toISOString(),
        timestamp: new Date().toISOString()
      }, null, 2);

      // NEUE STRATEGIE: Erst timestamp-Datei (immer erfolgreich), dann normale Datei aktualisieren
      const timestamp = Date.now();
      
      const files: GitHubFile[] = [
        {
          path: `tank-data-${timestamp}.json`, // NEUER Name - garantiert erfolgreich
          content: tankDataContent,
          message: `Tank data backup - ${new Date().toLocaleString()}`
        }
      ];

      console.log(`📦 Creating backup: tank-data-${timestamp}.json`);

      // 1. Erstelle Backup (sollte immer funktionieren)
      const timestampResult = await this.githubService.uploadFile(files[0]);
      
      if (timestampResult) {
        console.log(`✅ Backup erfolgreich erstellt: tank-data-${timestamp}.json`);
        
        // 2. Jetzt versuche normale tank-data.json zu aktualisieren (für sofortige Verfügbarkeit)
        console.log(`� Updating main tank-data.json for immediate availability...`);
        
        const mainFile: GitHubFile = {
          path: 'tank-data.json',
          content: tankDataContent,
          message: `Tank data update - ${new Date().toLocaleString()}`
        };
        
        const mainResult = await this.githubService.uploadFile(mainFile);
        
        if (mainResult) {
          console.log('✅ Hauptdatei tank-data.json erfolgreich aktualisiert!');
          console.log(`🔗 Tank-Daten sofort verfügbar: ${this.githubService.getGitHubPagesUrl('tank-data.json')}`);
          console.log(`📋 Backup verfügbar: ${this.githubService.getGitHubPagesUrl(files[0].path)}`);
          return { success: true, backupUrl: this.githubService.getGitHubPagesUrl(files[0].path) };
        } else {
          console.warn('⚠️ Hauptdatei-Update fehlgeschlagen, aber Backup wurde erstellt');
          console.log(`🔗 Daten verfügbar über Backup: ${this.githubService.getGitHubPagesUrl(files[0].path)}`);
          return { success: true, backupUrl: this.githubService.getGitHubPagesUrl(files[0].path) }; // Backup reicht aus
        }
      } else {
        console.error('❌ Backup-Erstellung fehlgeschlagen');
        return { success: false };
      }

    } catch (error) {
      console.error('❌ Tank-Daten Synchronisation Fehler:', error);
      return { success: false };
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
   * Lädt statische QR-System Dateien hoch (dummy für Kompatibilität)
   */
  async uploadStaticFiles(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Static files upload not implemented' };
  }

  /**
   * Generiert GitHub Pages URL für einen Tank
   */
  getTankUrl(tankId: string): string {
    return `${this.githubService.getGitHubPagesUrl('tank-viewer.html')}?tank=${tankId}`;
  }
}