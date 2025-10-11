'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Rezeptur, REZEPTUR_STATUS_LABELS, REZEPTUR_STATUS_COLORS } from '@/schemas/rezepturSchema';
import { erstelleNeueRezeptur } from '@/lib/rezeptur-manager';
import { ladeRezepturen } from '@/lib/app-auto-sync';
import { useRouter } from 'next/navigation';

export default function RezepturenPage() {
  const router = useRouter();
  const [rezepturen, setRezepturen] = useState<Rezeptur[]>([]);
  const [suchbegriff, setSuchbegriff] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('alle');
  const [isLoading, setIsLoading] = useState(true);

  // Rezepturen laden
  useEffect(() => {
    const loadRezepturen = async () => {
      try {
        console.log('=== LADE REZEPTUREN ===');
        const data = await ladeRezepturen();
        console.log('Rezepturen geladen:', data.length);
        setRezepturen(data);
      } catch (error) {
        console.error('Fehler beim Laden der Rezepturen:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    loadRezepturen();
    
    // Reload when component becomes visible again
    // (happens when navigating back from editor)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible again - reload Rezepturen');
        loadRezepturen();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Gefilterte Rezepturen
  const gefilterteRezepturen = rezepturen.filter(rez => {
    const matchSuche = rez.name.toLowerCase().includes(suchbegriff.toLowerCase()) ||
                       rez.zielProduktName.toLowerCase().includes(suchbegriff.toLowerCase()) ||
                       (rez.variantenName && rez.variantenName.toLowerCase().includes(suchbegriff.toLowerCase()));
    
    const matchStatus = statusFilter === 'alle' || rez.status === statusFilter;
    
    return matchSuche && matchStatus;
  });

  // Neue Rezeptur erstellen
  const handleNeueRezeptur = () => {
    router.push('/rezepturen/editor?id=neu');
  };

  // Rezeptur öffnen
  const handleRezepturOeffnen = (id: string) => {
    router.push(`/rezepturen/editor?id=${id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Beaker className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Lade Rezepturen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rezepturen</h1>
          <p className="text-muted-foreground mt-1">
            Verwalte deine Ausmischungen und Produktrezepturen
          </p>
        </div>
        <Button onClick={handleNeueRezeptur} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Neue Rezeptur
        </Button>
      </div>

      {/* Filter & Suche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rezeptur suchen..."
                value={suchbegriff}
                onChange={(e) => setSuchbegriff(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Status</SelectItem>
                <SelectItem value="entwurf">Entwurf</SelectItem>
                <SelectItem value="test">In Test</SelectItem>
                <SelectItem value="freigegeben">Freigegeben</SelectItem>
                <SelectItem value="produziert">Produziert</SelectItem>
                <SelectItem value="archiviert">Archiviert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rezepturen Liste */}
      {gefilterteRezepturen.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Beaker className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Noch keine Rezepturen</h3>
              <p className="text-muted-foreground mb-6">
                {suchbegriff || statusFilter !== 'alle' 
                  ? 'Keine Rezepturen gefunden. Versuche einen anderen Filter.' 
                  : 'Erstelle deine erste Rezeptur, um loszulegen.'}
              </p>
              {!suchbegriff && statusFilter === 'alle' && (
                <Button onClick={handleNeueRezeptur}>
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Rezeptur erstellen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gefilterteRezepturen.map((rez) => (
            <Card
              key={rez.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleRezepturOeffnen(rez.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-xl">{rez.name}</CardTitle>
                  <Badge className={REZEPTUR_STATUS_COLORS[rez.status]}>
                    {REZEPTUR_STATUS_LABELS[rez.status]}
                  </Badge>
                </div>
                <CardDescription>
                  {rez.zielProduktName}
                  {rez.variantenName && ` • ${rez.variantenName}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {rez.ergebnis && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Menge:</span>
                        <span className="font-medium">
                          {rez.ergebnis.gesamtMengeLiter.toFixed(2)} L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ø %vol:</span>
                        <span className="font-medium">
                          {rez.ergebnis.durchschnittAlkohol.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LA:</span>
                        <span className="font-medium">
                          {rez.ergebnis.gesamtLiterAlkohol.toFixed(3)} L
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Komponenten:</span>
                    <span className="font-medium">{rez.komponenten.length}</span>
                  </div>
                  {rez.sensorikBewertungen.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bewertungen:</span>
                      <span className="font-medium">{rez.sensorikBewertungen.length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
