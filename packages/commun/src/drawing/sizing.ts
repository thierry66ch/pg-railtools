/**
 * Dimensionnement du texte et des flèches des cotes, en fonction de la taille du dessin
 * (mm de dessin, après réduction par l'échelle de dessin) — jamais de l'échelle de
 * dessin elle-même, pour éviter des annotations illisibles ou disproportionnées.
 */

export interface DimensionSizing {
  textSizeMm: number;
  arrowSizeMm: number;
  /** Espace entre la géométrie dessinée et le trait de cote (cote de longueur). */
  gapMm: number;
}

const TEXT_RATIO = 0.02;
const TEXT_MIN_MM = 2;
const TEXT_MAX_MM = 12;

const ARROW_RATIO = 0.015;
const ARROW_MIN_MM = 1.5;
const ARROW_MAX_MM = 8;

const GAP_MM = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** `referenceSizeMm` = plus grande dimension du dessin, en mm de dessin. */
export function suggestDimensionSizing(referenceSizeMm: number): DimensionSizing {
  return {
    textSizeMm: clamp(referenceSizeMm * TEXT_RATIO, TEXT_MIN_MM, TEXT_MAX_MM),
    arrowSizeMm: clamp(referenceSizeMm * ARROW_RATIO, ARROW_MIN_MM, ARROW_MAX_MM),
    gapMm: GAP_MM,
  };
}
