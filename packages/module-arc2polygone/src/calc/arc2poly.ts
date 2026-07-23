/**
 * Moteur de calcul du module Arc2Poly — discrétisation d'un arc de voie circulaire
 * en une suite d'éléments de support rectilignes (planches trapézoïdales, pavés
 * rectangulaires, bordures à emboîtement).
 *
 * Source unique de vérité pour la géométrie. Aucune dépendance externe : ce fichier
 * n'utilise que de la trigonométrie circulaire élémentaire et peut être compilé et
 * testé isolément (voir arc2poly.test.ts).
 *
 * Convention : u = α / 2. Toutes les longueurs en mm, tous les angles en radians dans
 * le calcul ; la conversion en degrés décimaux n'intervient qu'aux frontières de sortie
 * (champs `*Deg`). Aucun arrondi intermédiaire.
 *
 * Réf. : CDC_Arc2Poly_v0.1.md §2–§7, PROMPT_ClaudeCode_Arc2Poly.md §2–§4.
 */

export type SupportType = 1 | 2 | 3;

export interface Arc2PolyInput {
  /** Type de support : 1 = planches trapézoïdales, 2 = pavés, 3 = bordures à emboîtement. */
  type: SupportType;
  /** Rayon de l'axe de la voie posée [mm]. */
  Ra: number;
  /** Largeur d'un élément [mm]. */
  B: number;
  /** Longueur médiane / entraxe des rotules (type 3) [mm]. */
  Lm: number;
  /** Ouverture totale de l'arc [degrés décimaux]. */
  beta: number;
  /** Jeu d'emboîtement (type 3 uniquement) [mm], défaut 0. */
  j?: number;
}

export type ValidationCode =
  | 'V1' // paramètre non strictement positif
  | 'V2' // ouverture d'arc hors domaine
  | 'V3' // jeu négatif interdit
  | 'V4' // corde supérieure au diamètre : arc impossible
  | 'V5' // largeur d'élément incompatible avec le rayon (type 2)
  | 'V6' // l'élément recouvre le centre de l'arc (Ri <= 0)
  | 'V7' // configuration de rotule dégénérée (type 3)
  | 'V8' // angle par élément trop ouvert (> 45°) — blocage
  | 'V9'; // échec de résolution numérique

export interface Arc2PolyError {
  code: ValidationCode;
  /** Nom du (ou des) paramètre(s) bloquant(s), pour un message non générique. */
  param: string;
}

export interface Arc2PolyResult {
  type: SupportType;

  /** Angle au centre par élément α = 2u [degrés décimaux]. */
  alphaDeg: number;
  /** Demi-angle u = α/2 [radians] (interne, utile aux consommateurs du dessin). */
  u: number;

  /** Rayon du cercle des points de jonction à mi-largeur [mm]. */
  Rm: number;
  /** Rayon d'enveloppe intérieur [mm]. */
  Ri: number;
  /** Rayon d'enveloppe extérieur [mm]. */
  Re: number;

  /** Longueur de la rive intérieure (type 1 uniquement) [mm]. */
  Li?: number;
  /** Longueur de la rive extérieure (type 1 uniquement) [mm]. */
  Le?: number;
  /** Réglage de scie à onglet = u (type 1 uniquement) [degrés décimaux]. */
  coupeDeg?: number;

  /** Angle rentrant 180° − α (types 2 et 3) [degrés décimaux]. */
  rentrantDeg?: number;
  /** Ouverture côté extérieur, mesurée sur la corde (type 2 uniquement) [mm]. */
  O?: number;

  /** Débord intérieur minimal (aux joints) [mm]. */
  EiMin: number;
  /** Débord intérieur maximal (à mi-longueur) [mm]. */
  EiMax: number;
  /** Débord extérieur minimal (à mi-longueur) [mm]. */
  EeMin: number;
  /** Débord extérieur maximal [mm]. */
  EeMax: number;

  /** Nombre d'éléments entiers n = floor(β / α). */
  n: number;
  /** Angle résiduel βr = β − n·α [degrés décimaux]. */
  betaResidualDeg: number;
  /** Corde résiduelle au rayon Rm : cr = 2·Rm·sin(βr/2) [mm]. */
  residualChord: number;
  /** Vrai si βr < 0,01° (arc couvert exactement par n éléments). */
  exactlyCovered: boolean;

