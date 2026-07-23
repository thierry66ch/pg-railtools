/**
 * Cœur métier du module « Calculs d'arc » : formules pures pour un arc de cercle défini
 * par sa corde AB (longueur c), sa flèche MD (f) et son rayon R.
 *
 * Ce fichier ne dépend d'aucun composant ni d'aucune brique de `@railtools/commun` :
 * uniquement `Math`, pour rester trivialement testable en isolation. Toutes les longueurs
 * sont exprimées dans la même unité (mm modèle) ; les angles sont en radians.
 *
 * Notations (voir docs/module_2_calcul_d_arc/Calcul_d_arc.md) :
 *  - c  : longueur de la corde AB
 *  - M  : milieu de la corde AB
 *  - f  : flèche = MD (distance perpendiculaire entre le milieu de la corde et le sommet)
 *  - R  : rayon du cercle
 *  - α  : demi-angle au centre sous-tendu par la demi-corde, α = asin((c/2)/R)
 *  - S  : sommet, intersection des tangentes au cercle en A et B
 *  - T  : longueur de tangente, T = A-S = B-S = R·tan(α)
 *  - bissectrice : distance S-M = R·(1/cos α − cos α)
 *  - contre-flèche : distance S-D = R·(1/cos α − 1) (distance externe standard)
 *  - E  : point courant sur la corde, à la distance AE de A
 *  - EF : flèche locale au point E (0 en A et B, f au milieu)
 */

/** Codes d'erreur de validation (traduits côté UI via `t('errors.<code>')`). */
export type ArcErrorCode =
  | 'chord-not-positive' // c ≤ 0
  | 'sagitta-not-positive' // f ≤ 0 (arc dégénéré en droite)
  | 'sagitta-too-large' // f > c/2 : dépasse le demi-cercle, non pris en charge
  | 'radius-not-positive' // R ≤ 0
  | 'radius-too-small' // R < c/2 : la corde dépasse le diamètre, impossible
  | 'angle-not-positive' // angle au centre ≤ 0
  | 'angle-too-large' // angle au centre > π : dépasse le demi-cercle, non pris en charge
  | 'tangent-not-positive' // T ≤ 0
  | 'tangent-too-small' // T ≤ c/2 : arc dégénéré en droite, non pris en charge
  | 'tangent-angle-too-large' // angle au centre ≥ π : tangentes parallèles, aucun R fini
  | 'intervals-too-small' // n < 2
  | 'intervals-not-integer'; // n non entier

/** Résultat d'un calcul : succès typé, ou échec avec un code d'erreur de validation. */
export type ArcResult<T> = { ok: true; value: T } | { ok: false; error: ArcErrorCode };

function ok<T>(value: T): ArcResult<T> {
  return { ok: true, value };
}
function err<T>(error: ArcErrorCode): ArcResult<T> {
  return { ok: false, error };
}

/**
 * Fonctionnalité 1 — Rayon R à partir de la corde c et de la flèche f.
 * R = (c² + 4f²) / (8f). Requiert c > 0 et f > 0 (si f = 0 l'arc dégénère en droite).
 *
 * Requiert aussi f ≤ c/2 : au-delà, l'arc dépasserait un demi-cercle (configuration
 * géométrique différente — centre du cercle du même côté que la corde que le sommet de
 * l'arc — que ce module ne modélise pas). f = c/2 correspond exactement au demi-cercle
 * (R = c/2), cas limite valide.
 */
export function radiusFromChordSagitta(chordMm: number, sagittaMm: number): ArcResult<number> {
  if (!(chordMm > 0)) return err('chord-not-positive');
  if (!(sagittaMm > 0)) return err('sagitta-not-positive');
  if (sagittaMm > chordMm / 2) return err('sagitta-too-large');
  return ok((chordMm * chordMm + 4 * sagittaMm * sagittaMm) / (8 * sagittaMm));
}

/**
 * Fonctionnalité 2 — Flèche f à partir du rayon R et de la corde c.
 * f = R − √(R² − (c/2)²). Requiert c > 0, R > 0 et R ≥ c/2 (sinon corde > diamètre).
 */
export function sagittaFromRadiusChord(radiusMm: number, chordMm: number): ArcResult<number> {
  if (!(chordMm > 0)) return err('chord-not-positive');
  if (!(radiusMm > 0)) return err('radius-not-positive');
  const half = chordMm / 2;
  if (radiusMm < half) return err('radius-too-small');
  return ok(radiusMm - Math.sqrt(radiusMm * radiusMm - half * half));
}

