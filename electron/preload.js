// preload.js - Sicherheits-Sandbox für Electron
const { contextBridge, ipcRenderer } = require('electron');

// Exponiere sichere APIs für den Renderer-Prozess
contextBridge.exposeInMainWorld('electronAPI', {
  // Hier können sichere APIs hinzugefügt werden
  // Zum Beispiel: Dateioperationen, Systeminformationen, etc.

  // Beispiel für eine einfache API
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});

// Entferne gefährliche APIs
delete window.require;
delete window.exports;
delete window.module;
