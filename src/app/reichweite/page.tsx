'use client';

import { Suspense, useEffect, useState } from 'react';
import RangeCalculator from '@/components/reichweite/RangeCalculator';
import { Card } from '@/components/ui/card';

/**
 * Reichweitenanalyse - Hauptseite
 * 
 * Zeigt Produktions- und Reichweitenberechnungen für GFKC-basierte Produkte.
 * Ermöglicht Multi-Rezeptur-Analyse, Komponenten-Tracking und Produktionsauftrag-Simulation.
 */
export default function ReichweiteAnalysePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="font-sans text-3xl md:text-4xl text-primary">Reichweitenanalyse</h1>
          <p className="text-gray-600 mt-4">Produktionsplanung und Vorratskontrolle</p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="p-8">
            <p className="text-muted-foreground">Reichweitenanalyse lädt...</p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-sans text-3xl md:text-4xl text-primary">Reichweitenanalyse</h1>
        <p className="text-gray-600 mt-4">Produktionsplanung und Vorratskontrolle</p>
      </div>

      <div className="mx-auto w-full max-w-7xl">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="p-8">
                <p className="text-muted-foreground">Daten werden geladen...</p>
              </Card>
            </div>
          }
        >
          <RangeCalculator />
        </Suspense>
      </div>
    </main>
  );
}
