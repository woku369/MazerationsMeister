
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
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type InventoryTransactionTableProps = {
  transactions: InventoryTransaction[];
};

type SortableKeys = keyof Pick<InventoryTransaction, 'transactionDate' | 'artikelNummer' | 'produktName' | 'chargenNummer' | 'type' | 'quantityLiters'>;

const formatNumber = (num: number | undefined | null, precision: number = 2) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString('de-DE', { minimumFractionDigits: precision, maximumFractionDigits: precision });
};

export default function InventoryTransactionTable({ transactions }: InventoryTransactionTableProps) {
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
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

  const sortedAndFilteredTransactions = useMemo(() => {
    let filteredItems = [...transactions];

    if (transactionTypeFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.type === transactionTypeFilter);
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
  }, [transactions, transactionTypeFilter, sortConfig]);

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
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
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <Table>
             <TableCaption>
              {sortedAndFilteredTransactions.length === 0 && transactionTypeFilter === 'all' ? "Noch keine Transaktionen erfasst." : 
               sortedAndFilteredTransactions.length === 0 && transactionTypeFilter !== 'all' ? `Keine Transaktionen vom Typ "${transactionTypeFilter}".` :
               `Protokoll aller Lagerbewegungen.`}
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8 h-48">
                    {transactionTypeFilter === 'all' ? "Noch keine Transaktionen erfasst." : `Keine Transaktionen vom Typ "${transactionTypeFilter}" gefunden.`}
                  </TableCell>
                </TableRow>
              )}
              {sortedAndFilteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(transaction.transactionDate, 'dd.MM.yyyy HH:mm')}</TableCell>
                  <TableCell className="font-medium">{transaction.artikelNummer}</TableCell>
                  <TableCell>{transaction.produktName}</TableCell>
                  <TableCell>{transaction.chargenNummer || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge 
                        variant={transaction.type === 'Zugang' ? 'default' : 'destructive'}
                        className={
                            transaction.type === 'Zugang' 
                            ? 'bg-green-600/90 hover:bg-green-600/80 text-white' 
                            : 'bg-orange-600/90 hover:bg-orange-600/80 text-white'
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
