"use client";

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, ExternalLink } from 'lucide-react';

export default function CalendarWidget() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleOpenGoogleCalendar = () => {
    window.open('https://calendar.google.com', '_blank');
  };

  const handleOpenOutlookCalendar = () => {
    window.open('https://outlook.live.com/calendar/', '_blank');
  };

  const formatSelectedDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Kalender</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenGoogleCalendar}
              className="h-8 w-8 p-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Ihre Termine und Aktivitäten
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border w-full"
          />
        </div>

        <Separator />

        {date && (
          <div className="bg-primary/5 p-3 rounded-lg">
            <p className="text-sm font-medium text-primary">Ausgewähltes Datum:</p>
            <p className="text-lg font-semibold">{formatSelectedDate(date)}</p>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Kalender-Apps öffnen</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenGoogleCalendar}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Google</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenOutlookCalendar}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Outlook</span>
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p><strong>Tipp:</strong> Klicken Sie auf die Kalender-Buttons, um Ihre persönlichen Termine zu verwalten. Nutzen Sie die Datumsauswahl für Ihre Planung.</p>
        </div>
      </CardContent>
    </Card>
  );
}
