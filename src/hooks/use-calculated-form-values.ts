import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { calculateNetWeightDetailsForProtocol, calcVolumeFromMassAndDensity } from '@/lib/mazeration-calc';
import {
  TARE_PER_CRATE_KG_FIXED,
  getDerivedUnitsForProtocol,
  parseFormNumber,
  calculateRatioDetails,
  calculateMacerationDurationDetails,
  calculateTaskDurationHours,
  calculateYieldAndLossDetails,
  calculateLADetails,
} from '@/lib/mazeration-form-helpers';
import type { MazerationFormData } from '@/schemas/mazerationSchema';

export const useCalculatedFormValues = (form: ReturnType<typeof useForm<MazerationFormData>>) => {
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
  const tankStartLForm    = watch('tankStartL');
  const tankEndLForm      = watch('tankEndL');
  const yieldMassKgForm   = watch('yieldMassKg');
  const yieldDensityForm  = watch('yieldDensityAt');
  const yieldTempForm     = watch('yieldSpindelTemp');
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
  const numberOfPalletsForm = watch('numberOfPallets');
  const tarePerPalletKgForm = watch('tarePerPalletKg');

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
    const numCrates = parseFormNumber(numberOfCratesForm);
    const grossKg = parseFormNumber(grossWeightKgForm);
    const tareKg = parseFormNumber(tarePerCrateKgForm) ?? TARE_PER_CRATE_KG_FIXED;
    const numPallets = parseFormNumber(numberOfPalletsForm);
    const palletTareKg = parseFormNumber(tarePerPalletKgForm);
    const { calculatedNetWeightKg: netKg, averageNetWeightPerCrateKg: avgKg } =
      calculateNetWeightDetailsForProtocol(numCrates, grossKg, tareKg, numPallets, palletTareKg);
    setCalculatedNetWeightKg(netKg);
    setAverageNetWeightPerCrateKg(avgKg);
    try {
      if (netKg !== null) {
        if (plantWeightUnit === 'kg') {
          form.setValue('plantWeight', netKg, { shouldValidate: true, shouldDirty: true });
        } else if (plantWeightUnit === 'g') {
          form.setValue('plantWeight', Math.round(netKg * 1000), { shouldValidate: true, shouldDirty: true });
        }
      }
    } catch {
      // form may not be ready during SSR/init
    }
  }, [plantWeightUnit, numberOfCratesForm, grossWeightKgForm, tarePerCrateKgForm, numberOfPalletsForm, tarePerPalletKgForm]);

  useEffect(() => {
    const { yieldUnit, lossUnit } = getDerivedUnitsForProtocol(plantWeightUnit);
    setYieldDisplayUnit(yieldUnit);
    setLossUnitDisplay(lossUnit);
    if (plantWeightUnit === 'kg') {
      if (form.getValues('alcoholVolumeUnit') === 'ml') form.setValue('alcoholVolumeUnit', 'l', { shouldValidate: true });
    } else {
      if (form.getValues('alcoholVolumeUnit') === 'l') form.setValue('alcoholVolumeUnit', 'ml', { shouldValidate: true });
    }
  }, [plantWeightUnit, form]);

  useEffect(() => {
    setRatio(calculateRatioDetails(Number(plantWeightForm), plantWeightUnit, Number(alcoholVolumeForm), alcoholVolumeUnit));
  }, [plantWeightForm, plantWeightUnit, alcoholVolumeForm, alcoholVolumeUnit]);

  useEffect(() => {
    const start = Number(tankStartLForm);
    const end   = Number(tankEndLForm);
    if (start > 0 && end >= 0 && start > end) {
      form.setValue('alcoholVolume', parseFloat((start - end).toFixed(3)), { shouldValidate: false });
      form.setValue('alcoholVolumeUnit', 'l', { shouldValidate: false });
    }
  }, [tankStartLForm, tankEndLForm, form]);

  useEffect(() => {
    const massKg = Number(yieldMassKgForm);
    const rhoT   = Number(yieldDensityForm);
    const temp   = yieldTempForm != null ? Number(yieldTempForm) : NaN;
    if (massKg > 0 && rhoT > 0) {
      const volL = parseFloat(calcVolumeFromMassAndDensity(massKg, rhoT, isNaN(temp) ? undefined : temp).toFixed(3));
      form.setValue('yieldVolume', volL, { shouldValidate: false });
    }
  }, [yieldMassKgForm, yieldDensityForm, yieldTempForm, form]);

  useEffect(() => {
    setMacerationDuration(calculateMacerationDurationDetails(startDate, startTime, endDate, endTime));
  }, [startDate, startTime, endDate, endTime]);

  useEffect(() => {
    const { lossAbsolute: la, lossPercentage: lp } =
      calculateYieldAndLossDetails(plantWeightUnit, Number(alcoholVolumeForm), alcoholVolumeUnit, Number(yieldVolumeValue));
    setLossAbsolute(la);
    setLossPercentage(lp);
  }, [alcoholVolumeForm, alcoholVolumeUnit, yieldVolumeValue, plantWeightUnit]);

  useEffect(() => {
    const { eingesetzteLA: einLA, ausbeuteLA: ausLA, verlustLA: verLA } =
      calculateLADetails(plantWeightUnit, Number(alcoholVolumeForm), Number(alcoholConcentrationForm), alcoholVolumeUnit, Number(yieldVolumeValue), Number(endConcentrationForm));
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
  }), []);

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
