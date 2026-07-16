/**
 * Cœur métier du module « Raccordement Vertical » : raccordement en profil en long de deux
 * tronçons de voie de pentes i₀ (amont) et iₙ (aval), en ‰, par un arc de cercle de rayon R,
 * matérialisé par une polyligne de segments plats.
 *
 * Ce fichier ne dépend d'aucun composant ni d'aucune brique de `@railtools/commun` : uniquement
 * `Math`. Toutes les longueurs (K, H, T, f, R, L) sont en mm modèle réduit ; les pentes en ‰.
 * Approximation des petits angles retenue (|ΔI| en ‰ ≪ 1000), voir CDC §1/§4.
 *
 * Notations (CDC_raccordement_vertical_v0.1.md) :
 *  - i₀/iₙ : pentes amont/aval, signées (+ = montant en K croissant)
 *  - ΔI = iₙ − i₀ : variation de pente totale
 *  - V  : sommet théorique (intersection des deux droites de pente), K_V/H_V
 *  - TC/CT : tangence amont/aval de l'arc théorique
 *  - T  : longueur de tangente V–TC = V–CT ; R : rayon signé ; f : flèche verticale
 *  - P  : point remarquable (pente nulle si i₀/iₙ de signes opposés, projection de V sinon)
 *
 * Correction par rapport au texte du CDC (vérifiée par calcul, voir raisonnement ci-dessous) :
 * la formule donnée pour H_TC ("H_V + i₀·T/1000") contient une erreur de signe — avec la
 * convention "+ = montant en K croissant" et TC situé à K_V−T (donc AVANT V), on doit avoir
 * H_V = H_TC + i₀/1000·T, soit H_TC = H_V − i₀·T/1000 (H_CT = H_V + iₙ·T/1000 du CDC est,
 * lui, correct). Vérifié par symétrie : pour i₀=−iₙ (dos d'âne symétrique), cette formule
 * donne bien H_TC = H_CT, ce que la formule du CDC ne donne PAS. `arcHeightAt` (la parabole
 * de l'arc, elle correcte dans le CDC) confirme cette correction : elle redonne exactement
 * H_TC/H_CT à x=0/x=2T avec les bonnes dérivées (i₀/iₙ) uniquement si H_TC est calculé ainsi.
 * Les formules séparées du CDC pour H_P (cas A/B et cas C-F) présentent la même incohérence de
 * signe une fois recoupées avec `arcHeightAt` — H_P est donc calculé ici en évaluant
 * `arcHeightAt` au point x_P (position horizontale de P, dont la formule du CDC est correcte),
 * plutôt qu'en réimplémentant ces formules séparées.
 */

export type RaccVertErrorCode =
  | 'delta-i-zero' // ΔI = 0 : pentes identiques, raccordement impossible
  | 'radius-zero' // R = 0 (mode "rayon")
  | 'sagitta-not-positive' // f ≤ 0 (mode "flèche")
  | 'tangent-not-positive' // T ≤ 0 (mode "tangente")
  | 'delta-target-not-positive' // Δi cible ≤ 0
  | 'length-not-positive' // L ≤ 0
  | 'segments-not-positive-integer'; // n < 1 ou non entier (Approche 2a)

export type RaccVertResult<T> = { ok: true; value: T } | { ok: false; error: RaccVertErrorCode };

function ok<T>(value: T): RaccVertResult<T> {
  return { ok: true, value };
}
function err<T>(error: RaccVertErrorCode): RaccVertResult<T> {
  return { ok: false, error };
}

export interface CommonInputs {
  i0PerMille: number;
  inPerMille: number;
  kVMm: number;
  hVMm: number;
}

/** ΔI = iₙ − i₀, non validant. */
export function deltaIPerMille(common: CommonInputs): number {
  return common.inPerMille - common.i0PerMille;
}

/** Caractéristiques complètes de l'arc théorique (Partie 1 / dérivé directement en Approche 2). */
export interface ArcCore {
  i0PerMille: number;
  inPerMille: number;
  deltaIPerMille: number;
  kVMm: number;
  hVMm: number;
  tMm: number;
  fMm: number;
  /** Rayon signé (R>0 concave/creux, R<0 convexe/dos-d'âne) — cf. saisie directe, non validée. */
  rMm: number;
  kTcMm: number;
  hTcMm: number;
  kCtMm: number;
  hCtMm: number;
  kPMm: number;
  hPMm: number;
  iPPerMille: number;
}

