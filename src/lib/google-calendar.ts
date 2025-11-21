/**
 * Google Calendar API Integration
 * Version 1.2.2 - Direkte Calendar-Integration im Dashboard
 * 
 * Verwendet Google OAuth 2.0 für Client-Side Authentication
 * Keine Backend-API erforderlich
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  htmlLink: string;
  status: string;
  created: string;
  updated: string;
}

export interface GoogleCalendarConfig {
  clientId: string;
  apiKey?: string; // Optional für öffentliche Kalender
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

class GoogleCalendarAPI {
  private isInitialized = false;
  private isSignedIn = false;
  private config: GoogleCalendarConfig | null = null;
  private tokenClient: any = null;
  private accessToken: string | null = null;

  /**
   * Initialisiert die Google Calendar API
   */
  async initialize(config: GoogleCalendarConfig): Promise<void> {
    this.config = config;

    try {
      // Lade Google Identity Services
      await this.loadGoogleIdentityServices();
      
      // Initialisiere Token Client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: (response: any) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.isSignedIn = true;
            console.log('✅ Google Calendar erfolgreich authentifiziert');
          }
        },
      });

      this.isInitialized = true;
      console.log('✅ Google Calendar API initialisiert');
    } catch (error) {
      console.error('❌ Google Calendar API Initialisierung fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Lädt Google Identity Services Script
   */
  private loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  /**
   * Login mit Google
   */
  async signIn(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('API not initialized. Call initialize() first.');
    }

    // Prüfe ob wir in Electron laufen
    const isElectron = typeof window !== 'undefined' && 
                       typeof (window as any).electronAPI !== 'undefined';

    if (isElectron) {
      // Electron: Nutze IPC für OAuth
      await this.signInElectronIPC();
    } else {
      // Browser: Normaler Token-Flow
      this.tokenClient.requestAccessToken();
    }
  }

  /**
   * Electron OAuth via IPC (Main Process)
   */
  private async signInElectronIPC(): Promise<void> {
    try {
      const result = await (window as any).electronAPI.invoke('google-oauth-login', {
        clientId: this.config!.clientId,
        scope: 'https://www.googleapis.com/auth/calendar',
      });

      if (result.success && result.accessToken) {
        this.accessToken = result.accessToken;
        this.isSignedIn = true;
        console.log('✅ Google Calendar erfolgreich authentifiziert (Electron IPC)');
      } else {
        throw new Error(result.error || 'Authentifizierung fehlgeschlagen');
      }
    } catch (error: any) {
      console.error('❌ Electron OAuth Fehler:', error);
      throw error;
    }
  }

  /**
   * Electron-spezifischer OAuth Flow
   */
  private async signInElectron(): Promise<void> {
    return new Promise((resolve, reject) => {
      const authUrl = 
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${this.config!.clientId}&` +
        `redirect_uri=http://localhost/oauth/callback&` +
        `response_type=token&` +
        `scope=https://www.googleapis.com/auth/calendar&` +
        `prompt=select_account`;

      // Öffne OAuth in neuem Browser-Fenster
      const authWindow = window.open(authUrl, 'Google OAuth', 'width=600,height=700');
      
      if (!authWindow) {
        reject(new Error('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.'));
        return;
      }

      // Polling: Prüfe URL-Änderungen im Popup
      const checkCallback = setInterval(() => {
        try {
          // Prüfe ob Popup geschlossen wurde
          if (authWindow.closed) {
            clearInterval(checkCallback);
            clearTimeout(timeout);
            reject(new Error('OAuth abgebrochen - Fenster geschlossen'));
            return;
          }

          // Versuche URL zu lesen (funktioniert nur bei gleicher Origin)
          const currentUrl = authWindow.location.href;
          
          if (currentUrl.includes('/oauth/callback')) {
            const hash = authWindow.location.hash;
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            
            if (accessToken) {
              this.accessToken = accessToken;
              this.isSignedIn = true;
              console.log('✅ Google Calendar erfolgreich authentifiziert (Electron)');
              clearInterval(checkCallback);
              clearTimeout(timeout);
              authWindow.close();
              resolve();
            }
          }
        } catch (err) {
          // Cross-origin error ist normal während Google OAuth läuft
          // Ignorieren und weiter polling
        }
      }, 500);

      // Timeout nach 5 Minuten
      const timeout = setTimeout(() => {
        clearInterval(checkCallback);
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        reject(new Error('OAuth Timeout'));
      }, 300000);
    });
  }

  /**
   * Logout
   */
  signOut(): void {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken);
      this.accessToken = null;
      this.isSignedIn = false;
      console.log('✅ Google Calendar abgemeldet');
    }
  }

  /**
   * Prüft ob User eingeloggt ist
   */
  isAuthenticated(): boolean {
    return this.isSignedIn && !!this.accessToken;
  }

  /**
   * Holt Events aus dem primären Kalender
   */
  async getEvents(options: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    orderBy?: 'startTime' | 'updated';
  } = {}): Promise<GoogleCalendarEvent[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    const {
      timeMin = new Date(),
      timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage
      maxResults = 50,
      orderBy = 'startTime',
    } = options;

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${timeMin.toISOString()}&` +
        `timeMax=${timeMax.toISOString()}&` +
        `maxResults=${maxResults}&` +
        `orderBy=${orderBy}&` +
        `singleEvents=true`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('❌ Fehler beim Laden der Events:', error);
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Termin
   */
  async createEvent(event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    location?: string;
    attendees?: Array<{ email: string }>;
  }): Promise<GoogleCalendarEvent> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...event,
            start: {
              ...event.start,
              timeZone: event.start.timeZone || 'Europe/Berlin',
            },
            end: {
              ...event.end,
              timeZone: event.end.timeZone || 'Europe/Berlin',
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Event erstellt:', data.summary);
      return data;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Events:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen bestehenden Termin
   */
  async updateEvent(
    eventId: string,
    updates: Partial<{
      summary: string;
      description: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      location: string;
    }>
  ): Promise<GoogleCalendarEvent> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Event aktualisiert:', data.summary);
      return data;
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Events:', error);
      throw error;
    }
  }

  /**
   * Löscht einen Termin
   */
  async deleteEvent(eventId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Event gelöscht:', eventId);
    } catch (error) {
      console.error('❌ Fehler beim Löschen des Events:', error);
      throw error;
    }
  }

  /**
   * Generiert .ics Datei für Event
   */
  generateICS(event: GoogleCalendarEvent): string {
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = event.start.dateTime || event.start.date!;
    const end = event.end.dateTime || event.end.date!;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MazerationsMeister//Google Calendar//DE',
      'BEGIN:VEVENT',
      `UID:${event.id}@google.com`,
      `DTSTAMP:${formatDate(event.created)}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${event.summary}`,
      event.description ? `DESCRIPTION:${event.description}` : '',
      event.location ? `LOCATION:${event.location}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
  }

  /**
   * Download .ics Datei
   */
  downloadICS(event: GoogleCalendarEvent): void {
    const icsContent = this.generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.summary.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('✅ .ics Datei heruntergeladen');
  }
}

// Singleton Instanz
let googleCalendarInstance: GoogleCalendarAPI | null = null;

export function getGoogleCalendar(): GoogleCalendarAPI {
  if (!googleCalendarInstance) {
    googleCalendarInstance = new GoogleCalendarAPI();
  }
  return googleCalendarInstance;
}

export default getGoogleCalendar;
