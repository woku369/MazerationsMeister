
"use client";

import type { InventoryTransaction } from '@/schemas/inventorySchema';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ListChecks, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type InventoryTransactionTableProps = {
  transactions: InventoryTransaction[];
};

type SortableKeys = keyof Pick<InventoryTransaction, 'transactionDate' | 'artikelNummer' | 'produktName' | 'chargenNummer' | 'tankNr' | 'type' | 'quantityLiters'>;

const formatNumber = (num: number | undefined | null, precision: number = 2) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString('de-DE', { minimumFractionDigits: precision, maximumFractionDigits: precision });
};

const FILTER_STORAGE_KEY = 'inventoryTransactionTableFilters';

// Vorbelegtes "Von"-Datum (Nutzer-Anfrage 10.10.2026): alle Buchungen vor dem
// tatsächlichen Produktivstart waren reine Korrekturen beim Einrichten der
// Tankverwaltung, keine echten Lagerbewegungen - "kann ich nicht manuell
// löschen (macht ja auch Sinn), aber alles vor 10.10. hätte ich gerne
// draussen". Bewusst nur ein Anzeige-Filter statt einer Löschung - das
// Journal bleibt lückenlos erhalten, nur die Default-Ansicht blendet den
// Einrichtungs-Zeitraum aus. Als Default, nicht hart codierter Cutoff: in
// localStorage gespeichert, sobald der Nutzer das Datum selbst ändert oder
// "Filter zurücksetzen" klickt, bleibt diese Wahl erhalten.
const DEFAULT_DATE_FROM = '2026-10-10';

type StoredFilters = { transactionTypeFilter: string; searchText: string; dateFrom: string; dateTo: string };

function loadStoredFilters(): StoredFilters {
  const fallback: StoredFilters = { transactionTypeFilter: 'all', searchText: '', dateFrom: DEFAULT_DATE_FROM, dateTo: '' };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {
    // Ungültiger/fehlender gespeicherter Zustand - Fallback greift.
  }
  return fallback;
}

