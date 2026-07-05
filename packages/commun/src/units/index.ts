/**
 * Gestion des unités de longueur et des échelles de modélisme ferroviaire.
 */

export type LengthUnit = 'mm' | 'cm' | 'm';

const MM_PER_UNIT: Record<LengthUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
};

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const mm = value * MM_PER_UNIT[from];
  return mm / MM_PER_UNIT[to];
}

export type ScaleKey = 'Z' | 'N' | 'TT' | 'H0' | '0' | 'I' | 'G';

export interface ScaleDefinition {
  key: ScaleKey;
  label: string;
  /** Ratio réel/modèle, ex. 87 pour H0 (1:87). */
  ratio: number;
}

export const SCALES: Record<ScaleKey, ScaleDefinition> = {
  Z: { key: 'Z', label: 'Z (1:220)', ratio: 220 },
  N: { key: 'N', label: 'N (1:160)', ratio: 160 },
  TT: { key: 'TT', label: 'TT (1:120)', ratio: 120 },
  H0: { key: 'H0', label: 'H0 (1:87)', ratio: 87 },
  '0': { key: '0', label: '0 (1:45)', ratio: 45 },
  I: { key: 'I', label: 'I (1:32)', ratio: 32 },
  G: { key: 'G', label: 'G (1:22.5)', ratio: 22.5 },
};

export const SCALE_KEYS = Object.keys(SCALES) as ScaleKey[];

/** Convertit une longueur réelle (en mm) en longueur modèle (en mm) pour une échelle donnée. */
export function realToScale(realMm: number, scale: ScaleKey): number {
  return realMm / SCALES[scale].ratio;
}

/** Convertit une longueur modèle (en mm) en longueur réelle (en mm) pour une échelle donnée. */
export function scaleToReal(modelMm: number, scale: ScaleKey): number {
  return modelMm * SCALES[scale].ratio;
}

// --- Préférences communes (unité / échelle par défaut) ---
// Stockées via `commonStorage` : ce sont des réglages qui ont du sens pour tous les modules.

import { commonStorage } from '../storage';

const PREFERRED_UNIT_KEY = 'preferredUnit';
const PREFERRED_SCALE_KEY = 'preferredScale';

export const DEFAULT_PREFERRED_UNIT: LengthUnit = 'mm';
export const DEFAULT_PREFERRED_SCALE: ScaleKey = 'H0';

export async function getPreferredUnit(): Promise<LengthUnit> {
  const stored = await commonStorage.get<LengthUnit>(PREFERRED_UNIT_KEY);
  return stored ?? DEFAULT_PREFERRED_UNIT;
}

export async function setPreferredUnit(unit: LengthUnit): Promise<void> {
  await commonStorage.set(PREFERRED_UNIT_KEY, unit);
}

export async function getPreferredScale(): Promise<ScaleKey> {
  const stored = await commonStorage.get<ScaleKey>(PREFERRED_SCALE_KEY);
  return stored ?? DEFAULT_PREFERRED_SCALE;
}

export async function setPreferredScale(scale: ScaleKey): Promise<void> {
  await commonStorage.set(PREFERRED_SCALE_KEY, scale);
}
