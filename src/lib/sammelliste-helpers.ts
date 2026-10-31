import { getDerivedUnitsForProtocol } from '@/lib/mazeration-form-helpers';

export interface Protocol {
  id?: string;
  macerationName?: string;
  batchNumber?: string;
  creationDate?: string;
  plantName?: string;
  plantPart?: string;
  plantWeight?: number | null;
  plantWeightUnit?: string;
  alcoholType?: string;
  alcoholVolume?: number | null;
  alcoholVolumeUnit?: string;
  alcoholConcentration?: number | null;
  macerationStart?: string;
  macerationEnd?: string;
  yieldVolume?: number | null;
  yieldVolumeUnit?: string;
  endConcentration?: number | null;
  roomTemperature?: number | null;
  remarks?: string;
  [key: string]: unknown;
}

/**
 * Einheit der Ausbeute (yieldVolume) mit Rückwärtskompatibilität: ältere
 * Desktop-Protokolle (vor Einführung von yieldVolumeUnit) hatten dieses Feld
 * nicht gespeichert. Ein harter 'l'-Default hätte in ml erfasste
 * Kleinmengen-Ausbeuten um Faktor 1000 verfälscht - stattdessen aus
 * plantWeightUnit ableiten, genau wie beim ursprünglichen Erfassen.
 */
export function getYieldUnit(p: Protocol): 'ml' | 'l' {
  if (p.yieldVolumeUnit === 'ml' || p.yieldVolumeUnit === 'l') return p.yieldVolumeUnit;
  return getDerivedUnitsForProtocol(p.plantWeightUnit as 'g' | 'kg' | undefined).yieldUnit;
}