  /** Rmédian > Ra ? (attendu pour le type 2, cf. CDC §4.3 — pas une anomalie). */
  RmGreaterThanRa: boolean;
}

export type Arc2PolyOutcome =
  | { ok: true; result: Arc2PolyResult }
  | { ok: false; error: Arc2PolyError };

/** Seuil bloquant sur l'angle par élément (V8) — le modèle polygonal perd son sens au-delà. */
export const ALPHA_MAX_DEG = 45;
/** Plafond de u correspondant à ALPHA_MAX_DEG (u = α/2). */
const U_MAX = (ALPHA_MAX_DEG * Math.PI) / 180 / 2; // = π/8
// Tolérance resserrée près de l'epsilon machine : la contrainte de centrage
// (Ei_min = Ee_min) EST l'équation résolue, son résidu en mm vaut ≈ f′·(largeur de
// bracket). Pour tenir l'invariant à 1e-9 mm (cf. prompt §4), il faut un bracket ≪ 1e-10.
const BISECTION_TOL = 1e-14; // rad
const BISECTION_MAX_ITER = 200;
/** Tolérance de dépassement de α (bruit flottant) avant de déclencher V8. */
const ALPHA_EPS_DEG = 1e-6;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Bissection d'une fonction strictement décroissante sur ]0 ; U_MAX].
 * f(0+) → +∞ par construction (terme en cot(u/2) ou en 1/sin u).
 *  - si f(U_MAX) > 0 : la racine est au-delà de u = π/8, donc α > 45° → V8 ;
 *  - sinon : racine dans ]0 ; U_MAX], convergence garantie.
 *
 * On borne volontairement l'intervalle au domaine admissible (α ≤ 45°) : au-delà, la
 * solution est de toute façon rejetée par V8 et la monotonie de f/g n'est plus garantie.
 * (Le prompt écrit « ]0 ; π/4] » et « f(π/4) » ; comme u = α/2, le plafond α = 45°
 * correspond à u = π/8 — c'est cette borne, cohérente avec V8, qui est retenue.)
 */
function solveDecreasing(
  f: (u: number) => number,
): { u: number } | { code: 'V8' | 'V9' } {
  const lo = 1e-9;
  const hi = U_MAX;
  const fLo = f(lo);
  const fHi = f(hi);

  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return { code: 'V9' };
  // f décroissante avec f(lo) > 0 : si f(hi) > 0, racine au-delà du domaine admissible.
  if (fHi > 0) return { code: 'V8' };
  if (fLo <= 0) return { code: 'V9' }; // configuration inattendue (pas de changement de signe utile)

  let a = lo;
  let b = hi;
  for (let i = 0; i < BISECTION_MAX_ITER; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (fm > 0) a = m;
    else b = m;
    if (b - a < BISECTION_TOL) return { u: 0.5 * (a + b) };
  }
  // Intervalle non resserré sous la tolérance après maxIter : non-convergence.
  return b - a < BISECTION_TOL * 10 ? { u: 0.5 * (a + b) } : { code: 'V9' };
}

/** Assemble le découpage de l'arc complet (commun aux trois types). */
function buildTiling(
  betaDeg: number,
  alphaDeg: number,
  Rm: number,
): Pick<Arc2PolyResult, 'n' | 'betaResidualDeg' | 'residualChord' | 'exactlyCovered'> {
  const n = Math.floor(betaDeg / alphaDeg);
  const betaResidualDeg = betaDeg - n * alphaDeg;
  const residualChord = 2 * Rm * Math.sin(toRad(betaResidualDeg) / 2);
  return {
    n,
    betaResidualDeg,
    residualChord,
    exactlyCovered: betaResidualDeg < 0.01,
  };
}

/**
 * Calcule la discrétisation d'un arc pour le type de support donné.
 * Retourne soit un résultat complet, soit la première erreur de validation rencontrée.
 */
