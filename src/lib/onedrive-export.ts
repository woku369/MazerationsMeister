/**
 * OneDrive Export System
 * Exportiert Tank- und Inventardaten als JSON für OneDrive Synchronisation
 */

interface TankData {
  id: string;
  tankNr: string;
  bezeichnung: string;
  volumenLiter: number;
  standortDetails?: string;
  aktuellerInhalt?: {
    artikel?: string;
    menge?: number;
    einheit?: string;
    chargenNr?: string;
    einlagerungsDatum?: string;
  };
}

interface ExportData {
  exportTimestamp: string;
  version: string;
  tanks: TankData[];
  inventory: any[];
  lastUpdate: string;
}

/**
 * Sammelt alle relevanten Tank- und Inventardaten
 */
export async function collectTankData(): Promise<ExportData> {
  // Tank-Daten aus localStorage laden
  const tanksData = localStorage.getItem('tanks');
  const tanks: TankData[] = tanksData ? JSON.parse(tanksData) : [];
  
  // Inventory-Daten laden
  const inventoryData = localStorage.getItem('inventory');
  const inventory = inventoryData ? JSON.parse(inventoryData) : [];
  
  // Aktuelle Inhalte den Tanks zuordnen
  const enrichedTanks = tanks.map(tank => {
    // Finde aktuellen Inhalt aus Inventory
    const currentContent = inventory.find((item: any) => 
      item.standort === tank.bezeichnung || 
      item.standort === `Tank ${tank.tankNr}` ||
      item.standort === tank.id
    );
    
    return {
      ...tank,
      aktuellerInhalt: currentContent ? {
        artikel: currentContent.artikel,
        menge: currentContent.menge,
        einheit: currentContent.einheit,
        chargenNr: currentContent.chargenNr,
        einlagerungsDatum: currentContent.datum
      } : undefined
    };
  });
  
  return {
    exportTimestamp: new Date().toISOString(),
    version: "1.0.0",
    tanks: enrichedTanks,
    inventory: inventory,
    lastUpdate: new Date().toLocaleString('de-DE')
  };
}

/**
 * Exportiert Daten als JSON-String
 */
export async function exportToJSON(): Promise<string> {
  const data = await collectTankData();
  return JSON.stringify(data, null, 2);
}

/**
 * Speichert Export-Datei lokal (für manuellen OneDrive Upload)
 */
export async function saveExportFile(): Promise<void> {
  try {
    const jsonData = await exportToJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `tank-inventory-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log('Export-Datei heruntergeladen für OneDrive Upload');
  } catch (error) {
    console.error('Fehler beim Speichern der Export-Datei:', error);
    throw error;
  }
}

/**
 * Erstellt individuelles Tank-JSON für QR-Code Zugriff
 */
export async function exportTankJSON(tankId: string): Promise<string> {
  const allData = await collectTankData();
  const tank = allData.tanks.find(t => t.id === tankId);
  
  if (!tank) {
    throw new Error(`Tank mit ID ${tankId} nicht gefunden`);
  }
  
  const tankExport = {
    tank: tank,
    exportTimestamp: allData.exportTimestamp,
    lastUpdate: allData.lastUpdate
  };
  
  return JSON.stringify(tankExport, null, 2);
}

/**
 * Automatischer Export nach Lagerbewegungen
 */
export function scheduleAutoExport(): void {
  // Überwache localStorage Änderungen
  const originalSetItem = localStorage.setItem;
  
  localStorage.setItem = function(key: string, value: string) {
    originalSetItem.call(this, key, value);
    
    // Triggere Export bei relevanten Änderungen
    if (key === 'inventory' || key === 'tanks') {
      console.log('Lagerbewegung erkannt, automatischer Export vorbereitet');
      
      // Kurze Verzögerung für UI Updates
      setTimeout(async () => {
        try {
          const jsonData = await exportToJSON();
          
          // Speichere in temporärem Storage für späteren Upload
          localStorage.setItem('pendingExport', jsonData);
          localStorage.setItem('pendingExportTimestamp', new Date().toISOString());
          
          console.log('Automatischer Export vorbereitet - bereit für OneDrive Upload');
        } catch (error) {
          console.error('Automatischer Export fehlgeschlagen:', error);
        }
      }, 1000);
    }
  };
}

/**
 * Prüft ob ein Export pending ist
 */
export function hasPendingExport(): boolean {
  return localStorage.getItem('pendingExport') !== null;
}

/**
 * Holt pending Export
 */
export function getPendingExport(): string | null {
  return localStorage.getItem('pendingExport');
}

/**
 * Markiert Export als verarbeitet
 */
export function clearPendingExport(): void {
  localStorage.removeItem('pendingExport');
  localStorage.removeItem('pendingExportTimestamp');
}