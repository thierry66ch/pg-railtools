/**
 * Dimensionnement du texte et des flèches des cotes, en mm "papier" (mm de dessin) —
 * toujours des valeurs fixes, indépendantes de l'échelle de dessin ET de la taille du
 * dessin, pour rester cohérentes d'un dessin à l'autre (comme en CAO : l'espace papier
 * ne dépend pas du contenu de l'espace modèle).
 */

export interface DimensionSizing {
  textSizeMm: number;
  arrowSizeMm: number;
  /** Espace entre la géométrie dessinée et le trait de cote (cote de longueur). */
  gapMm: number;
}

const DEFAULT_SIZING: DimensionSizing = {
  textSizeMm: 3,
  arrowSizeMm: 2,
  gapMm: 1,
};

/** Distance par défaut (mm de dessin) entre une géométrie et son trait de cote. */
export const DEFAULT_COTE_OFFSET_MM = 10;

export function suggestDimensionSizing(): DimensionSizing {
  return DEFAULT_SIZING;
}
