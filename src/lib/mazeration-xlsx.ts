import * as XLSX from 'xlsx';
import { format, isValid } from 'date-fns';
import { calculateNetWeightDetailsForProtocol } from '@/lib/mazeration-calc';
import {
  TARE_PER_CRATE_KG_FIXED,
  combineDateTime,
  formatNumberWithComma,
  placeholderText,
  placeholderDate,
  placeholderTime,
  placeholderNumber,
  placeholderHours,
} from '@/lib/mazeration-form-helpers';
import type { MazerationFormData } from '@/schemas/mazerationSchema';
import type { useCalculatedFormValues } from '@/hooks/use-calculated-form-values';

// Function to generate XLSX for single protocol (empty or current)
export const generateSingleProtocolXlsx = (
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

  addTitleToSheet("Mazerationszeitraum");
  const startDateTime = isEmptyForm || !data || !data.macerationStart || data.macerationStart.getTime() === new Date(0).getTime() ? null : combineDateTime(data.macerationStart, data.macerationStartTime);
  const endDateTime = isEmptyForm || !data || !data.macerationEnd || data.macerationEnd.getTime() === new Date(0).getTime() ? null : combineDateTime(data.macerationEnd, data.macerationEndTime);
  addRowToSheet("Beginn", !startDateTime ? `${placeholderDate} ${placeholderTime}` : format(startDateTime, 'dd.MM.yyyy HH:mm'));
  addRowToSheet("Ende", !endDateTime ? `${placeholderDate} ${placeholderTime}` : format(endDateTime, 'dd.MM.yyyy HH:mm'));
  addRowToSheet("Dauer", isEmptyForm ? `${placeholderNumber} Tage, ${placeholderNumber} Stunden` : macerationDuration);
  addRowToSheet("Durchschnittliche Raumtemperatur (°C)", isEmptyForm || !data || data.roomTemperature === null ? placeholderNumber : formatNumberWithComma(data.roomTemperature,1));

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
export const generateCumulativeXlsx = (protocols: MazerationFormData[], allCalculatedValues: ReturnType<typeof useCalculatedFormValues>['calculatedValues'][]) => {
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
