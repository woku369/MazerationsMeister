"use client";
// Globale Platzhalter-Variablen für die gesamte Datei
const placeholderText = "____________________";
const placeholderDate = "__.__.____";
const placeholderTime = "__:__";
const placeholderNumber = "___,_";
const placeholderHours = "__,__ Std.";

// Kleine Hilfsfunktionen / Platzhalter, die an mehreren Stellen benötigt werden
let y = 0;
let currentLineHeight = 0;

const getDerivedUnitsForProtocol = (plantWeightUnit?: 'g' | 'kg') => {
  // Wenn Pflanzengewicht in kg angegeben ist, verwenden wir liter für Volumen-Ausgaben, sonst ml
  if (plantWeightUnit === 'kg') return { yieldUnit: 'l', lossUnit: 'l' };
  return { yieldUnit: 'ml', lossUnit: 'ml' };
};

import { zodResolver } from '@hookform/resolvers/zod';
import { calculateNetWeightDetailsForProtocol } from '@/lib/mazeration-calc';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, differenceInMilliseconds, isValid } from 'date-fns';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageOrientation, SectionType, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';


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
import { Leaf, TestTubeDiagonal, Weight, Percent, FlaskConical, CalendarDays, Clock, Droplets, Info, Hash, FileText, Download, MessageSquare, Box, Thermometer, Award, Printer, Archive, Sigma, TimerIcon, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { mazerationFormSchema, type MazerationFormData } from '@/schemas/mazerationSchema';
import { Skeleton } from '@/components/ui/skeleton';

// Default Tara (can be overridden per form)
const TARE_PER_CRATE_KG_FIXED = 2.00;

// Parse form numeric inputs which may use comma as decimal separator
const parseFormNumber = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().replace(/\s+/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Helper function to combine Date and Time string
const combineDateTime = (date: Date | undefined | null, timeString: string | undefined | null): Date | undefined => {
  if (!date || !isValid(date)) return undefined;
  const newDate = new Date(date);
  if (timeString && /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
    const [hours, minutes] = timeString.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  }
  return undefined;
};
// ...Ende der Funktion


const formatNumberWithComma = (num: number | null | undefined, precision: number = 2, unit?: string): string => {
    if (num === null || num === undefined || isNaN(num)) return '---';
    const Suffix = unit ? ` ${unit}` : '';
    return num.toFixed(precision).replace('.', ',') + Suffix;
};


// Platzhalter-Variablen nur einmal deklarieren


// Calculation Helper Functions are in src/lib/mazeration-calc.ts

const calculateRatioDetails = (plantWeight?: number | null, plantWeightUnit?: 'g' | 'kg', alcoholVolume?: number | null, alcoholVolumeUnit?: 'ml' | 'l'): string => {
  let weightInG = Number(plantWeight);

  if (plantWeightUnit === 'kg') {
      weightInG = Number(plantWeight) * 1000;
  }

  let volumeInMl = Number(alcoholVolume);
  if (alcoholVolumeUnit === 'l') {
    volumeInMl = volumeInMl * 1000;
  }

  if (weightInG > 0 && volumeInMl > 0) {
    const calculatedRatio = (volumeInMl / weightInG).toFixed(2);
    return `1:${calculatedRatio.replace('.', ',')}`;
  }
  return '1:X';
};

const calculateMacerationDurationDetails = (macerationStart?: Date | null, macerationStartTime?: string | null, macerationEnd?: Date | null, macerationEndTime?: string | null): string => {
  const startDateTime = combineDateTime(macerationStart, macerationStartTime);
  const endDateTime = combineDateTime(macerationEnd, macerationEndTime);

  if (startDateTime && endDateTime && isValid(startDateTime) && isValid(endDateTime) && startDateTime < endDateTime) {
    const durationMs = differenceInMilliseconds(endDateTime, startDateTime);
    const totalHours = Math.floor(durationMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `${days} Tage, ${hours} Stunden`;
  }
  return '0 Tage, 0 Stunden';
};

const calculateTaskDurationHours = (date?: Date | null, startTime?: string | null, endTime?: string | null): number | null => {
    if (!date || !startTime || !endTime) return null;

    const startDateTime = combineDateTime(date, startTime);
    const endDateTime = combineDateTime(date, endTime);

    if (startDateTime && endDateTime && isValid(startDateTime) && isValid(endDateTime) && endDateTime > startDateTime) {
        const durationMs = differenceInMilliseconds(endDateTime, startDateTime);
        return parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
    }
    return null; 
};


const calculateYieldAndLossDetails = (
    plantWeightUnit?: 'g' | 'kg',
    alcoholVolume?: number | null,
    alcoholVolumeUnit?: 'ml' | 'l',
    yieldVolume?: number | null
  ): { lossAbsolute: number | null; lossPercentage: number | null; lossUnitDisplay: string; yieldDisplayUnit: string } => {
  const { yieldUnit, lossUnit } = getDerivedUnitsForProtocol(plantWeightUnit);

  const alcVolNum = Number(alcoholVolume);
  const yieldVolNum = Number(yieldVolume);

  if (isNaN(alcVolNum) || alcVolNum <= 0 || isNaN(yieldVolNum) || yieldVolNum < 0) {
    return { lossAbsolute: null, lossPercentage: null, lossUnitDisplay: lossUnit, yieldDisplayUnit: yieldUnit };
  }

  let alcoholInMl = alcoholVolumeUnit === 'l' ? alcVolNum * 1000 : alcVolNum;
  let yieldInMlToCompare = yieldUnit === 'l' ? yieldVolNum * 1000 : yieldVolNum;

  if (alcoholInMl <= 0) {
    return { lossAbsolute: null, lossPercentage: null, lossUnitDisplay: lossUnit, yieldDisplayUnit: yieldUnit };
  }

  const absoluteLossInMl = alcoholInMl - yieldInMlToCompare;
  const percentageLoss = (absoluteLossInMl / alcoholInMl) * 100;

  let displayAbsoluteLossValue: number;
  if (lossUnit === 'l') {
    displayAbsoluteLossValue = absoluteLossInMl / 1000;
  } else {
    displayAbsoluteLossValue = absoluteLossInMl;
  }

  return {
    lossAbsolute: parseFloat(displayAbsoluteLossValue.toFixed(2)),
    lossPercentage: parseFloat(percentageLoss.toFixed(2)),
    lossUnitDisplay: lossUnit,
    yieldDisplayUnit: yieldUnit,
  };
};

const calculateLADetails = (
    plantWeightUnit?: 'g' | 'kg',
    alcoholVolume?: number | null,
    alcoholConcentration?: number | null,
    alcoholVolumeUnit?: 'ml' | 'l',
    yieldVolume?: number | null,
    endConcentration?: number | null
  ): { eingesetzteLA: number | null; ausbeuteLA: number | null; verlustLA: number | null } => {
  const alcVol = Number(alcoholVolume);
  const alcConc = Number(alcoholConcentration);
  const yieldVol = Number(yieldVolume);
  const endConc = Number(endConcentration);
  const { yieldUnit } = getDerivedUnitsForProtocol(plantWeightUnit);

  let calculatedEingesetzteLA: number | null = null;
  if (!isNaN(alcVol) && !isNaN(alcConc) && alcVol > 0 && alcConc >= 0) {
      const volumeInLiters = alcoholVolumeUnit === 'ml' ? alcVol / 1000 : alcVol;
      calculatedEingesetzteLA = volumeInLiters * (alcConc / 100);
  }

  let calculatedAusbeuteLA: number | null = null;
  if (!isNaN(yieldVol) && !isNaN(endConc) && yieldVol > 0 && endConc >= 0) {
      const yieldVolumeInLiters = yieldUnit === 'ml' ? yieldVol / 1000 : yieldVol;
      calculatedAusbeuteLA = yieldVolumeInLiters * (endConc / 100);
  }

  let calculatedVerlustLA: number | null = null;
  if (calculatedEingesetzteLA !== null && calculatedAusbeuteLA !== null) {
      calculatedVerlustLA = calculatedEingesetzteLA - calculatedAusbeuteLA;
  }

  return {
    eingesetzteLA: calculatedEingesetzteLA !== null ? parseFloat(calculatedEingesetzteLA.toFixed(4)) : null,
    ausbeuteLA: calculatedAusbeuteLA !== null ? parseFloat(calculatedAusbeuteLA.toFixed(4)) : null,
    verlustLA: calculatedVerlustLA !== null ? parseFloat(calculatedVerlustLA.toFixed(4)) : null,
  };
};


// Function to generate PDF
function generatePdf(
  data: MazerationFormData | null,
  calculatedValues: ReturnType<typeof useCalculatedFormValues>["calculatedValues"],
  isEmptyForm: boolean = false
) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  let y = 15;
  const currentLineHeight = 7;
  const defaultFontSize = 10;
  const titleFontSize = 14;
  const currentMargin = 15;

  // Extrahiere alle benötigten Werte aus calculatedValues
  const {
    yieldDisplayUnit: yieldUnitVal,
    lossUnitDisplay: lossUnitVal,
    ratio,
    macerationDuration,
    lossAbsolute: lossAbs,
    lossPercentage: lossPerc,
    eingesetzteLA,
    ausbeuteLA,
    verlustLA,
    vorbereitungHours,
    verarbeitungKraeuterHours,
    verarbeitungMazeratHours,
    reinigungHours,
    sonstigesHours,
    summeZeitaufzeichnungStunden
  } = calculatedValues;

  function addText(label: string, value: string | number | undefined | null, isBold = false, unitSuffix?: string) {
    let displayValue: string;
    if (isEmptyForm) {
        displayValue = placeholderText;
        if (label.toLowerCase().includes("datum")) displayValue = placeholderDate;
        else if (label.toLowerCase().includes("uhrzeit")) displayValue = placeholderTime;
        else if (label.toLowerCase().includes("nummer") || label.toLowerCase().includes("gewicht") || label.toLowerCase().includes("volumen") || label.toLowerCase().includes("konzentration") || label.toLowerCase().includes("anzahl") || label.toLowerCase().includes("temperatur") || label.toLowerCase().includes("ausbeute") || label.toLowerCase().includes("verlust") || label.toLowerCase().includes("la") || label.toLowerCase().includes("stunden")) {
             displayValue = label.toLowerCase().includes("stunden") ? placeholderHours : placeholderNumber;
             if (label.toLowerCase().includes("einwaage pflanze")) displayValue = `${placeholderNumber} (g/kg)`;
             if (label.toLowerCase().includes("einwaage alkohol")) displayValue = `${placeholderNumber} (ml/l)`;
             if (label.toLowerCase().includes("ausbeute (menge)")) displayValue = `${placeholderNumber} (${yieldUnitVal || 'ml/l'})`;
             if (label.toLowerCase().includes("verlust (absolut)")) displayValue = `${placeholderNumber} (${lossUnitVal || 'ml/l'})`;
             if (label.toLowerCase().includes("tara pro kiste")) displayValue = `${formatNumberWithComma(TARE_PER_CRATE_KG_FIXED, 2)} kg (fix)`;
        }
    } else {
        if (typeof value === 'number') {
            if (label.toLowerCase().includes("verlust (%)") || label.toLowerCase().includes("konzentration (%vol.)") || label.toLowerCase().includes("endkonzentration (%vol.)") ) {
                displayValue = formatNumberWithComma(value, 2, '%vol.');
            } else if (label.toLowerCase().includes("la (liter absolutalkohol)")) {
                 displayValue = formatNumberWithComma(value, 4);
            } else if (label.toLowerCase().includes("stunden")) {
                 displayValue = formatNumberWithComma(value, 2, 'Std.');
            }
            else {
                 displayValue = formatNumberWithComma(value, 2, unitSuffix);
            }
        } else {
            displayValue = String(value || '---');
        }
    }

    if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value)) && !isEmptyForm && !label.toLowerCase().includes("stunden")) return; 

    if (isBold && !isEmptyForm) {
      doc.setFont('helvetica', 'bold');
    } else {
       doc.setFont('helvetica', 'normal');
    }
    const processedLabel = label.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    const processedValue = String(displayValue).replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

    const splitValue = doc.splitTextToSize(`${processedLabel}: ${processedValue}`, doc.internal.pageSize.width - currentMargin * 2);
    doc.text(splitValue, currentMargin, y);
    y += currentLineHeight * splitValue.length;
    if (y > doc.internal.pageSize.height - currentMargin) {
      doc.addPage();
      y = currentMargin;
    }
  };

  function addTitle(text: string) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(titleFontSize);
    doc.text(text, currentMargin, y);
    y += currentLineHeight * 1.5;
    doc.setFontSize(defaultFontSize);
    if (y > doc.internal.pageSize.height - currentMargin) {
      doc.addPage();
      y = currentMargin;
    }
  }

  doc.setFontSize(defaultFontSize);
  doc.setFont('helvetica');

  const macerationNameDisplay = isEmptyForm || !data ? placeholderText : data.macerationName;
  const batchNumberDisplay = isEmptyForm || !data ? placeholderNumber : data.batchNumber;
  const creationDateDisplay = isEmptyForm || !data || !data.creationDate || !isValid(data.creationDate) || data.creationDate.getTime() === new Date(0).getTime() ? placeholderDate : format(data.creationDate, 'dd.MM.yyyy');


  addTitle(`Mazerationsprotokoll: ${macerationNameDisplay}`);
  addText("Chargennummer", batchNumberDisplay, !isEmptyForm);
  addText("Erstellungsdatum", creationDateDisplay, !isEmptyForm);
  y += currentLineHeight;

  addTitle("Allgemeine Informationen");
  addText("Name der Mazeration", macerationNameDisplay);
  addText("Chargennummer", batchNumberDisplay);
  addText("Erstellungsdatum", creationDateDisplay);
  y += currentLineHeight;

  addTitle("Pflanzeninformationen");
  addText("Pflanze", isEmptyForm || !data ? placeholderText : data.plantName);
  addText("Beschreibung", isEmptyForm || !data ? placeholderText : data.plantDescription);
  addText("Verwendeter Pflanzenteil", isEmptyForm || !data ? placeholderText : data.plantPart);
  if (isEmptyForm || (data && data.harvestDate)) {
    addText("Erntedatum", isEmptyForm || !data || !data.harvestDate ? placeholderDate : format(data.harvestDate!, 'dd.MM.yyyy'));
  }
  addText("Qualitätsbeurteilung bei Anlieferung", isEmptyForm || !data ? placeholderText : data.qualityAssessment);

  if (isEmptyForm || (data && data.plantWeightUnit === 'kg')) {
      const { calculatedNetWeightKg: netKg, averageNetWeightPerCrateKg: avgKg } = isEmptyForm || !data ? {calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null} : calculateNetWeightDetailsForProtocol(data.numberOfCrates, data.grossWeightKg);
      addText("Anzahl Kisten", isEmptyForm || !data ? placeholderNumber : data.numberOfCrates);
      addText("Bruttogewicht Kisten (kg)", isEmptyForm || !data ? placeholderNumber : formatNumberWithComma(data.grossWeightKg, 2));
      addText("Tara pro Kiste (kg)", `${formatNumberWithComma(TARE_PER_CRATE_KG_FIXED, 2)} kg (fix)`);
      addText("Nettogewicht Pflanze (berechnet, kg)", isEmptyForm || !netKg ? placeholderNumber : formatNumberWithComma(netKg, 2));
      if (isEmptyForm || (avgKg)) {
          addText("Netto-Durchschnittsgewicht pro Kiste (kg)", isEmptyForm || !avgKg ? placeholderNumber : formatNumberWithComma(avgKg, 2));
      }
  }
  addText("Einwaage Pflanze", isEmptyForm || !data ? `${placeholderNumber} ${data?.plantWeightUnit || '(g/kg)'}` : `${formatNumberWithComma(data.plantWeight,2)} ${data.plantWeightUnit}`);
  y += currentLineHeight;

  addTitle("Alkoholinformationen");
  addText("Alkoholtyp", isEmptyForm || !data ? placeholderText : data.alcoholType);
  addText("Konzentration (%vol.)", isEmptyForm || !data ? placeholderNumber : formatNumberWithComma(data.alcoholConcentration,1));
  addText("Einwaage Alkohol", isEmptyForm || !data ? `${placeholderNumber} ${data?.alcoholVolumeUnit || '(ml/l)'}` : `${formatNumberWithComma(data.alcoholVolume,2)} ${data.alcoholVolumeUnit}`);
  addText("Verhältnis Pflanze/Alkohol", isEmptyForm ? "1:X" : ratio);
  y += currentLineHeight;

  addTitle("Mazerationszeitraum");
  const startDateTime = isEmptyForm || !data || !data.macerationStart || data.macerationStart.getTime() === new Date(0).getTime() ? null : combineDateTime(data.macerationStart, data.macerationStartTime);
  const endDateTime = isEmptyForm || !data || !data.macerationEnd || data.macerationEnd.getTime() === new Date(0).getTime() ? null : combineDateTime(data.macerationEnd, data.macerationEndTime);
  addText("Beginn", !startDateTime ? `${placeholderDate} ${placeholderTime}` : format(startDateTime, 'dd.MM.yyyy HH:mm'));
  addText("Ende", !endDateTime ? `${placeholderDate} ${placeholderTime}` : format(endDateTime, 'dd.MM.yyyy HH:mm'));
  addText("Dauer", isEmptyForm ? `${placeholderNumber} Tage, ${placeholderNumber} Stunden` : macerationDuration);
  addText("Durchschnittliche Raumtemperatur (°C)", isEmptyForm || !data || data.roomTemperature === null ? placeholderNumber : formatNumberWithComma(data.roomTemperature,1));
  y += currentLineHeight;

  addTitle("Ergebnis");
  addText(`Ausbeute (Menge)`, isEmptyForm || !data || data.yieldVolume === null ? placeholderNumber : formatNumberWithComma(data.yieldVolume, 2), false, yieldUnitVal);
  if (isEmptyForm || (lossAbs !== null && lossUnitVal)) {
    addText(`Verlust (absolut)`, isEmptyForm ? placeholderNumber : formatNumberWithComma(lossAbs, 2), false, lossUnitVal);
  }
  if (isEmptyForm || lossPerc !== null) {
    addText("Verlust (%)", isEmptyForm ? placeholderNumber : formatNumberWithComma(lossPerc, 2));
  }
  addText("Endkonzentration (%vol.)", isEmptyForm || !data || data.endConcentration === null ? placeholderNumber : formatNumberWithComma(data.endConcentration,1));

  if (isEmptyForm || (data && (data.alcoholVolumeUnit === 'l' || data.alcoholVolumeUnit === 'ml'))) {
    addText("Eingesetzte LA (Liter Absolutalkohol)", isEmptyForm || eingesetzteLA === null ? placeholderNumber : formatNumberWithComma(eingesetzteLA, 4));
    addText("Ausbeute LA (Liter Absolutalkohol)", isEmptyForm || ausbeuteLA === null ? placeholderNumber : formatNumberWithComma(ausbeuteLA, 4));
    addText("Verlust LA (Liter Absolutalkohol)", isEmptyForm || verlustLA === null ? placeholderNumber : formatNumberWithComma(verlustLA, 4));
  }
  addText("Bemerkungen", isEmptyForm || !data ? placeholderText : data.remarks);
  y += currentLineHeight;

  // Zeitaufzeichnung PDF
  addTitle("Zeitaufzechnung");
  const timeTrackingTasks = [
    { label: "Vorbereitung", date: data?.vorbereitungDate, startTime: data?.vorbereitungStartTime, endTime: data?.vorbereitungEndTime, hours: vorbereitungHours },
    { label: "Verarbeitung Kräuter", date: data?.verarbeitungKraeuterDate, startTime: data?.verarbeitungKraeuterStartTime, endTime: data?.verarbeitungKraeuterEndTime, hours: verarbeitungKraeuterHours },
    { label: "Verarbeitung Mazerat", date: data?.verarbeitungMazeratDate, startTime: data?.verarbeitungMazeratStartTime, endTime: data?.verarbeitungMazeratEndTime, hours: verarbeitungMazeratHours },
    { label: "Reinigung", date: data?.reinigungDate, startTime: data?.reinigungStartTime, endTime: data?.reinigungEndTime, hours: reinigungHours },
    { label: "Sonstiges", date: data?.sonstigesDate, startTime: data?.sonstigesStartTime, endTime: data?.sonstigesEndTime, hours: sonstigesHours },
  ];

  timeTrackingTasks.forEach(task => {
    const taskDateDisplay = isEmptyForm || !task.date ? placeholderDate : format(task.date, 'dd.MM.yyyy');
    const taskStartTimeDisplay = isEmptyForm || !task.startTime ? placeholderTime : task.startTime;
    const taskEndTimeDisplay = isEmptyForm || !task.endTime ? placeholderTime : task.endTime;
    const taskHoursDisplay = isEmptyForm || task.hours === null ? placeholderHours : formatNumberWithComma(task.hours, 2, 'Std.');
    
    addText(`${task.label}`, `Datum: ${taskDateDisplay}, Von: ${taskStartTimeDisplay}, Bis: ${taskEndTimeDisplay}, Stunden: ${taskHoursDisplay}`);
  });
  addText("Summe Stunden", isEmptyForm || summeZeitaufzeichnungStunden === null ? placeholderHours : formatNumberWithComma(summeZeitaufzeichnungStunden, 2, 'Std.'), !isEmptyForm);


  const fileName = isEmptyForm ? 'leeres_mazerations-protokoll.pdf' : `mazerations-protokoll_${data!.batchNumber}_${data!.macerationName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};

// Function to generate XLSX for single protocol (empty or current)
const generateSingleProtocolXlsx = (
    data: MazerationFormData | null,
    calculatedValues: ReturnType<typeof useCalculatedFormValues>["calculatedValues"],
    isEmptyForm: boolean = false
) => {
  const {
    ratio, macerationDuration, yieldDisplayUnit: yieldUnitVal, lossAbsolute: lossAbs, lossPercentage: lossPerc, lossUnitDisplay: lossUnitVal,
    eingesetzteLA, ausbeuteLA, verlustLA,
    vorbereitungHours, verarbeitungKraeuterHours, verarbeitungMazeratHours, reinigungHours, sonstigesHours, summeZeitaufzeichnungStunden
  } = calculatedValues;

  const wb = XLSX.utils.book_new();
  const sheetData: (string | number | undefined | null)[][] = [];
  const titleRows: number[] = [];

  const addRowToSheet = (label: string, value: string | number | undefined | null, unitSuffix?: string) => {
    let displayValue;
     if (isEmptyForm) {
        displayValue = placeholderText;
        if (label.toLowerCase().includes("datum")) displayValue = placeholderDate;
        else if (label.toLowerCase().includes("uhrzeit")) displayValue = placeholderTime;
        else if (label.toLowerCase().includes("stunden")) displayValue = placeholderHours;
        else if (label.toLowerCase().includes("nummer") || label.toLowerCase().includes("gewicht") || label.toLowerCase().includes("volumen") || label.toLowerCase().includes("konzentration") || label.toLowerCase().includes("anzahl") || label.toLowerCase().includes("temperatur") || label.toLowerCase().includes("ausbeute") || label.toLowerCase().includes("verlust") || label.toLowerCase().includes("la")) {
             displayValue = placeholderNumber; 
             if (label.toLowerCase().includes("einwaage pflanze")) displayValue = `${placeholderNumber} (g/kg)`;
             if (label.toLowerCase().includes("einwaage alkohol")) displayValue = `${placeholderNumber} (ml/l)`;
             if (label.toLowerCase().includes("ausbeute (menge)")) displayValue = `${placeholderNumber} (${yieldUnitVal || 'ml/l'})`;
             if (label.toLowerCase().includes("verlust (absolut")) displayValue = `${placeholderNumber} (${lossUnitVal || 'ml/l'})`;
             if (label.toLowerCase().includes("tara pro kiste")) displayValue = `${formatNumberWithComma(TARE_PER_CRATE_KG_FIXED, 2)} kg (fix)`;
        }
    } else {
        if (typeof value === 'number') {
             if (label.toLowerCase().includes("verlust (%)") || label.toLowerCase().includes("konzentration (%vol.)") || label.toLowerCase().includes("endkonzentration (%vol.)") ) {
                displayValue = formatNumberWithComma(value, 2, '%vol.');
            } else if (label.toLowerCase().includes("la (liter absolutalkohol)")) {
                 displayValue = formatNumberWithComma(value, 4);
            } else if (label.toLowerCase().includes("stunden")) {
                displayValue = formatNumberWithComma(value, 2, 'Std.');
            }
            else {
                 displayValue = formatNumberWithComma(value, 2, unitSuffix);
            }
        } else {
            displayValue = value;
        }
    }

    const finalDisplayValue = (displayValue === undefined || displayValue === null || displayValue === '' || (typeof displayValue === 'number' && isNaN(displayValue))) && !label.toLowerCase().includes("stunden")
        ? ''
        : displayValue;
    sheetData.push([label, finalDisplayValue]);
  };

  const addTitleToSheet = (title: string) => {
    if (sheetData.length > 0) sheetData.push([]);
    sheetData.push([title]);
    titleRows.push(sheetData.length -1);
  };

  const macerationNameDisplay = isEmptyForm || !data ? placeholderText : data.macerationName;
  const batchNumberDisplay = isEmptyForm || !data ? placeholderNumber : data.batchNumber;
  const creationDateDisplay = isEmptyForm || !data || !data.creationDate || !isValid(data.creationDate) || data.creationDate.getTime() === new Date(0).getTime() ? placeholderDate : format(data.creationDate, 'dd.MM.yyyy');


  addTitleToSheet(`Mazerationsprotokoll: ${macerationNameDisplay}`);
  addRowToSheet("Chargennummer:", batchNumberDisplay);
  addRowToSheet("Erstellungsdatum:", creationDateDisplay);

  addTitleToSheet("Allgemeine Informationen");
  addRowToSheet("Name der Mazeration:", macerationNameDisplay);
  addRowToSheet("Chargennummer:", batchNumberDisplay);
  addRowToSheet("Erstellungsdatum:", creationDateDisplay);


  addTitleToSheet("Pflanzeninformationen");
  addRowToSheet("Pflanze:", isEmptyForm || !data ? placeholderText : data.plantName);
  addRowToSheet("Beschreibung:", isEmptyForm || !data ? placeholderText : data.plantDescription);
  addRowToSheet("Verwendeter Pflanzenteil:", isEmptyForm || !data ? placeholderText : data.plantPart);
  if (isEmptyForm || (data && data.harvestDate)) {
    addRowToSheet("Erntedatum:", isEmptyForm || !data || !data.harvestDate ? placeholderDate : format(data.harvestDate!, 'dd.MM.yyyy'));
  }
  addRowToSheet("Qualitätsbeurteilung bei Anlieferung:", isEmptyForm || !data ? placeholderText : data.qualityAssessment);

  if (isEmptyForm || (data && data.plantWeightUnit === 'kg')) {
    const { calculatedNetWeightKg: netKg, averageNetWeightPerCrateKg: avgKg } = isEmptyForm || !data ? {calculatedNetWeightKg: null, averageNetWeightPerCrateKg: null} : calculateNetWeightDetailsForProtocol(data.numberOfCrates, data.grossWeightKg);
    addRowToSheet("Anzahl Kisten:", isEmptyForm || !data ? placeholderNumber : data.numberOfCrates);
    addRowToSheet("Bruttogewicht Kisten (kg):", isEmptyForm || !data ? placeholderNumber : formatNumberWithComma(data.grossWeightKg,2));
    addRowToSheet("Tara pro Kiste (kg):", `${formatNumberWithComma(TARE_PER_CRATE_KG_FIXED, 2)} (fix)`);
    addRowToSheet("Nettogewicht Pflanze (berechnet, kg):", isEmptyForm || !netKg ? placeholderNumber : formatNumberWithComma(netKg,2));
    if (isEmptyForm || (avgKg)) {
        addRowToSheet("Netto-Durchschnittsgewicht pro Kiste (kg):", isEmptyForm || !avgKg ? placeholderNumber : formatNumberWithComma(avgKg,2));
    }
  }
  addRowToSheet("Einwaage Pflanze:", isEmptyForm || !data ? `${placeholderNumber} ${data?.plantWeightUnit || '(g/kg)'}` : `${formatNumberWithComma(data.plantWeight,2)} ${data.plantWeightUnit}`);


  addTitleToSheet("Alkoholinformationen");
  addRowToSheet("Alkoholtyp:", isEmptyForm || !data ? placeholderText : data.alcoholType);
  addRowToSheet("Konzentration (%vol.):", isEmptyForm || !data ? placeholderNumber : formatNumberWithComma(data.alcoholConcentration,1));
  addRowToSheet("Einwaage Alkohol:", isEmptyForm || !data ? `${placeholderNumber} ${data?.alcoholVolumeUnit || '(ml/l)'}` : `${formatNumberWithComma(data.alcoholVolume,2)} ${data.alcoholVolumeUnit}`);
  addRowToSheet("Verhältnis Pflanze/Alkohol:", isEmptyForm ? "1:X" : ratio);
  y += currentLineHeight;

  addTitleToSheet("Mazerationszeitraum");
  const startDateTime = isEmptyForm || !data || !data.macerationStart || data.macerationStart.getTime() === new Date(0).getTime() ? null : combineDateTime(data.macerationStart, data.macerationStartTime);
  const endDateTime = isEmptyForm || !data || !data.macerationEnd || data.macerationEnd.getTime() === new Date(0).getTime() ? null : combineDateTime(data.macerationEnd, data.macerationEndTime);
  addRowToSheet("Beginn", !startDateTime ? `${placeholderDate} ${placeholderTime}` : format(startDateTime, 'dd.MM.yyyy HH:mm'));
  addRowToSheet("Ende", !endDateTime ? `${placeholderDate} ${placeholderTime}` : format(endDateTime, 'dd.MM.yyyy HH:mm'));
  addRowToSheet("Dauer", isEmptyForm ? `${placeholderNumber} Tage, ${placeholderNumber} Stunden` : macerationDuration);
  addRowToSheet("Durchschnittliche Raumtemperatur (°C)", isEmptyForm || !data || data.roomTemperature === null ? placeholderNumber : formatNumberWithComma(data.roomTemperature,1));
  y += currentLineHeight;

  addTitleToSheet("Ergebnis");
  addRowToSheet(`Ausbeute (Menge)`, isEmptyForm || !data || data.yieldVolume === null ? placeholderNumber : formatNumberWithComma(data.yieldVolume, 2), yieldUnitVal);
  if (isEmptyForm || (lossAbs !== null && lossUnitVal)) {
  addRowToSheet(`Verlust (absolut)`, isEmptyForm ? placeholderNumber : formatNumberWithComma(lossAbs, 2), lossUnitVal);
  }
  if (isEmptyForm || lossPerc !== null) {
    addRowToSheet("Verlust (%)", isEmptyForm ? placeholderNumber : formatNumberWithComma(lossPerc, 2));
  }
  addRowToSheet("Endkonzentration (%vol.)", isEmptyForm || !data || data.endConcentration === null ? placeholderNumber : formatNumberWithComma(data.endConcentration,1));

  if (isEmptyForm || (data && (data.alcoholVolumeUnit === 'l' || data.alcoholVolumeUnit === 'ml'))) {
    addRowToSheet("Eingesetzte LA (Liter Absolutalkohol)", isEmptyForm || eingesetzteLA === null ? placeholderNumber : formatNumberWithComma(eingesetzteLA, 4));
    addRowToSheet("Ausbeute LA (Liter Absolutalkohol)", isEmptyForm || ausbeuteLA === null ? placeholderNumber : formatNumberWithComma(ausbeuteLA, 4));
    addRowToSheet("Verlust LA (Liter Absolutalkohol)", isEmptyForm || verlustLA === null ? placeholderNumber : formatNumberWithComma(verlustLA, 4));
  }
  addRowToSheet("Bemerkungen", isEmptyForm || !data ? placeholderText : data.remarks);
  y += currentLineHeight;

  // Zeitaufzeichnung PDF
  addTitleToSheet("Zeitaufzechnung");
  const timeTrackingTasks = [
    { label: "Vorbereitung", date: data?.vorbereitungDate, startTime: data?.vorbereitungStartTime, endTime: data?.vorbereitungEndTime, hours: vorbereitungHours },
    { label: "Verarbeitung Kräuter", date: data?.verarbeitungKraeuterDate, startTime: data?.verarbeitungKraeuterStartTime, endTime: data?.verarbeitungKraeuterEndTime, hours: verarbeitungKraeuterHours },
    { label: "Verarbeitung Mazerat", date: data?.verarbeitungMazeratDate, startTime: data?.verarbeitungMazeratStartTime, endTime: data?.verarbeitungMazeratEndTime, hours: verarbeitungMazeratHours },
    { label: "Reinigung", date: data?.reinigungDate, startTime: data?.reinigungStartTime, endTime: data?.reinigungEndTime, hours: reinigungHours },
    { label: "Sonstiges", date: data?.sonstigesDate, startTime: data?.sonstigesStartTime, endTime: data?.sonstigesEndTime, hours: sonstigesHours },
  ];

  timeTrackingTasks.forEach(task => {
    const taskDateDisplay = isEmptyForm || !task.date ? placeholderDate : format(task.date, 'dd.MM.yyyy');
    const taskStartTimeDisplay = isEmptyForm || !task.startTime ? placeholderTime : task.startTime;
    const taskEndTimeDisplay = isEmptyForm || !task.endTime ? placeholderTime : task.endTime;
    const taskHoursDisplay = isEmptyForm || task.hours === null ? placeholderHours : formatNumberWithComma(task.hours, 2, 'Std.');
    
    addRowToSheet(`${task.label}`, `Datum: ${taskDateDisplay}, Von: ${taskStartTimeDisplay}, Bis: ${taskEndTimeDisplay}, Stunden: ${taskHoursDisplay}`);
  });
  addRowToSheet("Summe Stunden", isEmptyForm || summeZeitaufzeichnungStunden === null ? placeholderHours : formatNumberWithComma(summeZeitaufzeichnungStunden, 2, 'Std.'));


  const fileName = isEmptyForm ? 'leeres_mazerations-protokoll.xlsx' : `mazerations-protokoll_${data!.batchNumber}_${data!.macerationName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};


