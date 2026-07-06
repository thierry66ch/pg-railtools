/**
 * Échelle de dessin : rapport entre la taille du modèle réduit et la taille du dessin
 * rendu (unités SVG = mm de dessin). Distincte de l'échelle modèle (`ScaleKey`, réel →
 * modèle réduit) : un tronçon peut mesurer plusieurs mètres à taille modèle réduit (grandes
 * échelles comme 0 ou I) et doit être encore réduit pour tenir sur une page.
 */

import { commonStorage } from '../storage';

export type DrawingScaleMode = 'fixed' | 'fit';

/** Dénominateurs de ratio 1:N proposés pour le mode fixe. */
export const DRAWING_SCALE_RATIOS = [1, 2, 5, 10, 20, 50] as const;

export interface DrawingScale {
  mode: DrawingScaleMode;
  /** Dénominateur du ratio 1:N, utilisé si `mode === 'fixed'`. */
  ratio?: number;
  /** Dimensions cible (mm de dessin) de la page, utilisées si `mode === 'fit'`. */
  fitTargetMm?: { width: number; height: number };
}

export interface ResolvedDrawingScale {
  mode: DrawingScaleMode;
  /** Dénominateur effectif du ratio 1:N (mm modèle / mm dessin). */
  ratio: number;
}

export const DEFAULT_DRAWING_SCALE: DrawingScale = { mode: 'fixed', ratio: 1 };

/** Résout une `DrawingScale` en ratio effectif, à partir de la taille du modèle (mm). */
export function resolveDrawingScale(
  scale: DrawingScale,
  modelSizeMm: { width: number; height: number },
): ResolvedDrawingScale {
  if (scale.mode === 'fit' && scale.fitTargetMm) {
    const { width, height } = scale.fitTargetMm;
    const ratioW = width > 0 ? modelSizeMm.width / width : 1;
    const ratioH = height > 0 ? modelSizeMm.height / height : 1;
    const ratio = Math.max(ratioW, ratioH) || 1;
    return { mode: 'fit', ratio };
  }
  return { mode: 'fixed', ratio: scale.ratio ?? 1 };
}

/** Convertit une longueur en mm modèle réduit vers des mm de dessin. */
export function modelToDrawing(mm: number, resolved: ResolvedDrawingScale): number {
  return mm / resolved.ratio;
}

/** Convertit une longueur en mm de dessin vers des mm modèle réduit. */
export function drawingToModel(mm: number, resolved: ResolvedDrawingScale): number {
  return mm * resolved.ratio;
}

// --- Préférence globale (valeur par défaut au chargement d'un module) ---

const PREFERRED_DRAWING_SCALE_KEY = 'preferredDrawingScale';

export async function getPreferredDrawingScale(): Promise<DrawingScale> {
  const stored = await commonStorage.get<DrawingScale>(PREFERRED_DRAWING_SCALE_KEY);
  return stored ?? DEFAULT_DRAWING_SCALE;
}

export async function setPreferredDrawingScale(scale: DrawingScale): Promise<void> {
  await commonStorage.set(PREFERRED_DRAWING_SCALE_KEY, scale);
}
