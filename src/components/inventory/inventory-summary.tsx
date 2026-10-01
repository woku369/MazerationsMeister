
"use client";

import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import { calcLA } from '@/lib/mazeration-calc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PackageSearch } from 'lucide-react';

type InventorySummaryProps = {
  items: StoredInventoryItem[];
};

type ProductSummary = {
  artikelNummer: string;
  produktName: string; // Take from the first item in the group
  category: string;
  totalQuantityLiters: number;
  totalAbsoluteAlcoholLiters: number;
};

const formatNumber = (num: number | undefined | null, precision: number = 2) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString('de-DE', { minimumFractionDigits: precision, maximumFractionDigits: precision });
};

export default function InventorySummary({ items }: InventorySummaryProps) {
  const productSummaries = items.reduce<Record<string, ProductSummary & { uniqueKey: string }>>((acc, item) => {
    // Gruppiere nach Produktname statt nach Artikel-Nr., falls Artikel-Nr. leer oder identisch ist.
    // Kategorie fließt zusätzlich in den Schlüssel ein (Nutzer-Meldung 30.09./01.10.2026,
    // dieselbe Lücke wie im XLSX-Export aus Aufgabe 38, hier in der Bildschirmansicht
    // übersehen): Mazerat und Destillat derselben Pflanze tragen oft denselben
    // Produktnamen/dieselbe Artikelnummer, sind aber zwei grundverschiedene Artikel.
    const key = `${item.produktName || item.artikelNummer || 'unbekannt'}::${item.category || ''}`;

    if (!acc[key]) {
      acc[key] = {
        artikelNummer: item.artikelNummer || '',
        produktName: item.produktName || '',
        category: item.category || '',
        totalQuantityLiters: 0,
        totalAbsoluteAlcoholLiters: 0,
        uniqueKey: key, // Store the unique key used for grouping
      };
    }
    acc[key].totalQuantityLiters += item.currentQuantityLiters || 0;
    acc[key].totalAbsoluteAlcoholLiters += calcLA(item.currentQuantityLiters || 0, item.alcoholVolProzent || 0);
    return acc;
  }, {});

  const summariesArray = Object.values(productSummaries).sort((a, b) => {
    // Sortiere nach dem eindeutigen Key (der bereits der beste verfügbare Wert ist)
    return a.uniqueKey.localeCompare(b.uniqueKey);
  });

  if (items.length === 0) {
    return null; // Don't show summary if there are no items
  }

  return (
    <Card className="shadow-md mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <PackageSearch className="mr-2 h-6 w-6" />
          Lagerübersicht nach Artikel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Artikel-Nr.</TableHead>
                <TableHead className="min-w-[200px]">Produktname</TableHead>
                <TableHead className="min-w-[120px]">Kategorie</TableHead>
                <TableHead className="text-right min-w-[150px]">Gesamtmenge (L)</TableHead>
                <TableHead className="text-right min-w-[180px]">Gesamt LA (L)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summariesArray.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    Keine Artikel im Lager.
                  </TableCell>
                </TableRow>
              )}
              {summariesArray.map((summary) => (
                <TableRow key={summary.uniqueKey}>
                  <TableCell className="font-medium">{summary.artikelNummer}</TableCell>
                  <TableCell>{summary.produktName}</TableCell>
                  <TableCell>{summary.category}</TableCell>
                  <TableCell className="text-right">{formatNumber(summary.totalQuantityLiters)}</TableCell>
                  <TableCell className="text-right">{formatNumber(summary.totalAbsoluteAlcoholLiters, 3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