// Function to generate CUMULATIVE XLSX (column-wise)
const generateCumulativeXlsx = (protocols: MazerationFormData[], allCalculatedValues: ReturnType<typeof useCalculatedFormValues>['calculatedValues'][]) => {
  const wb = XLSX.utils.book_new();
  const sheetData: (string | number | undefined | null)[][] = [];

  if (protocols.length === 0) {
    sheetData.push(["Keine Protokolle zum Exportieren vorhanden."]);
    const ws_empty = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws_empty, "Mazerations Log");
    const today = new Date();
    const dateString = format(today, 'dd_MM_yy');
    XLSX.writeFile(wb, `Mazerationsprotokoll fortlaufend ${dateString}.xlsx`);
    return;
  }

  const rowHeaders = [
    "Erstellungsdatum", "Chargennummer", "Name der Mazeration", 
    "Pflanze", "Beschreibung", "Verwendeter Pflanzenteil", "Erntedatum", "Qualitätsbeurteilung bei Anlieferung",
    "Anzahl Kisten", "Bruttogewicht Kisten (kg)", "Tara pro Kiste (kg)",
    "Nettogewicht Pflanze (berechnet, kg)", "Netto-Durchschnittsgewicht pro Kiste (kg)",
    "Einwaage Pflanze", "Einheit Pflanze",
    "Alkoholtyp", "Konzentration (%vol.)", "Einwaage Alkohol", "Einheit Alkohol",
    "Verhältnis Pflanze/Alkohol",
    "Beginn", "Ende", "Dauer", "Durchschnittliche Raumtemperatur (°C)",
    "Ausbeute (Menge)", "Einheit Ausbeute",
    "Verlust (absolut)", "Einheit Verlust (abs.)", "Verlust (%)",
    "Endkonzentration (%vol.)",
    "Eingesetzte LA (Liter Absolutalkohol)", "Ausbeute LA (Liter Absolutalkohol)", "Verlust LA (Liter Absolutalkohol)",
    "Bemerkungen",
    // Zeitaufzeichnung Headers
    "Vorbereitung - Datum", "Vorbereitung - Von", "Vorbereitung - Bis", "Vorbereitung - Stunden",
    "Verarbeitung Kräuter - Datum", "Verarbeitung Kräuter - Von", "Verarbeitung Kräuter - Bis", "Verarbeitung Kräuter - Stunden",
    "Verarbeitung Mazerat - Datum", "Verarbeitung Mazerat - Von", "Verarbeitung Mazerat - Bis", "Verarbeitung Mazerat - Stunden",
    "Reinigung - Datum", "Reinigung - Von", "Reinigung - Bis", "Reinigung - Stunden",
    "Sonstiges - Datum", "Sonstiges - Von", "Sonstiges - Bis", "Sonstiges - Stunden",
    "Summe Stunden (Zeitaufzeichnung)"
  ];

  const excelHeaderRow: (string | number | undefined | null)[] = ["Protokoll-Nr."]; 
  protocols.forEach((p, i) => {
    const protocolTitle = `Protokoll ${i + 1} (${p.batchNumber} - ${p.macerationName.substring(0, 20)}${p.macerationName.length > 20 ? '...' : ''})`;
    excelHeaderRow.push(protocolTitle);
  });
  sheetData.push(excelHeaderRow);

  rowHeaders.forEach(header => {
    const row: (string | number | undefined | null)[] = [header];
    protocols.forEach((protocol, index) => {
      const calculatedValues = allCalculatedValues[index];
      const { calculatedNetWeightKg, averageNetWeightPerCrateKg } = calculateNetWeightDetailsForProtocol(protocol.numberOfCrates, protocol.grossWeightKg);
      const startDateTime = combineDateTime(protocol.macerationStart, protocol.macerationStartTime);
      const endDateTime = combineDateTime(protocol.macerationEnd, protocol.macerationEndTime);

      let value: string | number | undefined | null = '';

      switch (header) {
        case "Erstellungsdatum": value = protocol.creationDate && isValid(protocol.creationDate) && protocol.creationDate.getTime() !== new Date(0).getTime() ? format(protocol.creationDate, 'dd.MM.yyyy') : ''; break;
        case "Chargennummer": value = protocol.batchNumber; break;
        case "Name der Mazeration": value = protocol.macerationName; break;
        case "Pflanze": value = protocol.plantName; break;
        case "Beschreibung": value = protocol.plantDescription; break;
        case "Verwendeter Pflanzenteil": value = protocol.plantPart; break;
        case "Erntedatum": value = protocol.harvestDate ? format(protocol.harvestDate, 'dd.MM.yyyy') : ''; break;
        case "Qualitätsbeurteilung bei Anlieferung": value = protocol.qualityAssessment; break;

        case "Anzahl Kisten": value = protocol.plantWeightUnit === 'kg' ? formatNumberWithComma(protocol.numberOfCrates, 0) : "N/A"; break;
        case "Bruttogewicht Kisten (kg)": value = protocol.plantWeightUnit === 'kg' ? formatNumberWithComma(protocol.grossWeightKg, 2) : "N/A"; break;
        case "Tara pro Kiste (kg)": value = protocol.plantWeightUnit === 'kg' ? formatNumberWithComma(TARE_PER_CRATE_KG_FIXED, 2) + " (fix)" : "N/A"; break;
        case "Nettogewicht Pflanze (berechnet, kg)": value = protocol.plantWeightUnit === 'kg' ? (calculatedNetWeightKg !== null ? formatNumberWithComma(calculatedNetWeightKg, 2) : '') : "N/A"; break;
        case "Netto-Durchschnittsgewicht pro Kiste (kg)": value = protocol.plantWeightUnit === 'kg' ? (averageNetWeightPerCrateKg !== null ? formatNumberWithComma(averageNetWeightPerCrateKg, 2) : '') : "N/A"; break;

        case "Einwaage Pflanze": value = formatNumberWithComma(protocol.plantWeight, 2); break;
        case "Einheit Pflanze": value = protocol.plantWeightUnit; break;

        case "Alkoholtyp": value = protocol.alcoholType; break;
        case "Konzentration (%vol.)": value = formatNumberWithComma(protocol.alcoholConcentration, 1); break;
        case "Einwaage Alkohol": value = formatNumberWithComma(protocol.alcoholVolume, 2); break;
        case "Einheit Alkohol": value = protocol.alcoholVolumeUnit; break;
        case "Verhältnis Pflanze/Alkohol": value = calculatedValues.ratio; break;

        case "Beginn": value = startDateTime && isValid(startDateTime) && startDateTime.getTime() !== new Date(0).getTime() ? format(startDateTime, 'dd.MM.yyyy HH:mm') : ''; break;
        case "Ende": value = endDateTime && isValid(endDateTime) && endDateTime.getTime() !== new Date(0).getTime() ? format(endDateTime, 'dd.MM.yyyy HH:mm') : ''; break;
        case "Dauer": value = calculatedValues.macerationDuration; break;
        case "Durchschnittliche Raumtemperatur (°C)": value = formatNumberWithComma(protocol.roomTemperature, 1); break;

        case "Ausbeute (Menge)": value = formatNumberWithComma(protocol.yieldVolume, 2); break;
        case "Einheit Ausbeute": value = calculatedValues.yieldDisplayUnit; break;
        case "Verlust (absolut)": value = calculatedValues.lossAbsolute !== null ? formatNumberWithComma(calculatedValues.lossAbsolute, 2) : ''; break;
        case "Einheit Verlust (abs.)": value = calculatedValues.lossUnitDisplay; break;
        case "Verlust (%)": value = calculatedValues.lossPercentage !== null ? `${formatNumberWithComma(calculatedValues.lossPercentage, 2)} %` : ''; break;
        case "Endkonzentration (%vol.)": value = formatNumberWithComma(protocol.endConcentration, 1); break;

        case "Eingesetzte LA (Liter Absolutalkohol)": value = calculatedValues.eingesetzteLA !== null ? formatNumberWithComma(calculatedValues.eingesetzteLA, 4) : ''; break;
        case "Ausbeute LA (Liter Absolutalkohol)": value = calculatedValues.ausbeuteLA !== null ? formatNumberWithComma(calculatedValues.ausbeuteLA, 4) : ''; break;
        case "Verlust LA (Liter Absolutalkohol)": value = calculatedValues.verlustLA !== null ? formatNumberWithComma(calculatedValues.verlustLA, 4) : ''; break;
        case "Bemerkungen": value = protocol.remarks; break;
        
        case "Vorbereitung - Datum": value = protocol.vorbereitungDate ? format(protocol.vorbereitungDate, 'dd.MM.yyyy') : ''; break;
        case "Vorbereitung - Von": value = protocol.vorbereitungStartTime || ''; break;
        case "Vorbereitung - Bis": value = protocol.vorbereitungEndTime || ''; break;
        case "Vorbereitung - Stunden": value = calculatedValues.vorbereitungHours !== null ? formatNumberWithComma(calculatedValues.vorbereitungHours, 2, 'Std.') : ''; break;
        
        case "Verarbeitung Kräuter - Datum": value = protocol.verarbeitungKraeuterDate ? format(protocol.verarbeitungKraeuterDate, 'dd.MM.yyyy') : ''; break;
        case "Verarbeitung Kräuter - Von": value = protocol.verarbeitungKraeuterStartTime || ''; break;
        case "Verarbeitung Kräuter - Bis": value = protocol.verarbeitungKraeuterEndTime || ''; break;
        case "Verarbeitung Kräuter - Stunden": value = calculatedValues.verarbeitungKraeuterHours !== null ? formatNumberWithComma(calculatedValues.verarbeitungKraeuterHours, 2, 'Std.') : ''; break;

        case "Verarbeitung Mazerat - Datum": value = protocol.verarbeitungMazeratDate ? format(protocol.verarbeitungMazeratDate, 'dd.MM.yyyy') : ''; break;
        case "Verarbeitung Mazerat - Von": value = protocol.verarbeitungMazeratStartTime || ''; break;
        case "Verarbeitung Mazerat - Bis": value = protocol.verarbeitungMazeratEndTime || ''; break;
        case "Verarbeitung Mazerat - Stunden": value = calculatedValues.verarbeitungMazeratHours !== null ? formatNumberWithComma(calculatedValues.verarbeitungMazeratHours, 2, 'Std.') : ''; break;

        case "Reinigung - Datum": value = protocol.reinigungDate ? format(protocol.reinigungDate, 'dd.MM.yyyy') : ''; break;
        case "Reinigung - Von": value = protocol.reinigungStartTime || ''; break;
        case "Reinigung - Bis": value = protocol.reinigungEndTime || ''; break;
        case "Reinigung - Stunden": value = calculatedValues.reinigungHours !== null ? formatNumberWithComma(calculatedValues.reinigungHours, 2, 'Std.') : ''; break;

        case "Sonstiges - Datum": value = protocol.sonstigesDate ? format(protocol.sonstigesDate, 'dd.MM.yyyy') : ''; break;
        case "Sonstiges - Von": value = protocol.sonstigesStartTime || ''; break;
        case "Sonstiges - Bis": value = protocol.sonstigesEndTime || ''; break;
        case "Sonstiges - Stunden": value = calculatedValues.sonstigesHours !== null ? formatNumberWithComma(calculatedValues.sonstigesHours, 2, 'Std.') : ''; break;

        case "Summe Stunden (Zeitaufzeichnung)": value = calculatedValues.summeZeitaufzeichnungStunden !== null ? formatNumberWithComma(calculatedValues.summeZeitaufzeichnungStunden, 2, 'Std.') : ''; break;

        default: value = '';
      }
      row.push(value === null || value === undefined ? '' : value);
    });
    sheetData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const boldLeftAlignment = { font: { bold: true, sz: 10 }, alignment: { horizontal: "left", vertical: "center", wrapText: true } };
  const leftAlignment = { font: { sz: 10 }, alignment: { horizontal: "left", vertical: "center", wrapText: true } };
  
  const range = XLSX.utils.decode_range(ws['!ref']!);
  for (let R = 0; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) ws[cellAddress] = { v: '' }; 
      
      if (R === 0) { 
        ws[cellAddress].s = boldLeftAlignment;
      } else if (C === 0) { 
        ws[cellAddress].s = boldLeftAlignment;
      } else { 
        ws[cellAddress].s = leftAlignment;
      }
    }
  }

  const colWidths = [{ wch: 45 }]; 
  protocols.forEach(() => colWidths.push({ wch: 30 })); 
  ws['!cols'] = colWidths;

  ws['!rows'] = [{ hpt: 40 }]; 
  for (let R = 1; R <= range.e.r; R++) {
      if(!ws['!rows']) ws['!rows'] = [];
      ws['!rows'][R] = { hpt: 15 }; 
  }

  XLSX.utils.book_append_sheet(wb, ws, "Mazerations Log");
};


