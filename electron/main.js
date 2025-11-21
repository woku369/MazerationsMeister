"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const http_1 = require("http");
const fs_1 = require("fs");
const url_1 = require("url");
const persistent_storage_1 = require("./persistent-storage");
let mainWindow = null;
let server = null;
// Force production mode for packaged apps
const isDev = process.env.NODE_ENV === 'development' && !electron_1.app.isPackaged;
function getMimeType(filepath) {
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes = {
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
async function startSimpleServer() {
    try {
        console.log('Starting simple static server...');
        const staticPath = path.join(electron_1.app.getAppPath(), 'out');
        console.log('Serving from:', staticPath);
        server = (0, http_1.createServer)((req, res) => {
            try {
                const parsedUrl = (0, url_1.parse)(req.url || '/', true);
                let pathname = parsedUrl.pathname || '/';
                // Handle OAuth callback
                if (pathname === '/oauth/callback') {
                    const callbackHtml = `
            <!DOCTYPE html>
            <html>
            <head><title>Authentifizierung erfolgreich</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>✅ Authentifizierung erfolgreich!</h1>
              <p>Dieses Fenster kann geschlossen werden.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
            </html>
          `;
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(callbackHtml);
                    return;
                }
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
                    if ((0, fs_1.existsSync)(routeIndexPath)) {
                        const content = (0, fs_1.readFileSync)(routeIndexPath);
                        res.writeHead(200, {
                            'Content-Type': 'text/html',
                            'Content-Length': content.length
                        });
                        res.end(content);
                        return;
                    }
                    // Try direct HTML file
                    const directHtml = path.join(staticPath, pathname + '.html');
                    if ((0, fs_1.existsSync)(directHtml)) {
                        const content = (0, fs_1.readFileSync)(directHtml);
                        res.writeHead(200, {
                            'Content-Type': 'text/html',
                            'Content-Length': content.length
                        });
                        res.end(content);
                        return;
                    }
                    // Fallback to main index.html for SPA
                    const mainIndexPath = path.join(staticPath, 'index.html');
                    if ((0, fs_1.existsSync)(mainIndexPath)) {
                        const content = (0, fs_1.readFileSync)(mainIndexPath);
                        res.writeHead(200, {
                            'Content-Type': 'text/html',
                            'Content-Length': content.length
                        });
                        res.end(content);
                        return;
                    }
                }
                // Handle static files (CSS, JS, images, etc.)
                if ((0, fs_1.existsSync)(filePath)) {
                    const content = (0, fs_1.readFileSync)(filePath);
                    const mimeType = getMimeType(filePath);
                    res.writeHead(200, {
                        'Content-Type': mimeType,
                        'Content-Length': content.length
                    });
                    res.end(content);
                }
                else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            }
            catch (error) {
                console.error('Server error:', error);
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        });
        return new Promise((resolve, reject) => {
            server.listen(0, 'localhost', (err) => {
                if (err) {
                    console.error('Server start error:', err);
                    reject(err);
                }
                else {
                    const address = server.address();
                    const port = address.port;
                    console.log(`Simple server started on port ${port}`);
                    resolve(`http://localhost:${port}`);
                }
            });
        });
    }
    catch (error) {
        console.error('Failed to start simple server:', error);
        throw error;
    }
}
function createWindow() {
    // Create the browser window
    mainWindow = new electron_1.BrowserWindow({
        width: 1600,
        height: 1000,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            allowRunningInsecureContent: false,
            preload: path.join(__dirname, 'preload.js')
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
    }
    else {
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
electron_1.app.whenReady().then(() => {
    // Initialize Persistent Storage
    const storage = (0, persistent_storage_1.initializeStorage)({
        fileName: 'mazerations-storage.json',
        backupCount: 5,
        autoBackup: true,
    });
    console.log('[Main] PersistentStorage initialisiert');
    // Zusätzliche IPC Handlers für App-spezifische Funktionen
    electron_1.ipcMain.handle('get-app-version', () => {
        return electron_1.app.getVersion();
    });
    electron_1.ipcMain.handle('get-app-path', () => {
        return electron_1.app.getAppPath();
    });
    electron_1.ipcMain.handle('get-user-data-path', () => {
        return electron_1.app.getPath('userData');
    });
    // Google OAuth Handler
    electron_1.ipcMain.handle('google-oauth-login', async (event, options) => {
        return new Promise((resolve) => {
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${options.clientId}&` +
                `redirect_uri=http://localhost/oauth/callback&` +
                `response_type=token&` +
                `scope=${encodeURIComponent(options.scope)}&` +
                `prompt=select_account`;
            // Erstelle OAuth Fenster
            const authWindow = new electron_1.BrowserWindow({
                width: 600,
                height: 700,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                },
                parent: mainWindow,
                modal: true,
                show: false,
            });
            authWindow.loadURL(authUrl);
            authWindow.show();
            // Überwache URL-Änderungen
            authWindow.webContents.on('will-redirect', (event, url) => {
                handleCallback(url);
            });
            authWindow.webContents.on('did-navigate', (event, url) => {
                handleCallback(url);
            });
            function handleCallback(url) {
                if (url.includes('/oauth/callback')) {
                    const urlObj = new URL(url);
                    const hash = urlObj.hash.substring(1);
                    const params = new URLSearchParams(hash);
                    const accessToken = params.get('access_token');
                    if (accessToken) {
                        resolve({ success: true, accessToken });
                        authWindow.close();
                    }
                }
            }
            authWindow.on('closed', () => {
                resolve({ success: false, error: 'Fenster geschlossen' });
            });
        });
    });
    // Git-Backup Handlers (FIX 5.11d)
    electron_1.ipcMain.handle('save-git-backup', async (event, filename, content) => {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            // FIX: Verwende userData statt appPath (ASAR ist read-only in gepackter EXE)
            const backupDir = path.join(electron_1.app.getPath('userData'), 'backups');
            // Erstelle backups/ Verzeichnis falls nicht vorhanden
            try {
                await fs.mkdir(backupDir, { recursive: true });
            }
            catch (err) {
                // Verzeichnis existiert bereits
            }
            const filePath = path.join(backupDir, filename);
            await fs.writeFile(filePath, content, 'utf-8');
            console.log(`✅ Git-Backup gespeichert: ${filePath}`);
            return { success: true, path: filePath };
        }
        catch (error) {
            console.error('❌ Fehler beim Speichern des Git-Backups:', error);
            return { success: false, error: String(error) };
        }
    });
    electron_1.ipcMain.handle('cleanup-git-backups', async (event, maxCount) => {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            // FIX: Verwende userData statt appPath (ASAR ist read-only)
            const backupDir = path.join(electron_1.app.getPath('userData'), 'backups');
            try {
                const files = await fs.readdir(backupDir);
                const backupFiles = files
                    .filter(f => f.startsWith('tankDefinitions_backup_') && f.endsWith('.json'))
                    .sort()
                    .reverse();
                if (backupFiles.length > maxCount) {
                    const filesToDelete = backupFiles.slice(maxCount);
                    for (const file of filesToDelete) {
                        await fs.unlink(path.join(backupDir, file));
                        console.log(`🗑️ Altes Git-Backup gelöscht: ${file}`);
                    }
                }
                return { success: true, deleted: backupFiles.length - maxCount };
            }
            catch (err) {
                // backups/ Verzeichnis existiert nicht
                return { success: true, deleted: 0 };
            }
        }
        catch (error) {
            console.error('❌ Fehler beim Aufräumen der Git-Backups:', error);
            return { success: false, error: String(error) };
        }
    });
    electron_1.ipcMain.handle('list-git-backups', async () => {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            // FIX: Verwende userData statt appPath (ASAR ist read-only)
            const backupDir = path.join(electron_1.app.getPath('userData'), 'backups');
            try {
                const files = await fs.readdir(backupDir);
                const backups = [];
                for (const file of files) {
                    if (file.startsWith('tankDefinitions_backup_') && file.endsWith('.json')) {
                        const filePath = path.join(backupDir, file);
                        const content = await fs.readFile(filePath, 'utf-8');
                        const data = JSON.parse(content);
                        backups.push({
                            filename: file,
                            timestamp: data.timestamp || '',
                            containerCount: data.containerCount || 0,
                        });
                    }
                }
                return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            }
            catch (err) {
                return [];
            }
        }
        catch (error) {
            console.error('❌ Fehler beim Auflisten der Git-Backups:', error);
            return [];
        }
    });
    electron_1.ipcMain.handle('load-git-backup', async (event, filename) => {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            // FIX: Verwende userData statt appPath (ASAR ist read-only)
            const backupDir = path.join(electron_1.app.getPath('userData'), 'backups');
            const filePath = path.join(backupDir, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            console.log(`✅ Git-Backup geladen: ${filename}`);
            return data;
        }
        catch (error) {
            console.error('❌ Fehler beim Laden des Git-Backups:', error);
            throw error;
        }
    });
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (server) {
        console.log('Stopping server...');
        server.close();
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        // Erlaube Google OAuth Popups
        if (url.startsWith('https://accounts.google.com')) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    width: 600,
                    height: 700,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                }
            };
        }
        if (url.startsWith('http') && !url.startsWith('http://localhost:')) {
            require('electron').shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
});
