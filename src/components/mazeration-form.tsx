"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { calculateNetWeightDetailsForProtocol, korrDichte20, calcVolumeFromMassAndDensity, toVolumeLiters } from '@/lib/mazeration-calc';
import { getGithubToken } from '@/lib/github-token';
import { getTankDefinitions, syncTankDefinitionsWithInventory } from '@/lib/tank-sync';
import type { TankDefinition } from '@/schemas/tankSchema';
import {
  TARE_PER_CRATE_KG_FIXED,
  getDerivedUnitsForProtocol,
  parseFormNumber,
  combineDateTime,
  formatNumberWithComma,
  calculateRatioDetails,
  calculateMacerationDurationDetails,
  calculateTaskDurationHours,
  calculateYieldAndLossDetails,
  calculateLADetails,
  buildCalculatedValuesForImportedProtocol,
} from '@/lib/mazeration-form-helpers';
import { useCalculatedFormValues } from '@/hooks/use-calculated-form-values';
import { generatePdf } from '@/lib/mazeration-pdf';
import { generateDocx } from '@/lib/mazeration-docx';
import { generateSingleProtocolXlsx, generateCumulativeXlsx } from '@/lib/mazeration-xlsx';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import * as StockService from '@/lib/stock-service';


import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, TestTubeDiagonal, Weight, Percent, FlaskConical, CalendarDays, Clock, Droplets, Info, Hash, FileText, Download, MessageSquare, Box, Thermometer, Award, Printer, Archive, Sigma, TimerIcon, Upload, Warehouse } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { mazerationFormSchema, type MazerationFormData } from '@/schemas/mazerationSchema';
import { Skeleton } from '@/components/ui/skeleton';


const getSsrSafeDefaultValues = (): MazerationFormData => {
  const fixedDate = new Date(0); // Use a fixed date for SSR and initial client render
  return {
    macerationName: '',
    batchNumber: '',
    creationDate: null,
    plantName: '',
    plantDescription: '',
    plantPart: '',
    harvestDate: null,
    qualityAssessment: '',
  plantWeight: null,
    plantWeightUnit: 'g',
  numberOfCrates: null,
  grossWeightKg: null,
  tarePerCrateKg: TARE_PER_CRATE_KG_FIXED,
  numberOfPallets: null,
  tarePerPalletKg: 20.0,
    alcoholType: '',
  alcoholConcentration: 0,
    alcoholVolume: 0,
    alcoholVolumeUnit: 'ml',
    tankStartL: null,
    tankEndL: null,
    macerationStart: null,
    macerationStartTime: '',
    macerationEnd: null,
    macerationEndTime: '',
    roomTemperature: null,
    yieldVolume: null,
    yieldMassKg: null,
    yieldDensityAt: null,
    yieldSpindelTemp: null,
    endConcentration: null,
    targetTankNr: '',
    remarks: '',
    vorbereitungDate: null,
    vorbereitungStartTime: "",
    vorbereitungEndTime: "",
    verarbeitungKraeuterDate: null,
    verarbeitungKraeuterStartTime: "",
    verarbeitungKraeuterEndTime: "",
    verarbeitungMazeratDate: null,
    verarbeitungMazeratStartTime: "",
    verarbeitungMazeratEndTime: "",
    reinigungDate: null,
    reinigungStartTime: "",
    reinigungEndTime: "",
    sonstigesDate: null,
    sonstigesStartTime: "",
    sonstigesEndTime: "",
  };
};const getClientDefaultValues = (): MazerationFormData => {
  const now = new Date();
  return {
    ...getSsrSafeDefaultValues(), // Start with SSR safe defaults
    // creationDate, macerationStart, macerationEnd are now optional and not set by default
  };
};



