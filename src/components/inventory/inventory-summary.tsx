
"use client";

import type { StoredInventoryItem } from '@/schemas/inventorySchema';
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
  totalQuantityLiters: number;
  totalAbsoluteAlcoholLiters: number;
};

const formatNumber = (num: number | undefined | null, precision: number = 2) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString('de-DE', { minimumFractionDigits: precision, maximumFractionDigits: precision });
};

export default function InventorySummary({ items }: InventorySummaryProps) {
  // Debug: Log the items to see what we're working with
  console.log('InventorySummary - Items received:', items);

  const productSummaries = items.reduce<Record<string, ProductSummary & { uniqueKey: string }>>((acc, item) => {
    // Gruppiere nach Produktname statt nach Artikel-Nr., falls Artikel-Nr. leer oder identisch ist
    const key = item.produktName || item.artikelNummer || 'unbekannt';
    
    console.log(`Processing item: ${item.produktName}, Artikel-Nr: ${item.artikelNummer}, Key: ${key}`);
    
    if (!acc[key]) {
      acc[key] = {
        artikelNummer: item.artikelNummer || '',
        produktName: item.produktName || '',
        totalQuantityLiters: 0,
        totalAbsoluteAlcoholLiters: 0,
        uniqueKey: key, // Store the unique key used for grouping
      };
    }
    acc[key].totalQuantityLiters += item.currentQuantityLiters || 0;
    acc[key].totalAbsoluteAlcoholLiters += (item.currentQuantityLiters || 0) * ((item.alcoholVolProzent || 0) / 100);
    return acc;
  }, {});

  console.log('InventorySummary - Product summaries:', productSummaries);

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
                <TableHead className="text-right min-w-[150px]">Gesamtmenge (L)</TableHead>
                <TableHead className="text-right min-w-[180px]">Gesamt LA (L)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summariesArray.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    Keine Artikel im Lager.
                  </TableCell>
                </TableRow>
              )}
              {summariesArray.map((summary) => (
                <TableRow key={summary.uniqueKey}>
                  <TableCell className="font-medium">{summary.artikelNummer}</TableCell>
                  <TableCell>{summary.produktName}</TableCell>
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