/** Matérialisation par segments plats (Partie 2 / dérivé directement en Approche 2). */
export interface Segmentation {
  n: number;
  /** Longueur de segment effectivement utilisée pour placer les sommets de la polyligne. */
  lMm: number;
  deltaIEffPerMille: number;
  /**
   * = kTcMm/kCtMm du ArcCore correspondant, SAUF en Approche 1 Partie 2 "L imposé" : L y est
   * une longueur physique fixe (non recalculée), donc n·L peut dépasser 2T et ces points
   * divergent alors réellement des TC/CT théoriques (voir `segmentationFromLength`).
   */
  kTcMatMm: number;
  kCtMatMm: number;
  /** Rayon interne (tangent aux milieux des segments), informatif uniquement, signé comme rMm. */
  rIntMm: number;
}

/**
 * Hauteur sur l'arc théorique (parabole, approximation petits angles) à la distance
 * horizontale `xMm` depuis TC. Formule volontairement non bornée à [0, 2T] : réutilisée telle
 * quelle pour les sommets matérialisés qui débordent légèrement de TC/CT théoriques (Approche 1
 * Partie 2 "L imposé", voir `Segmentation.kTcMatMm`) — extension directe de l'approximation
 * parabolique, cohérente avec l'hypothèse petits angles du module.
 */
export function arcHeightAt(
  xMm: number,
  i0PerMille: number,
  deltaIPerMille: number,
  tMm: number,
  hTcMm: number,
): number {
  return hTcMm + (i0PerMille / 1000) * xMm + (xMm * xMm) / (4 * tMm) * (deltaIPerMille / 1000);
}

/**
 * Position horizontale (depuis TC) et pente du point remarquable P :
 *  - cas A/B (i₀·iₙ ≤ 0, signes opposés ou l'un nul) : P = point de pente nulle sur l'arc.
 *  - cas C-F (i₀·iₙ > 0, même signe) : P = projection verticale de V sur l'arc (K_P=K_V).
 */
function computePointP(
  common: CommonInputs,
  tMm: number,
  deltaI: number,
  kTcMm: number,
): { kPMm: number; iPPerMille: number } {
  const { i0PerMille, inPerMille, kVMm } = common;
  if (i0PerMille * inPerMille <= 0) {
    const xPMm = (Math.abs(i0PerMille) / Math.abs(deltaI)) * 2 * tMm;
    return { kPMm: kTcMm + xPMm, iPPerMille: 0 };
  }
  return { kPMm: kVMm, iPPerMille: (i0PerMille + inPerMille) / 2 };
}

function finishArcCore(
  common: CommonInputs,
  tMm: number,
  fMm: number,
  rMm: number,
  deltaI: number,
): ArcCore {
  const { i0PerMille, inPerMille, kVMm, hVMm } = common;
  const kTcMm = kVMm - tMm;
  const hTcMm = hVMm - (i0PerMille / 1000) * tMm;
  const kCtMm = kVMm + tMm;
  const hCtMm = hVMm + (inPerMille / 1000) * tMm;
  const { kPMm, iPPerMille } = computePointP(common, tMm, deltaI, kTcMm);
  const hPMm = arcHeightAt(kPMm - kTcMm, i0PerMille, deltaI, tMm, hTcMm);
  return {
    i0PerMille,
    inPerMille,
    deltaIPerMille: deltaI,
    kVMm,
    hVMm,
    tMm,
    fMm,
    rMm,
    kTcMm,
    hTcMm,
    kCtMm,
    hCtMm,
    kPMm,
    hPMm,
    iPPerMille,
  };
}

/** |R| et R signé à partir de T (formule directe |R|=2T/|ΔI_rad|, puis f=T²/(2|R|)). */
function arcFromTMm(tMm: number, deltaI: number): { rMm: number; fMm: number } {
  const deltaIRad = deltaI / 1000;
  const rAbs = (2 * tMm) / Math.abs(deltaIRad);
  const fMm = (tMm * tMm) / (2 * rAbs);
  const rMm = deltaI < 0 ? -rAbs : rAbs;
  return { rMm, fMm };
}

/**
 * Approche 1, Partie 1, sous-mode "R" — l'utilisateur saisit directement le rayon signé.
 * Un signe incohérent avec ΔI est accepté silencieusement (décision actée avec l'utilisateur) :
 * T et f n'utilisent que |R|, donc la géométrie (TC/CT/P) est identique quel que soit le signe
 * saisi — seul l'affichage de R lui-même en porterait la trace.
 */
export function arcFromRadius(common: CommonInputs, radiusMm: number): RaccVertResult<ArcCore> {
  const deltaI = deltaIPerMille(common);
  if (deltaI === 0) return err('delta-i-zero');
  if (radiusMm === 0) return err('radius-zero');
  const deltaIRad = deltaI / 1000;
  const rAbs = Math.abs(radiusMm);
  const tMm = (rAbs * Math.abs(deltaIRad)) / 2;
  const fMm = (tMm * tMm) / (2 * rAbs);
  return ok(finishArcCore(common, tMm, fMm, radiusMm, deltaI));
}

