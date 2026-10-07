"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { CalendarClock, Plus, Pencil, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  listUpcomingEvents, createEvent, updateEvent, deleteEvent, type CalendarEvent, type NewCalendarEvent,
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
  const start = new Date(ev.startIso);
  const dateStr = start.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  if (ev.allDay) return `${dateStr} (ganztägig)`;
  const startTime = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(ev.endIso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr}, ${startTime}–${endTime}`;
}

const EMPTY_FORM = { summary: '', description: '', startDate: '', startTime: '09:00', endDate: '', endTime: '10:00', allDay: false };

export default function CalendarWidget() {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadEvents = useCallback(async () => {
    if (!isGoogleCalendarConnected()) return;
    setLoading(true);
    setError(null);
    const result = await listUpcomingEvents(14);
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
    if (connected) loadEvents();
  }, [connected, loadEvents]);

  function openNewEventDialog() {
    const today = new Date().toISOString().slice(0, 10);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, startDate: today, endDate: today });
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
    loadEvents();
  }

  async function handleDeleteEvent(id: string) {
    const result = await deleteEvent(id);
    if (!result.ok) {
      toast({ title: 'Löschen fehlgeschlagen', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Termin gelöscht' });
    loadEvents();
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={loadEvents} title="Aktualisieren">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={openNewEventDialog} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />Termin
            </Button>
          </div>
        </div>
        <CardDescription>Nächste 14 Tage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && events.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">Keine Termine in den nächsten 14 Tagen.</p>
        )}
        {events.map(ev => (
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
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteEvent(ev.id)} title="Löschen">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
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
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
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