export function computeArc2Poly(input: Arc2PolyInput): Arc2PolyOutcome {
  const { type, Ra, B, Lm, beta } = input;
  const j = input.j ?? 0;

  // --- Validations amont (avant résolution) ---
  // V1 — paramètre non strictement positif.
  if (!(Ra > 0)) return { ok: false, error: { code: 'V1', param: 'Ra' } };
  if (!(B > 0)) return { ok: false, error: { code: 'V1', param: 'B' } };
  if (!(Lm > 0)) return { ok: false, error: { code: 'V1', param: 'Lm' } };
  // V2 — ouverture d'arc hors domaine.
  if (!(beta > 0) || beta > 360) return { ok: false, error: { code: 'V2', param: 'beta' } };
  // V3 — jeu négatif interdit (type 3).
  if (type === 3 && j < 0) return { ok: false, error: { code: 'V3', param: 'j' } };
  // V5 — largeur incompatible avec le rayon (type 2). Vérifiée avant V4 car elle nomme
  // précisément la relation bloquante propre au type 2 (B trop grand devant Ra).
  if (type === 2 && 2 * Ra - B <= 0) return { ok: false, error: { code: 'V5', param: 'B' } };
  // V4 — corde supérieure au diamètre : arc impossible.
  if (Lm >= 2 * Ra) return { ok: false, error: { code: 'V4', param: 'Lm' } };

  // --- Résolution de u puis assemblage, propre à chaque type ---
  if (type === 1) return solveType1(Ra, B, Lm, beta);
  if (type === 2) return solveType2(Ra, B, Lm, beta);
  return solveType3(Ra, B, Lm, beta, j);
}

// ---------------------------------------------------------------------------
// Type 1 — planches trapézoïdales, coupes radiales
// ---------------------------------------------------------------------------
function solveType1(Ra: number, B: number, Lm: number, beta: number): Arc2PolyOutcome {
  // f(u) = Lm·(1+cos u)/(2·sin u) − (B/2)·(1−cos u)/cos u − 2·Ra   (strictement décroissante)
  const f = (u: number): number =>
    (Lm * (1 + Math.cos(u))) / (2 * Math.sin(u)) -
    (B / 2) * ((1 - Math.cos(u)) / Math.cos(u)) -
    2 * Ra;

  const sol = solveDecreasing(f);
  if ('code' in sol) return { ok: false, error: { code: sol.code, param: sol.code === 'V8' ? 'Lm' : 'Lm' } };
  const u = sol.u;

  const Rm = Lm / (2 * Math.sin(u));
  const Ri = Rm - B / (2 * Math.cos(u));
  const Re = Rm + B / (2 * Math.cos(u));

  // V6 — l'élément recouvre le centre de l'arc.
  if (Ri <= 0) return { ok: false, error: { code: 'V6', param: 'Ri' } };

  const alphaDeg = toDeg(2 * u);
  // V8 — angle par élément trop ouvert (post-résolution).
  if (alphaDeg > ALPHA_MAX_DEG + ALPHA_EPS_DEG) return { ok: false, error: { code: 'V8', param: 'Lm' } };

  const Li = 2 * Ri * Math.sin(u);
  const Le = 2 * Re * Math.sin(u);

  const EiMin = Ra - Ri;
  const EiMax = Ra - Ri * Math.cos(u);
  const EeMin = Re * Math.cos(u) - Ra;
  const EeMax = Re - Ra;

  return {
    ok: true,
    result: {
      type: 1,
      alphaDeg,
      u,
      Rm,
      Ri,
      Re,
      Li,
      Le,
      coupeDeg: toDeg(u),
      EiMin,
      EiMax,
      EeMin,
      EeMax,
      RmGreaterThanRa: Rm > Ra,
      ...buildTiling(beta, alphaDeg, Rm),
    },
  };
}

