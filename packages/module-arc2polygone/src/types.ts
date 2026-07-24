import type { DrawingScale } from '@railtools/commun';
import type { SupportType } from './calc/arc2poly';

/**
 * Entrée de la bibliothèque de modèles de support, partagée entre tous les projets du
 * module (cf. CDC §10). L'insertion d'un modèle dans un projet en crée une COPIE FIGÉE
 * (voir `Arc2PolyProjectData.modelOrigin`) : modifier ensuite l'entrée n'affecte aucun
 * projet existant.
 */
export interface Arc2PolyLibraryEntry {
  /** Identifiant interne. */
  id: string;
  /** Libellé utilisateur (champ requis par `LibraryItem` de la base commune). */
  name: string;
  type: SupportType;
  /** Largeur [mm]. */
  B: number;
  /** Longueur médiane / entraxe des rotules si type 3 [mm]. */
  Lm: number;
  /** Jeu d'emboîtement (type 3 uniquement) [mm], défaut 0. */
  jeu: number;
  /** Commentaire libre, optionnel. */
  commentaire?: string;
}

/**
 * Trace informative de l'origine d'un modèle inséré dans un projet. Le projet conserve le
 * nom d'origine à titre indicatif seulement ; les dimensions vivent dans le projet lui-même.
 */
export interface Arc2PolyModelOrigin {
  id: string;
  name: string;
}

/**
 * Contenu d'un projet utilisateur du module. C'est la structure propre au module ; le
 * mécanisme de sauvegarde/chargement/export est fourni par la base commune (`projects`).
 */
export interface Arc2PolyProjectData {
  /** Type de support sélectionné. */
  type: SupportType;
  /** Rayon de l'axe de la voie [mm]. */
  Ra: number;
  /** Largeur d'un élément [mm]. */
  B: number;
  /** Longueur médiane / entraxe des rotules (type 3) [mm]. */
  Lm: number;
  /** Ouverture totale de l'arc [degrés décimaux]. */
  beta: number;
  /** Jeu d'emboîtement (type 3) [mm]. */
  j: number;
  /** Origine du modèle inséré depuis la bibliothèque (informatif). */
  modelOrigin?: Arc2PolyModelOrigin;
  /** Échelle de dessin choisie pour ce projet. */
  drawingScale: DrawingScale;
  /** Interrupteur « cotation des débords » sur le dessin. */
  showOverhangCotes: boolean;
}
