import { differenceInMilliseconds, isValid } from 'date-fns';
import { toVolumeLiters, calcLA } from './mazeration-calc';

export const TARE_PER_CRATE_KG_FIXED = 2.00;

export const getDerivedUnitsForProtocol = (plantWeightUnit?: 'g' | 'kg') => {
  if (plantWeightUnit === 'kg') return { yieldUnit: 'l', lossUnit: 'l' };
  return { yieldUnit: 'ml', lossUnit: 'ml' };
};

export const parseFormNumber = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().replace(/\s+/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const combineDateTime = (date: Date | undefined | null, timeString: string | undefined | null): Date | undefined => {
  if (!date || !isValid(date)) return undefined;
  const newDate = new Date(date);
  if (timeString && /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
    const [hours, minutes] = timeString.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  }
  return undefined;
};

export const formatNumberWithComma = (num: number | null | undefined, precision: number = 2, unit?: string): string => {
  if (num === null || num === undefined || isNaN(num)) return '---';
  const suffix = unit ? ` ${unit}` : '';
  return num.toFixed(precision).replace('.', ',') + suffix;
};

export const calculateRatioDetails = (
  plantWeight?: number | null,
  plantWeightUnit?: 'g' | 'kg',
  alcoholVolume?: number | null,
  alcoholVolumeUnit?: 'ml' | 'l',
): string => {
  let weightInG = Number(plantWeight);
  if (plantWeightUnit === 'kg') weightInG = Number(plantWeight) * 1000;

  let volumeInMl = Number(alcoholVolume);
  if (alcoholVolumeUnit === 'l') volumeInMl = volumeInMl * 1000;

  if (weightInG > 0 && volumeInMl > 0) {
    return `1:${(volumeInMl / weightInG).toFixed(2).replace('.', ',')}`;
  }
  return '1:X';
};

export const calculateMacerationDurationDetails = (
  macerationStart?: Date | null,
  macerationStartTime?: string | null,
  macerationEnd?: Date | null,
  macerationEndTime?: string | null,
): string => {
  const startDateTime = combineDateTime(macerationStart, macerationStartTime);
  const endDateTime = combineDateTime(macerationEnd, macerationEndTime);

  if (startDateTime && endDateTime && isValid(startDateTime) && isValid(endDateTime) && startDateTime < endDateTime) {
    const totalHours = Math.floor(differenceInMilliseconds(endDateTime, startDateTime) / (1000 * 60 * 60));
    return `${Math.floor(totalHours / 24)} Tage, ${totalHours % 24} Stunden`;
  }
  return '0 Tage, 0 Stunden';
};

export const calculateTaskDurationHours = (
  date?: Date | null,
  startTime?: string | null,
  endTime?: string | null,
): number | null => {
  if (!date || !startTime || !endTime) return null;
  const startDateTime = combineDateTime(date, startTime);
  const endDateTime = combineDateTime(date, endTime);
  if (startDateTime && endDateTime && isValid(startDateTime) && isValid(endDateTime) && endDateTime > startDateTime) {
    return parseFloat((differenceInMilliseconds(endDateTime, startDateTime) / (1000 * 60 * 60)).toFixed(2));
  }
  return null;
};

export const calculateYieldAndLossDetails = (
  plantWeightUnit?: 'g' | 'kg',
  alcoholVolume?: number | null,
  alcoholVolumeUnit?: 'ml' | 'l',
  yieldVolume?: number | null,
): { lossAbsolute: number | null; lossPercentage: number | null; lossUnitDisplay: string; yieldDisplayUnit: string } => {
  const { yieldUnit, lossUnit } = getDerivedUnitsForProtocol(plantWeightUnit);
  const alcVolNum = Number(alcoholVolume);
  const yieldVolNum = Number(yieldVolume);

  if (isNaN(alcVolNum) || alcVolNum <= 0 || isNaN(yieldVolNum) || yieldVolNum < 0) {
    return { lossAbsolute: null, lossPercentage: null, lossUnitDisplay: lossUnit, yieldDisplayUnit: yieldUnit };
  }

  const alcoholInMl = alcoholVolumeUnit === 'l' ? alcVolNum * 1000 : alcVolNum;
  const yieldInMlToCompare = yieldUnit === 'l' ? yieldVolNum * 1000 : yieldVolNum;

  if (alcoholInMl <= 0) {
    return { lossAbsolute: null, lossPercentage: null, lossUnitDisplay: lossUnit, yieldDisplayUnit: yieldUnit };
  }

  const absoluteLossInMl = alcoholInMl - yieldInMlToCompare;
  const percentageLoss = (absoluteLossInMl / alcoholInMl) * 100;
  const displayAbsoluteLossValue = lossUnit === 'l' ? absoluteLossInMl / 1000 : absoluteLossInMl;

  return {
    lossAbsolute: parseFloat(displayAbsoluteLossValue.toFixed(2)),
    lossPercentage: parseFloat(percentageLoss.toFixed(2)),
    lossUnitDisplay: lossUnit,
    yieldDisplayUnit: yieldUnit,
  };
};

export const calculateLADetails = (
  plantWeightUnit?: 'g' | 'kg',
  alcoholVolume?: number | null,
  alcoholConcentration?: number | null,
  alcoholVolumeUnit?: 'ml' | 'l',
  yieldVolume?: number | null,
  endConcentration?: number | null,
): { eingesetzteLA: number | null; ausbeuteLA: number | null; verlustLA: number | null } => {
  const alcVol = Number(alcoholVolume);
  const alcConc = Number(alcoholConcentration);
  const yieldVol = Number(yieldVolume);
  const endConc = Number(endConcentration);
  const { yieldUnit } = getDerivedUnitsForProtocol(plantWeightUnit);

  const eingesetzteLA =
    !isNaN(alcVol) && !isNaN(alcConc) && alcVol > 0 && alcConc >= 0
      ? parseFloat(calcLA(toVolumeLiters(alcVol, alcoholVolumeUnit || 'l'), alcConc).toFixed(4))
      : null;

  const ausbeuteLA =
    !isNaN(yieldVol) && !isNaN(endConc) && yieldVol > 0 && endConc >= 0
      ? parseFloat(calcLA(toVolumeLiters(yieldVol, yieldUnit), endConc).toFixed(4))
      : null;

  const verlustLA =
    eingesetzteLA !== null && ausbeuteLA !== null
      ? parseFloat((eingesetzteLA - ausbeuteLA).toFixed(4))
      : null;

  return { eingesetzteLA, ausbeuteLA, verlustLA };
};
