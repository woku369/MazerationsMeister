// preload.js - Sicherheits-Brücke zwischen dem isolierten Renderer
// (contextIsolation: true, nodeIntegration: false - kein window.require) und
// dem Hauptprozess. Läuft selbst mit Node-Zugriff, gibt aber nur eine
// bewusst kleine, geprüfte API über contextBridge frei.
//
// War bis Aufgabe 40 nirgends als `preload` in den BrowserWindow-
// webPreferences eingetragen - lief also nie, obwohl an vielen Stellen im
// Code (inventory-management.tsx, backup-service.ts) `window.require(...)`
// aufgerufen wurde. Ohne aktives Preload UND ohne nodeIntegration ist
// window.require im echten Programm schlicht undefined - jede dieser
// Stellen nahm daher lautlos den Browser-Download-Fallback statt wirklich
// in den konfigurierten Exportordner zu schreiben (Nutzer-Frage 30.09.2026
// zum Auto-Sync deckte das auf).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  // Nur für einen sinnvollen Vorschlagswert im Einstellungen-Feld
  // "Lokaler Daten-Speicherpfad" - kein sicherheitsrelevanter Zugriff.
  appDataDir: process.env.APPDATA || '',

  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getCwd: () => ipcRenderer.invoke('get-cwd'),

  /**
   * Schreibt eine Datei in ein Verzeichnis (wird bei Bedarf angelegt).
   * encoding 'utf-8' für Text (JSON etc.), 'base64' für Binärdaten (XLSX).
   * Gibt {ok:true, path} oder {ok:false, error} zurück - wirft nie.
   */
  writeFile: (dir, fileName, content, encoding) =>
    ipcRenderer.invoke('fs-write-file', dir, fileName, content, encoding || 'utf-8'),

  /** Öffnet eine Datei oder einen Ordner mit der Standard-Anwendung des Betriebssystems. */
  openPath: (targetPath) => ipcRenderer.invoke('shell-open-path', targetPath),

  /**
   * Koordination für "vor dem Beenden noch synchronisieren" (Aufgabe 40):
   * Der Hauptprozess verzögert app.quit(), bis der Renderer über
   * notifyQuitReady() signalisiert, dass er fertig ist (oder ein Timeout
   * im Hauptprozess abläuft, falls z.B. keine Internetverbindung besteht).
   */
  onBeforeQuit: (callback) => {
    ipcRenderer.on('app-before-quit', () => callback());
  },
  notifyQuitReady: () => ipcRenderer.send('renderer-quit-ready'),
});
