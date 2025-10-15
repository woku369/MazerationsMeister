

"use client";
let lastProduktName = '';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, PlusCircle, Download } from 'lucide-react';
import InventoryTable from './inventory-table';
import AddInventoryItemDialog from './add-inventory-item-dialog';
import RecordTransactionDialog from './record-transaction-dialog';
import InventorySummary from './inventory-summary';
import AddEditArtikelDefinitionDialog from './add-edit-artikel-definition-dialog';
import ArtikelDefinitionTable from './artikel-definition-table';
import InventoryTransactionTable from './inventory-transaction-table';
import AssignContainerDialog from './assign-container-dialog';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StoredInventoryItem, InventoryTransaction, InventoryTransactionCoreData } from '@/schemas/inventorySchema';
import type { ArtikelDefinition, ArtikelDefinitionFormInput } from '@/schemas/artikelDefinitionSchema';
import { format } from 'date-fns';
import { syncTankDefinitionsWithInventory } from '@/lib/tank-sync';
import { hybridStorage } from '@/lib/hybrid-storage';

export default function InventoryManagement() {
  // State für erkannte Spalten und Import-Warnungen
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importHeaderWarnings, setImportHeaderWarnings] = useState<string[]>([]);
  
  // Hilfsfunktion zum Löschen aller Artikeldefinitionen (nur bei expliziter Anforderung)
  const clearArtikelDefinitionen = async () => {
    setArtikelDefinitionen([]);
    if (typeof window !== 'undefined') {
      await hybridStorage.set('artikelDefinitionen', []);
    }
  };
  // HybridStorage: Lagerdaten beim Start laden
  useEffect(() => {
    const loadData = async () => {
      if (typeof window !== 'undefined') {
        try {
          const items = await hybridStorage.get('inventoryItems');
          if (items) setInventoryItems(items);
          
          const artikel = await hybridStorage.get('artikelDefinitionen');
          if (artikel) setArtikelDefinitionen(artikel);
          
          const transactions = await hybridStorage.get('inventoryTransactions');
          if (transactions) setInventoryTransactions(transactions);
        } catch (err) {
          console.error('Failed to load inventory data:', err);
        }
      }
    };
    loadData();
  }, []);

  // State für Artikeldefinitionen - wird async im useEffect geladen
  const [artikelDefinitionen, setArtikelDefinitionen] = useState<ArtikelDefinition[]>([]);
  
  // State für Lagerartikel - wird async im useEffect geladen
  const [inventoryItems, setInventoryItems] = useState<StoredInventoryItem[]>([]);
  
  // State für Transaktionen - wird async im useEffect geladen
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  
  const [clientMounted, setClientMounted] = useState(false);
  const [localExportPath, setLocalExportPath] = useState('');
  const [oneDrivePath, setOneDrivePath] = useState('');
  const [autoSave, setAutoSave] = useState(false);
  const [lastSaveInfo, setLastSaveInfo] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isArtikelDefinitionDialogOpen, setIsArtikelDefinitionDialogOpen] = useState(false);
  const [isAssignContainerDialogOpen, setIsAssignContainerDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoredInventoryItem | null>(null);
  const [editingArtikelDefinition, setEditingArtikelDefinition] = useState<ArtikelDefinition | null>(null);
  const [itemForTransaction, setItemForTransaction] = useState<StoredInventoryItem | null>(null);
  const [itemForContainerAssignment, setItemForContainerAssignment] = useState<StoredInventoryItem | null>(null);
  // Flag, ob gerade ein Import läuft
  const [isImporting, setIsImporting] = useState(false);
  // Synchronisiere Kennzeichen in allen Lagerartikeln, wenn sich der Artikelstamm ändert und kein Import läuft
  useEffect(() => {
    if (isImporting) return;
    if (artikelDefinitionen.length === 0 || inventoryItems.length === 0) return;
    setInventoryItems(prevItems => prevItems.map(item => {
      const def = artikelDefinitionen.find(a => a.produktName === item.produktName);
      return {
        ...item,
        kennzeichen: def ? def.kennzeichen : '',
      };
    }));
  }, [artikelDefinitionen, isImporting]);
  const [currentTransactionType, setCurrentTransactionType] = useState<'Zugang' | 'Abgang' | null>(null);

  const { toast } = useToast();

  // Automatisches Speichern im hybridStorage bei Änderungen
  useEffect(() => {
    if (typeof window !== 'undefined' && inventoryItems.length > 0) {
      hybridStorage.set('inventoryItems', inventoryItems).catch(console.error);
    }
  }, [inventoryItems]);

  useEffect(() => {
    if (typeof window !== 'undefined' && artikelDefinitionen.length > 0) {
      hybridStorage.set('artikelDefinitionen', artikelDefinitionen).catch(console.error);
    }
  }, [artikelDefinitionen]);

  useEffect(() => {
    if (typeof window !== 'undefined' && inventoryTransactions.length > 0) {
      hybridStorage.set('inventoryTransactions', inventoryTransactions).catch(console.error);
    }
  }, [inventoryTransactions]);

  // XLSX Import für Artikelstamm und Lagerbestand
  const handleImportXLSX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Import: Header aus Zeile 5, Daten ab Zeile 7 (0-basiert)
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headerRowIndex = 4; // Zeile 5
        const dataStartIndex = 6; // Zeile 7
        const header: string[] = Array.isArray(json[headerRowIndex]) ? (json[headerRowIndex] as string[]) : [];
        setImportHeaders(header);

        const normalize = (s: any) => ('' + (s || '')).toLowerCase().replace(/\s+/g, '').replace(/\u00A0/g, '');

        // Aliases für App-Felder
        const COLUMN_ALIASES: Record<string, string[]> = {
          artikelNummer: ['artikel-nr.', 'artnr', 'artikelnummer', 'art.-nr', 'artnr.'],
          produktName: ['produktname', 'sorte', 'prod', 'produkt'],
          chargenNummer: ['charge', 'chargen', 'chargen-nummer'],
          category: ['kategorie', 'prod', 'category'],
          kennzeichen: ['kennzeichen', 'merkmal', 'zeichen'],
          tankNr: ['tank-nr.', 'tanknr', 'behälter', 'behaelter'],
          currentQuantityLiters: ['menge(l)', 'menge/lt', 'menge lt', 'menge/ l', 'menge/ l', 'menge/lt.', 'menge/kg', 'menge/kg.'],
          alcoholVolProzent: ['alkoholvol%', 'alk.%vol', 'alkoholvol', 'vol%', 'vol'],
          dichte20C: ['dichte20c', 'dichte20°c', 'dichte 20°c', 'spez.', 'spez', 'dichte'],
          literAbsolutalkohol: ['literabsolutalkohol', 'l absolutalk.', 'la'],
          lastInventoryDate: ['inventurdatum', 'letztebuchung', 'datum', 'stichtag'],
          bemerkungen: ['bemerkungen', 'notiz', 'info', 'bemerkung'],
        };

        // Erzeuge normalisierte Header-Array
        const normalizedHeader = header.map(h => normalize(h));

        // Mappe App-Feld -> Spaltenindex
        const appFieldIndex: Record<string, number> = {};
        Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
          const found = aliases
            .map(a => normalize(a))
            .map(alias => normalizedHeader.findIndex(h => h === alias))
            .find(idx => idx !== -1);
          if (found !== undefined && found !== -1) appFieldIndex[field] = found;
        });

        // Prüfe, ob es sich um Artikelstamm- oder Lagerbestand-Import handelt
        const isArtikelStammImport = typeof appFieldIndex['produktName'] === 'number' && typeof appFieldIndex['artikelNummer'] === 'number';
        const isLagerbestandImport = typeof appFieldIndex['chargenNummer'] === 'number' && (typeof appFieldIndex['currentQuantityLiters'] === 'number' || normalizedHeader.includes('menge/kg'));

        const rawRows = Array.isArray(json) && json.length > dataStartIndex ? json.slice(dataStartIndex) : [];
        // Bereinige Reihen: nur Arrays, trim Strings und entferne vollständig leere Zeilen
        const rows: any[][] = rawRows
          .filter(r => Array.isArray(r))
          .map(r => (r as any[]).map(cell => (typeof cell === 'string' ? cell.trim() : cell)))
          .filter(r => r.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));

        const parseNumber = (v: any) => {
          if (v === undefined || v === null || v === '') return undefined;
          const s = String(v).replace(/\s+/g, '').replace(',', '.');
          const n = Number(s);
          return Number.isFinite(n) ? n : undefined;
        };

        if (isArtikelStammImport) {
          const neueArtikelDefinitionen: ArtikelDefinition[] = rows.map((row: any[]) => {
            const get = (f: string) => (typeof appFieldIndex[f] === 'number' ? row[appFieldIndex[f]] : undefined);
            return {
              id: uuidv4(),
              artikelNummer: (get('artikelNummer') || '') + '',
              produktName: ((get('produktName') || '') + '').trim(),
              category: (get('category') || '') + '',
              beschreibung: (get('bemerkungen') || '') + '',
              alcoholVolProzent: parseNumber(get('alcoholVolProzent')),
              dichte20C: parseNumber(get('dichte20C')),
              kennzeichen: (get('kennzeichen') || '') + '',
            };
          }).filter(a => a.produktName && String(a.produktName).trim() !== '');
          setArtikelDefinitionen(neueArtikelDefinitionen);
          toast({ title: 'Artikelstamm importiert', description: `${neueArtikelDefinitionen.length} Artikel wurden zum Artikelstamm hinzugefügt.` });
          setIsImporting(false);
          return;
        }

        if (isLagerbestandImport) {
          console.log('═══════════════════════════════════════════════════════════');
          console.log('📥 LAGERBESTAND-IMPORT DEBUG');
          console.log('═══════════════════════════════════════════════════════════');
          console.log(`📊 Total Zeilen in Excel: ${json.length}`);
          console.log(`📍 Header-Zeile (Index ${headerRowIndex}, Zeile ${headerRowIndex + 1}):`, header);
          console.log(`📍 Daten starten bei Index ${dataStartIndex} (Zeile ${dataStartIndex + 1})`);
          console.log(`\n📦 Raw Rows (vor Filter): ${rawRows.length}`);
          console.log(`✅ Bereinigte Rows (nach Filter): ${rows.length}`);
          console.log(`\n🔍 Erste 3 bereinigte Zeilen:`);
          rows.slice(0, 3).forEach((r, idx) => {
            console.log(`   Zeile ${dataStartIndex + idx + 1}:`, r);
          });
          console.log('═══════════════════════════════════════════════════════════\n');
          
          // Excel-Merge-Zellen: Wenn Produktname leer ist, vorherigen Namen verwenden
          let lastProduktName = '';
          let lastCategory = '';
          
          const neueInventoryItems: StoredInventoryItem[] = rows.map((row: any[]) => {
            const getByField = (f: string) => (typeof appFieldIndex[f] === 'number' ? row[appFieldIndex[f]] : undefined);
            
            // Produktname und Kategorie: Wenn leer, vorherigen Wert übernehmen (Excel-Merge-Zellen)
            const produktNameRaw = ((getByField('produktName') || '') + '').trim();
            if (produktNameRaw) {
              lastProduktName = produktNameRaw;
            }
            const categoryRaw = ((getByField('category') || '') + '').trim();
            if (categoryRaw) {
              lastCategory = categoryRaw;
            }
            
            // Versuch: falls Menge in kg statt lt geliefert wird, wir übernehmen Wert trotzdem (Anpassung kann später erfolgen)
            const mengeLtRaw = getByField('currentQuantityLiters');
            const mengeKgRaw = normalizedHeader.includes('menge/kg') ? row[normalizedHeader.indexOf('menge/kg')] : undefined;
            const menge = parseNumber(mengeLtRaw ?? mengeKgRaw) ?? 0;
            const alcoholRaw = parseNumber(getByField('alcoholVolProzent')) ?? 0;
            const d20 = parseNumber(getByField('dichte20C'));
            const la = parseNumber(getByField('literAbsolutalkohol'));
            const lastInvRaw = getByField('lastInventoryDate');
            const lastInv = lastInvRaw ? new Date(lastInvRaw) : new Date();
            return {
              id: uuidv4(),
              artikelNummer: (getByField('artikelNummer') || '') + '',
              kennzeichen: (getByField('kennzeichen') || '') + '',
              chargenNummer: (getByField('chargenNummer') || '') + '',
              produktName: lastProduktName,  // Verwende letzten bekannten Produktnamen
              category: lastCategory,          // Verwende letzte bekannte Kategorie
              tankNr: (getByField('tankNr') || '') + '',
              currentQuantityLiters: menge,
              alcoholVolProzent: alcoholRaw,
              dichte20C: d20,
              literAbsolutalkohol: la,
              lastInventoryDate: lastInv,
              bemerkungen: (getByField('bemerkungen') || '') + '',
            } as StoredInventoryItem;
          }).filter(i => i.produktName && String(i.produktName).trim() !== '' && i.tankNr && String(i.tankNr).trim() !== '');
          
          console.log('═══════════════════════════════════════════════════════════');
          console.log(`✅ Inventory Items nach Filterung: ${neueInventoryItems.length}`);
          console.log(`\n📦 Erste 5 Items:`);
          neueInventoryItems.slice(0, 5).forEach(item => {
            console.log(`   - ${item.produktName} (Tank: ${item.tankNr}): ${item.currentQuantityLiters}L`);
          });
          if (neueInventoryItems.length > 5) {
            console.log(`   ... und ${neueInventoryItems.length - 5} weitere`);
          }
          console.log('═══════════════════════════════════════════════════════════\n');
          
          setInventoryItems(neueInventoryItems);
          toast({ title: 'Lagerbestand importiert', description: `${neueInventoryItems.length} Lagerartikel wurden hinzugefügt.` });
          
          // Tank-Definitionen automatisch synchronisieren nach dem Import
          syncTankDefinitionsWithInventory();
          
          setIsImporting(false);
          return;
        }

        // Wenn kein Typ erkannt wurde
        setImportHeaderWarnings([`Die Datei konnte nicht eindeutig als Artikelstamm oder Lagerbestand erkannt werden. Gefundene Header: ${header.join(', ')}`]);
        toast({ title: 'Import fehlgeschlagen', description: 'Die Datei hat nicht das erwartete Format. Bitte überprüfen Sie die Datei und versuchen Sie es erneut.', variant: 'destructive' });
        setIsImporting(false);
      } catch (err) {
        console.error('Import-Fehler', err);
        toast({ title: 'Import fehlgeschlagen', description: 'Fehler beim Verarbeiten der Datei.', variant: 'destructive' });
      } finally {
        // Immer Import-Flag resetten und File-Input zurücksetzen
        try { setIsImporting(false); } catch (e) {}
        try { if (input) input.value = ''; } catch (e) {}
      }
    };
    reader.readAsArrayBuffer(file);
  };
  // Klammer entfernt, damit der Komponenten-Scope korrekt ist
  const handleOpenAddEditDialogForNew = () => {
    setEditingItem(null);
    setIsAddEditDialogOpen(true);
  };
  const handleDeleteItem = (itemId: string) => {
    setInventoryItems(prevItems => prevItems.filter(item => item.id !== itemId));
    toast({
      title: 'Artikelcharge gelöscht',
      description: `Die Artikelcharge wurde aus dem Lagerbestand entfernt. Zugehörige Transaktionen bleiben im Protokoll.`,
      variant: 'destructive'
    });
  };
  const handleOpenAddEditDialogForEdit = (itemToEdit: StoredInventoryItem) => {
    setEditingItem(itemToEdit);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenAssignContainerDialog = (item: StoredInventoryItem) => {
    setItemForContainerAssignment(item);
    setIsAssignContainerDialogOpen(true);
  };

  const handleAssignToContainer = async (tankId: string) => {
    if (!itemForContainerAssignment) return;
    
    // Update inventory item with new tank
    setInventoryItems(prevItems => 
      prevItems.map(item => 
        item.id === itemForContainerAssignment.id
          ? { ...item, tankNr: tankId }
          : item
      )
    );

    // Sync tanks after inventory change
    await syncTankDefinitionsWithInventory();

    toast({
      title: 'Container zugeordnet',
      description: `Produkt "${itemForContainerAssignment.produktName}" wurde Container "${tankId}" zugeordnet.`,
    });

    setItemForContainerAssignment(null);
  };

  useEffect(() => {
    if (inventoryItems.length === 0) return;
    // Erzeuge fehlende Artikeldefinitionen aus importierten Lagerartikeln
    const existierendeNamen = new Set(artikelDefinitionen.map(a => a.produktName));
    const produktNamenFromInventory = Array.from(new Set(inventoryItems.map(i => (i.produktName || '').toString().trim()).filter(Boolean)));
    const fehlendeNamen = produktNamenFromInventory.filter(name => !existierendeNamen.has(name));
    if (fehlendeNamen.length === 0) return;
    const neueArtikel: ArtikelDefinition[] = fehlendeNamen.map(name => {
      const item = inventoryItems.find(i => (i.produktName || '').toString().trim() === name);
      return {
        id: uuidv4(),
        artikelNummer: '',
        produktName: name,
        category: item?.category || '',
        beschreibung: '',
        alcoholVolProzent: item?.alcoholVolProzent,
        dichte20C: item?.dichte20C,
        kennzeichen: item ? (artikelDefinitionen.find(a => a.produktName === item.produktName)?.kennzeichen || '') : '',
      };
    });
    setArtikelDefinitionen(prev => [...prev, ...neueArtikel]);
    toast({ title: 'Artikelstamm aktualisiert', description: `${neueArtikel.length} Produkte aus Lagerbestand übernommen.` });
  }, [inventoryItems]);
  // Handler für Kopieren der Warnungen (muss im Komponenten-Body stehen)
  const handleCopyWarnings = () => {
    if (importWarnings.length > 0) {
      navigator.clipboard.writeText(importWarnings.join('\n'));
      toast({ title: 'Warnungen kopiert', description: 'Die Warnungen wurden in die Zwischenablage kopiert.' });
    }
  };
  // XLSX Export für Artikelübersicht
  const generateSummaryXlsx = async (itemsToSummarize: StoredInventoryItem[]) => {
    const wb = XLSX.utils.book_new();
    const sheetData: (string | number | undefined | null)[][] = [];
    sheetData.push([
      "Artikel-Nr.", "Produktname", "Gesamtmenge (L)", "Gesamt LA (L)"
    ]);
    const productSummaries = itemsToSummarize.reduce<Record<string, any>>((acc, item) => {
      const key = item.artikelNummer;
      if (!acc[key]) {
        acc[key] = {
          artikelNummer: item.artikelNummer,
          produktName: item.produktName,
          totalQuantityLiters: 0,
          totalAbsoluteAlcoholLiters: 0,
        };
      }
      acc[key].totalQuantityLiters += item.currentQuantityLiters;
      acc[key].totalAbsoluteAlcoholLiters += item.currentQuantityLiters * (item.alcoholVolProzent / 100);
      return acc;
    }, {});
    Object.values(productSummaries).forEach(summary => {
      sheetData.push([
        summary.artikelNummer,
        summary.produktName,
        summary.totalQuantityLiters,
        summary.totalAbsoluteAlcoholLiters,
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Lageruebersicht_Artikel");
    const fileName = `Lageruebersicht_Artikel_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;

    // Exportpfad aus Einstellungen holen
    let exportDir = '';
    if (typeof window !== 'undefined') {
      exportDir = await hybridStorage.get('exportPath') || '';
    }
    // Fallback: Arbeitsverzeichnis
    if (!exportDir) {
      if (typeof window !== 'undefined' && window.require) {
        const path = window.require('path');
        exportDir = path.join(process.cwd());
      } else {
        exportDir = '';
      }
    }

    // Datei im Exportverzeichnis speichern
    if (typeof window !== 'undefined' && window.require) {
      try {
        const fs = window.require('fs');
        const path = window.require('path');
        const { shell } = window.require('electron');
        const exportPath = path.join(exportDir, fileName);
        XLSX.writeFile(wb, exportPath);

        // Dialog mit Auswahl
        const auswahl = window.prompt('Export erfolgreich! Was möchten Sie tun?\n1 = Datei öffnen\n2 = Exportordner öffnen\nAbbrechen = nichts tun', '');
        if (auswahl === '1') {
          shell.openPath(exportPath);
        } else if (auswahl === '2') {
          shell.openPath(exportDir);
        }
      } catch (err) {
        // Fehler beim Öffnen ignorieren
      }
    } else {
      // Fallback: Standardverhalten
      XLSX.writeFile(wb, fileName);
    }

    toast({
      title: "Lagerübersicht Exportiert",
      description: `Die Lagerübersicht wurde als XLSX-Datei im Exportordner (${exportDir || 'Arbeitsverzeichnis'}) gespeichert.`,
    });
  };

  // XLSX Export für Transaktionsprotokoll
  const generateTransactionXlsx = (transactionsToExport: InventoryTransaction[]) => {
    const wb = XLSX.utils.book_new();
    const sheetData: (string | number | undefined | null)[][] = [];
    sheetData.push([
      "Datum", "Artikel-Nr.", "Produktname", "Charge", "Typ", "Menge (L)", "Bemerkungen"
    ]);
    transactionsToExport.forEach(transaction => {
      sheetData.push([
        format(transaction.transactionDate, 'dd.MM.yyyy HH:mm'),
        transaction.artikelNummer,
        transaction.produktName,
        transaction.chargenNummer || 'N/A',
        transaction.type,
        transaction.quantityLiters,
        transaction.notes || '',
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Transaktionsprotokoll");
    XLSX.writeFile(wb, `Transaktionsprotokoll_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
    toast({
      title: "Transaktionsprotokoll Exportiert",
      description: "Das Transaktionsprotokoll wurde als XLSX-Datei heruntergeladen.",
    });
  };
  // Handler für Artikeldefinition löschen
  const handleDeleteArtikelDefinition = async (definitionId: string) => {
    const updated = artikelDefinitionen.filter(def => def.id !== definitionId);
    setArtikelDefinitionen(updated);
    if (typeof window !== 'undefined') {
      await hybridStorage.set('artikelDefinitionen', updated);
    }
    toast({
      title: 'Artikeldefinition gelöscht',
      description: `Die Artikeldefinition wurde aus dem Artikelstamm entfernt.`,
      variant: 'destructive'
    });
  };

  // Handler für Export Summary
  const handleExportSummary = async () => {
    // ...implementiere Export-Logik oder rufe vorhandene Funktion auf...
    // Annahme: generateSummaryXlsx ist vorhanden
    if (inventoryItems.length === 0) {
      toast({
        title: "Keine Daten zum Exportieren",
        description: "Es sind keine Lagerartikel zum Erstellen einer Übersicht vorhanden.",
        variant: "destructive",
      });
      return;
    }
    await generateSummaryXlsx(inventoryItems);
  };

  // Handler für Export Transactions
  const handleExportTransactions = () => {
    if (inventoryTransactions.length === 0) {
      toast({
        title: "Keine Daten zum Exportieren",
        description: "Es sind keine Transaktionen zum Exportieren vorhanden.",
        variant: "destructive",
      });
      return;
    }
    generateTransactionXlsx(inventoryTransactions);
  };

  // Handler für Save Item
  const handleSaveItem = (itemData: any) => {
    if (itemData.id) {
      const updatedItem: StoredInventoryItem = {
        ...itemData,
        currentQuantityLiters: itemData.quantityLiters,
        alcoholVolProzent: itemData.alcoholVolProzent,
        lastInventoryDate: itemData.inventoryDate,
        bemerkungen: itemData.bemerkungen || '',
        kennzeichen: (() => {
          const def = artikelDefinitionen.find(a => a.produktName === itemData.produktName);
          return def ? def.kennzeichen : '';
        })(),
      };
      setInventoryItems(prevItems =>
        prevItems.map(item => (item.id === updatedItem.id ? updatedItem : item))
      );
      toast({
        title: 'Artikelcharge aktualisiert',
        description: `${updatedItem.produktName} (${updatedItem.artikelNummer} / ${updatedItem.chargenNummer || 'N/A'}) wurde erfolgreich aktualisiert.`,
      });
    } else {
      const newItem: StoredInventoryItem = {
        ...itemData,
        id: uuidv4(),
        currentQuantityLiters: itemData.quantityLiters,
        alcoholVolProzent: itemData.alcoholVolProzent,
        lastInventoryDate: itemData.inventoryDate,
        bemerkungen: itemData.bemerkungen || '',
        kennzeichen: (() => {
          const def = artikelDefinitionen.find(a => a.produktName === itemData.produktName);
          return def ? def.kennzeichen : '';
        })(),
      };
      setInventoryItems(prevItems => [...prevItems, newItem]);
      toast({
        title: 'Artikelcharge hinzugefügt',
        description: `${newItem.produktName} (${newItem.artikelNummer} / ${newItem.chargenNummer || 'N/A'}) wurde zum Lagerbestand hinzugefügt.`,
      });
    }
    
    // Tank-Definitionen automatisch synchronisieren nach dem Speichern
    syncTankDefinitionsWithInventory();
    
    // Dialog schließen
    setIsAddEditDialogOpen(false);
    setEditingItem(null);
  };

  // Handler für Save Artikeldefinition
  const handleSaveArtikelDefinition = (definitionData: ArtikelDefinitionFormInput) => {
    // Nur prüfen, wenn eine Artikelnummer eingegeben wurde (nicht leer, nicht undefined)
    const artikelNummerTrimmed = (definitionData.artikelNummer ?? '').trim();
    let isDuplicateArtikelNummer = false;
    if (artikelNummerTrimmed.length > 0) {
      isDuplicateArtikelNummer = artikelDefinitionen.some(
        (def) => (def.artikelNummer ?? '').trim() === artikelNummerTrimmed && def.id !== definitionData.id
      );
      if (isDuplicateArtikelNummer) {
        toast({
          title: 'Fehler: Artikelnummer existiert bereits',
          description: `Die Artikelnummer "${artikelNummerTrimmed}" wird bereits für einen anderen Artikel verwendet. Bitte wählen Sie eine eindeutige Artikelnummer.`,
          variant: 'destructive'
        });
        return;
      }
    }
    if (definitionData.id) {
      const updatedDefinition: ArtikelDefinition = {
        id: definitionData.id,
        artikelNummer: definitionData.artikelNummer ?? "",
        produktName: definitionData.produktName,
        category: definitionData.category,
        beschreibung: definitionData.beschreibung || '',
        kennzeichen: definitionData.kennzeichen || '',
      };
      setArtikelDefinitionen(prevDefs =>
        prevDefs.map(def => (def.id === updatedDefinition.id ? updatedDefinition : def))
      );
      toast({
        title: 'Artikeldefinition aktualisiert',
        description: `Artikel "${updatedDefinition.produktName}" (${updatedDefinition.artikelNummer}) wurde erfolgreich aktualisiert.`
      });
    } else {
      const newDefinition: ArtikelDefinition = {
        id: uuidv4(),
        artikelNummer: definitionData.artikelNummer ?? "",
        produktName: definitionData.produktName,
        category: definitionData.category,
        beschreibung: definitionData.beschreibung || '',
        kennzeichen: definitionData.kennzeichen || '',
      };
      setArtikelDefinitionen(prevDefs => [...prevDefs, newDefinition]);
      toast({
        title: 'Artikeldefinition hinzugefügt',
        description: `Neuer Artikel "${newDefinition.produktName}" (${newDefinition.artikelNummer}) wurde zum Artikelstamm hinzugefügt.`
      });
    }
    handleCloseArtikelDefinitionDialog();
  };
  // Handler für Artikeldefinition-Dialog
  const handleOpenArtikelDefinitionDialogForNew = () => {
    setEditingArtikelDefinition(null);
    setIsArtikelDefinitionDialogOpen(true);
  };
  const handleOpenArtikelDefinitionDialogForEdit = (definition: ArtikelDefinition) => {
  if (!definition || !definition.id) return;
  setEditingArtikelDefinition(definition);
  setIsArtikelDefinitionDialogOpen(true);
  };
  const handleCloseArtikelDefinitionDialog = () => {
    setIsArtikelDefinitionDialogOpen(false);
    setEditingArtikelDefinition(null);
  };

  // Handler für Transaktions-Dialog
  const handleOpenTransactionDialog = (item: StoredInventoryItem, type: 'Zugang' | 'Abgang') => {
    setItemForTransaction(item);
    setCurrentTransactionType(type);
    setIsTransactionDialogOpen(true);
  };
  const handleCloseTransactionDialog = () => {
    setIsTransactionDialogOpen(false);
    setItemForTransaction(null);
    setCurrentTransactionType(null);
  };
  const handleSaveTransaction = (transaction: InventoryTransactionCoreData) => {
    if (!itemForTransaction || !currentTransactionType) return;

    // 1. Transaktion speichern
    const newTransaction: InventoryTransaction = {
      ...transaction,
      id: uuidv4(),
      transactionDate: new Date(),
      type: currentTransactionType,
      itemId: itemForTransaction.id,
      artikelNummer: itemForTransaction.artikelNummer,
      produktName: itemForTransaction.produktName,
      chargenNummer: itemForTransaction.chargenNummer || '',
      notes: transaction.notes || '',
    };
    setInventoryTransactions(prev => [...prev, newTransaction]);

    // 2. Lagerbestand aktualisieren
    setInventoryItems(prevItems => prevItems.map(item => {
      if (item.id === itemForTransaction.id) {
        const currentQty = item.currentQuantityLiters || 0;
        const transactionQty = transaction.quantityLiters;
        const newQty = currentTransactionType === 'Zugang' 
          ? currentQty + transactionQty 
          : currentQty - transactionQty;
        
        return {
          ...item,
          currentQuantityLiters: Math.max(0, newQty), // Verhindere negative Bestände
          lastInventoryDate: new Date(),
        };
      }
      return item;
    }));

    toast({
      title: 'Transaktion gespeichert',
      description: `${currentTransactionType} von ${transaction.quantityLiters}L wurde gebucht. Lagerbestand aktualisiert.`
    });
    handleCloseTransactionDialog();
  };
  useEffect(() => { setClientMounted(true); }, []);
  // DEAKTIVIERT: Automatisches Laden verhindert, da es importierte Daten überschreibt
  // Verwenden Sie stattdessen den manuellen "Daten aus Speicherpfad importieren" Button
  /*
  useEffect(() => {
    if (typeof window !== 'undefined' && window.require && localExportPath) {
      try {
        const fs = window.require('fs');
        const path = window.require('path');
        const filePath = path.join(localExportPath, 'lagerbestand.json');
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf-8');
          const items = JSON.parse(data);
          if (Array.isArray(items)) setInventoryItems(items);
        }
      } catch (err) {}
    }
    if (typeof window !== 'undefined' && window.require && oneDrivePath) {
      try {
        const fs = window.require('fs');
        const path = window.require('path');
        const filePath = path.join(oneDrivePath, 'lagerbestand.json');
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf-8');
          const items = JSON.parse(data);
          if (Array.isArray(items)) setInventoryItems(items);
        }
      } catch (err) {}
    }
  }, [localExportPath, oneDrivePath]);
  */

  // Ergänze die Funktion saveAllData im Komponenten-Scope
  const saveAllData = async () => {
    // Beispiel: Daten speichern
    await hybridStorage.set('artikelDefinitionen', artikelDefinitionen);
    await hybridStorage.set('inventoryItems', inventoryItems);
    await hybridStorage.set('inventoryTransactions', inventoryTransactions);
    setLastSaveInfo(`Zuletzt gespeichert: ${new Date().toLocaleString()}`);
    toast({ title: 'Daten gespeichert', description: 'Speichern erfolgreich.' });
  };

  // Sicheres JSON-Backup erstellen (Electron fs falls vorhanden, sonst Browser-Download)
  const createBackup = async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        artikelDefinitionen,
        inventoryItems,
        inventoryTransactions,
      };
      const data = JSON.stringify(payload, null, 2);
      const fileName = `MazerationsMeister_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;

      if (typeof window !== 'undefined' && (window as any).require) {
        // Electron / Node environment
        try {
          const fs = (window as any).require('fs');
          const path = (window as any).require('path');
          const exportDir = (await hybridStorage.get('exportPath')) || process.cwd();
          const exportPath = path.join(exportDir, fileName);
          fs.writeFileSync(exportPath, data, 'utf-8');
          toast({ title: 'Backup gespeichert', description: `Backup als ${exportPath} gespeichert.` });
          return;
        } catch (err) {
          // Falls Schreiben mit Electron fehlschlägt, fallthrough zum Browser-Download
          console.warn('Electron write failed, fallback to browser download', err);
        }
      }

      // Browser-Download Fallback
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Backup erstellt', description: 'Backup wurde heruntergeladen.' });
    } catch (err) {
      console.error('Backup-Fehler', err);
      toast({ title: 'Backup fehlgeschlagen', description: 'Fehler beim Erstellen des Backups.', variant: 'destructive' });
    }
  };

  // --- Rendering ---
  return (
    <div>
      {/* Import-Spaltenanzeige und Warnungen */}
      {importHeaders.length > 0 && (
        <div className="my-4 p-4 border rounded bg-gray-50">
          <div className="font-bold mb-2">Erkannte Spalten in der Importdatei:</div>
          <div className="mb-2 text-sm text-gray-700">{importHeaders.join(', ')}</div>
          {importHeaderWarnings.length > 0 && (
            <div className="text-red-600 text-sm font-semibold">{importHeaderWarnings.join(' | ')}</div>
          )}
        </div>
      )}
      {isImporting && (
        <div className="fixed top-0 left-0 w-full bg-yellow-100 text-yellow-900 text-center py-2 z-50 shadow">
          <span>Import läuft ... bitte warten</span>
        </div>
      )}
      {/* Einstellungen-Dialog immer rendern */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einstellungen: Speicherpfade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lokaler Exportpfad</label>
              <input type="text" value={localExportPath} onChange={e => {
                setLocalExportPath(e.target.value);
                if (typeof window !== 'undefined') hybridStorage.set('exportPath', e.target.value);
              }} className="w-full border rounded px-2 py-1" />
              <div className="text-xs text-muted-foreground mt-1">Aktueller Pfad: <span className="font-mono">{localExportPath || '(nicht gesetzt)'}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">OneDrive-Pfad</label>
              <input type="text" value={oneDrivePath} onChange={e => {
                setOneDrivePath(e.target.value);
                if (typeof window !== 'undefined') hybridStorage.set('oneDrivePath', e.target.value);
              }} className="w-full border rounded px-2 py-1" />
              <div className="text-xs text-muted-foreground mt-1">Aktueller Pfad: <span className="font-mono">{oneDrivePath || '(nicht gesetzt)'}</span></div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="autoSave" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} />
              <label htmlFor="autoSave" className="text-sm">Automatisch speichern</label>
            </div>
            <div className="flex gap-2 mt-2">
              <Button type="button" onClick={() => saveAllData()} variant="outline">Manuell speichern</Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {lastSaveInfo ? lastSaveInfo : 'Noch nicht gespeichert.'}
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button onClick={() => setIsSettingsDialogOpen(false)} variant="default">Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Ladeanzeige */}
      {!clientMounted ? (
        <div className="space-y-4 p-4 md:p-6">
          <div className="animate-pulse bg-muted h-10 w-48 rounded-md mb-6"></div> 
          <div className="animate-pulse bg-card h-40 w-full rounded-md mb-6"></div> 
          <div className="animate-pulse bg-muted h-10 w-48 rounded-md"></div> 
          <div className="animate-pulse bg-card h-64 w-full rounded-md"></div> 
        </div>
      ) : (
        <div className="space-y-8">
          {/* Einstellungen öffnen */}
          <div className="mb-2 flex justify-end">
            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => setIsSettingsDialogOpen(true)} variant="outline" className="border-primary text-primary">Speicher-Einstellungen</Button>
              <Button type="button" onClick={() => createBackup()} variant="outline" className="border-amber-600 text-amber-600">Backup erstellen</Button>
            </div>
          </div>
          {/* Hauptinhalt der Komponente */}
          {/* Section for Artikelstamm */}
          <section className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-primary mb-2">Import XLSX</label>
              <input type="file" accept=".xlsx,.xls" onChange={handleImportXLSX} className="block" />
              <p className="text-muted-foreground text-xs mt-1">Importiere Artikelstammdaten oder Lagerbestände als XLSX. Die Kategorie muss nachträglich ergänzt werden.</p>
            </div>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-primary">Artikelstamm verwalten</h2>
                <Button onClick={handleOpenArtikelDefinitionDialogForNew} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                    <BookOpen className="mr-2 h-4 w-4" /> Neuen Artikel definieren
                </Button>
            </div>
            <ArtikelDefinitionTable
              definitions={artikelDefinitionen}
              onEditDefinition={handleOpenArtikelDefinitionDialogForEdit}
              onDeleteDefinition={handleDeleteArtikelDefinition}
            />
          </section>

          <Separator className="my-8" />

          {/* Section for Lagerbestand & Chargen & Protokoll */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-primary">Lagerbestand, Chargen &amp; Protokoll</h2>
               <div className="flex gap-2">
                 <Button onClick={handleOpenAddEditDialogForNew} className="bg-primary hover:bg-primary/90">
                    <PlusCircle className="mr-2 h-4 w-4" /> Neue Charge/Bestand anlegen
                </Button>
               </div>
            </div>
            <InventorySummary items={inventoryItems} />
            <InventoryTable 
              items={inventoryItems} 
              onDeleteItem={handleDeleteItem}
              onEditItem={handleOpenAddEditDialogForEdit}
              onRecordTransaction={handleOpenTransactionDialog}
              onAssignToContainer={handleOpenAssignContainerDialog}
            />
            <div className="mt-8">
              <Card>
                <CardHeader>
                    <CardTitle className="text-xl text-primary">Datenexport</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={handleExportSummary} variant="outline" className="text-accent border-accent hover:bg-accent/10 flex-1">
                        <Download className="mr-2 h-4 w-4" /> Lagerübersicht exportieren (XLSX)
                    </Button>
                    <Button onClick={handleExportTransactions} variant="outline" className="text-accent border-accent hover:bg-accent/10 flex-1">
                        <Download className="mr-2 h-4 w-4" /> Transaktionsprotokoll exportieren (XLSX)
                    </Button>
                    <Button onClick={async () => {
                      // Exportiere alle inventoryItems als XLSX
                      const wb = XLSX.utils.book_new();
                      const sheetData: (string | number | undefined | null)[][] = [];
                      sheetData.push([
                        "Artikel-Nr.", "Produktname", "Charge", "Kategorie", "TankNr", "Menge (L)", "Alkohol %", "Dichte 20°C", "Liter Absolutalkohol", "Inventurdatum", "Bemerkungen"
                      ]);
                      inventoryItems.forEach(item => {
                        sheetData.push([
                          item.artikelNummer,
                          item.produktName,
                          item.chargenNummer,
                          item.category,
                          item.tankNr,
                          item.currentQuantityLiters,
                          item.alcoholVolProzent,
                          item.dichte20C,
                          item.literAbsolutalkohol,
                          item.lastInventoryDate ? (typeof item.lastInventoryDate === 'string' ? item.lastInventoryDate : (item.lastInventoryDate instanceof Date ? format(item.lastInventoryDate, 'yyyy-MM-dd') : '')) : '',
                          item.bemerkungen
                        ]);
                      });
                      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), "Aktueller_Lagerbestand");
                      // Exportpfad aus Einstellungen holen
                      let exportDir = '';
                      if (typeof window !== 'undefined') {
                        exportDir = (await hybridStorage.get('exportPath')) || '';
                      }
                      // Fallback: Arbeitsverzeichnis
                      if (!exportDir) {
                        if (typeof window !== 'undefined' && window.require) {
                          const path = window.require('path');
                          exportDir = path.join(process.cwd());
                        } else {
                          exportDir = '';
                        }
                      }
                      const fileName = `Lagerbestand_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
                      if (typeof window !== 'undefined' && window.require) {
                        try {
                          const fs = window.require('fs');
                          const path = window.require('path');
                          const { shell } = window.require('electron');
                          const exportPath = path.join(exportDir, fileName);
                          XLSX.writeFile(wb, exportPath);
                          const auswahl = window.prompt('Export erfolgreich! Was möchten Sie tun?\n1 = Datei öffnen\n2 = Exportordner öffnen\nAbbrechen = nichts tun', '');
                          if (auswahl === '1') {
                            shell.openPath(exportPath);
                          } else if (auswahl === '2') {
                            shell.openPath(exportDir);
                          }
                        } catch (err) {
                          // Fehler ignorieren
                        }
                      } else {
                        XLSX.writeFile(wb, fileName);
                      }
                      toast({
                        title: "Lagerbestand exportiert",
                        description: `Der aktuelle Lagerbestand wurde als XLSX-Datei im Exportordner (${exportDir || 'Arbeitsverzeichnis'}) gespeichert.`,
                      });
                    }} variant="outline" className="text-accent border-accent hover:bg-accent/10 flex-1">
                      <Download className="mr-2 h-4 w-4" /> Aktuellen Lagerbestand exportieren (XLSX)
                    </Button>
                </CardContent>
              </Card>
              <InventoryTransactionTable transactions={inventoryTransactions} />
            </div>
          </section>


          <AddInventoryItemDialog
            isOpen={isAddEditDialogOpen}
            onClose={() => { setIsAddEditDialogOpen(false); setEditingItem(null); }}
            onSaveItem={handleSaveItem}
            initialData={editingItem}
            artikelDefinitionen={artikelDefinitionen} 
          />

          <RecordTransactionDialog
            isOpen={isTransactionDialogOpen}
            onClose={handleCloseTransactionDialog}
            onSaveTransaction={handleSaveTransaction}
            itemToTransact={itemForTransaction}
            transactionType={currentTransactionType}
          />

          <AddEditArtikelDefinitionDialog
            isOpen={isArtikelDefinitionDialogOpen}
            onClose={handleCloseArtikelDefinitionDialog}
            onSaveDefinition={handleSaveArtikelDefinition}
            initialData={editingArtikelDefinition}
          />

          {/* Dialog für Import-Warnungen */}
          <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import-Warnungen</DialogTitle>
              </DialogHeader>
              <div className="max-h-96 overflow-auto mb-4">
                <ul className="text-sm whitespace-pre-wrap">
                  {importWarnings.map((w, i) => (
                    <li key={i + '-' + String(w).slice(0,20)}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2 justify-end">
                <Button onClick={handleCopyWarnings} variant="outline">Warnungen kopieren</Button>
                <Button onClick={() => setIsWarningDialogOpen(false)} variant="default">Schließen</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
  </div>
    );

  return (
  <div className="space-y-8">
      {/* Einstellungen öffnen */}
      <div className="mb-2 flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => document.getElementById('artikelstamm')?.scrollIntoView({ behavior: 'smooth' })}>
            → Artikelstamm
          </Button>
          <Button variant="ghost" size="sm" onClick={() => document.getElementById('lagerbestand')?.scrollIntoView({ behavior: 'smooth' })}>
            → Lagerbestand
          </Button>
          <Button variant="ghost" size="sm" onClick={() => document.getElementById('chargen')?.scrollIntoView({ behavior: 'smooth' })}>
            → Chargen
          </Button>
          <Button variant="ghost" size="sm" onClick={() => document.getElementById('transaktionen')?.scrollIntoView({ behavior: 'smooth' })}>
            → Transaktionen
          </Button>
        </div>
        <Button onClick={() => setIsSettingsDialogOpen(true)} variant="outline" className="border-primary text-primary">Speicher-Einstellungen</Button>
      </div>

      {/* Neuer Button: Aktuellen Lagerbestand als XLSX exportieren */}
      <div className="mb-4">
        <Button onClick={async () => {
          // Exportiere alle inventoryItems als XLSX
          const wb = XLSX.utils.book_new();
          const sheetData: (string | number | undefined | null)[][] = [];
          sheetData.push([
            "Artikel-Nr.", "Produktname", "Charge", "Kategorie", "TankNr", "Menge (L)", "Alkohol %", "Dichte 20°C", "Liter Absolutalkohol", "Inventurdatum", "Bemerkungen"
          ]);
          inventoryItems.forEach(item => {
            // Berechne Liter Absolutalkohol, falls nicht vorhanden
            let literAbsolutalkohol = item.literAbsolutalkohol;
            if (literAbsolutalkohol === undefined || literAbsolutalkohol === null) {
              const menge = parseFloat(String(item.currentQuantityLiters).replace(',', '.'));
              const alc = parseFloat(String(item.alcoholVolProzent).replace(',', '.'));
              if (!isNaN(menge) && !isNaN(alc)) {
                literAbsolutalkohol = menge * (alc / 100);
              } else {
                literAbsolutalkohol = 0;
              }
            }
            sheetData.push([
              item.artikelNummer,
              item.produktName,
              item.chargenNummer,
              item.category,
              item.tankNr,
              item.currentQuantityLiters,
              item.alcoholVolProzent,
              item.dichte20C,
              literAbsolutalkohol,
              item.lastInventoryDate ? (typeof item.lastInventoryDate === 'string' ? item.lastInventoryDate : (item.lastInventoryDate instanceof Date ? format(item.lastInventoryDate, 'yyyy-MM-dd') : '')) : '',
              item.bemerkungen
            ]);
          });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), "Aktueller_Lagerbestand");
          // Exportpfad aus Einstellungen holen
          let exportDir = '';
          if (typeof window !== 'undefined') {
            exportDir = (await hybridStorage.get('exportPath')) || '';
          }
          // Fallback: Arbeitsverzeichnis
          if (!exportDir) {
            if (typeof window !== 'undefined' && window.require) {
              const path = window.require('path');
              exportDir = path.join(process.cwd());
            } else {
              exportDir = '';
            }
          }
          const fileName = `Lagerbestand_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
          if (typeof window !== 'undefined' && window.require) {
            try {
              const fs = window.require('fs');
              const path = window.require('path');
              const { shell } = window.require('electron');
              const exportPath = path.join(exportDir, fileName);
              XLSX.writeFile(wb, exportPath);
              const auswahl = window.prompt('Export erfolgreich! Was möchten Sie tun?\n1 = Datei öffnen\n2 = Exportordner öffnen\nAbbrechen = nichts tun', '');
              if (auswahl === '1') {
                shell.openPath(exportPath);
              } else if (auswahl === '2') {
                shell.openPath(exportDir);
              }
            } catch (err) {
              // Fehler ignorieren
            }
          } else {
            XLSX.writeFile(wb, fileName);
          }
          toast({
            title: "Lagerbestand exportiert",
            description: `Der aktuelle Lagerbestand wurde als XLSX-Datei im Exportordner (${exportDir || 'Arbeitsverzeichnis'}) gespeichert.`,
          });
        }} variant="outline" className="text-accent border-accent hover:bg-accent/10">
          <Download className="mr-2 h-4 w-4" /> Aktuellen Lagerbestand exportieren (XLSX)
        </Button>
      </div>
      {/* Dialog für Import-Warnungen */}
      <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import-Warnungen</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto mb-4">
            <ul className="text-sm whitespace-pre-wrap">
              {importWarnings.map((w, i) => (
                <li key={i + '-' + String(w).slice(0,20)}>{w}</li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={handleCopyWarnings} variant="outline">Warnungen kopieren</Button>
            <Button onClick={() => setIsWarningDialogOpen(false)} variant="default">Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Section for Artikelstamm */}
      <section className="space-y-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-2">Import XLSX</label>
          <input type="file" accept=".xlsx,.xls" onChange={handleImportXLSX} className="block" />
          <p className="text-muted-foreground text-xs mt-1">Importiere Artikelstammdaten oder Lagerbestände als XLSX. Die Kategorie muss nachträglich ergänzt werden.</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary mb-2">Import gespeicherter Daten</label>
          <Button type="button" variant="outline" onClick={async () => {
            let importPath = '';
            if (typeof window !== 'undefined') {
              importPath = (await hybridStorage.get('dataPath')) || '';
            }
            if (importPath && typeof window !== 'undefined' && window.require) {
              try {
                const fs = window.require('fs');
                const path = window.require('path');
                const filePath = path.join(importPath, 'lagerbestand.json');
                if (fs.existsSync(filePath)) {
                  const data = fs.readFileSync(filePath, 'utf-8');
                  const items = JSON.parse(data);
                  if (Array.isArray(items)) setInventoryItems(items);
                  toast({ title: 'Daten importiert', description: 'Lagerbestand wurde aus dem Datenpfad geladen.' });
                } else {
                  toast({ title: 'Import fehlgeschlagen', description: 'Keine gespeicherten Daten gefunden.', variant: 'destructive' });
                }
              } catch (err) {
                toast({ title: 'Import fehlgeschlagen', description: String(err), variant: 'destructive' });
              }
            } else {
              toast({ title: 'Import nicht möglich', description: 'Kein Datenpfad gesetzt oder Umgebung nicht unterstützt.', variant: 'destructive' });
            }
          }}>Daten aus Speicherpfad importieren</Button>
          <p className="text-muted-foreground text-xs mt-1">Lädt den aktuellen Lagerbestand aus dem eingestellten Daten-Speicherpfad.</p>
        </div>
        <div id="artikelstamm" className="py-4 border-b flex justify-between items-center scroll-mt-20">
            <h2 className="text-2xl font-semibold text-primary">Artikelstamm verwalten</h2>
            <Button onClick={handleOpenArtikelDefinitionDialogForNew} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <BookOpen className="mr-2 h-4 w-4" /> Neuen Artikel definieren
            </Button>
        </div>
        <ArtikelDefinitionTable
          definitions={artikelDefinitionen}
          onEditDefinition={handleOpenArtikelDefinitionDialogForEdit}
          onDeleteDefinition={handleDeleteArtikelDefinition}
        />
      </section>

      <Separator className="my-8" />

      {/* Section for Lagerbestand & Chargen & Protokoll */}
      <section className="space-y-4">
        <div id="lagerbestand" className="py-4 border-b flex justify-between items-center scroll-mt-20">
          <h2 className="text-2xl font-semibold text-primary">Lagerbestand, Chargen &amp; Protokoll</h2>
           <div className="flex gap-2">
             <Button onClick={handleOpenAddEditDialogForNew} className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Neue Charge/Bestand anlegen
            </Button>
           </div>
        </div>
        
        <div className="py-2 border-b">
          <h3 className="text-lg font-semibold text-primary">Lagerübersicht nach Artikeln</h3>
        </div>
        <InventorySummary items={inventoryItems} />
        
        <div id="chargen" className="py-2 border-b scroll-mt-20">
          <h3 className="text-lg font-semibold text-primary">Chargen-Übersicht</h3>
        </div>
        <InventoryTable 
          items={inventoryItems} 
          onDeleteItem={handleDeleteItem}
          onEditItem={handleOpenAddEditDialogForEdit}
          onRecordTransaction={handleOpenTransactionDialog}
          onAssignToContainer={handleOpenAssignContainerDialog}
        />
        
        <div className="mt-8">
          <Card>
            <CardHeader>
                <CardTitle className="text-xl text-primary">Datenexport</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleExportSummary} variant="outline" className="text-accent border-accent hover:bg-accent/10 flex-1">
                    <Download className="mr-2 h-4 w-4" /> Lagerübersicht exportieren (XLSX)
                </Button>
                <Button onClick={handleExportTransactions} variant="outline" className="text-accent border-accent hover:bg-accent/10 flex-1">
                    <Download className="mr-2 h-4 w-4" /> Transaktionsprotokoll exportieren (XLSX)
                </Button>
                <Button onClick={async () => {
                  // Exportiere alle inventoryItems als XLSX
                  const wb = XLSX.utils.book_new();
                  const sheetData: (string | number | undefined | null)[][] = [];
                  sheetData.push([
                    "Artikel-Nr.", "Produktname", "Charge", "Kategorie", "TankNr", "Menge (L)", "Alkohol %", "Dichte 20°C", "Liter Absolutalkohol", "Inventurdatum", "Bemerkungen"
                  ]);
                  inventoryItems.forEach(item => {
                    sheetData.push([
                      item.artikelNummer,
                      item.produktName,
                      item.chargenNummer,
                      item.category,
                      item.tankNr,
                      item.currentQuantityLiters,
                      item.alcoholVolProzent,
                      item.dichte20C,
                      item.literAbsolutalkohol,
                      item.lastInventoryDate ? (typeof item.lastInventoryDate === 'string' ? item.lastInventoryDate : (item.lastInventoryDate instanceof Date ? format(item.lastInventoryDate, 'yyyy-MM-dd') : '')) : '',
                      item.bemerkungen
                    ]);
                  });
                  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), "Aktueller_Lagerbestand");
                  // Exportpfad aus Einstellungen holen
                  let exportDir = '';
                  if (typeof window !== 'undefined') {
                    exportDir = (await hybridStorage.get('exportPath')) || '';
                  }
                  // Fallback: Arbeitsverzeichnis
                  if (!exportDir) {
                    if (typeof window !== 'undefined' && window.require) {
                      const path = window.require('path');
                      exportDir = path.join(process.cwd());
                    } else {
                      exportDir = '';
                    }
                  }
                  const fileName = `Lagerbestand_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
                  if (typeof window !== 'undefined' && window.require) {
                    try {
                      const fs = window.require('fs');
                      const path = window.require('path');
                      const { shell } = window.require('electron');
                      const exportPath = path.join(exportDir, fileName);
                      XLSX.writeFile(wb, exportPath);
                      const auswahl = window.prompt('Export erfolgreich! Was möchten Sie tun?\n1 = Datei öffnen\n2 = Exportordner öffnen\nAbbrechen = nichts tun', '');
                      if (auswahl === '1') {
                        shell.openPath(exportPath);
                      } else if (auswahl === '2') {
                        shell.openPath(exportDir);
                      }
                    } catch (err) {
                      // Fehler ignorieren
                    }
                  } else {
                    XLSX.writeFile(wb, fileName);
                  }
                  toast({
                    title: "Lagerbestand exportiert",
                    description: `Der aktuelle Lagerbestand wurde als XLSX-Datei im Exportordner (${exportDir || 'Arbeitsverzeichnis'}) gespeichert.`,
                  });
                }} variant="outline" className="text-accent border-accent hover:bg-accent/10 flex-1">
                  <Download className="mr-2 h-4 w-4" /> Aktuellen Lagerbestand exportieren (XLSX)
                </Button>
            </CardContent>
          </Card>

          <div id="transaktionen" className="py-2 border-b mt-8 scroll-mt-20">
            <h3 className="text-lg font-semibold text-primary">Transaktionsprotokoll</h3>
          </div>
          <InventoryTransactionTable transactions={inventoryTransactions} />
        </div>
      </section>


      <AddInventoryItemDialog
        isOpen={isAddEditDialogOpen}
        onClose={() => { setIsAddEditDialogOpen(false); setEditingItem(null); }}
        onSaveItem={handleSaveItem}
        initialData={editingItem}
        artikelDefinitionen={artikelDefinitionen} 
      />

      <RecordTransactionDialog
        isOpen={isTransactionDialogOpen}
        onClose={handleCloseTransactionDialog}
        onSaveTransaction={handleSaveTransaction}
        itemToTransact={itemForTransaction}
        transactionType={currentTransactionType}
      />

      <AddEditArtikelDefinitionDialog
        isOpen={isArtikelDefinitionDialogOpen}
        onClose={handleCloseArtikelDefinitionDialog}
        onSaveDefinition={handleSaveArtikelDefinition}
        initialData={editingArtikelDefinition}
      />

      <AssignContainerDialog
        isOpen={isAssignContainerDialogOpen}
        onClose={() => {
          setIsAssignContainerDialogOpen(false);
          setItemForContainerAssignment(null);
        }}
        item={itemForContainerAssignment}
        onAssign={handleAssignToContainer}
      />
    </div>
  );
}

// Ende der Komponente