const convertMillimetersToTwip = (mm: number): number => {
    return Math.round(mm * (1440 / 25.4));
};

const primaryColorHex = "#68AC68"; 
const accentColorHex = "#FFAA05";


// Hilfsvariablen und -funktionen für Export-Logik (global im Modul)
// Removed duplicated stubs that conflicted with real variables and hooks above.


    function generateDocx(
      data: MazerationFormData | null,
      calculatedValues: ReturnType<typeof useCalculatedFormValues>["calculatedValues"],
      isEmptyForm: boolean = false
    ) {
      const docInstance = new Document({
        sections: [{
            properties: {
                page: {
                    size: {
                        width: convertMillimetersToTwip(isEmptyForm ? 210 : 297), 
                        height: convertMillimetersToTwip(isEmptyForm ? 297 : 210),
                        orientation: isEmptyForm ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE,
                    },
                    margin: {
                        top: convertMillimetersToTwip(15),
                        right: convertMillimetersToTwip(15),
                        bottom: convertMillimetersToTwip(15),
                        left: convertMillimetersToTwip(15),
                    },
                },
                 column: isEmptyForm ? {
                    count: 2,
                    space: convertMillimetersToTwip(10),
                } : undefined,
            },
            children: [],
        }],
    });

    const fileName = isEmptyForm ? 'leeres_mazerations-protokoll.docx' : `mazerations-protokoll_${data!.batchNumber}_${data!.macerationName.replace(/\s+/g, '_')}.docx`;

      Packer.toBlob(docInstance).then(blob => {
        saveAs(blob, fileName);
      });
    }

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
    alcoholType: '',
  alcoholConcentration: 0,
    alcoholVolume: 0,
    alcoholVolumeUnit: 'ml',
    macerationStart: null,
    macerationStartTime: '',
    macerationEnd: null,
    macerationEndTime: '',
    roomTemperature: null,
    yieldVolume: null,
    endConcentration: null,
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