/** Approche 1, Partie 1, sous-mode "f" — |R|=8f/ΔI_rad², signe de R déduit de ΔI. */
export function arcFromSagitta(common: CommonInputs, sagittaMm: number): RaccVertResult<ArcCore> {
  const deltaI = deltaIPerMille(common);
  if (deltaI === 0) return err('delta-i-zero');
  if (!(sagittaMm > 0)) return err('sagitta-not-positive');
  const deltaIRad = deltaI / 1000;
  const rAbs = (8 * sagittaMm) / (deltaIRad * deltaIRad);
  const tMm = (rAbs * Math.abs(deltaIRad)) / 2;
  const rMm = deltaI < 0 ? -rAbs : rAbs;
  return ok(finishArcCore(common, tMm, sagittaMm, rMm, deltaI));
}

/** Approche 1, Partie 1, sous-mode "T" — |R|=2T/|ΔI_rad|, signe de R déduit de ΔI. */
export function arcFromTangent(common: CommonInputs, tangentMm: number): RaccVertResult<ArcCore> {
  const deltaI = deltaIPerMille(common);
  if (deltaI === 0) return err('delta-i-zero');
  if (!(tangentMm > 0)) return err('tangent-not-positive');
  const { rMm, fMm } = arcFromTMm(tangentMm, deltaI);
  return ok(finishArcCore(common, tangentMm, fMm, rMm, deltaI));
}

/** Rayon interne (tangent aux milieux des segments), signé comme R, informatif uniquement. */
export function internalRadius(rMm: number, lMm: number): number {
  const rAbs = Math.abs(rMm);
  const rIntAbs = rAbs - (lMm * lMm) / (8 * rAbs);
  return rMm < 0 ? -rIntAbs : rIntAbs;
}

/**
 * Approche 1, Partie 2, option "Δi cible" — L est DÉRIVÉ de T (L=2T/n) : couvre exactement
 * 2T, donc kTcMatMm/kCtMatMm = kTcMm/kCtMm du core.
 */
export function segmentationFromDeltaTarget(
  core: ArcCore,
  deltaTargetPerMille: number,
): RaccVertResult<Segmentation> {
  if (!(deltaTargetPerMille > 0)) return err('delta-target-not-positive');
  const n = Math.ceil(Math.abs(core.deltaIPerMille) / deltaTargetPerMille);
  const lMm = (2 * core.tMm) / n;
  return ok({
    n,
    lMm,
    deltaIEffPerMille: core.deltaIPerMille / n,
    kTcMatMm: core.kTcMm,
    kCtMatMm: core.kCtMm,
    rIntMm: internalRadius(core.rMm, lMm),
  });
}

/**
 * Approche 1, Partie 2, option "L imposé" — L est une longueur physique FIXE (élément de voie
 * du commerce, non ajustable) : n=⌈2T/L⌉ segments de longueur L exacte sont placés
 * symétriquement autour de K_V. n·L peut dépasser 2T, donc kTcMatMm/kCtMatMm divergent
 * réellement de kTcMm/kCtMm théoriques (décision actée avec l'utilisateur, corrige une
 * lecture littérale du CDC qui suggérait L_eff=2T/n, toujours égal — vrai seulement pour
 * l'option "Δi cible" et pour l'Approche 2).
 */
export function segmentationFromLength(
  core: ArcCore,
  lengthMm: number,
): RaccVertResult<Segmentation> {
  if (!(lengthMm > 0)) return err('length-not-positive');
  const n = Math.ceil((2 * core.tMm) / lengthMm);
  return ok({
    n,
    lMm: lengthMm,
    deltaIEffPerMille: core.deltaIPerMille / n,
    kTcMatMm: core.kVMm - (n * lengthMm) / 2,
    kCtMatMm: core.kVMm + (n * lengthMm) / 2,
    rIntMm: internalRadius(core.rMm, lengthMm),
  });
}

/**
 * Approche 2, option 2a — n et L imposés : 2T=n·L, donc T est déduit de la segmentation ;
 * kTcMatMm/kCtMatMm = kTcMm/kCtMm par construction (T est défini comme n·L/2).
 */
export function arcAndSegmentationFrom2a(
  common: CommonInputs,
  n: number,
  lengthMm: number,
): RaccVertResult<ArcCore & Segmentation> {
  const deltaI = deltaIPerMille(common);
  if (deltaI === 0) return err('delta-i-zero');
  if (!Number.isInteger(n) || n < 1) return err('segments-not-positive-integer');
  if (!(lengthMm > 0)) return err('length-not-positive');
  const tMm = (n * lengthMm) / 2;
  const { rMm, fMm } = arcFromTMm(tMm, deltaI);
  const core = finishArcCore(common, tMm, fMm, rMm, deltaI);
  return ok({
    ...core,
    n,
    lMm: lengthMm,
    deltaIEffPerMille: deltaI / n,
    kTcMatMm: core.kTcMm,
    kCtMatMm: core.kCtMm,
    rIntMm: internalRadius(rMm, lengthMm),
  });
}

