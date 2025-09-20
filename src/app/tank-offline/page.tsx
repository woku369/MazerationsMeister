'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * 📱 TANK-OFFLINE-SEITE
 * Mobile-optimierte Tank-Viewer für QR-Code-Scanning
 * Funktioniert mit URL-Parametern und Fallback-Daten
 */
export default function TankOfflinePage() {
  const searchParams = useSearchParams();
  const [tankData, setTankData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTankData() {
      try {
        // Tank-ID aus URL extrahieren
        const tankId = searchParams.get('tank');
        const fallbackData = searchParams.get('fallback');
        const mode = searchParams.get('mode');

        console.log('🔍 Tank-Offline geladen:', { tankId, mode, hasFallback: !!fallbackData });

        if (!tankId) {
          throw new Error('Keine Tank-ID in URL gefunden');
        }

        let tank: any = null;

        // Strategie 1: Fallback-Daten aus URL
        if (fallbackData) {
          try {
            tank = JSON.parse(decodeURIComponent(fallbackData));
            console.log('✅ Fallback-Daten geladen:', tank);
          } catch (e) {
            console.warn('⚠️ Fallback-Daten konnten nicht geparst werden:', e);
          }
        }

        // Strategie 2: localStorage (wenn verfügbar)
        if (!tank && typeof window !== 'undefined') {
          try {
            const storedTanks = localStorage.getItem('tankDefinitions');
            if (storedTanks) {
              const tanks = JSON.parse(storedTanks);
              tank = tanks.find((t: any) => t.tankNr === tankId || t.id === tankId);
              console.log('🗄️ Tank aus localStorage gefunden:', tank);
            }
          } catch (e) {
            console.warn('⚠️ localStorage-Zugriff fehlgeschlagen:', e);
          }
        }

        // Strategie 3: Default-Tank erstellen
        if (!tank) {
          tank = {
            tankNr: tankId,
            bezeichnung: `Tank ${tankId}`,
            volumen: 5000,
            aktuellerFuellstand: 0,
            sorte: 'Unbekannt',
            batch: 'Offline-Modus',
            lastUpdate: new Date().toISOString()
          };
          console.log('🔧 Default-Tank erstellt:', tank);
        }

        setTankData(tank);
        
      } catch (err) {
        console.error('❌ Fehler beim Laden der Tank-Daten:', err);
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setIsLoading(false);
      }
    }

    loadTankData();
  }, [searchParams]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 text-center max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            🗄️ Lade Tank-Daten...
          </h2>
          <p className="text-gray-600">
            Offline-Modus wird initialisiert
          </p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error || !tankData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 text-center max-w-sm w-full">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Fehler beim Laden
          </h2>
          <p className="text-gray-600 mb-4">
            {error || 'Tank-Daten konnten nicht geladen werden'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Success - Tank-Daten anzeigen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-xl p-6 text-center">
          <div className="text-4xl mb-2">🗄️</div>
          <h1 className="text-2xl font-bold text-gray-800">
            Tank-Info (Offline)
          </h1>
          <div className="text-sm text-gray-500 mt-1">
            MazerationsMeister v1.0
          </div>
        </div>

        {/* Tank-Informationen */}
        <div className="bg-white shadow-xl p-6">
          <div className="space-y-4">
            {/* Tank-Nummer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tank-Nummer
              </label>
              <div className="text-2xl font-bold text-blue-600">
                {tankData.tankNr}
              </div>
            </div>

            {/* Bezeichnung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bezeichnung
              </label>
              <div className="text-lg text-gray-800">
                {tankData.bezeichnung}
              </div>
            </div>

            {/* Volumen & Füllstand */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volumen
                </label>
                <div className="text-lg font-semibold text-gray-800">
                  {tankData.volumen?.toLocaleString()} L
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Füllstand
                </label>
                <div className="text-lg font-semibold text-green-600">
                  {tankData.aktuellerFuellstand?.toLocaleString()} L
                </div>
              </div>
            </div>

            {/* Sorte */}
            {tankData.sorte && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sorte/Inhalt
                </label>
                <div className="text-lg text-gray-800">
                  {tankData.sorte}
                </div>
              </div>
            )}

            {/* Batch */}
            {tankData.batch && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch/Charge
                </label>
                <div className="text-lg text-gray-800">
                  {tankData.batch}
                </div>
              </div>
            )}

            {/* Status-Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <div className="font-semibold mb-1">📱 Offline-Modus aktiv</div>
                <div>Tank-Daten erfolgreich geladen</div>
                {tankData.lastUpdate && (
                  <div className="text-xs text-blue-600 mt-1">
                    Stand: {new Date(tankData.lastUpdate).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 rounded-b-lg shadow-xl p-4 text-center">
          <div className="text-sm text-gray-600">
            🔄 <strong>Offline-fähig:</strong> Daten aus QR-Code geladen
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Für Live-Updates zur Hauptanwendung zurückkehren
          </div>
        </div>

        {/* Debug-Info (nur in Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded">
            <div className="font-bold mb-1">🔧 Debug-Info</div>
            <div>URL: {window.location.href}</div>
            <div>Tank-ID: {searchParams.get('tank')}</div>
            <div>Mode: {searchParams.get('mode')}</div>
            <div>Fallback: {searchParams.get('fallback') ? 'Ja' : 'Nein'}</div>
          </div>
        )}
      </div>
    </div>
  );
}