const useCalculatedFormValues = (form: ReturnType<typeof useForm<MazerationFormData>>) => {
  const [ratio, setRatio] = useState<string>("1:X");
  const [macerationDuration, setMacerationDuration] = useState<string>("0 Tage, 0 Stunden");
  const [calculatedNetWeightKg, setCalculatedNetWeightKg] = useState<number | null>(null);
  const [averageNetWeightPerCrateKg, setAverageNetWeightPerCrateKg] = useState<number | null>(null);
  const [yieldDisplayUnit, setYieldDisplayUnit] = useState<string>('ml');
  const [lossAbsolute, setLossAbsolute] = useState<number | null>(null);
  const [lossPercentage, setLossPercentage] = useState<number | null>(null);
  const [lossUnitDisplay, setLossUnitDisplay] = useState<string>('ml');
  const [eingesetzteLA, setEingesetzteLA] = useState<number | null>(null);
  const [ausbeuteLA, setAusbeuteLA] = useState<number | null>(null);
  const [verlustLA, setVerlustLA] = useState<number | null>(null);

  const [vorbereitungHours, setVorbereitungHours] = useState<number | null>(null);
  const [verarbeitungKraeuterHours, setVerarbeitungKraeuterHours] = useState<number | null>(null);
  const [verarbeitungMazeratHours, setVerarbeitungMazeratHours] = useState<number | null>(null);
  const [reinigungHours, setReinigungHours] = useState<number | null>(null);
  const [sonstigesHours, setSonstigesHours] = useState<number | null>(null);
  const [summeZeitaufzeichnungStunden, setSummeZeitaufzeichnungStunden] = useState<number | null>(null);

  const { watch } = form;

  const plantWeightForm = watch('plantWeight');
  const plantWeightUnit = watch('plantWeightUnit');
  const alcoholVolumeForm = watch('alcoholVolume');
  const alcoholVolumeUnit = watch('alcoholVolumeUnit');
  const alcoholConcentrationForm = watch('alcoholConcentration');
  const yieldVolumeValue = watch('yieldVolume');
  const endConcentrationForm = watch('endConcentration');
  const startDate = watch('macerationStart');
  const startTime = watch('macerationStartTime');
  const endDate = watch('macerationEnd');
  const endTime = watch('macerationEndTime');
  const numberOfCratesForm = watch('numberOfCrates');
  const grossWeightKgForm = watch('grossWeightKg');
  const tarePerCrateKgForm = watch('tarePerCrateKg');

  const vorbereitungD = watch('vorbereitungDate');
  const vorbereitungST = watch('vorbereitungStartTime');
  const vorbereitungET = watch('vorbereitungEndTime');
  const verarbeitungKraeuterD = watch('verarbeitungKraeuterDate');
  const verarbeitungKraeuterST = watch('verarbeitungKraeuterStartTime');
  const verarbeitungKraeuterET = watch('verarbeitungKraeuterEndTime');
  const verarbeitungMazeratD = watch('verarbeitungMazeratDate');
  const verarbeitungMazeratST = watch('verarbeitungMazeratStartTime');
  const verarbeitungMazeratET = watch('verarbeitungMazeratEndTime');
  const reinigungD = watch('reinigungDate');
  const reinigungST = watch('reinigungStartTime');
  const reinigungET = watch('reinigungEndTime');
  const sonstigesD = watch('sonstigesDate');
  const sonstigesST = watch('sonstigesStartTime');
  const sonstigesET = watch('sonstigesEndTime');

  useEffect(() => {
    // parse values coming from form (may be strings with comma decimal)
    const numCrates = parseFormNumber(numberOfCratesForm);
    const grossKg = parseFormNumber(grossWeightKgForm);
    const tareKg = parseFormNumber(tarePerCrateKgForm) ?? TARE_PER_CRATE_KG_FIXED;
    const { calculatedNetWeightKg: netKg, averageNetWeightPerCrateKg: avgKg } = calculateNetWeightDetailsForProtocol(
      numCrates,
      grossKg,
      tareKg
    );
    setCalculatedNetWeightKg(netKg);
    setAverageNetWeightPerCrateKg(avgKg);
    // Debug: logge relevante Werte (sichtbar in der Browser-Konsole)
  // debug logs removed for production

    // Wenn berechnetes Nettogewicht vorliegt, in das Feld 'Einwaage Pflanze' übernehmen,
    // aber nur, wenn dieses Feld aktuell leer ist (nicht vom Nutzer gesetzt) oder 0.
    try {
      // Setze den berechneten Wert immer in das Feld 'plantWeight' (Gewünschtes Verhalten).
        if (netKg !== null) {
          if (plantWeightUnit === 'kg') {
            form.setValue('plantWeight', netKg, { shouldValidate: true, shouldDirty: true });
          } else if (plantWeightUnit === 'g') {
            const grams = Math.round(netKg * 1000);
            form.setValue('plantWeight', grams, { shouldValidate: true, shouldDirty: true });
          }
      }
    } catch (e) {
      // Form kann während SSR/Initialisierung manchmal noch nicht bereit sein; ignoriere dann still.
    }
  }, [plantWeightUnit, numberOfCratesForm, grossWeightKgForm, tarePerCrateKgForm]);

  useEffect(() => {
    const currentPlantWeightUnit = plantWeightUnit;
    const { yieldUnit, lossUnit } = getDerivedUnitsForProtocol(currentPlantWeightUnit);
    setYieldDisplayUnit(yieldUnit);
    setLossUnitDisplay(lossUnit);
    if (currentPlantWeightUnit === 'kg') {
      if (form.getValues('alcoholVolumeUnit') === 'ml') {
        form.setValue('alcoholVolumeUnit', 'l', { shouldValidate: true });
      }
    } else {
      if (form.getValues('alcoholVolumeUnit') === 'l') {
        form.setValue('alcoholVolumeUnit', 'ml', { shouldValidate: true });
      }
    }
  }, [plantWeightUnit, form]);

  useEffect(() => {
    setRatio(calculateRatioDetails(Number(plantWeightForm), plantWeightUnit, Number(alcoholVolumeForm), alcoholVolumeUnit));
  }, [plantWeightForm, plantWeightUnit, alcoholVolumeForm, alcoholVolumeUnit]);

  useEffect(() => {
    setMacerationDuration(calculateMacerationDurationDetails(startDate, startTime, endDate, endTime));
  }, [startDate, startTime, endDate, endTime]);

  useEffect(() => {
    const { lossAbsolute: la, lossPercentage: lp } = calculateYieldAndLossDetails(plantWeightUnit, Number(alcoholVolumeForm), alcoholVolumeUnit, Number(yieldVolumeValue));
    setLossAbsolute(la);
    setLossPercentage(lp);
  }, [alcoholVolumeForm, alcoholVolumeUnit, yieldVolumeValue, plantWeightUnit]);

  useEffect(() => {
    const { eingesetzteLA: einLA, ausbeuteLA: ausLA, verlustLA: verLA } = calculateLADetails(plantWeightUnit, Number(alcoholVolumeForm), Number(alcoholConcentrationForm), alcoholVolumeUnit, Number(yieldVolumeValue), Number(endConcentrationForm));
    setEingesetzteLA(einLA);
    setAusbeuteLA(ausLA);
    setVerlustLA(verLA);
  }, [plantWeightUnit, alcoholVolumeForm, alcoholConcentrationForm, alcoholVolumeUnit, yieldVolumeValue, endConcentrationForm]);

  useEffect(() => setVorbereitungHours(calculateTaskDurationHours(vorbereitungD, vorbereitungST, vorbereitungET)), [vorbereitungD, vorbereitungST, vorbereitungET]);
  useEffect(() => setVerarbeitungKraeuterHours(calculateTaskDurationHours(verarbeitungKraeuterD, verarbeitungKraeuterST, verarbeitungKraeuterET)), [verarbeitungKraeuterD, verarbeitungKraeuterST, verarbeitungKraeuterET]);
  useEffect(() => setVerarbeitungMazeratHours(calculateTaskDurationHours(verarbeitungMazeratD, verarbeitungMazeratST, verarbeitungMazeratET)), [verarbeitungMazeratD, verarbeitungMazeratST, verarbeitungMazeratET]);
  useEffect(() => setReinigungHours(calculateTaskDurationHours(reinigungD, reinigungST, reinigungET)), [reinigungD, reinigungST, reinigungET]);
  useEffect(() => setSonstigesHours(calculateTaskDurationHours(sonstigesD, sonstigesST, sonstigesET)), [sonstigesD, sonstigesST, sonstigesET]);

  useEffect(() => {
    const sum = [vorbereitungHours, verarbeitungKraeuterHours, verarbeitungMazeratHours, reinigungHours, sonstigesHours]
      .reduce((acc, curr) => (acc || 0) + (curr || 0), 0);
  setSummeZeitaufzeichnungStunden((sum ?? 0) > 0 ? sum ?? 0 : null);
  }, [vorbereitungHours, verarbeitungKraeuterHours, verarbeitungMazeratHours, reinigungHours, sonstigesHours]);
  
  const setters = useMemo(() => ({
    setRatio, setMacerationDuration, setCalculatedNetWeightKg, setAverageNetWeightPerCrateKg,
    setYieldDisplayUnit, setLossAbsolute, setLossPercentage, setLossUnitDisplay,
    setEingesetzteLA, setAusbeuteLA, setVerlustLA,
    setVorbereitungHours, setVerarbeitungKraeuterHours, setVerarbeitungMazeratHours,
    setReinigungHours, setSonstigesHours, setSummeZeitaufzeichnungStunden
  }), [ // Removed setters from dependency array as they are stable due to useState
  ]);

  return {
    calculatedValues: {
      ratio, macerationDuration, calculatedNetWeightKg, averageNetWeightPerCrateKg,
      yieldDisplayUnit, lossAbsolute, lossPercentage, lossUnitDisplay,
      eingesetzteLA, ausbeuteLA, verlustLA,
      vorbereitungHours, verarbeitungKraeuterHours, verarbeitungMazeratHours,
      reinigungHours, sonstigesHours, summeZeitaufzeichnungStunden
    },
    setters,
  };
};


export default function MazerationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [loggedProtocols, setLoggedProtocols] = useState<MazerationFormData[]>([]);
  const [isImporting, setIsImporting] = useState(false);
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
        const dataForExportFiles: MazerationFormData = { ...values };

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('github-token') : null;
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
                    <FormLabel className="flex items-center gap-1"><Hash className="w-4 h-4 text-muted-foreground" />Chargennummer (5-stellig)</FormLabel>
                    <FormControl>
                      <Input type="text" maxLength={5} placeholder="00000" {...field} value={field.value ?? ""} />
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
                  <div className="md:col-span-1"> {} </div>


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
    </>
  );
}

