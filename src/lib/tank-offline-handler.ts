// Tank-Offline-Handler
// Überwacht Verbindungsstatus und leitet bei Bedarf zur Offline-Seite um

class TankOfflineHandler {
  constructor() {
    this.init();
  }

  init() {
    // Überwache Online/Offline Status
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Prüfe beim Laden der Seite
    this.checkConnectionAndRedirect();
  }

  async checkConnectionAndRedirect() {
    // Wenn wir bereits auf der Offline-Seite sind, nichts tun
    if (window.location.pathname.includes('tank-offline.html')) {
      return;
    }

    // Prüfe, ob wir auf einer Tank-Detail-Seite sind
    const tankMatch = window.location.pathname.match(/\/inventory\/tank\/(.+)/);
    if (!tankMatch) {
      return;
    }

    try {
      // Versuche eine schnelle Anfrage an die API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 Sekunden Timeout

      const response = await fetch('/api/health', { 
        signal: controller.signal,
        method: 'HEAD' // Nur Header abfragen
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Server nicht erreichbar');
      }
    } catch (error) {
      console.log('App offline erkannt, leite zur Offline-Seite um:', error);
      this.redirectToOfflinePage();
    }
  }

  redirectToOfflinePage() {
    // Aktuelle URL-Parameter (inkl. fallback) beibehalten
    const currentUrl = new URL(window.location.href);
    const fallbackData = currentUrl.searchParams.get('fallback');
    
    // Zur statischen Offline-Seite umleiten
    const offlineUrl = new URL('/tank-offline.html', window.location.origin);
    if (fallbackData) {
      offlineUrl.searchParams.set('fallback', fallbackData);
    }
    
    window.location.href = offlineUrl.toString();
  }

  handleOnline() {
    console.log('🟢 Verbindung wiederhergestellt');
    
    // Wenn wir auf der Offline-Seite sind, versuche zurück zur App zu gehen
    if (window.location.pathname.includes('tank-offline.html')) {
      const urlParams = new URLSearchParams(window.location.search);
      const fallbackData = urlParams.get('fallback');
      
      if (fallbackData) {
        try {
          const data = JSON.parse(decodeURIComponent(fallbackData));
          const tankId = this.extractTankIdFromFallback(data);
          
          if (tankId) {
            // Zurück zur Tank-Detail-Seite
            const appUrl = `/inventory/tank/${tankId}?fallback=${encodeURIComponent(fallbackData)}`;
            window.location.href = appUrl;
          }
        } catch (e) {
          console.error('Fehler beim Parsen der Fallback-Daten:', e);
        }
      }
    }
  }

  handleOffline() {
    console.log('🔴 Verbindung verloren');
    // Optional: Warnung anzeigen, aber nicht sofort umleiten
    // Der User könnte offline arbeiten wollen
  }

  extractTankIdFromFallback(data: any) {
    // Versuche Tank-ID aus den Daten zu extrahieren
    // Das könnte basierend auf tankNr oder anderen Feldern sein
    return data.tankNr ? `tank-${data.tankNr.toLowerCase().replace(/\s+/g, '-')}` : null;
  }
}

// Handler automatisch starten wenn DOM geladen ist
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new TankOfflineHandler();
  });
}

export default TankOfflineHandler;