export default function MazerationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [loggedProtocols, setLoggedProtocols] = useState<MazerationFormData[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingInventoryItem, setPendingInventoryItem] = useState<StoredInventoryItem | null>(null);
  const [availableTanks, setAvailableTanks] = useState<TankDefinition[]>([]);
  const [useCustomTank, setUseCustomTank] = useState(false);
  useEffect(() => { setAvailableTanks(getTankDefinitions()); }, []);
  // LocalStorage: Protokolle beim Start laden
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mazerationProtocols');
      if (stored) {
        try {
          setLoggedProtocols(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);
  const [allLoggedCalculatedValues, setAllLoggedCalculatedValues] = useState<ReturnType<typeof useCalculatedFormValues>['calculatedValues'][]>([]);
  // LocalStorage: Protokolle nach Änderung speichern
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mazerationProtocols', JSON.stringify(loggedProtocols));
    }
  }, [loggedProtocols]);
  const [clientMounted, setClientMounted] = useState(false);

  const form = useForm<MazerationFormData>({
    resolver: zodResolver(mazerationFormSchema),
    defaultValues: getSsrSafeDefaultValues(), 
  });

  // Persist tare per crate in localStorage: read on mount and write on change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTara = window.localStorage.getItem('taraPerCrateKg');
    if (storedTara) {
      const parsed = parseFloat(storedTara);
      if (Number.isFinite(parsed) && parsed > 0) {
        form.setValue('tarePerCrateKg', parsed, { shouldValidate: false });
      }
    }
    const sub = form.watch((value, { name }) => {
      if (name === 'tarePerCrateKg') {
        const v = value.tarePerCrateKg;
        if (v !== null && v !== undefined) {
          try { window.localStorage.setItem('taraPerCrateKg', String(v)); } catch (e) {}
        }
      }
    });
    return () => sub.unsubscribe();
  }, [form]);
  
  const { calculatedValues, setters: setCalculatedValueSetters } = useCalculatedFormValues(form);

  const tankStartLForm  = form.watch('tankStartL');
  const tankEndLForm    = form.watch('tankEndL');
  const yieldMassKgForm = form.watch('yieldMassKg');
  const yieldDensityForm = form.watch('yieldDensityAt');
  const yieldTempForm   = form.watch('yieldSpindelTemp');

  useEffect(() => { setClientMounted(true); }, []);

  useEffect(() => {
    if (clientMounted) {
      const clientDefaults = getClientDefaultValues();
      if (searchParams.get('resetForm') === 'true') {
        form.reset(clientDefaults);
        Object.values(setCalculatedValueSetters).forEach(setter => {
          if (typeof setter === 'function') {
            const setterName = setter.name.toLowerCase();
            if (setterName.includes('ratio')) setter('1:X' as any);
            else if (setterName.includes('duration')) setter('0 Tage, 0 Stunden' as any);
            else setter(0 as any);
          }
        });
        router.replace('/', { scroll: false });
      } else {
        // Optional fields are now not automatically set
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [clientMounted, searchParams, router]); // form and setCalculatedValueSetters removed for stability


  const plantWeightUnit = form.watch('plantWeightUnit');

  const handleNumericInputChange = (field: any, rawValue: string) => {
    if (/^[0-9]*[,]?[0-9]*$/.test(rawValue) || rawValue === "") {
      field.onChange(rawValue);
    }
  };

  const getNumericFieldValueForDisplay = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    return String(value).replace('.', ',');
  };


  async function onSubmit(values: MazerationFormData) {
    setIsLoading(true);
    try {
        const { yieldUnit: yieldVolumeUnitForSave } = getDerivedUnitsForProtocol(values.plantWeightUnit);
        const dataForExportFiles: MazerationFormData = { ...values, yieldVolumeUnit: yieldVolumeUnitForSave };

        generatePdf(dataForExportFiles, calculatedValues, false);
        await generateDocx(dataForExportFiles, calculatedValues, false);
        
        const currentLoggedProtocols = [...loggedProtocols, dataForExportFiles];
        const currentAllLoggedCalculatedValues = [...allLoggedCalculatedValues, calculatedValues];

        setLoggedProtocols(currentLoggedProtocols);
        setAllLoggedCalculatedValues(currentAllLoggedCalculatedValues);

        generateCumulativeXlsx(currentLoggedProtocols, currentAllLoggedCalculatedValues);

        toast({
          title: "Protokolle Exportiert",
          description: `PDF & DOCX für aktuelles Protokoll heruntergeladen. Kumulative XLSX-Log-Datei aktualisiert und heruntergeladen.`,
          variant: 'default',
        });

        // Lager-Zugang vorschlagen wenn Zieltank und Ausbeute vorhanden
        if (values.targetTankNr && values.yieldVolume) {
          const { yieldUnit } = getDerivedUnitsForProtocol(values.plantWeightUnit);
          const yieldInLiters = toVolumeLiters(values.yieldVolume, yieldUnit);
          const proposed: StoredInventoryItem = {
            id: uuidv4(),
            artikelNummer: values.batchNumber,
            produktName: values.macerationName,
            chargenNummer: values.batchNumber,
            category: 'M',
            tankNr: values.targetTankNr,
            currentQuantityLiters: yieldInLiters,
            alcoholVolProzent: values.endConcentration ?? 0,
            lastInventoryDate: new Date(),
            bemerkungen: values.remarks ?? '',
            kennzeichen: 'S',
          };
          setPendingInventoryItem(proposed);
        }

    } catch (error) {
        console.error("Error submitting form for export:", error);
        toast({
            title: "Fehler beim Exportieren",
            description: `Beim Exportieren des Protokolls ist ein Fehler aufgetreten: ${error instanceof Error ? error.message : String(error)}`,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  }

  function handleConfirmInventoryEntry() {
    if (!pendingInventoryItem) return;
    try {
      StockService.persistAddEntry(pendingInventoryItem);
      toast({
        title: 'Lager-Zugang gebucht',
        description: `${pendingInventoryItem.currentQuantityLiters.toFixed(2)} L ${pendingInventoryItem.produktName} in ${pendingInventoryItem.tankNr} eingebucht.`,
      });
      // Tank-Definitionen synchronisieren, damit ein per Freitext eingegebener,
      // noch unbekannter Zieltank in der Tankverwaltung auftaucht - und der Nutzer
      // gewarnt wird, falls dadurch (z.B. bei einem Tippfehler) ein neuer Tank entsteht.
      const neuAngelegt = syncTankDefinitionsWithInventory();
      if (neuAngelegt.length > 0) {
        toast({
          title: `Neuer Tank angelegt: ${neuAngelegt.map(t => t.tankNr).join(', ')}`,
          description: 'Tanknummer war nicht bekannt, wurde mit 5000L Standardgröße angelegt. Bei Tippfehlern bitte in der Tankverwaltung korrigieren.',
          variant: 'destructive',
        });
        setAvailableTanks(getTankDefinitions());
      }
    } catch (err) {
      toast({ title: 'Fehler beim Einbuchen', variant: 'destructive' });
    } finally {
      setPendingInventoryItem(null);
    }
  }

  const handlePrintEmptyForm = async () => {
    const emptyData: MazerationFormData = getSsrSafeDefaultValues(); 
    const { yieldUnit, lossUnit } = getDerivedUnitsForProtocol('g'); 
    
    const emptyCalculatedValues: ReturnType<typeof useCalculatedFormValues>['calculatedValues'] = {
        ratio: "1:X",
        macerationDuration: "0 Tage, 0 Stunden",
        calculatedNetWeightKg: null,
        averageNetWeightPerCrateKg: null,
        yieldDisplayUnit: yieldUnit,
        lossAbsolute: null,
        lossPercentage: null,
        lossUnitDisplay: lossUnit,
        eingesetzteLA: null,
        ausbeuteLA: null,
        verlustLA: null,
        vorbereitungHours: null,
        verarbeitungKraeuterHours: null,
        verarbeitungMazeratHours: null,
        reinigungHours: null,
        sonstigesHours: null,
        summeZeitaufzeichnungStunden: null,
    };

    generatePdf(emptyData, emptyCalculatedValues, true);
    generateSingleProtocolXlsx(emptyData, emptyCalculatedValues, true);
    await generateDocx(emptyData, emptyCalculatedValues, true);
    toast({
      title: "Leeres Protokoll Exportiert",
      description: "Ein leeres Protokoll wurde als PDF, XLSX und DOCX heruntergeladen.",
      variant: 'default',
    });
  };


  const handleImportFromGitHub = async () => {
    const token = getGithubToken() || null;
    if (!token) {
      toast({
        title: 'Kein GitHub-Token',
        description: 'Bitte GitHub-Token unter Einstellungen → GitHub Integration konfigurieren.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      const listResp = await fetch(
        'https://api.github.com/repos/woku369/mazerationsmeister/contents/mazeration-protocols',
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      );

      if (listResp.status === 404) {
        toast({ title: 'Keine PWA-Protokolle', description: 'Das Verzeichnis mazeration-protocols/ existiert noch nicht auf GitHub. Bitte zuerst ein Protokoll über die PWA erfassen und synchronisieren.' });
        return;
      }
      if (!listResp.ok) {
        toast({ title: 'GitHub-Fehler', description: `Fehler beim Laden des Verzeichnisses: ${listResp.status}`, variant: 'destructive' });
        return;
      }

      const files: { name: string; download_url: string }[] = await listResp.json();
      const jsonFiles = files.filter(f => f.name.endsWith('.json'));

      if (jsonFiles.length === 0) {
        toast({ title: 'Keine Protokolle', description: 'Keine JSON-Dateien in mazeration-protocols/ gefunden.' });
        return;
      }

      const existingIds = new Set<string>(
        loggedProtocols.map(p => (p as any).id).filter(Boolean)
      );
      const newProtocols: MazerationFormData[] = [];

      for (const file of jsonFiles) {
        try {
          const fileResp = await fetch(file.download_url);
          if (!fileResp.ok) continue;
          const protocol = await fileResp.json();
          if (protocol.id && existingIds.has(protocol.id)) continue;
          newProtocols.push(protocol);
          if (protocol.id) existingIds.add(protocol.id);
        } catch {}
      }

      if (newProtocols.length === 0) {
        toast({ title: 'Alles aktuell', description: 'Alle PWA-Protokolle sind bereits importiert.' });
        return;
      }

      setLoggedProtocols(prev => [...prev, ...newProtocols]);
      // allLoggedCalculatedValues muss synchron mitwachsen, sonst greift
      // generateCumulativeXlsx beim naechsten Export mit undefined-Index daneben
      // und stuerzt ab (siehe docs/REVIEW-2026-09-cross-modul-kohaerenz.md, Befund D5).
      setAllLoggedCalculatedValues(prev => [
        ...prev,
        ...newProtocols.map(p => buildCalculatedValuesForImportedProtocol(p as unknown as Record<string, unknown>)),
      ]);
      toast({
        title: `${newProtocols.length} Protokoll(e) importiert`,
        description: 'PWA-Protokolle wurden erfolgreich in die Desktop-App übernommen.',
      });
    } catch (err) {
      toast({
        title: 'Import-Fehler',
        description: `Fehler beim Importieren: ${err instanceof Error ? err.message : String(err)}`,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const renderTimeTrackingEntry = (
    fieldPrefix: string,
    label: string,
    hours: number | null
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 items-end border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <FormLabel className="md:col-span-12 flex items-center font-medium">{label}</FormLabel>
      <FormField
        control={form.control}
        name={`${fieldPrefix}Date` as any} // Type assertion for dynamic name
        render={({ field }) => (
          <FormItem className="flex flex-col md:col-span-4">
            <FormLabel className="text-xs text-muted-foreground">Datum</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn("w-full pl-3 text-left font-normal h-10", !field.value && "text-muted-foreground")}
                  >
                    {field.value && isValid(field.value) ? format(field.value, "dd.MM.yyyy") : <span>Datum wählen</span>}
                    <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value as Date | undefined}
                  onSelect={(date) => {
                    field.onChange(date);
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${fieldPrefix}StartTime` as any} // Type assertion
        render={({ field }) => (
          <FormItem className="md:col-span-3">
            <FormLabel className="text-xs text-muted-foreground">Von (HH:MM)</FormLabel>
            <FormControl>
              <TimePicker
                value={field.value || ""}
                onChange={field.onChange}
                placeholder="Uhrzeit wählen"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${fieldPrefix}EndTime` as any} // Type assertion
        render={({ field }) => (
          <FormItem className="md:col-span-3">
            <FormLabel className="text-xs text-muted-foreground">Bis (HH:MM)</FormLabel>
            <FormControl>
              <TimePicker
                value={field.value || ""}
                onChange={field.onChange}
                placeholder="Uhrzeit wählen"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormItem className="md:col-span-2">
        <FormLabel className="text-xs text-muted-foreground">Stunden</FormLabel>
        <FormControl>
          <Input value={hours !== null ? formatNumberWithComma(hours, 2) : "---"} readOnly className="bg-muted cursor-not-allowed h-10" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </div>
  );

  if (!clientMounted) {
    return (
      <div className="space-y-8 p-4 container mx-auto">
        <Skeleton className="h-10 w-1/4 mb-6" />
        <Card className="shadow-md">
            <CardHeader>
              <Skeleton className="h-8 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>

            {/* debug panel removed */}
         <Card className="shadow-md">
            <CardHeader>
              <Skeleton className="h-8 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full md:col-span-2" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
        <div className="flex justify-between items-center mt-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-64" />
        </div>
      </div>
    );
  }


  return (
    <>
      <Form {...form}>
  {/* Summary of calculated values removed from UI (kept in form state) */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
           <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary"><FileText className="w-6 h-6" />Basisdaten</CardTitle>
              <CardDescription>Name, Chargennummer und Erstellungsdatum der Mazeration.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="macerationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><FileText className="w-4 h-4 text-muted-foreground" />Name der Mazeration</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Ringelblumenmazerat 2024" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><Hash className="w-4 h-4 text-muted-foreground" />Chargennummer (4–5-stellig)</FormLabel>
                    <FormControl>
                      <Input type="text" maxLength={5} placeholder="0000" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creationDate"
                render={({ field }) => {
                  const [isOpen, setIsOpen] = useState(false);
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-1"><CalendarDays className="w-4 h-4 text-muted-foreground" />Erstellungsdatum</FormLabel>
                      <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value && isValid(field.value) && field.value.getTime() !== new Date(0).getTime() ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Datum wählen</span>
                              )}
                              <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value && field.value.getTime() !== new Date(0).getTime() ? field.value : undefined}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CardContent>
           </Card>


          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary"><Leaf className="w-6 h-6" />Pflanzeninformationen</CardTitle>
              <CardDescription>Details zur verwendeten Pflanze.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="plantName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-1"><Leaf className="w-4 h-4 text-muted-foreground" />Pflanze</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Ringelblume" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plantDescription"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-1"><Info className="w-4 h-4 text-muted-foreground" />Beschreibung der Pflanze, Sorte</FormLabel>
                    <FormControl>
                      <Textarea placeholder="z.B. Calendula officinalis, Sorte 'Erfurter Orangefarbige'" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plantPart"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-1"><TestTubeDiagonal className="w-4 h-4 text-muted-foreground" />Verwendeter Pflanzenteil</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="– auswählen –" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Oberirdische Pflanze">Oberirdische Pflanze</SelectItem>
                        <SelectItem value="Blüten">Blüten</SelectItem>
                        <SelectItem value="Blätter">Blätter</SelectItem>
                        <SelectItem value="Früchte / Beeren">Früchte / Beeren</SelectItem>
                        <SelectItem value="Rinde">Rinde</SelectItem>
                        <SelectItem value="Wurzeln">Wurzeln</SelectItem>
                        <SelectItem value="Samen">Samen</SelectItem>
                        <SelectItem value="Schalen">Schalen</SelectItem>
                        <SelectItem value="Ganze Pflanze">Ganze Pflanze</SelectItem>
                        <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="harvestDate"
                render={({ field }) => {
                  const [isOpen, setIsOpen] = useState(false);
                  return (
                    <FormItem className="flex flex-col md:col-span-2">
                      <FormLabel className="flex items-center gap-1"><CalendarDays className="w-4 h-4 text-muted-foreground" />Erntedatum</FormLabel>
                      <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value && isValid(field.value) ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Datum wählen</span>
                              )}
                              <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsOpen(false);
                            }}
                             disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="qualityAssessment"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-1"><Award className="w-4 h-4 text-muted-foreground" />Qualitätsbeurteilung bei Anlieferung</FormLabel>
                    <FormControl>
                      <Textarea placeholder="z.B. Optik, Geruch, Frische..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {plantWeightUnit === 'kg' && (
                <>
                  <FormField
                    control={form.control}
                    name="numberOfCrates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><Box className="w-4 h-4 text-muted-foreground" />Anzahl Kisten</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            {...field}
                            value={getNumericFieldValueForDisplay(field.value)}
                            onChange={e => handleNumericInputChange(field, e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grossWeightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><Weight className="w-4 h-4 text-muted-foreground" />Bruttogewicht Kisten (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,0"
                            {...field}
                            value={getNumericFieldValueForDisplay(field.value)}
                            onChange={e => handleNumericInputChange(field, e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="md:col-span-1">
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><Weight className="w-4 h-4 text-muted-foreground"/>Tara pro Kiste (kg)</FormLabel>
                      <FormControl>
                        <FormField
                          control={form.control}
                          name="tarePerCrateKg"
                          render={({ field }) => (
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder={formatNumberWithComma(TARE_PER_CRATE_KG_FIXED, 2)}
                              {...field}
                              value={getNumericFieldValueForDisplay(field.value ?? TARE_PER_CRATE_KG_FIXED)}
                              onChange={e => handleNumericInputChange(field, e.target.value)}
                            />
                          )}
                        />
                      </FormControl>
                    </FormItem>
                  </div>
                  {/* Paletten */}
                  <div className="md:col-span-2 border-t pt-3 mt-1">
                    <p className="text-sm text-muted-foreground font-medium mb-3">Palettenmanagement (optional)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="numberOfPallets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1"><Weight className="w-4 h-4 text-muted-foreground"/>Anzahl Paletten</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                {...field}
                                value={getNumericFieldValueForDisplay(field.value)}
                                onChange={e => handleNumericInputChange(field, e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tarePerPalletKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1"><Weight className="w-4 h-4 text-muted-foreground"/>Tara / Palette (kg)</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="20,00"
                                {...field}
                                value={getNumericFieldValueForDisplay(field.value ?? 20.0)}
                                onChange={e => handleNumericInputChange(field, e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                   <div className="md:col-span-1">
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><Weight className="w-4 h-4 text-muted-foreground"/>Nettogewicht Pflanze (berechnet, kg)</FormLabel>
                      <FormControl>
                        <Input
                          value={calculatedValues.calculatedNetWeightKg !== null && calculatedValues.calculatedNetWeightKg > 0 ? formatNumberWithComma(calculatedValues.calculatedNetWeightKg, 2) : (calculatedValues.calculatedNetWeightKg === null ? '---' : 'Ungültig')}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                        />
                      </FormControl>
                      {calculatedValues.calculatedNetWeightKg !== null && calculatedValues.calculatedNetWeightKg <= 0 && (
                        <p className="text-sm text-destructive pt-1">Nettogewicht muss positiv sein.</p>
                      )}
                       {form.formState.errors.grossWeightKg?.type === 'custom' && form.formState.errors.grossWeightKg?.message && (
                         <p className="text-sm text-destructive pt-1">{form.formState.errors.grossWeightKg.message}</p>
                       )}
                    </FormItem>
                  </div>
                  <div className="md:col-span-1">
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><Weight className="w-4 h-4 text-muted-foreground" />Netto-Durchschnittsgewicht pro Kiste (kg)</FormLabel>
                      <FormControl>
                        <Input
                          value={calculatedValues.averageNetWeightPerCrateKg !== null && calculatedValues.averageNetWeightPerCrateKg > 0 ? formatNumberWithComma(calculatedValues.averageNetWeightPerCrateKg, 2) : (calculatedValues.averageNetWeightPerCrateKg === null ? '---' : 'Ungültig')}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                        />
                      </FormControl>
                    </FormItem>
                  </div>
                </>
              )}

              <div className="md:col-span-1 space-y-2">
                <FormLabel className="flex items-center gap-1"><Weight className="w-4 h-4 text-muted-foreground" />Einwaage Pflanze</FormLabel>
                <div className="flex gap-2 items-start">
                  <FormField
                    control={form.control}
                    name="plantWeight"
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,0"
                            {...field}
                            value={getNumericFieldValueForDisplay(field.value)}
                            onChange={e => handleNumericInputChange(field, e.target.value)}
                           />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="plantWeightUnit"
                    render={({ field }) => (
                      <FormItem className="w-[80px]">
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            if (value === 'g') {
                                form.setValue('numberOfCrates', null, {shouldValidate: true});
                                form.setValue('grossWeightKg', null, {shouldValidate: true});
                                setCalculatedValueSetters.setCalculatedNetWeightKg(null);
                                setCalculatedValueSetters.setAverageNetWeightPerCrateKg(null);
                            }
                        }} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Einheit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              {plantWeightUnit === 'g' && <div className="md:col-span-1"></div>}


            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary"><FlaskConical className="w-6 h-6" />Alkoholinformationen</CardTitle>
              <CardDescription>Details zum verwendeten Alkohol.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="alcoholType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><FlaskConical className="w-4 h-4 text-muted-foreground" />Welcher Alkohol</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Weingeist" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alcoholConcentration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><Percent className="w-4 h-4 text-muted-foreground" />Alkohol (%vol.)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,0"
                        {...field}
                        value={getNumericFieldValueForDisplay(field.value)}
                        onChange={e => handleNumericInputChange(field, e.target.value)}
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-1 space-y-2">
                <FormLabel className="flex items-center gap-1"><Droplets className="w-4 h-4 text-muted-foreground" />Einwaage Alkohol</FormLabel>
                <div className="flex gap-2 items-start">
                  <FormField
                    control={form.control}
                    name="alcoholVolume"
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                           <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            {...field}
                            value={getNumericFieldValueForDisplay(field.value)}
                            onChange={e => handleNumericInputChange(field, e.target.value)}
                           />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="md:col-span-2 border-t pt-4 space-y-3">
                <p className="text-sm text-muted-foreground font-medium">📏 Steigrohranzeige (optional) — Anfangs- und Endstand ablesen, Menge wird berechnet</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tankStartL"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anfangsstand (L)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="z.B. 4020"
                            {...field}
                            value={getNumericFieldValueForDisplay(field.value)}
                            onChange={e => handleNumericInputChange(field, e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tankEndL"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endstand (L)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="z.B. 3010"
                            {...field}
                            value={getNumericFieldValueForDisplay(field.value)}
                            onChange={e => handleNumericInputChange(field, e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                {Number(tankStartLForm) > 0 && Number(tankEndLForm) >= 0 && Number(tankStartLForm) > Number(tankEndLForm) && (
                  <p className="text-sm text-green-700 bg-green-50 rounded-lg p-2">
                    🧮 Eingesetzt: <strong>{(Number(tankStartLForm) - Number(tankEndLForm)).toFixed(3).replace('.', ',')} L</strong>
                    &nbsp;({String(tankStartLForm).replace('.', ',')} − {String(tankEndLForm).replace('.', ',')} L)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>


          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary"><Clock className="w-6 h-6" />Mazerationszeitraum</CardTitle>
              <CardDescription>Daten zum Beginn und Ende der Mazeration.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="macerationStart"
                render={({ field }) => {
                  const [isOpen, setIsOpen] = useState(false);
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-1"><CalendarDays className="w-4 h-4 text-muted-foreground" />Beginn</FormLabel>
                      <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value && isValid(field.value) && field.value.getTime() !== new Date(0).getTime() ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Datum wählen</span>
                              )}
                              <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value && field.value.getTime() !== new Date(0).getTime() ? field.value : undefined}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                           
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="macerationStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Uhrzeit (HH:MM)</FormLabel>
                    <FormControl>
                      <TimePicker
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Uhrzeit wählen"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="macerationEnd"
                render={({ field }) => {
                  const [isOpen, setIsOpen] = useState(false);
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-1"><CalendarDays className="w-4 h-4 text-muted-foreground" />Ende</FormLabel>
                      <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value && isValid(field.value) && field.value.getTime() !== new Date(0).getTime() ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Datum wählen</span>
                              )}
                              <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value && field.value.getTime() !== new Date(0).getTime() ? field.value : undefined}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="macerationEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Uhrzeit (HH:MM)</FormLabel>
                    <FormControl>
                      <TimePicker
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Uhrzeit wählen"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem className="md:col-span-2">
                <FormLabel className="text-xs text-muted-foreground">Dauer</FormLabel>
                <FormControl>
                  <Input value={calculatedValues.macerationDuration} readOnly className="bg-muted cursor-not-allowed h-10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </CardContent>
          </Card>


          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary"><Thermometer className="w-6 h-6" />Raumtemperatur</CardTitle>
              <CardDescription>Durchschnittliche Temperatur während der Mazeration.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="roomTemperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><Thermometer className="w-4 h-4 text-muted-foreground" />Durchschnittliche Raumtemperatur (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="20,5"
                        {...field}
                        value={getNumericFieldValueForDisplay(field.value)}
                        onChange={e => handleNumericInputChange(field, e.target.value)}
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>


          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary"><FileText className="w-6 h-6" />Ergebnis</CardTitle>
              <CardDescription>Berechnete Ausbeute und Verlustdaten.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="yieldVolume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><FileText className="w-4 h-4 text-muted-foreground" />Ausbeute (Menge)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,0"
                        {...field}
                        value={getNumericFieldValueForDisplay(field.value)}
                        onChange={e => handleNumericInputChange(field, e.target.value)}
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endConcentration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><FileText className="w-4 h-4 text-muted-foreground" />Endkonzentration (%vol.)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,0"
                        {...field}
                        value={getNumericFieldValueForDisplay(field.value)}
                        onChange={e => handleNumericInputChange(field, e.target.value)}
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetTankNr"
                render={({ field }) => {
                  const isKnownTank = !field.value || availableTanks.some(t => t.tankNr === field.value);
                  const showCustomInput = useCustomTank || (!!field.value && !isKnownTank);
                  return (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-1"><Warehouse className="w-4 h-4 text-muted-foreground" />Zieltank (für Lagereinbuchung)</FormLabel>
                      {!showCustomInput ? (
                        <Select
                          value={field.value || '__none__'}
                          onValueChange={(v) => {
                            if (v === '__custom__') { setUseCustomTank(true); field.onChange(''); return; }
                            field.onChange(v === '__none__' ? '' : v);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Zieltank wählen (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">— Kein Zieltank / Einbuchung überspringen —</SelectItem>
                            {availableTanks.map(t => (
                              <SelectItem key={t.tankNr} value={t.tankNr}>{t.bezeichnung} ({t.tankNr})</SelectItem>
                            ))}
                            <SelectItem value="__custom__">+ Anderer/neuer Tank (manuell eingeben)…</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-1">
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="z.B. T 341, Fass-3"
                              {...field}
                              value={field.value ?? ''}
                              autoFocus
                            />
                          </FormControl>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-amber-600">
                              {isKnownTank ? 'Freie Eingabe' : 'Dieser Tank ist noch nicht angelegt — wird beim Speichern automatisch als neuer Tank erfasst.'}
                            </p>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground underline shrink-0"
                              onClick={() => { setUseCustomTank(false); field.onChange(''); }}
                            >
                              zurück zur Liste
                            </button>
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <div className="md:col-span-1">
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><FileText className="w-4 h-4 text-muted-foreground" />Verlust (absolut)</FormLabel>
                  <FormControl>
                    <Input
                      value={calculatedValues.lossAbsolute !== null ? formatNumberWithComma(calculatedValues.lossAbsolute, 2) : '---'}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </FormControl>
                </FormItem>
              </div>
              <div className="md:col-span-1">
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><FileText className="w-4 h-4 text-muted-foreground" />Verlust (%)</FormLabel>
                  <FormControl>
                    <Input
                      value={calculatedValues.lossPercentage !== null ? `${formatNumberWithComma(calculatedValues.lossPercentage, 2)} %` : '---'}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </FormControl>
                </FormItem>
              </div>
              <div className="md:col-span-2 border-t pt-4 space-y-3">
                <p className="text-sm text-muted-foreground font-medium">⚗️ Ausbeute aus kg + Dichte (optional) — kg eingeben, Volumen wird berechnet</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="yieldMassKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Masse Mazerat (kg)</FormLabel>
                        <FormControl>
                          <Input type="text" inputMode="decimal" placeholder="0,000"
                            {...field}
                            value={getNumericFieldValueForDisplay(field.value)}
                            onChange={e => handleNumericInputChange(field, e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="yieldDensityAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dichte bei Spindeltemp. (g/cm³)</FormLabel>
                        <FormControl>
                          <Input type="text" inputMode="decimal" placeholder="1,0000"
                            {...field}
                            value={field.value != null ? String(field.value).replace('.', ',') : ''}
                            onChange={e => {
                              const v = e.target.value.replace(',', '.');
                              field.onChange(v === '' ? null : parseFloat(v) || null);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="yieldSpindelTemp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spindeltemperatur (°C)</FormLabel>
                        <FormControl>
                          <Input type="text" inputMode="decimal" placeholder="20,0"
                            {...field}
                            value={getNumericFieldValueForDisplay(field.value)}
                            onChange={e => handleNumericInputChange(field, e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                {Number(yieldMassKgForm) > 0 && Number(yieldDensityForm) > 0 && (() => {
                  const rhoT  = Number(yieldDensityForm);
                  const temp  = yieldTempForm != null ? Number(yieldTempForm) : NaN;
                  const rho20 = korrDichte20(rhoT, isNaN(temp) ? 20 : temp);
                  const volL  = calcVolumeFromMassAndDensity(Number(yieldMassKgForm), rhoT, isNaN(temp) ? undefined : temp);
                  return (
                    <p className="text-sm text-green-700 bg-green-50 rounded-lg p-2">
                      🧮 <strong>{String(yieldMassKgForm).replace('.', ',')} kg</strong>
                      {' ÷ ρ₂₀ '}<strong>{rho20.toFixed(4).replace('.', ',')} g/cm³</strong>
                      {' = '}<strong>{volL.toFixed(3).replace('.', ',')} L</strong>
                      {!isNaN(temp) && temp !== 20 && ` (Korr. ${rhoT.toFixed(4).replace('.', ',')} bei ${temp}°C → ${rho20.toFixed(4).replace('.', ',')} bei 20°C)`}
                    </p>
                  );
                })()}
              </div>
            </CardContent>
          </Card>


          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary"><Clock className="w-6 h-6" />Zeitaufzeichnung</CardTitle>
              <CardDescription>Erfasste Zeiten für Vorbereitung, Verarbeitung und Reinigung.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderTimeTrackingEntry("vorbereitung", "Vorbereitung", calculatedValues.vorbereitungHours)}
              {renderTimeTrackingEntry("verarbeitungKraeuter", "Verarbeitung Kräuter", calculatedValues.verarbeitungKraeuterHours)}
              {renderTimeTrackingEntry("verarbeitungMazerat", "Verarbeitung Mazerat", calculatedValues.verarbeitungMazeratHours)}
              {renderTimeTrackingEntry("reinigung", "Reinigung", calculatedValues.reinigungHours)}
              {renderTimeTrackingEntry("sonstiges", "Sonstiges", calculatedValues.sonstigesHours)}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 items-end">
                <div className="md:col-span-10"></div>
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-xs text-muted-foreground">Summe Stunden</FormLabel>
                  <FormControl>
                    <Input value={calculatedValues.summeZeitaufzeichnungStunden !== null ? formatNumberWithComma(calculatedValues.summeZeitaufzeichnungStunden, 2, 'Std.') : '---'} readOnly className="bg-muted cursor-not-allowed h-10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>
            </CardContent>
          </Card>


          <div className="flex items-center justify-between p-4 border border-dashed border-accent/40 rounded-lg bg-accent/5">
            <div>
              <p className="text-sm font-medium text-primary">PWA-Protokolle importieren</p>
              <p className="text-xs text-muted-foreground">Lädt synchronisierte Protokolle aus GitHub (mazeration-protocols/) in die Desktop-App</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleImportFromGitHub}
              disabled={isImporting}
              className="text-accent border-accent hover:bg-accent/10 ml-4 shrink-0"
            >
              {isImporting
                ? <><Archive className="mr-2 h-4 w-4 animate-spin" /> Importiere...</>
                : <><Upload className="mr-2 h-4 w-4" /> Aus GitHub laden</>
              }
            </Button>
          </div>

                    <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={handlePrintEmptyForm} className="text-accent border-accent hover:bg-accent/10" disabled={isLoading}>
                <Printer className="mr-2 h-4 w-4" /> Leeres Protokoll Exportieren
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
               {isLoading ? <><Archive className="mr-2 h-4 w-4 animate-spin" /> Exportiere...</> : <><Download className="mr-2 h-4 w-4" /> Protokoll Exportieren & Log Aktualisieren</>}
            </Button>
          </div>
        </form>
      </Form>
      <Toaster />

      <AlertDialog open={!!pendingInventoryItem} onOpenChange={(open) => { if (!open) setPendingInventoryItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mazerat ins Lager einbuchen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingInventoryItem && (
                <>
                  <strong>{pendingInventoryItem.currentQuantityLiters.toFixed(2)} L</strong>{' '}
                  <strong>{pendingInventoryItem.produktName}</strong>{' '}
                  (Charge {pendingInventoryItem.chargenNummer},{' '}
                  {pendingInventoryItem.alcoholVolProzent > 0 ? `${pendingInventoryItem.alcoholVolProzent} %vol.` : 'kein Alkoholgehalt angegeben'}){' '}
                  in Tank <strong>{pendingInventoryItem.tankNr}</strong> als Zugang einbuchen?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Überspringen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInventoryEntry}>Einbuchen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