/**
 * Fonctionnalité 3 — Corde c et flèche f à partir du rayon R et de l'angle au centre
 * (angle plein, en radians). c = 2·R·sin(angle/2) ; f = R·(1 − cos(angle/2)).
 * Requiert R > 0 et 0 < angle ≤ π (angle = π correspond au demi-cercle, cas limite valide).
 */
export function chordSagittaFromRadiusAngle(
  radiusMm: number,
  angleRad: number,
): ArcResult<{ chordMm: number; sagittaMm: number }> {
  if (!(radiusMm > 0)) return err('radius-not-positive');
  if (!(angleRad > 0)) return err('angle-not-positive');
  if (angleRad > Math.PI) return err('angle-too-large');
  const half = angleRad / 2;
  return ok({
    chordMm: 2 * radiusMm * Math.sin(half),
    sagittaMm: radiusMm * (1 - Math.cos(half)),
  });
}

/**
 * Angle au centre (angle plein, en radians) pour un rayon R et une corde c donnés :
 * 2·asin((c/2)/R). Fonction volontairement non validante (appelée uniquement sur une
 * configuration (R, c) déjà validée par ailleurs), à l'image de `localOffset`.
 */
export function centralAngleFromRadiusChord(radiusMm: number, chordMm: number): number {
  return 2 * Math.asin(chordMm / (2 * radiusMm));
}

/**
 * Fonctionnalité 4 — Rayon R à partir de la longueur de tangente T (A-S ou B-S, S =
 * sommet, intersection des tangentes en A et B) et de l'angle au centre (angle plein,
 * en radians). R = T / tan(angle/2).
 *
 * Requiert T > 0 et 0 < angle < π **strictement** (contrairement à
 * `chordSagittaFromRadiusAngle`, l'angle π lui-même est ici invalide : à 180° les
 * tangentes en A et B sont parallèles, aucun rayon fini ne correspond à une tangente
 * donnée).
 */
export function radiusFromTangentAngle(tangentMm: number, angleRad: number): ArcResult<number> {
  if (!(tangentMm > 0)) return err('tangent-not-positive');
  if (!(angleRad > 0)) return err('angle-not-positive');
  if (angleRad >= Math.PI) return err('tangent-angle-too-large');
  return ok(tangentMm / Math.tan(angleRad / 2));
}

/**
 * Fonctionnalité 5 — Rayon R et angle au centre (angle plein, en radians) à partir de
 * la longueur de tangente T et de la corde c.
 * cos(angle/2) = c/(2T) ⟹ angle = 2·acos(c/(2T)) ; R = T/tan(angle/2).
 *
 * Requiert c > 0 et T > c/2 **strictement** (T = c/2 correspondrait à un arc dégénéré
 * en droite — angle → 0, rayon → l'infini — cas limite non représentable).
 */
export function radiusAngleFromTangentChord(
  tangentMm: number,
  chordMm: number,
): ArcResult<{ radiusMm: number; angleRad: number }> {
  if (!(chordMm > 0)) return err('chord-not-positive');
  if (!(tangentMm > 0)) return err('tangent-not-positive');
  if (tangentMm <= chordMm / 2) return err('tangent-too-small');
  const half = Math.acos(chordMm / (2 * tangentMm));
  return ok({ radiusMm: tangentMm / Math.tan(half), angleRad: 2 * half });
}

/** Tangente (A-S = B-S), bissectrice (S-M) et contre-flèche (S-D, distance externe). */
export interface TangentGeometry {
  tangentMm: number;
  bisectorMm: number;
  externalMm: number;
}

/** Tolérance (radians) sous laquelle l'angle plein est considéré indiscernable de π. */
const SEMICIRCLE_EPSILON_RAD = 1e-9;

/**
 * Grandeurs caractéristiques du sommet S (intersection des tangentes en A et B) à
 * partir du rayon R et de l'angle au centre (angle plein, en radians). Fonction
 * volontairement non validante (appelée uniquement sur une configuration déjà
 * validée), à l'image de `centralAngleFromRadiusChord`.
 *
 * Retourne `undefined` à la limite du demi-cercle (angle → π) : les tangentes en A et
 * B deviennent parallèles, S s'éloigne à l'infini — aucune valeur finie n'existe.
 */
