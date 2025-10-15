'use client';

import { useEffect, useState } from 'react';
import { initializeApp, getAppDataStatus } from '@/lib/app-data-manager';

/**
 * 🚀 APP-DATEN-INITIALIZER
 * Lädt alle persistenten Echtdaten beim App-Start
 * Zeigt Loading-Status und Debug-Info
 */
export default function AppDataInitializer({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAppData() {
      try {
        console.log('🚀 App-Daten-Initializer: Starte Datenladung...');
        
        // Alle App-Daten laden
        const appData = await initializeApp();
        
        // Status für Debug-Info
        const status = getAppDataStatus();
        setDataStatus(status);
        
        console.log('✅ App-Daten vollständig geladen:', status);
        
        // Kurze Pause für UX
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
        
      } catch (err) {
        console.error('❌ Fehler beim Laden der App-Daten:', err);
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        setIsLoading(false);
      }
    }

    loadAppData();
  }, []);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            🗄️ Lade App-Daten...
          </h2>
          <p className="text-gray-500">
            Persistente Echtdaten werden initialisiert
          </p>
          {dataStatus && (
            <div className="mt-4 text-sm text-gray-400">
              <div>Tanks: {dataStatus.tankCount}</div>
              <div>Inventar: {dataStatus.inventoryCount}</div>
              <div>Protokolle: {dataStatus.protocolCount}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error Screen
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">
            Fehler beim Laden der App-Daten
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            App neu laden
          </button>
        </div>
      </div>
    );
  }

  // Success - Render App
  return (
    <>
      {children}
      
      {/* Debug-Info in Development */}
      {process.env.NODE_ENV === 'development' && dataStatus && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
          <div className="font-bold mb-1">📊 App-Daten Status</div>
          <div>Tanks: {dataStatus.tankCount}</div>
          <div>Inventar: {dataStatus.inventoryCount}</div>
          <div>Protokolle: {dataStatus.protocolCount}</div>
          <div>Storage: {dataStatus.storageUsage}</div>
          {dataStatus.lastBackup && (
            <div>Backup: {new Date(dataStatus.lastBackup).toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </>
  );
}