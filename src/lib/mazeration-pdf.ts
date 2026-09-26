import jsPDF from 'jspdf';
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

export function generatePdf(
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
