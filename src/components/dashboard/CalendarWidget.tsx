"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, ExternalLink, Settings, Plus, Download, Trash2, Edit, LogIn, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getGoogleCalendar, type GoogleCalendarEvent } from '@/lib/google-calendar';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export default function CalendarWidget() {
  // State Management
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [clientId, setClientId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('googleCalendarClientId') || '1004514561626-ak5fear0b788324hrchjbv6hkhdiobam.apps.googleusercontent.com';
    }
    return '1004514561626-ak5fear0b788324hrchjbv6hkhdiobam.apps.googleusercontent.com';
  });
  const [tempClientId, setTempClientId] = useState(clientId);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Kalender-Navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Dialog State für Event erstellen/bearbeiten
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GoogleCalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    summary: '',
    description: '',
    start: '',
    end: '',
    location: '',
  });

  const calendar = getGoogleCalendar();

  // Initialisiere Google Calendar API
  useEffect(() => {
    if (clientId && typeof window !== 'undefined') {
      calendar.initialize({ clientId }).catch((err) => {
        setError('Initialisierung fehlgeschlagen: ' + err.message);
      });
    }
  }, [clientId]);

  // Lade Events wenn authentifiziert oder Monat wechselt
  useEffect(() => {
    if (isAuthenticated) {
      loadEvents();
    }
  }, [isAuthenticated, currentMonth]);

  const handleSaveConfig = () => {
    setClientId(tempClientId);
    localStorage.setItem('googleCalendarClientId', tempClientId);
    setIsConfiguring(false);
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await calendar.signIn();
      setIsAuthenticated(true);
    } catch (err: any) {
      setError('Login fehlgeschlagen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    calendar.signOut();
    setIsAuthenticated(false);
    setEvents([]);
  };

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const fetchedEvents = await calendar.getEvents({
        maxResults: 50,
        timeMin: startOfMonth,
        timeMax: endOfMonth,
      });
      setEvents(fetchedEvents);
    } catch (err: any) {
      setError('Events laden fehlgeschlagen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setEditingEvent(null);
    setEventForm({
      summary: '',
      description: '',
      start: format(clickedDate, "yyyy-MM-dd'T'09:00"),
      end: format(clickedDate, "yyyy-MM-dd'T'10:00"),
      location: '',
    });
    setIsEventDialogOpen(true);
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventForm({
      summary: '',
      description: '',
      start: '',
      end: '',
      location: '',
    });
    setIsEventDialogOpen(true);
  };

  const handleEditEvent = (event: GoogleCalendarEvent) => {
    setEditingEvent(event);
    setEventForm({
      summary: event.summary,
      description: event.description || '',
      start: event.start.dateTime || event.start.date || '',
      end: event.end.dateTime || event.end.date || '',
      location: event.location || '',
    });
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (editingEvent) {
        // Update existing event
        await calendar.updateEvent(editingEvent.id, {
          summary: eventForm.summary,
          description: eventForm.description,
          start: { dateTime: eventForm.start },
          end: { dateTime: eventForm.end },
          location: eventForm.location,
        });
      } else {
        // Create new event
        await calendar.createEvent({
          summary: eventForm.summary,
          description: eventForm.description,
          start: { dateTime: eventForm.start },
          end: { dateTime: eventForm.end },
          location: eventForm.location,
        });
      }
      setIsEventDialogOpen(false);
      await loadEvents();
    } catch (err: any) {
      setError('Event speichern fehlgeschlagen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await calendar.deleteEvent(eventId);
      await loadEvents();
    } catch (err: any) {
      setError('Event löschen fehlgeschlagen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadICS = (event: GoogleCalendarEvent) => {
    calendar.downloadICS(event);
  };

  const formatEventDate = (event: GoogleCalendarEvent) => {
    const dateStr = event.start.dateTime || event.start.date;
    if (!dateStr) return '';
    
    try {
      const date = parseISO(dateStr);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Google Kalender</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateEvent}
                    className="h-8 w-8 p-0"
                    title="Neuer Termin"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="h-8 w-8 p-0"
                    title="Abmelden"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfiguring(!isConfiguring)}
                  className="h-8 w-8 p-0"
                  title="Konfigurieren"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://calendar.google.com', '_blank')}
                className="h-8 w-8 p-0"
                title="In Google Calendar öffnen"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Ihre Termine direkt im Dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Fehler-Anzeige */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Konfigurations-Panel */}
          {isConfiguring && (
            <div className="space-y-3 p-3 bg-primary/5 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="client-id" className="text-sm font-medium">
                  Google OAuth Client ID
                </Label>
                <Input
                  id="client-id"
                  type="text"
                  placeholder="xxxxx.apps.googleusercontent.com"
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                  className="w-full font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Erstellen Sie eine Client ID in der Google Cloud Console → APIs & Dienste → Anmeldedaten
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveConfig} className="flex-1">
                  Speichern
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setTempClientId(clientId);
                    setIsConfiguring(false);
                  }}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {/* Nicht konfiguriert */}
          {!clientId ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-3">
                <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground" />
                <div className="space-y-1">
                  <h3 className="font-medium">Google Calendar konfigurieren</h3>
                  <p className="text-sm text-muted-foreground">
                    Richten Sie Ihre Google OAuth Client ID ein, um loszulegen.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsConfiguring(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Jetzt einrichten
                </Button>
              </div>
            </div>
          ) : !isAuthenticated ? (
            /* Login-Screen */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-3">
                <CalendarClock className="h-12 w-12 mx-auto text-primary" />
                <div className="space-y-1">
                  <h3 className="font-medium">Mit Google anmelden</h3>
                  <p className="text-sm text-muted-foreground">
                    Melden Sie sich an, um Ihre Termine zu sehen und zu verwalten.
                  </p>
                </div>
                <Button 
                  onClick={handleSignIn}
                  disabled={isLoading}
                  size="sm"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {isLoading ? 'Verbinde...' : 'Mit Google anmelden'}
                </Button>
              </div>
            </div>
          ) : (
            /* Kalender-Monatsansicht */
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Lade Termine...
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Monats-Navigation */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreviousMonth}
                      className="h-7 w-7 p-0"
                    >
                      ‹
                    </Button>
                    <h3 className="text-sm font-medium">
                      {format(currentMonth, 'MMMM yyyy', { locale: de })}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextMonth}
                      className="h-7 w-7 p-0"
                    >
                      ›
                    </Button>
                  </div>
                  
                  {/* Kalender-Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                      <div key={day} className="text-xs font-medium text-muted-foreground py-1">
                        {day}
                      </div>
                    ))}
                    {(() => {
                      const now = new Date();
                      const year = currentMonth.getFullYear();
                      const month = currentMonth.getMonth();
                      const firstDay = new Date(year, month, 1);
                      const lastDay = new Date(year, month + 1, 0);
                      const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                      const days = [];
                      
                      // Leere Tage am Anfang
                      for (let i = 0; i < startDay; i++) {
                        days.push(<div key={`empty-${i}`} className="aspect-square" />);
                      }
                      
                      // Tage des Monats
                      for (let day = 1; day <= lastDay.getDate(); day++) {
                        const date = new Date(year, month, day);
                        const isToday = date.toDateString() === now.toDateString();
                        const dayEvents = events.filter(e => {
                          const eventDate = new Date(e.start.dateTime || e.start.date || '');
                          return eventDate.toDateString() === date.toDateString();
                        });
                        
                        days.push(
                          <div
                            key={day}
                            onClick={() => handleDayClick(day)}
                            className={`aspect-square p-1 rounded-md text-xs flex flex-col items-center justify-start cursor-pointer hover:bg-muted/50 transition-colors ${
                              isToday ? 'bg-primary text-primary-foreground font-bold' : ''
                            }`}
                            title={dayEvents.length > 0 ? dayEvents.map(e => e.summary).join(', ') : 'Neuer Termin erstellen'}
                          >
                            <span>{day}</span>
                            {dayEvents.length > 0 && (
                              <div className="flex gap-0.5 mt-0.5">
                                {dayEvents.slice(0, 3).map((_, i) => (
                                  <div key={i} className={`w-1 h-1 rounded-full ${isToday ? 'bg-primary-foreground' : 'bg-primary'}`} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return days;
                    })()}
                  </div>
                  
                  {/* Event-Liste darunter */}
                  <div className="border-t pt-3 space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Anstehende Termine</h4>
                    {events.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Keine anstehenden Termine
                      </p>
                    ) : (
                      events.slice(0, 5).map((event) => (
                        <div
                          key={event.id}
                          className="p-2 border rounded hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-xs truncate">{event.summary}</h5>
                              <p className="text-xs text-muted-foreground">
                                {formatEventDate(event)}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadICS(event)}
                                className="h-6 w-6 p-0"
                                title=".ics herunterladen"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEvent(event)}
                                className="h-6 w-6 p-0"
                                title="Bearbeiten"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEvent(event.id)}
                                className="h-6 w-6 p-0 text-destructive"
                                title="Löschen"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Erstellen/Bearbeiten Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Termin bearbeiten' : 'Neuer Termin'}
            </DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Ändern Sie die Details des Termins.' : 'Erstellen Sie einen neuen Kalendertermin.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Titel*</Label>
              <Input
                id="summary"
                value={eventForm.summary}
                onChange={(e) => setEventForm({ ...eventForm, summary: e.target.value })}
                placeholder="z.B. Meeting mit Team"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start">Start*</Label>
              <Input
                id="start"
                type="datetime-local"
                value={eventForm.start}
                onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end">Ende*</Label>
              <Input
                id="end"
                type="datetime-local"
                value={eventForm.end}
                onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Ort</Label>
              <Input
                id="location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="z.B. Konferenzraum A"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Zusätzliche Details..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSaveEvent}
              disabled={!eventForm.summary || !eventForm.start || !eventForm.end || isLoading}
            >
              {isLoading ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
