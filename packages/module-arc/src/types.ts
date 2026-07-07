import type { DrawingScale } from '@railtools/commun';

/** Mode de saisie : quel couple de valeurs l'utilisateur fournit, le 3e étant déduit. */
export type ArcInputMode = 'chordSagitta' | 'radiusChord';

/**
 * Données d'un projet du module « Calculs d'arc ». Toutes les longueurs sont en mm
 * (le module travaille directement en mm modèle, sans conversion d'échelle modèle).
 */
export interface ArcProjectData {
  /** Couple de valeurs saisi par l'utilisateur ; l'autre grandeur en est déduite. */
  inputMode: ArcInputMode;
  /** Corde AB (mm). */
  chordMm: number;
  /** Flèche CD (mm) — saisie en mode `chordSagitta`, déduite en mode `radiusChord`. */
  sagittaMm: number;
  /** Rayon R (mm) — saisi en mode `radiusChord`, déduit en mode `chordSagitta`. */
  radiusMm: number;
  /** Nombre d'intervalles le long de l'arc pour le tableau d'implantation (≥ 2). */
  intervals: number;
  /** Nombre de décimales affichées pour les résultats et le tableau. */
  decimals: number;
  /** Afficher la colonne abscisse curviligne s_i dans le tableau d'implantation. */
  showArcLength: boolean;
  /** Afficher la colonne cumul des angles dans le tableau d'implantation. */
  showAngleCumul: boolean;
  /** Échelle de dessin choisie pour le SVG. */
  drawingScale: DrawingScale;
}