export default function InventoryTransactionTable({ transactions }: InventoryTransactionTableProps) {
  const [initialFilters] = useState(loadStoredFilters);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>(initialFilters.transactionTypeFilter);
  const [searchText, setSearchText] = useState(initialFilters.searchText);
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom);
  const [dateTo, setDateTo] = useState(initialFilters.dateTo);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ transactionTypeFilter, searchText, dateFrom, dateTo }));
  }, [transactionTypeFilter, searchText, dateFrom, dateTo]);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys | null; direction: 'ascending' | 'descending' }>({
    key: 'transactionDate', // Default sort by date
    direction: 'descending',  // Default sort descending
  });

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      // Optional: Third click on same column could remove sort or cycle back to ascending
      // For now, it just toggles between ascending and descending
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableKeys) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-2 h-3 w-3 text-primary" />;
    }
    return <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
  };

  const hasActiveFilters = transactionTypeFilter !== 'all' || searchText.trim() !== '' || dateFrom !== '' || dateTo !== '';

  const resetFilters = () => {
    setTransactionTypeFilter('all');
    setSearchText('');
    setDateFrom('');
    setDateTo('');
  };

  const sortedAndFilteredTransactions = useMemo(() => {
    let filteredItems = [...transactions];

    if (transactionTypeFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.type === transactionTypeFilter);
    }

    const suche = searchText.trim().toLowerCase();
    if (suche) {
      filteredItems = filteredItems.filter(item =>
        item.produktName.toLowerCase().includes(suche) ||
        item.chargenNummer.toLowerCase().includes(suche) ||
        item.artikelNummer.toLowerCase().includes(suche) ||
        item.tankNr.toLowerCase().includes(suche)
      );
    }

    if (dateFrom) {
      const von = new Date(dateFrom);
      filteredItems = filteredItems.filter(item => item.transactionDate >= von);
    }
    if (dateTo) {
      // Ende des Tages, damit der "bis"-Tag selbst noch eingeschlossen ist
      const bis = new Date(dateTo);
      bis.setHours(23, 59, 59, 999);
      filteredItems = filteredItems.filter(item => item.transactionDate <= bis);
    }

    if (sortConfig.key !== null) {
      filteredItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        
        let comparison = 0;
        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (valA instanceof Date && valB instanceof Date) {
          comparison = valA.getTime() - valB.getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB, 'de', { sensitivity: 'base' });
        } else {
          comparison = String(valA).localeCompare(String(valB), 'de', { sensitivity: 'base' });
        }
        
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return filteredItems;
  }, [transactions, transactionTypeFilter, searchText, dateFrom, dateTo, sortConfig]);

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center text-xl text-primary">
              <ListChecks className="mr-2 h-6 w-6" />
              Transaktionsprotokoll
            </CardTitle>
            <div className="w-full sm:w-auto min-w-[200px]">
              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Nach Typ filtern..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="Zugang">Zugang</SelectItem>
                  <SelectItem value="Abgang">Abgang</SelectItem>
                  <SelectItem value="Korrektur">Korrektur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full sm:max-w-xs">
              <Label className="text-xs text-muted-foreground">Suche (Produkt, Charge, Artikel-Nr., Tank)</Label>
              <Input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="z.B. GFKC-N, T341, ..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Von</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-auto" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bis</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-auto" />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                Filter zurücksetzen
              </Button>
            )}
          </div>
          {dateFrom === DEFAULT_DATE_FROM && !searchText && transactionTypeFilter === 'all' && !dateTo && (
            <p className="text-xs text-muted-foreground">
              Standardmäßig ab 10.10.2026 gefiltert (Produktivstart) — ältere Buchungen waren reine Korrekturen beim Einrichten der Tankverwaltung. „Filter zurücksetzen" zeigt auch diese wieder.
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <Table>
             <TableCaption>
              {sortedAndFilteredTransactions.length === 0 && !hasActiveFilters ? "Noch keine Transaktionen erfasst." :
               sortedAndFilteredTransactions.length === 0 && hasActiveFilters ? "Keine Transaktionen für die gewählten Filter gefunden." :
               `Protokoll aller Lagerbewegungen (${sortedAndFilteredTransactions.length} von ${transactions.length}).`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => requestSort('transactionDate')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Datum {getSortIcon('transactionDate')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[100px]">
                  <Button variant="ghost" onClick={() => requestSort('artikelNummer')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Artikel-Nr. {getSortIcon('artikelNummer')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[180px]">
                   <Button variant="ghost" onClick={() => requestSort('produktName')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Produktname {getSortIcon('produktName')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[130px]">
                  <Button variant="ghost" onClick={() => requestSort('chargenNummer')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Charge {getSortIcon('chargenNummer')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[100px]">
                  <Button variant="ghost" onClick={() => requestSort('tankNr')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Tank-Nr. {getSortIcon('tankNr')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[100px]">
                  <Button variant="ghost" onClick={() => requestSort('type')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Typ {getSortIcon('type')}
                  </Button>
                </TableHead>
                <TableHead className="text-right min-w-[100px]">
                  <Button variant="ghost" onClick={() => requestSort('quantityLiters')} className="px-1 py-0 h-auto hover:bg-transparent w-full justify-end">
                    Menge (L) {getSortIcon('quantityLiters')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[250px]">Bemerkungen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8 h-48">
                    {!hasActiveFilters ? "Noch keine Transaktionen erfasst." : "Keine Transaktionen für die gewählten Filter gefunden."}
                  </TableCell>
                </TableRow>
              )}
              {sortedAndFilteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(transaction.transactionDate, 'dd.MM.yyyy HH:mm')}</TableCell>
                  <TableCell className="font-medium">{transaction.artikelNummer}</TableCell>
                  <TableCell>{transaction.produktName}</TableCell>
                  <TableCell>{transaction.chargenNummer || 'N/A'}</TableCell>
                  <TableCell>{transaction.tankNr || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge
                        variant={transaction.type === 'Korrektur' ? 'outline' : transaction.type === 'Zugang' ? 'default' : 'destructive'}
                        className={
                            transaction.type === 'Zugang'
                            ? 'bg-green-600/90 hover:bg-green-600/80 text-white'
                            : transaction.type === 'Abgang'
                            ? 'bg-orange-600/90 hover:bg-orange-600/80 text-white'
                            : 'bg-blue-600/90 hover:bg-blue-600/80 text-white border-0'
                        }
                    >
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(transaction.quantityLiters)}</TableCell>
                  <TableCell>
                    {transaction.notes && transaction.notes.length > 40 ? (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help truncate block max-w-[250px]">{transaction.notes.substring(0,40)}...</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs break-words whitespace-normal z-50">
                            <p>{transaction.notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      transaction.notes || '-'
                    )}
                  </TableCell>
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
