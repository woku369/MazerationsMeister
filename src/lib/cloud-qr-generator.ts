/**
 * Tank QR Code Generator für OneDrive Integration
 * Generiert QR-Codes die auf OneDrive gehostete Tank-Daten verweisen
 */

interface TankInfo {
  tankNr: string;
  bezeichnung: string;
  volumen: number;
}

interface OneDriveConfig {
  shareUrl: string;
  appPath: string;
}

/**
 * OneDrive-Konfiguration aus localStorage laden
 */
function getOneDriveConfig(): OneDriveConfig | null {
  try {
    const config = localStorage.getItem('oneDriveConfig');
    console.log('Raw OneDrive config from localStorage:', config);
    
    if (config) {
      const parsed = JSON.parse(config);
      console.log('Parsed OneDrive config:', parsed);
      
      // Validiere die Konfiguration
      if (parsed && typeof parsed === 'object' && parsed.shareUrl && parsed.shareUrl.trim()) {
        console.log('✅ Gültige OneDrive-Konfiguration gefunden:', parsed);
        return parsed;
      } else {
        console.warn('⚠️ OneDrive-Konfiguration unvollständig:', parsed);
        return null;
      }
    } else {
      console.log('ℹ️ Keine OneDrive-Konfiguration in localStorage gefunden');
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der OneDrive-Konfiguration:', error);
  }
  return null;
}

/**
 * Generiert OneDrive Share-URL für Tank-Viewer
 */
export function generateTankViewerUrl(tankId: string): string {
  const config = getOneDriveConfig();
  
  if (!config || !config.shareUrl) {
    console.warn('OneDrive nicht konfiguriert - keine shareUrl gefunden');
    throw new Error('OneDrive nicht konfiguriert');
  }
  
  // Debug-Log für OneDrive Konfiguration
  console.log('OneDrive Config gefunden:', config);
  
  // Konvertiere OneDrive Share-URL in direkten Download-Link
  let shareUrl = config.shareUrl.trim();
  
  // Prüfe ob es eine OneDrive Share-URL ist
  if (shareUrl.includes('1drv.ms') || shareUrl.includes('onedrive.live.com')) {
    // Verwende die Share-URL direkt als Basis
    const viewerUrl = `${shareUrl}/tank-viewer.html?tank=${tankId}`;
    console.log(`Tank-Viewer URL für Tank ${tankId}:`, viewerUrl);
    return viewerUrl;
  } else {
    // Fallback für direkte URLs
    const viewerUrl = `${shareUrl}/tank-viewer.html?tank=${tankId}`;
    console.log(`Direct Tank-Viewer URL für Tank ${tankId}:`, viewerUrl);
    return viewerUrl;
  }
}

/**
 * Generiert direkte OneDrive JSON URL für Tank
 */
export function generateDirectDataUrl(tankId: string): string {
  const config = getOneDriveConfig();
  
  if (!config || !config.shareUrl) {
    throw new Error('OneDrive nicht konfiguriert');
  }
  
  // Direkte URL zur JSON-Datei in OneDrive
  const directUrl = `${config.shareUrl}/tanks/${tankId}.json`;
  
  console.log(`Direkte Daten-URL für Tank ${tankId}:`, directUrl);
  return directUrl;
}

/**
 * Erstellt QR-Code URL mit Tank-ID
 */
export async function generateCloudQRUrl(tankId: string, tankInfo: TankInfo): Promise<string> {
  try {
    // Versuche Tank-Viewer URL zu generieren
    return generateTankViewerUrl(tankId);
  } catch (error) {
    console.warn('OneDrive nicht konfiguriert, erstelle Fallback-URL');
    throw error;
  }
}

/**
 * Generiert lokale Fallback-URL (sollte nur verwendet werden wenn OneDrive nicht konfiguriert ist)
 */
export function generateLocalFallbackUrl(tankId: string, tankInfo: TankInfo): string {
  // Zuerst prüfen ob OneDrive konfiguriert ist
  const config = getOneDriveConfig();
  
  if (config && config.shareUrl) {
    console.log('OneDrive verfügbar, verwende OneDrive-URL statt lokalem Fallback');
    try {
      return generateTankViewerUrl(tankId);
    } catch (error) {
      console.warn('OneDrive-URL-Generierung fehlgeschlagen, verwende echten lokalen Fallback');
    }
  }
  
  console.warn('⚠️ Verwende lokalen Fallback (OneDrive nicht konfiguriert)');
  
  const params = new URLSearchParams({
    name: tankInfo.bezeichnung,
    capacity: tankInfo.volumen.toString(),
    nr: tankInfo.tankNr
  });
  
  return `${window.location.origin}/tank/${tankId}?${params.toString()}`;
}

/**
 * Prüft ob OneDrive konfiguriert ist
 */
export function isOneDriveConfigured(): boolean {
  const config = getOneDriveConfig();
  const isConfigured = !!(config && config.shareUrl && config.shareUrl.trim());
  
  console.log('=== OneDrive Konfigurations-Check ===');
  console.log('Config gefunden:', !!config);
  console.log('ShareUrl vorhanden:', !!(config && config.shareUrl));
  console.log('ShareUrl nicht leer:', !!(config && config.shareUrl && config.shareUrl.trim()));
  console.log('Endergebnis isOneDriveConfigured:', isConfigured);
  
  return isConfigured;
}

/**
 * Speichert OneDrive-Konfiguration
 */
export function saveOneDriveConfig(shareUrl: string, appPath: string = ''): void {
  const config: OneDriveConfig = {
    shareUrl: shareUrl.trim(),
    appPath: appPath.trim()
  };
  
  localStorage.setItem('oneDriveConfig', JSON.stringify(config));
  console.log('OneDrive-Konfiguration gespeichert:', config);
}

/**
 * Generiert Anweisungen für OneDrive Setup
 */
export function getOneDriveSetupInstructions(): string[] {
  return [
    "1. Erstelle einen Ordner 'MazerationsMeister' in deinem OneDrive",
    "2. Lade die exportierte tank-data.json in diesen Ordner hoch", 
    "3. Rechtsklick auf tank-data.json → 'Link teilen' → 'Jeder mit dem Link'",
    "4. Kopiere den Share-Link und trage ihn in den Einstellungen ein",
    "5. QR-Codes werden automatisch auf OneDrive-Daten verweisen"
  ];
}