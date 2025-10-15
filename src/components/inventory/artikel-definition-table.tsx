"use client";

// kennzeichen: string; // "S" für Standard, "V" für Versuch

import type { ArtikelDefinition } from '@/schemas/artikelDefinitionSchema';
import { InventoryItemCategory } from '@/schemas/inventorySchema';
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
import { Trash2, Edit3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

type ArtikelDefinitionTableProps = {
  definitions: ArtikelDefinition[];
  onDeleteDefinition: (id: string) => void;
  onEditDefinition: (definition: ArtikelDefinition) => void;
};

type SortableKeys = keyof Pick<ArtikelDefinition, 'artikelNummer' | 'produktName' | 'category'>;

export default function ArtikelDefinitionTable({ definitions, onDeleteDefinition, onEditDefinition }: ArtikelDefinitionTableProps) {
  const [kennzeichen, setKennzeichen] = useState('S');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys | null; direction: 'ascending' | 'descending' }>({
    key: null,
    direction: 'ascending',
  });

  // Feste Farben für Kategorien
  function getCategoryColor(name: string): string {
    if (name === 'Mazerat' || name === 'M') return '#d1fae5'; // hellgrün
    if (name === 'Destillat' || name === 'Dest') return '#dbeafe'; // hellblau
    return '#e5e7eb'; // hellgrau für andere
  }

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

  // Kennzeichen nachträglich auf 'S' setzen, falls nicht vorhanden
  const definitionsWithKennzeichen = definitions.map(def => ({ ...def, kennzeichen: def.kennzeichen || 'S' }));
  const sortedAndFilteredDefinitions = useMemo(() => {
    let sortableItems = [...definitionsWithKennzeichen];

    // Filtering
    if (categoryFilter !== 'all') {
      sortableItems = sortableItems.filter(def => def.category === categoryFilter);
    }

    // Sorting
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB, 'de', { sensitivity: 'base' });
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          // Fallback for mixed or other types, treat as string
          comparison = String(valA).localeCompare(String(valB), 'de', { sensitivity: 'base' });
        }
        
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableItems;
  }, [definitions, categoryFilter, sortConfig]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl text-primary">Definierte Artikel (Artikelstamm)</CardTitle>
          <div className="w-full sm:w-auto min-w-[200px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Nach Kategorie filtern..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                <SelectItem value="M">
                  <span style={{display:'inline-flex',alignItems:'center'}}>
                    <span style={{background:getCategoryColor('M'),width:18,height:18,borderRadius:4,display:'inline-block',marginRight:8}}></span>
                    Mazerat
                  </span>
                </SelectItem>
                <SelectItem value="Dest">
                  <span style={{display:'inline-flex',alignItems:'center'}}>
                    <span style={{background:getCategoryColor('Dest'),width:18,height:18,borderRadius:4,display:'inline-block',marginRight:8}}></span>
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
              {sortedAndFilteredDefinitions.length === 0 && categoryFilter === 'all' ? "Noch keine Artikel definiert." : 
               sortedAndFilteredDefinitions.length === 0 && categoryFilter !== 'all' ? `Keine Artikel in Kategorie "${categoryFilter}".` :
               `Liste aller definierten Artikel.`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">
                  <Button variant="ghost" onClick={() => requestSort('artikelNummer')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Artikel-Nr. {getSortIcon('artikelNummer')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <Button variant="ghost" onClick={() => requestSort('produktName')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Produktname {getSortIcon('produktName')}
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => requestSort('category')} className="px-1 py-0 h-auto hover:bg-transparent">
                    Kategorie {getSortIcon('category')}
                  </Button>
                </TableHead>
                  <TableHead className="min-w-[80px]">
                    Kennzeichen
                  </TableHead>
                <TableHead className="min-w-[250px]">Beschreibung</TableHead>
                <TableHead className="text-center min-w-[120px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredDefinitions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 h-48">
                    {categoryFilter === 'all' ? "Noch keine Artikel definiert." : `Keine Artikel für Kategorie "${categoryFilter}" gefunden.`}
                  </TableCell>
                </TableRow>
              )}
              {sortedAndFilteredDefinitions.map((def) => (
                <TableRow key={def.id}>
                  <TableCell className="font-medium">{def.artikelNummer}</TableCell>
                  <TableCell>{def.produktName}</TableCell>
                  <TableCell>
                    <Badge style={{background:getCategoryColor(def.category),color:'#222',minWidth:120,display:'inline-flex',justifyContent:'center'}}>
                      {def.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold text-lg align-middle">{def.kennzeichen}</TableCell>
                  <TableCell>
                    {def.beschreibung && def.beschreibung.length > 40 ? (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help truncate block max-w-[250px]">{def.beschreibung.substring(0,40)}...</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs break-words whitespace-normal z-50">
                            <p>{def.beschreibung}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      def.beschreibung || '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onEditDefinition(def)} className="text-blue-600 hover:text-blue-700">
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
                            Möchten Sie den Artikel "{def.produktName} ({def.artikelNummer})" wirklich unwiderruflich aus dem Artikelstamm löschen? 
                            Bestehende Chargen dieses Artikels im Lagerbestand bleiben erhalten, verlieren aber die direkte Verknüpfung zu dieser Definition.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteDefinition(def.id)} className="bg-destructive hover:bg-destructive/90">
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

