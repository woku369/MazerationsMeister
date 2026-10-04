import { app, BrowserWindow, shell, ipcMain } from 'electron';
import * as path from 'path';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { parse } from 'url';

let mainWindow: BrowserWindow | null = null;
let server: any = null;
// Verhindert, dass der "vor dem Beenden synchronisieren"-Handler (siehe
// registerIpcHandlers()) sich selbst erneut blockiert, wenn er app.quit()
// ein zweites Mal aufruft, um das Beenden tatsächlich zuzulassen.
let allowQuit = false;

// Force production mode for packaged apps
const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;

function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

async function startSimpleServer(): Promise<string> {
  try {
    console.log('Starting simple static server...');
    
    const staticPath = path.join(process.resourcesPath, 'out');
    console.log('Serving from:', staticPath);
    
    server = createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url || '/', true);
        let pathname = parsedUrl.pathname || '/';
        
        // Default to index.html for root
        if (pathname === '/') {
          pathname = '/index.html';
        }
        
        // Remove leading slash for path.join
        pathname = pathname.slice(1);
        
        const filePath = path.join(staticPath, pathname);
        console.log('Requested:', req.url, '-> File:', filePath);
        
        // Security check - ensure file is within staticPath
        if (!filePath.startsWith(staticPath)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        
        // Check if this is a route request (no file extension)
        if (!pathname.includes('.') && pathname !== 'index.html') {
          // For routes like /inventory, try /inventory/index.html first
          const routeIndexPath = path.join(staticPath, pathname, 'index.html');
          if (existsSync(routeIndexPath)) {
            const content = readFileSync(routeIndexPath);
            res.writeHead(200, {
              'Content-Type': 'text/html',
              'Content-Length': content.length
            });
            res.end(content);
            return;
          }
          
          // Try direct HTML file
          const directHtml = path.join(staticPath, pathname + '.html');
          if (existsSync(directHtml)) {
            const content = readFileSync(directHtml);
            res.writeHead(200, {
              'Content-Type': 'text/html',
              'Content-Length': content.length
            });
            res.end(content);
            return;
          }
          
          // Fallback to main index.html for SPA
          const mainIndexPath = path.join(staticPath, 'index.html');
          if (existsSync(mainIndexPath)) {
            const content = readFileSync(mainIndexPath);
            res.writeHead(200, {
              'Content-Type': 'text/html',
              'Content-Length': content.length
            });
            res.end(content);
            return;
          }
        }
        
        // Handle static files (CSS, JS, images, etc.)
        if (existsSync(filePath)) {
          const content = readFileSync(filePath);
          const mimeType = getMimeType(filePath);
          
          res.writeHead(200, {
            'Content-Type': mimeType,
            'Content-Length': content.length
          });
          res.end(content);
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    // FESTER Port statt listen(0) (zufälliger, bei jedem Start anderer Port):
    // localStorage ist strikt pro Origin (Schema+Host+PORT) getrennt - bei
    // jedem Start ein anderer Port bedeutete bei jedem Start eine andere,
    // leere Origin. Die alten Daten lagen dadurch nicht etwa weg, sondern
    // unerreichbar unter der vorherigen, verwaisten Port-Origin - genau das
    // vom Nutzer gemeldete "nach erneutem Öffnen sind keine Daten mehr da"
    // (inkl. Speicherpfade und Importdatei, die ebenfalls nur in localStorage
    // lagen). Mit `app.requestSingleInstanceLock()` unten ist eine zweite,
    // gleichzeitig laufende Instanz ausgeschlossen, die sich sonst denselben
    // festen Port streitig machen könnte.
    const FIXED_PORT = 47893;
    return new Promise<string>((resolve, reject) => {
      server.listen(FIXED_PORT, 'localhost', (err?: Error) => {
        if (err) {
          console.error(`Server start error on fixed port ${FIXED_PORT}, falling back to random port:`, err);
          // Fallback nur fuer den unwahrscheinlichen Fall, dass der feste Port
          // durch einen fremden Prozess belegt ist (Single-Instance-Lock
          // schliesst eine zweite eigene Instanz bereits aus) - lieber mit
          // einem zufaelligen Port starten (und das klar loggen, damit es
          // auffindbar bleibt) als gar nicht.
          server.listen(0, 'localhost', (fallbackErr?: Error) => {
            if (fallbackErr) {
              reject(fallbackErr);
              return;
            }
            const address = server.address() as any;
            const port = address.port;
            console.warn(`Simple server started on FALLBACK random port ${port} - localStorage wird bei naechstem Start NICHT erhalten bleiben!`);
            resolve(`http://localhost:${port}`);
          });
        } else {
          console.log(`Simple server started on fixed port ${FIXED_PORT}`);
          resolve(`http://localhost:${FIXED_PORT}`);
        }
      });
    });
  } catch (error) {
    console.error('Failed to start simple server:', error);
    throw error;
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // War hier bis Aufgabe 40 nicht gesetzt - preload.js existierte zwar,
      // wurde aber nie geladen. Ohne aktives Preload UND ohne nodeIntegration
      // ist window.require im Renderer schlicht undefined; jede darauf
      // aufbauende Stelle im Code lief lautlos in den Browser-Fallback statt
      // wirklich in den konfigurierten Exportordner zu schreiben.
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    title: 'MazerationsMeister',
    show: false,
    autoHideMenuBar: true
  });

  if (isDev) {
    // Development mode
    mainWindow.loadURL('http://localhost:9003');
    mainWindow.webContents.openDevTools();
    mainWindow.show();
  } else {
    // Production mode - simple static server
    startSimpleServer()
      .then((url) => {
        console.log('Loading URL:', url);
        mainWindow?.loadURL(url);
        
        mainWindow?.once('ready-to-show', () => {
          mainWindow?.show();
          console.log('MazerationsMeister loaded successfully');
        });
      })
      .catch((error) => {
        console.error('Failed to start server:', error);
        
        const errorHtml = `
          <!DOCTYPE html>
          <html>
            <head><title>MazerationsMeister - Fehler</title></head>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
              <h1>⚠️ Fehler beim Starten</h1>
              <p>Die Anwendung konnte nicht gestartet werden.</p>
              <p>Fehler: ${error.message}</p>
              <button onclick="location.reload()">🔄 Erneut versuchen</button>
            </body>
          </html>
        `;
        
        mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
        mainWindow?.show();
      });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Stabiler Default-Ordner für Exporte/Backups, wenn in den Einstellungen
 * kein eigener Speicherpfad gesetzt ist. Bewusst NICHT process.cwd(): Die
 * portable .exe (electron-builder NSIS "portable"-Target) entpackt sich bei
 * jedem Start in einen neuen, temporären Ordner und startet von dort aus -
 * process.cwd() zeigte dadurch bisher bei jedem Start auf einen anderen,
 * nach dem Beenden wieder verschwindenden Ordner (Nutzer-Frage 04.10.2026:
 * "wohin geht die Backup-Datei eigentlich?" - dieselbe Ursachenfamilie wie
 * der zufällige Server-Port aus Aufgabe 58, nur für Datei-Exporte statt
 * localStorage). electron-builder setzt für die portable .exe zusätzlich
 * PORTABLE_EXECUTABLE_DIR auf den Ordner, in dem die .exe selbst liegt (z.B.
 * Desktop oder USB-Stick) - das ist der eigentlich gemeinte, stabile Ort.
 */
function getDefaultExportDir(): string {
  return process.env.PORTABLE_EXECUTABLE_DIR || app.getPath('documents');
}

/**
 * IPC-Gegenstücke zur in preload.js über contextBridge freigegebenen API
 * (Aufgabe 40). Ersetzt die zuvor im Renderer verwendeten, dort aber nie
 * tatsächlich funktionierenden window.require('fs'/'path'/'electron')-Aufrufe.
 */
function registerIpcHandlers() {
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-default-export-dir', () => getDefaultExportDir());

  ipcMain.handle(
    'fs-write-file',
    async (_event, dir: string, fileName: string, content: string, encoding: 'utf-8' | 'base64') => {
      try {
        const targetDir = dir && dir.trim() ? dir : getDefaultExportDir();
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path.join(targetDir, fileName);
        if (encoding === 'base64') {
          writeFileSync(filePath, Buffer.from(content, 'base64'));
        } else {
          writeFileSync(filePath, content, 'utf-8');
        }
        return { ok: true, path: filePath };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle('shell-open-path', async (_event, targetPath: string) => {
    const result = await shell.openPath(targetPath);
    return { ok: result === '', error: result || undefined };
  });

  // "Vor dem Beenden synchronisieren" (Nutzer-Anfrage 30.09.2026): app.quit()
  // wird einmal verzögert, bis der Renderer über 'renderer-quit-ready'
  // meldet, dass ein letzter GitHub-Sync-Versuch abgeschlossen ist - mit
  // Sicherheitsnetz, falls der Renderer nie antwortet (z.B. keine
  // Internetverbindung), damit die App dadurch nicht unschließbar wird.
  app.on('before-quit', (event) => {
    if (allowQuit || !mainWindow) return;
    event.preventDefault();

    const finishQuit = () => {
      clearTimeout(safetyTimeout);
      allowQuit = true;
      app.quit();
    };
    const safetyTimeout = setTimeout(finishQuit, 5000);
    ipcMain.once('renderer-quit-ready', finishQuit);
    mainWindow.webContents.send('app-before-quit');
  });
}

// Verhindert, dass eine zweite gleichzeitig gestartete Instanz sich mit der
// ersten den festen Server-Port (siehe startSimpleServer()) streitig macht,
// oder beide gleichzeitig in dieselbe localStorage-Origin schreiben. Statt
// eines zweiten Fensters wird die bereits laufende Instanz fokussiert.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (server) {
    console.log('Stopping server...');
    server.close();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.startsWith('http://localhost:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
});