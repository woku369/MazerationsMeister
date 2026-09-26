"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Beaker, Search } from 'lucide-react';
import * as RezepturService from '@/lib/rezeptur-service';
import { erstelleNeueRezeptur } from '@/lib/rezeptur-manager';
import { REZEPTUR_STATUS_LABELS, REZEPTUR_STATUS_COLORS, type Rezeptur } from '@/schemas/rezepturSchema';

export default function RezepturenPage() {
  const [rezepturen, setRezepturen] = useState<Rezeptur[]>([]);
  const [suchbegriff, setSuchbegriff] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('alle');

  useEffect(() => {
    setRezepturen(RezepturService.readAll());
  }, []);

  function handleNeueRezeptur() {
    const name = prompt('Name der neuen Rezeptur (z.B. "GFKC-O Muster 1")');
    if (!name?.trim()) return;
    const zielProduktName = prompt('Zielprodukt-/Chargenbezeichnung (z.B. "GFKC-O")', 'GFKC-O') || 'GFKC';
    const neu = erstelleNeueRezeptur(name.trim(), zielProduktName.trim());
    const alle = [...rezepturen, neu];
    RezepturService.writeAll(alle);
    setRezepturen(alle);
    window.location.href = `/rezepturen/editor?id=${neu.id}`;
  }

  const gefiltert = rezepturen
    .filter(r => statusFilter === 'alle' || r.status === statusFilter)
    .filter(r => !suchbegriff.trim() || `${r.name} ${r.variantenName || ''} ${r.zielProduktName}`.toLowerCase().includes(suchbegriff.toLowerCase()))
    .sort((a, b) => b.geaendertAm.localeCompare(a.geaendertAm));

  return (
    <div className="space-y-6 p-4 container mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Beaker className="w-6 h-6" />Rezepturen / GFKC-Ausmischung</h1>
          <p className="text-muted-foreground text-sm">Verschnitte planen, ausmischen und buchen.</p>
        </div>
        <Button onClick={handleNeueRezeptur}><Plus className="w-4 h-4 mr-1" />Neue Rezeptur</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Suchen..." value={suchbegriff} onChange={e => setSuchbegriff(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {Object.entries(REZEPTUR_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {gefiltert.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Keine Rezepturen gefunden.</p>
        )}
        {gefiltert.map(r => (
          <Link key={r.id} href={`/rezepturen/editor?id=${r.id}`}>
            <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {r.name}
                      {r.variantenName && <span className="text-muted-foreground font-normal">– {r.variantenName}</span>}
                    </CardTitle>
                    <CardDescription>
                      {r.zielProduktName} · v{r.version} · Basis {r.basisMenge} L
                      {r.produktionsMenge ? ` · Produktion ${r.produktionsMenge} L` : ''}
                    </CardDescription>
                  </div>
                  <Badge className={REZEPTUR_STATUS_COLORS[r.status]}>{REZEPTUR_STATUS_LABELS[r.status]}</Badge>
                </div>
              </CardHeader>
              {r.ergebnis && (
                <CardContent className="py-0 pb-4 text-sm text-muted-foreground">
                  {r.ergebnis.gesamtMengeLiter.toFixed(1)} L bei {r.ergebnis.durchschnittAlkohol.toFixed(1)}% vol
                  {r.produktionsDaten && ` · gebucht in ${r.produktionsDaten.zielTankNr}`}
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
