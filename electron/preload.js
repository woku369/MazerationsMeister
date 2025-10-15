// preload.js - Sicherheits-Sandbox für Electron
const { contextBridge, ipcRenderer } = require('electron');

// Exponiere sichere APIs für den Renderer-Prozess
contextBridge.exposeInMainWorld('electronAPI', {
  // App-Info APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // Persistent Storage APIs
  storageGet: (key) => ipcRenderer.invoke('storage-get', key),
  storageSet: (key, value) => ipcRenderer.invoke('storage-set', key, value),
  storageRemove: (key) => ipcRenderer.invoke('storage-remove', key),
  storageGetAll: () => ipcRenderer.invoke('storage-get-all'),
  storageClear: () => ipcRenderer.invoke('storage-clear'),
  storageKeys: () => ipcRenderer.invoke('storage-keys'),
  storageInfo: () => ipcRenderer.invoke('storage-info'),
  
  // Erweiterte Storage APIs
  storageDiagnostics: () => ipcRenderer.invoke('storage-diagnostics'),
  storageCreateBackup: (name) => ipcRenderer.invoke('storage-create-backup', name),
  storageExport: () => ipcRenderer.invoke('storage-export'),
  storageImport: (jsonData) => ipcRenderer.invoke('storage-import', jsonData),
});

// Entferne gefährliche APIs
delete window.require;
delete window.exports;
delete window.module;