/**
 * Approche 2, option 2b — L et Δi cible imposés : n=⌈|ΔI|/|Δi|⌉, puis 2T=n·L (T déduit) ;
 * kTcMatMm/kCtMatMm = kTcMm/kCtMm par construction (même raison que 2a).
 */
export function arcAndSegmentationFrom2b(
  common: CommonInputs,
  lengthMm: number,
  deltaTargetPerMille: number,
): RaccVertResult<ArcCore & Segmentation> {
  const deltaI = deltaIPerMille(common);
  if (deltaI === 0) return err('delta-i-zero');
  if (!(lengthMm > 0)) return err('length-not-positive');
  if (!(deltaTargetPerMille > 0)) return err('delta-target-not-positive');
  const n = Math.ceil(Math.abs(deltaI) / deltaTargetPerMille);
  const tMm = (n * lengthMm) / 2;
  const { rMm, fMm } = arcFromTMm(tMm, deltaI);
  const core = finishArcCore(common, tMm, fMm, rMm, deltaI);
  return ok({
    ...core,
    n,
    lMm: lengthMm,
    deltaIEffPerMille: deltaI / n,
    kTcMatMm: core.kTcMm,
    kCtMatMm: core.kCtMm,
    rIntMm: internalRadius(rMm, lengthMm),
  });
}

/** Échantillonnage de l'arc théorique TC→CT pour le dessin (≥200 points par défaut, CDC §7.4). */
export function sampleArc(core: ArcCore, sampleCount = 200): { kMm: number; hMm: number }[] {
  const points: { kMm: number; hMm: number }[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    const xMm = (2 * core.tMm * i) / sampleCount;
    points.push({
      kMm: core.kTcMm + xMm,
      hMm: arcHeightAt(xMm, core.i0PerMille, core.deltaIPerMille, core.tMm, core.hTcMm),
    });
  }
  return points;
}

/** Un point du tableau "points clés" (arc théorique) — V n'a pas de pente affichée. */
export interface KeyPoint {
  name: 'TC' | 'V' | 'P' | 'CT';
  kMm: number;
  hMm: number;
  gradeBeforePerMille?: number;
  gradeAfterPerMille?: number;
}

/** Tableau des 4 points clés de l'arc théorique (CDC §6.2). */
export function buildKeyPointsTable(core: ArcCore, deltaIEffPerMille: number): KeyPoint[] {
  return [
    {
      name: 'TC',
      kMm: core.kTcMm,
      hMm: core.hTcMm,
      gradeBeforePerMille: core.i0PerMille,
      gradeAfterPerMille: core.i0PerMille + deltaIEffPerMille,
    },
    { name: 'V', kMm: core.kVMm, hMm: core.hVMm },
    {
      name: 'P',
      kMm: core.kPMm,
      hMm: core.hPMm,
      gradeBeforePerMille: core.iPPerMille,
      gradeAfterPerMille: core.iPPerMille,
    },
    {
      name: 'CT',
      kMm: core.kCtMm,
      hMm: core.hCtMm,
      gradeBeforePerMille: core.inPerMille - deltaIEffPerMille,
      gradeAfterPerMille: core.inPerMille,
    },
  ];
}

/** Un sommet de la polyligne rouge matérialisée (CDC §6.3). */
export interface PolylineVertex {
  index: number;
  kMm: number;
  hMm: number;
  gradeBeforePerMille?: number;
  gradeAfterPerMille?: number;
}

/** Tableau des n+1 sommets de la polyligne rouge matérialisée. */
export function buildPolylineVertices(core: ArcCore, seg: Segmentation): PolylineVertex[] {
  const vertices: PolylineVertex[] = [];
  for (let k = 0; k <= seg.n; k++) {
    const kMm = seg.kTcMatMm + k * seg.lMm;
    const xMm = kMm - core.kTcMm;
    const hMm = arcHeightAt(xMm, core.i0PerMille, core.deltaIPerMille, core.tMm, core.hTcMm);
    const gradeBeforePerMille =
      k === 0 ? core.i0PerMille : core.i0PerMille + (k - 0.5) * seg.deltaIEffPerMille;
    const gradeAfterPerMille =
      k === seg.n ? core.inPerMille : core.i0PerMille + (k + 0.5) * seg.deltaIEffPerMille;
    vertices.push({ index: k, kMm, hMm, gradeBeforePerMille, gradeAfterPerMille });
  }
  return vertices;
}
