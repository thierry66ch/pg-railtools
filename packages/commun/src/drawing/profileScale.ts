/**
 * Échelle de dessin "profil" : combine l'échelle de dessin horizontale existante
 * (`DrawingScale`, réutilisée telle quelle) avec un facteur d'exagération verticale
 * additionnel, pour les dessins de type profil en long (axe K horizontal, axe H vertical
 * déformé). Utilitaire additif séparé — ne modifie ni `resolveDrawingScale` ni
 * `modelToDrawing`, utilisés tels quels par les modules à échelle X/Y uniforme (arc,
 * emprise latérale) : aucun risque de régression sur ces modules.
 */

import { modelToDrawing, resolveDrawingScale, type DrawingScale, type ResolvedDrawingScale } from './scale';

export interface ProfileDrawingScale {
  horizontal: DrawingScale;
  /** Facteur d'exagération de l'axe H par rapport à l'axe K (ex. 1, 2, 5, 10). */
  verticalExaggeration: number;
}

export interface ResolvedProfileScale {
  horizontal: ResolvedDrawingScale;
  verticalExaggeration: number;
}

/**
 * Résout une `ProfileDrawingScale` en ratio effectif. En mode "fit", la hauteur passée au
 * calcul du ratio doit être la hauteur DÉFORMÉE (`height * verticalExaggeration`) — sinon le
 * dessin déborderait de la cible une fois le facteur appliqué en plus au rendu par
 * `modelToDrawingY`.
 */
export function resolveProfileDrawingScale(
  scale: ProfileDrawingScale,
  modelSizeMm: { width: number; height: number },
): ResolvedProfileScale {
  const horizontal = resolveDrawingScale(scale.horizontal, {
    width: modelSizeMm.width,
    height: modelSizeMm.height * scale.verticalExaggeration,
  });
  return { horizontal, verticalExaggeration: scale.verticalExaggeration };
}

/** Convertit une longueur K (mm modèle réduit) en mm de dessin (échelle horizontale seule). */
export function modelToDrawingX(mm: number, resolved: ResolvedProfileScale): number {
  return modelToDrawing(mm, resolved.horizontal);
}

/** Convertit une longueur H (mm modèle réduit) en mm de dessin (échelle horizontale × exagération verticale). */
export function modelToDrawingY(mm: number, resolved: ResolvedProfileScale): number {
  return modelToDrawing(mm, resolved.horizontal) * resolved.verticalExaggeration;
}