// ---------------------------------------------------------------------------
// Type 2 — pavés rectangulaires, contact par l'angle intérieur (solution fermée)
// ---------------------------------------------------------------------------
function solveType2(Ra: number, B: number, Lm: number, beta: number): Arc2PolyOutcome {
  // Solution analytique : u = 2·arctan[ Lm / (2·(2·Ra − B)) ], α = 2u. Aucune itération.
  const u = 2 * Math.atan(Lm / (2 * (2 * Ra - B)));

  const Ri = Lm / (2 * Math.sin(u));
  // V6 — l'élément recouvre le centre de l'arc.
  if (Ri <= 0) return { ok: false, error: { code: 'V6', param: 'Ri' } };

  const alphaDeg = toDeg(2 * u);
  // V8 — angle par élément trop ouvert.
  if (alphaDeg > ALPHA_MAX_DEG + ALPHA_EPS_DEG) return { ok: false, error: { code: 'V8', param: 'Lm' } };

  const dInt = Ri * Math.cos(u);
  const dExt = dInt + B;
  const Re = Math.hypot(Lm / 2, dExt);
  const Rm = Math.hypot(Lm / 2, dInt + B / 2);

  const O = 2 * B * Math.sin(u);

  const EiMin = Ra - Ri;
  const EiMax = Ra - dInt;
  const EeMin = dExt - Ra;
  const EeMax = Re - Ra;

  return {
    ok: true,
    result: {
      type: 2,
      alphaDeg,
      u,
      Rm,
      Ri,
      Re,
      rentrantDeg: 180 - alphaDeg,
      O,
      EiMin,
      EiMax,
      EeMin,
      EeMax,
      RmGreaterThanRa: Rm > Ra,
      ...buildTiling(beta, alphaDeg, Rm),
    },
  };
}

// ---------------------------------------------------------------------------
// Type 3 — bordures à emboîtement (rotule de rayon B/2)
// ---------------------------------------------------------------------------
function solveType3(
  Ra: number,
  B: number,
  Lm: number,
  beta: number,
  j: number,
): Arc2PolyOutcome {
  // Jeu modélisé comme allongement de l'entraxe effectif : Lm* = Lm + j.
  const LmStar = Lm + j;
  const rmOf = (u: number): number => LmStar / (2 * Math.sin(u));

  // g(u) = (Rm·cos u + B/2) + √(Rm² + B²/4 − Rm·B·cos u) − 2·Ra   (strictement décroissante
  // tant que 2·Rm·cos u > B).
  const g = (u: number): number => {
    const Rm = rmOf(u);
    return (
      Rm * Math.cos(u) +
      B / 2 +
      Math.sqrt(Rm * Rm + (B * B) / 4 - Rm * B * Math.cos(u)) -
      2 * Ra
    );
  };

  const sol = solveDecreasing(g);
  if ('code' in sol) return { ok: false, error: { code: sol.code, param: 'Lm' } };
  const u = sol.u;

  const Rm = rmOf(u);

  // V7 — configuration de rotule dégénérée.
  if (2 * Rm * Math.cos(u) <= B) return { ok: false, error: { code: 'V7', param: 'B' } };

  // Ri = rayon de tangence (PAS Rm − B/2), extremum radial intérieur atteint hors joint.
  const Ri = Math.sqrt(Rm * Rm + (B * B) / 4 - Rm * B * Math.cos(u));
  const Re = Rm + B / 2;

  // V6 — l'élément recouvre le centre de l'arc.
  if (Ri <= 0) return { ok: false, error: { code: 'V6', param: 'Ri' } };

  const alphaDeg = toDeg(2 * u);
  // V8 — angle par élément trop ouvert.
  if (alphaDeg > ALPHA_MAX_DEG + ALPHA_EPS_DEG) return { ok: false, error: { code: 'V8', param: 'Lm' } };

  const rIntMin = Rm * Math.cos(u) - B / 2; // à mi-longueur
  const rExtMin = Rm * Math.cos(u) + B / 2; // à mi-longueur

  const EiMin = Ra - Ri;
  const EiMax = Ra - rIntMin;
  const EeMin = rExtMin - Ra;
  const EeMax = Re - Ra;

  return {
    ok: true,
    result: {
      type: 3,
      alphaDeg,
      u,
      Rm,
      Ri,
      Re,
      rentrantDeg: 180 - alphaDeg,
      EiMin,
      EiMax,
      EeMin,
      EeMax,
      RmGreaterThanRa: Rm > Ra,
      ...buildTiling(beta, alphaDeg, Rm),
    },
  };
}