export function tangentGeometryFromRadiusAngle(
  radiusMm: number,
  angleRad: number,
): TangentGeometry | undefined {
  const half = angleRad / 2;
  if (Math.PI / 2 - half < SEMICIRCLE_EPSILON_RAD) return undefined;
  const secant = 1 / Math.cos(half);
  return {
    tangentMm: radiusMm * Math.tan(half),
    bisectorMm: radiusMm * (secant - Math.cos(half)),
    externalMm: radiusMm * (secant - 1),
  };
}

/** Un point d'implantation de l'arc (une ligne du tableau). */
export interface ImplantationPoint {
  /** Index du point, de 0 (point A) à n (point B). */
  index: number;
  /** Angle β mesuré depuis la médiatrice de la corde (négatif côté A, positif côté B). */
  betaRad: number;
  /** Distance AE le long de la corde depuis A. */
  aeMm: number;
  /** Distance EB le long de la corde depuis B (= c − AE). */
  ebMm: number;
  /** Flèche locale EF (écart perpendiculaire à la corde) au point E. */
  efMm: number;
  /** Abscisse curviligne s le long de l'arc depuis A (0 en A, L en B). */
  arcLengthMm: number;
}

/** Tableau d'implantation complet plus les grandeurs dérivées utiles. */
export interface ImplantationTable {
  points: ImplantationPoint[];
  /** Demi-angle au centre α = asin((c/2)/R). */
  alphaRad: number;
  /** Flèche f de l'arc (déduite de R et c). */
  sagittaMm: number;
  /** Longueur totale de l'arc L = 2·R·α. */
  totalArcLengthMm: number;
}

/**
 * Fonctionnalité 3 — Tableau de n+1 points répartis UNIFORMÉMENT LE LONG DE L'ARC
 * (pas le long de la corde), pour un piquetage par écarts perpendiculaires.
 *
 * Requiert c > 0, R > 0, R ≥ c/2, et n entier ≥ 2.
 *
 * Points de contrôle (garantis par les formules) : i=0 → AE=0, EF=0 (A) ;
 * i=n → AE=c, EF=0 (B) ; point milieu → EF=f.
 */
export function computeImplantation(
  radiusMm: number,
  chordMm: number,
  intervals: number,
): ArcResult<ImplantationTable> {
  if (!(chordMm > 0)) return err('chord-not-positive');
  if (!(radiusMm > 0)) return err('radius-not-positive');
  const half = chordMm / 2;
  if (radiusMm < half) return err('radius-too-small');
  if (!Number.isInteger(intervals)) return err('intervals-not-integer');
  if (intervals < 2) return err('intervals-too-small');

  const alphaRad = Math.asin(half / radiusMm);
  const sagittaMm = radiusMm - Math.sqrt(radiusMm * radiusMm - half * half);
  const deltaBeta = (2 * alphaRad) / intervals;

  const points: ImplantationPoint[] = [];
  for (let i = 0; i <= intervals; i++) {
    const betaRad = -alphaRad + i * deltaBeta;
    const aeMm = radiusMm * Math.sin(betaRad) + half;
    const efMm = radiusMm * Math.cos(betaRad) - radiusMm + sagittaMm;
    points.push({
      index: i,
      betaRad,
      aeMm,
      ebMm: chordMm - aeMm,
      efMm,
      arcLengthMm: radiusMm * (betaRad + alphaRad),
    });
  }

  return ok({ points, alphaRad, sagittaMm, totalArcLengthMm: 2 * radiusMm * alphaRad });
}

/**
 * Flèche locale EF au point E situé à la distance `aeMm` de A sur la corde, pour le mode
 * « curseur libre » (formule continue, indépendante de tout découpage en intervalles) :
 *   EF(x) = √(R² − x²) − (R − f),  avec x = AE − c/2.
 *
 * Fonction volontairement non validante (appelée en continu avec des entrées déjà
 * validées) ; le domaine du √ est simplement borné pour éviter un NaN aux limites.
 */
export function localOffset(
  aeMm: number,
  radiusMm: number,
  chordMm: number,
  sagittaMm: number,
): number {
  const x = aeMm - chordMm / 2;
  const under = radiusMm * radiusMm - x * x;
  return Math.sqrt(Math.max(0, under)) - (radiusMm - sagittaMm);
}
