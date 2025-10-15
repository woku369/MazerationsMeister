// OneDrive Auto-Upload für Tank-Daten
// Automatischer Upload von tank-data.json nach OneDrive

interface OneDriveConfig {
  shareUrl: string;
  accessToken?: string;
  uploadEndpoint?: string;
}

class OneDriveAutoUploader {
  private config: OneDriveConfig | null = null;
  
  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const configStr = localStorage.getItem('oneDriveConfig');
      if (configStr) {
        this.config = JSON.parse(configStr);
        console.log('✅ OneDrive Konfiguration geladen');
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der OneDrive-Konfiguration:', error);
    }
  }

  // Extrahiert OneDrive-Details aus Share-URL
  private parseShareUrl(shareUrl: string) {
    try {
      // Beispiel: https://1drv.ms/f/c/f751511f0e75c571/EhJYFMr1Af9GvQhrNPYa4HkBvmxgQLwwGxMsavnXl3lvrA?e=YO91pj
      const url = new URL(shareUrl);
      const pathParts = url.pathname.split('/');
      
      if (pathParts.length >= 4) {
        const resourceId = pathParts[3]; // f751511f0e75c571
        const itemId = pathParts[4]; // EhJYFMr1Af9GvQhrNPYa4HkBvmxgQLwwGxMsavnXl3lvrA
        
        return {
          resourceId,
          itemId,
          baseUrl: `https://graph.microsoft.com/v1.0/shares/u!${resourceId}/items/${itemId}`
        };
      }
    } catch (error) {
      console.error('❌ Fehler beim Parsen der OneDrive Share-URL:', error);
    }
    return null;
  }

  // Automatischer Upload von tank-data.json
  async autoUploadTankData(tankData: any): Promise<boolean> {
    if (!this.config?.shareUrl) {
      console.warn('⚠️ OneDrive nicht konfiguriert - Upload übersprungen');
      return false;
    }

    try {
      console.log('🔄 Starte automatischen OneDrive-Upload...');
      
      // Erstelle tank-data.json Inhalt
      const dataStr = JSON.stringify(tankData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Verwende moderne OneDrive API (ohne Auth für öffentliche Ordner)
      const success = await this.uploadToPublicFolder(dataBlob, 'tank-data.json');
      
      if (success) {
        console.log('✅ Tank-Daten erfolgreich zu OneDrive hochgeladen!');
        this.showSuccessNotification('Tank-Daten automatisch zu OneDrive hochgeladen!');
        return true;
      } else {
        // Fallback: Lokaler Download
        console.log('📥 Fallback: Lokaler Download der tank-data.json');
        this.downloadFile(dataBlob, 'tank-data.json');
        this.showInfoNotification('tank-data.json heruntergeladen. Bitte manuell zu OneDrive hochladen.');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Fehler beim automatischen Upload:', error);
      return false;
    }
  }

  // Upload zu öffentlichem OneDrive-Ordner
  private async uploadToPublicFolder(blob: Blob, filename: string): Promise<boolean> {
    try {
      // Methode 1: Direkte PUT-Anfrage an OneDrive (erfordert Auth)
      const shareDetails = this.parseShareUrl(this.config!.shareUrl);
      if (!shareDetails) return false;

      // Versuche direkten Upload (funktioniert nur bei entsprechenden Berechtigungen)
      const uploadUrl = `${shareDetails.baseUrl}/children/${filename}/content`;
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'application/json',
          // Auth-Header würde hier hin, aber für öffentliche Ordner nicht verfügbar
        }
      });

      if (response.ok) {
        console.log('✅ Direkter OneDrive-Upload erfolgreich');
        return true;
      }

      // Methode 2: OneDrive Web-Interface simulieren (experimentell)
      return await this.tryWebInterfaceUpload(blob, filename);
      
    } catch (error) {
      console.error('❌ OneDrive Upload fehlgeschlagen:', error);
      return false;
    }
  }

  // Experimenteller Web-Interface Upload
  private async tryWebInterfaceUpload(blob: Blob, filename: string): Promise<boolean> {
    try {
      // Öffne OneDrive-Upload in neuem Tab
      const uploadUrl = this.config!.shareUrl.replace('?e=', '/upload?e=');
      
      // Erstelle temporäre Form für Upload
      const formData = new FormData();
      formData.append('file', blob, filename);
      
      // Hinweis: Dies funktioniert nur begrenzt aufgrund von CORS-Beschränkungen
      console.log('🌐 Versuche Web-Interface Upload...');
      return false; // Placeholder - echter Upload würde Auth benötigen
      
    } catch (error) {
      console.error('❌ Web-Interface Upload fehlgeschlagen:', error);
      return false;
    }
  }

  // Fallback: Lokaler Download
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Benachrichtigungen
  private showSuccessNotification(message: string): void {
    this.showNotification(message, 'success');
  }

  private showInfoNotification(message: string): void {
    this.showNotification(message, 'info');
  }

  private showNotification(message: string, type: 'success' | 'info' | 'error'): void {
    // Erstelle Notification Element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'info' ? 'bg-blue-500 text-white' :
      'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove nach 5 Sekunden
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // Prüfe OneDrive-Verbindung
  async testConnection(): Promise<boolean> {
    if (!this.config?.shareUrl) return false;
    
    try {
      const response = await fetch(this.config.shareUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Exportiere für Verwendung in anderen Modulen
export default OneDriveAutoUploader;