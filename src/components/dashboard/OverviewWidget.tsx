"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, Gauge, Send } from 'lucide-react';
import * as StockService from '@/lib/stock-service';
import * as LohnbrandService from '@/lib/lohnbrand-service';
import * as VersandService from '@/lib/versand-service';
import { getTankDefinitions } from '@/lib/tank-sync';
import { calcLA } from '@/lib/mazeration-calc';

function fmtL(n: number) {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
}

/**
 * Kennzahlen-Überblick für die Dashboard-Startseite (Aufgabe 26, Punkt 3): ohne
 * das hier musste man sich den Zustand aus Inventar, Tank-Verwaltung, Lohnbrand
 * und Versand einzeln zusammensuchen. Bewusst nur ein paar Kennzahlen statt
 * eines vollständigen Reports - Details bleiben in den jeweiligen Modulen.
 */
export default function OverviewWidget() {
  const [mounted, setMounted] = useState(false);
  const [gesamtLA, setGesamtLA] = useState(0);
  const [gesamtMenge, setGesamtMenge] = useState(0);
  const [tankBelegt, setTankBelegt] = useState(0);
  const [tankKapazitaet, setTankKapazitaet] = useState(0);
  const [tanksFastVoll, setTanksFastVoll] = useState(0);
  const [offeneLohnbrandAuftraege, setOffeneLohnbrandAuftraege] = useState(0);
  const [versandLetzte30Tage, setVersandLetzte30Tage] = useState(0);

  useEffect(() => {
    setMounted(true);
    const items = StockService.readAll();
    setGesamtLA(items.reduce((s, i) => s + calcLA(i.currentQuantityLiters, i.alcoholVolProzent), 0));
    setGesamtMenge(items.reduce((s, i) => s + i.currentQuantityLiters, 0));

    const tanks = getTankDefinitions();
    let belegtSumme = 0;
    let kapazitaetSumme = 0;
    let fastVoll = 0;
    tanks.forEach(t => {
      const belegt = items.filter(i => i.tankNr === t.tankNr).reduce((s, i) => s + i.currentQuantityLiters, 0);
      belegtSumme += belegt;
      kapazitaetSumme += t.volumenLiter || 0;
      if (t.volumenLiter > 0 && belegt / t.volumenLiter >= 0.9) fastVoll += 1;
    });
    setTankBelegt(belegtSumme);
    setTankKapazitaet(kapazitaetSumme);
    setTanksFastVoll(fastVoll);

    setOffeneLohnbrandAuftraege(LohnbrandService.readAll().filter(a => a.status === 'unterwegs').length);

    const vor30Tagen = new Date();
    vor30Tagen.setDate(vor30Tagen.getDate() - 30);
    setVersandLetzte30Tage(VersandService.readAll().filter(v => new Date(v.versanddatum) >= vor30Tagen).length);
  }, []);

  if (!mounted) return null;

  const auslastungProzent = tankKapazitaet > 0 ? Math.round((tankBelegt / tankKapazitaet) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Lagerbestand</CardTitle>
          <Droplets className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmtL(gesamtLA)} L</div>
          <p className="text-xs text-muted-foreground">Liter Absolutalkohol · {fmtL(gesamtMenge)} L Gesamtmenge</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tank-Auslastung</CardTitle>
          <Gauge className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{auslastungProzent}%</div>
          <p className="text-xs text-muted-foreground">
            {fmtL(tankBelegt)} von {fmtL(tankKapazitaet)} L
            {tanksFastVoll > 0 && ` · ${tanksFastVoll} Tank${tanksFastVoll === 1 ? '' : 's'} ≥ 90% befüllt`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Offene Vorgänge</CardTitle>
          <Send className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{offeneLohnbrandAuftraege}</div>
          <p className="text-xs text-muted-foreground">
            <Link href="/lohnbrand" className="underline hover:text-foreground">Lohnbrand-Aufträge unterwegs</Link>
            {' · '}
            <Link href="/versand" className="underline hover:text-foreground">{versandLetzte30Tage} Versand (30 Tage)</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
