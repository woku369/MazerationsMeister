"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarClock, Plus, Pencil, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  listEventsInRange, createEvent, updateEvent, deleteEvent, type CalendarEvent, type NewCalendarEvent,
} from '@/lib/google-calendar';
import { isGoogleCalendarConnected, onGoogleCalendarConfigChanged } from '@/lib/google-calendar-token';

function toLocalDateInput(iso: string): string {
  return iso.slice(0, 10);
}
function toLocalTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}
function formatEventRange(ev: CalendarEvent): string {
  if (ev.allDay) return 'ganztägig';
  const startTime = new Date(ev.startIso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(ev.endIso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${startTime}–${endTime}`;
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Google liefert bei ganztägigen Terminen ein exklusives Enddatum (1-Tages-Termin: end = start+1). */
function eventFallsOnDay(ev: CalendarEvent, day: Date): boolean {
  const key = dateKey(day);
  if (ev.allDay) return key >= toLocalDateInput(ev.startIso) && key < toLocalDateInput(ev.endIso);
  return toLocalDateInput(ev.startIso) === key;
}

const EMPTY_FORM = { summary: '', description: '', startDate: '', startTime: '09:00', endDate: '', endTime: '10:00', allDay: false };

export default function CalendarWidget() {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadEventsForMonth = useCallback(async (month: Date) => {
    if (!isGoogleCalendarConnected()) return;
    setLoading(true);
    setError(null);
    // Eine Woche Puffer vor/nach dem eigentlichen Monat, da das Kalenderraster
    // auch die letzten Tage des Vor- und die ersten Tage des Folgemonats
    // anzeigt (showOutsideDays) - sonst fehlten dort die Termin-Markierungen.
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - 7);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1 + 7);
    const result = await listEventsInRange(start.toISOString(), end.toISOString());
    setLoading(false);
    if (result.ok) {
      setEvents(result.data);
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    setConnected(isGoogleCalendarConnected());
    const unsubscribe = onGoogleCalendarConfigChanged(() => setConnected(isGoogleCalendarConnected()));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (connected) loadEventsForMonth(displayMonth);
  }, [connected, displayMonth, loadEventsForMonth]);

  const eventsOnSelectedDay = useMemo(
    () => events.filter(ev => eventFallsOnDay(ev, selectedDay)).sort((a, b) => a.startIso.localeCompare(b.startIso)),
    [events, selectedDay],
  );
  const daysWithEvents = useMemo(() => {
    const dates: Date[] = [];
    for (const ev of events) {
      const from = new Date(toLocalDateInput(ev.startIso));
      const to = ev.allDay ? new Date(toLocalDateInput(ev.endIso)) : new Date(toLocalDateInput(ev.startIso) + 'T00:00:00');
      // Bei Mehrtages-Terminen jeden betroffenen Tag einzeln markieren.
      for (let d = new Date(from); d < (ev.allDay ? to : new Date(from.getTime() + 24 * 60 * 60 * 1000)); d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    }
    return dates;
  }, [events]);

  function openNewEventDialog(forDate?: Date) {
    const day = toLocalDateInput((forDate || selectedDay).toISOString());
    setEditingId(null);
    setForm({ ...EMPTY_FORM, startDate: day, endDate: day });
    setIsDialogOpen(true);
  }

  function openEditEventDialog(ev: CalendarEvent) {
    setEditingId(ev.id);
    setForm({
      summary: ev.summary,
      description: ev.description || '',
      startDate: toLocalDateInput(ev.startIso),
      startTime: ev.allDay ? '09:00' : toLocalTimeInput(ev.startIso),
      endDate: toLocalDateInput(ev.endIso),
      endTime: ev.allDay ? '10:00' : toLocalTimeInput(ev.endIso),
      allDay: ev.allDay,
    });
    setIsDialogOpen(true);
  }

  async function handleSaveEvent() {
    if (!form.summary.trim()) {
      toast({ title: 'Titel fehlt', variant: 'destructive' });
      return;
    }
    const payload: NewCalendarEvent = {
      summary: form.summary.trim(),
      description: form.description.trim() || undefined,
      startIso: form.allDay ? form.startDate : combineDateTime(form.startDate, form.startTime),
      endIso: form.allDay ? form.endDate : combineDateTime(form.endDate, form.endTime),
      allDay: form.allDay,
    };
    const result = editingId ? await updateEvent(editingId, payload) : await createEvent(payload);
    if (!result.ok) {
      toast({ title: editingId ? 'Ändern fehlgeschlagen' : 'Anlegen fehlgeschlagen', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: editingId ? 'Termin geändert' : 'Termin angelegt' });
    setIsDialogOpen(false);
    loadEventsForMonth(displayMonth);
  }

  async function handleDeleteEvent(id: string) {
    const result = await deleteEvent(id);
    if (!result.ok) {
      toast({ title: 'Löschen fehlgeschlagen', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Termin gelöscht' });
    loadEventsForMonth(displayMonth);
  }

  if (!connected) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Kalender</CardTitle>
          </div>
          <CardDescription>Dein persönlicher Google Calendar</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Noch nicht mit Google Calendar verbunden.
          </p>
          <Link href="/einstellungen">
            <Button variant="outline" size="sm">In Einstellungen verbinden</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Kalender</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => loadEventsForMonth(displayMonth)} title="Aktualisieren">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <Calendar
          mode="single"
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          selected={selectedDay}
          onSelect={day => day && setSelectedDay(day)}
          onDayClick={day => setSelectedDay(day)}
          modifiers={{ hasEvent: daysWithEvents }}
          modifiersClassNames={{ hasEvent: 'font-bold text-primary underline decoration-2 underline-offset-4' }}
          className="rounded-md border w-full p-0"
        />

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {selectedDay.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
          <Button size="sm" onClick={() => openNewEventDialog()} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />Termin
          </Button>
        </div>

        {eventsOnSelectedDay.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag.</p>
        )}
        {eventsOnSelectedDay.map(ev => (
          <div key={ev.id} className="flex items-start gap-2 border rounded-lg p-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{ev.summary}</div>
              <div className="text-xs text-muted-foreground">{formatEventRange(ev)}</div>
              {ev.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</div>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {ev.htmlLink && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(ev.htmlLink, '_blank')} title="In Google Calendar öffnen">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditEventDialog(ev)} title="Bearbeiten">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Löschen">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Möchten Sie den Termin „{ev.summary}" wirklich unwiderruflich aus Google Calendar löschen?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteEvent(ev.id)} className="bg-destructive hover:bg-destructive/90">
                      Löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Termin bearbeiten' : 'Neuer Termin'}</DialogTitle>
            <DialogDescription>Wird direkt in deinem Google Calendar angelegt bzw. geändert.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titel</Label>
              <Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="z.B. Termin bei Mozart" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.allDay} onCheckedChange={c => setForm(f => ({ ...f, allDay: !!c }))} />
              Ganztägig
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => {
                    const neuesStart = e.target.value;
                    // Enddatum folgt dem Start, solange der Nutzer es nicht bewusst
                    // abweichend gesetzt hat (Nutzer-Meldung 07.10.2026: Start auf
                    // nächste Woche verschoben, Ende blieb beim heutigen Tag stehen,
                    // weil beide Felder bislang unabhängig waren). Sobald das Ende
                    // einmal vom Start abweicht (Mehrtages-Termin), bleibt es dabei.
                    setForm(f => ({ ...f, startDate: neuesStart, endDate: f.endDate === f.startDate ? neuesStart : f.endDate }));
                  }}
                />
                {!form.allDay && (
                  <Input type="time" className="mt-1" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                )}
              </div>
              <div>
                <Label>Ende</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                {!form.allDay && (
                  <Input type="time" className="mt-1" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                )}
              </div>
            </div>
            <div>
              <Label>Beschreibung (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveEvent}>{editingId ? 'Speichern' : 'Anlegen'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
