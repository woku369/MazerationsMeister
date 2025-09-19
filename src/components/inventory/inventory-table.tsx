"use client";

import type { StoredInventoryItem } from '@/schemas/inventorySchema';
// Dynamische Kategorien aus localStorage
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
import { Trash2, Edit3, PlusSquare, MinusSquare, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type InventoryTableProps = {
  items: StoredInventoryItem[];
  onDeleteItem: (id: string) => void;
  onEditItem: (item: StoredInventoryItem) => void;
  onRecordTransaction: (item: StoredInventoryItem, type: 'Zugang' | 'Abgang') => void;
};

type SortableKeys = 
  | keyof Pick<StoredInventoryItem, 'artikelNummer' | 'produktName' | 'chargenNummer' | 'category' | 'tankNr' | 'currentQuantityLiters' | 'alcoholVolProzent' | 'lastInventoryDate' | 'dichte20C'>
  | 'literAbsolut';

const formatNumber = (num: number | undefined | null, precision: number = 2) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  return num.toLocaleString('de-DE', { minimumFractionDigits: precision, maximumFractionDigits: precision });
};

export default function InventoryTable({ items, onDeleteItem, onEditItem, onRecordTransaction }: InventoryTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys | null; direction: 'ascending' | 'descending' }>({
    key: 'produktName', // Default sort by product name
    direction: 'ascending',
  });

  // Feste Farben für Kategorien
  function getCategoryColor(name: string): string {
  if (name === 'Mazerat' || name === 'M') return '#d1fae5'; // hellgrün
  if (name === 'Destillat' || name === 'Dest') return '#dbeafe'; // hellblau
  return '#e5e7eb'; // hellgrau für andere
  }

  const calculateLA = (liters: number, alcoholVol: number): number | null => {
    if (isNaN(liters) || isNaN(alcoholVol)) return null;
    return liters * (alcoholVol / 100);
  };

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
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

  const sortedAndFilteredItems = useMemo(() => {
    let filteredItems = [...items];

    if (categoryFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === categoryFilter);
    }

    if (sortConfig.key !== null) {
      filteredItems.sort((a, b) => {
        let valA, valB;
        const key = sortConfig.key;

        if (key === 'literAbsolut') {
          valA = calculateLA(a.currentQuantityLiters, a.alcoholVolProzent) ?? -Infinity;
          valB = calculateLA(b.currentQuantityLiters, b.alcoholVolProzent) ?? -Infinity;
        } else {
          valA = a[key as keyof StoredInventoryItem];
          valB = b[key as keyof StoredInventoryItem];
        }

        let comparison = 0;
        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if ((valA instanceof Date || typeof valA === 'string') && (valB instanceof Date || typeof valB === 'string') && key === 'lastInventoryDate') {
          // Robust: String zu Date parsen falls nötig
          const dateA = valA instanceof Date ? valA : new Date(valA);
          const dateB = valB instanceof Date ? valB : new Date(valB);
          comparison = dateA.getTime() - dateB.getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB, 'de', { sensitivity: 'base' });
        } else {
          comparison = String(valA).localeCompare(String(valB), 'de', { sensitivity: 'base' });
        }

        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return filteredItems;
  }, [items, categoryFilter, sortConfig]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl text-primary">Aktueller Lagerbestand (Chargenübersicht)</CardTitle>
          <div className="w-full sm:w-auto min-w-[200px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Nach Kategorie filtern..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                <SelectItem value="Mazerat">
                  <span style={{display:'inline-flex',alignItems:'center'}}>
                    <span style={{background:getCategoryColor('Mazerat'),width:18,height:18,borderRadius:4,display:'inline-block',marginRight:8}}></span>
                    Mazerat
                  </span>
                </SelectItem>
                <SelectItem value="Destillat">
                  <span style={{display:'inline-flex',alignItems:'center'}}>
                    <span style={{background:getCategoryColor('Destillat'),width:18,height:18,borderRadius:4,display:'inline-block',marginRight:8}}></span>
                    Destillat
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <Table>
            <TableCaption>
              {sortedAndFilteredItems.length === 0 && categoryFilter === 'all' ? "Noch keine Artikel im Lager erfasst." : 
               sortedAndFilteredItems.length === 0 && categoryFilter !== 'all' ? `Keine Artikel für Kategorie "${categoryFilter}" gefunden.` :
               `Liste aller erfassten Lagerartikel und Chargen.`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">
                  <Button variant="ghost" onClick={() => requestSort('artikelNummer')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Artikel-Nr. {getSortIcon('artikelNummer')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <Button variant="ghost" onClick={() => requestSort('produktName')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Produktname {getSortIcon('produktName')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[150px]">
                  <Button variant="ghost" onClick={() => requestSort('chargenNummer')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Charge {getSortIcon('chargenNummer')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => requestSort('category')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Kategorie {getSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[80px]">Kennzeichen</TableHead>
                <TableHead className="min-w-[100px]">
                  <Button variant="ghost" onClick={() => requestSort('tankNr')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Tank-Nr. {getSortIcon('tankNr')}
                  </Button>
                </TableHead>
                <TableHead className="text-right min-w-[100px]">
                  <Button variant="ghost" onClick={() => requestSort('currentQuantityLiters')} className="px-1 py-0 h-auto hover:bg-transparent w-full justify-end">
                    Menge (L) {getSortIcon('currentQuantityLiters')}
                  </Button>
                </TableHead>
                <TableHead className="text-right min-w-[100px]">
                  <Button variant="ghost" onClick={() => requestSort('alcoholVolProzent')} className="px-1 py-0 h-auto hover:bg-transparent w-full justify-end">
                    Alk. (%vol) {getSortIcon('alcoholVolProzent')}
                  </Button>
                </TableHead>
                  <TableHead className="text-right min-w-[100px]">
                    <Button variant="ghost" onClick={() => requestSort('dichte20C')} className="px-1 py-0 h-auto hover:bg-transparent w-full justify-end">
                      Dichte 20°C {getSortIcon('dichte20C')}
                    </Button>
                  </TableHead>
                <TableHead className="text-right min-w-[120px]">
                  <Button variant="ghost" onClick={() => requestSort('literAbsolut')} className="px-1 py-0 h-auto hover:bg-transparent w-full justify-end">
                    L Absolutalk. {getSortIcon('literAbsolut')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => requestSort('lastInventoryDate')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Letzte Buchung {getSortIcon('lastInventoryDate')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[200px]">Bemerkungen</TableHead>
                <TableHead className="text-center min-w-[180px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8 h-48">
                    {categoryFilter === 'all' ? "Noch keine Artikel im Lager erfasst." : `Keine Artikel für Kategorie "${categoryFilter}" gefunden.`}
                  </TableCell>
                </TableRow>
              )}
              {sortedAndFilteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.artikelNummer}</TableCell>
                  <TableCell>{item.produktName}</TableCell>
                  <TableCell>{item.chargenNummer || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge style={{background:getCategoryColor(item.category),color:'#222',minWidth:120,display:'inline-flex',justifyContent:'center'}}>
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.kennzeichen}
                  </TableCell>
                  <TableCell>{item.tankNr}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.currentQuantityLiters)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.alcoholVolProzent, 1)}</TableCell>
                    <TableCell className="text-right">{item.dichte20C !== undefined ? formatNumber(item.dichte20C, 4) : '-'}</TableCell>
                  <TableCell className="text-right">{
                    item.literAbsolutalkohol !== undefined && item.literAbsolutalkohol !== null
                      ? formatNumber(item.literAbsolutalkohol)
                      : formatNumber(calculateLA(item.currentQuantityLiters, item.alcoholVolProzent))
                  }</TableCell>
                  <TableCell>{format(item.lastInventoryDate, 'dd.MM.yyyy')}</TableCell>
                  <TableCell>
                    {item.bemerkungen && item.bemerkungen.length > 30 ? (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help truncate block max-w-[200px]">{item.bemerkungen.substring(0,30)}...</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs break-words whitespace-normal z-50">
                            <p>{item.bemerkungen}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      item.bemerkungen || '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" onClick={() => onRecordTransaction(item, 'Zugang')} className="text-green-600 hover:text-green-700">
                             <PlusSquare className="h-4 w-4" />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Zugang buchen</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                     <TooltipProvider delayDuration={100}>
                       <Tooltip>
                         <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onRecordTransaction(item, 'Abgang')} className="text-orange-600 hover:text-orange-700">
                              <MinusSquare className="h-4 w-4" />
                            </Button>
                         </TooltipTrigger>
                         <TooltipContent><p>Abgang buchen</p></TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onEditItem(item)} className="text-blue-600 hover:text-blue-700">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Artikel bearbeiten</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <TooltipProvider delayDuration={100}>
                           <Tooltip>
                             <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                             </TooltipTrigger>
                             <TooltipContent><p>Artikel löschen</p></TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Möchten Sie den Artikel "{item.produktName} {item.chargenNummer ? `(Charge: ${item.chargenNummer})` : `(Art.-Nr.: ${item.artikelNummer})`}" wirklich unwiderruflich löschen?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteItem(item.id)} className="bg-destructive hover:bg-destructive/90">
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

