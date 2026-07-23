/**
 * Géométrie du dessin Arc2Poly (pure, sans React) : construit, à partir d'un résultat de
 * calcul, les primitives du tronçon de 3 éléments consécutifs — contours réels, arcs des
 * 4 rayons caractéristiques, rayons-vecteurs aux joints, points remarquables — exprimées
 * en mm de dessin après résolution de l'échelle de dessin.
 *
 * Repère : O (centre de l'arc) à l'origine du modèle, axe de symétrie vertical. On travaille
 * directement en orientation écran (y vers le bas) : un point à rayon r et angle θ (mesuré
 * depuis la verticale montante, positif vers la droite) a pour coordonnées modèle
 * (r·sin θ, −r·cos θ) — les éléments sont donc au-dessus de O (y négatif). Aucune inversion
 * d'axe n'est nécessaire ensuite, ce qui garde les angles cohérents avec `pointOnCircle`.
 */
import {
  modelToDrawing,
  resolveDrawingScale,
  type DrawingScale,
  type Point,
  type ResolvedDrawingScale,
} from '@railtools/commun';
import type { Arc2PolyResult, SupportType } from '../calc/arc2poly';

export interface Arc2PolyDrawing {
  /** Contour SVG (attribut `d`) de chacun des 3 éléments. */
  elementPaths: string[];
  /** O (centre de l'arc) en mm de dessin. */
  centerO: Point;
  /** Rayons-vecteurs O → joint (4), en mm de dessin. */
  jointRays: Array<{ from: Point; to: Point }>;
  /** Arcs des 4 rayons caractéristiques (polylignes), avec couleur, nom et ancre de libellé. */
  radiusArcs: Array<{ points: string; color: string; name: string; labelPoint: Point }>;
  /** Cotation de l'angle α au centre. */
  alphaArc: { center: Point; radiusMm: number; startAngleRad: number; endAngleRad: number };
  /** Directions (rad, repère dessin) des joints −u et +u depuis O (pour placer le libellé α). */
  /** Point remarquable : pivots de rotule (type 3) en mm de dessin, sinon vide. */
  pivots: Point[];
  /** Cercle de rotule illustratif (type 3) : centre + rayon en mm de dessin. */
  rotule?: { center: Point; radiusMm: number };
  /** Angle rentrant (types 2 et 3) : sommet + directions des deux arêtes, en mm de dessin. */
  rentrant?: { vertex: Point; a: Point; b: Point };
  /** Ouverture O (type 2) : segment entre les deux angles extérieurs voisins d'un joint. */
  opening?: { from: Point; to: Point };
  /** Angle de coupe (type 1) : sommet, référence de coupe droite, direction de coupe radiale. */
  cut?: { vertex: Point; square: Point; radial: Point };
  /** Cotes de débord (best-effort) : 4 segments radiaux [from,to] + clé i18n. */
  overhangs: Array<{ from: Point; to: Point; key: 'EiMin' | 'EiMax' | 'EeMin' | 'EeMax' }>;
  resolvedScale: ResolvedDrawingScale;
  drawingWidth: number;
  drawingHeight: number;
  viewBox: { minX: number; minY: number; width: number; height: number };
}

/** Marges internes (mm de dessin) réservées aux cotes/libellés autour de la géométrie. */
const MARGIN_MM = 42;
/** Longueur fixe (mm de dessin) des traits de référence des annotations d'angle. */
const ANGLE_REF_LEN_MM = 16;
const SCALE_BAR_EXTRA_MM = 26;
/** Dimensions cible (mm de dessin) du mode d'échelle "fit". */
const FIT_TARGET_MM = { width: 240, height: 260 };
/** Rayon (mm de dessin) de l'arc de cotation de α, près de O. */
const ALPHA_ARC_RADIUS_MM = 42;

export const RADIUS_COLORS = {
  Ra: '#1f5f8b', // bleu
  Rm: '#c0392b', // rouge
  Ri: '#8a5a2b', // brun
  Re: '#2e7d32', // vert
} as const;

/** Angle normalisé dans [0 ; 2π[. */
function norm(a: number): number {
  const x = a % (2 * Math.PI);
  return x < 0 ? x + 2 * Math.PI : x;
}

/**
 * Construit toute la géométrie de dessin. `result` est un résultat de calcul valide ;
 * `Ra`, `B`, `Lm` sont les entrées (Lm* = Lm+j pour le type 3 est déjà intégré au calcul,
 * mais la construction n'a besoin que de Rm/Ri/Re/u fournis par `result`).
 */
export function buildArc2PolyDrawing(
  type: SupportType,
  result: Arc2PolyResult,
  Ra: number,
  B: number,
  drawingScale: DrawingScale,
  showOverhangs: boolean,
): Arc2PolyDrawing {
  const { u, Rm, Ri, Re } = result;
  // Point modèle à rayon r et angle θ (depuis la verticale, positif à droite), y vers le bas.
  const mpt = (r: number, theta: number): Point => ({ x: r * Math.sin(theta), y: -r * Math.cos(theta) });

  // 3 éléments centrés sur l'axe : joints aux rayons ±u, ±3u ; O au centre.
  const jointThetas = [-3 * u, -u, u, 3 * u];
  const elementBounds: Array<[number, number]> = [
    [-3 * u, -u],
    [-u, u],
    [u, 3 * u],
  ];

  // --- Contours réels par type (en coordonnées modèle) ---
  const elementModelPaths: Point[][] = [];
  const arcsInPath: Array<{ i: number; sweep: 0 | 1; rMm: number }[]> = [];
  const pivotsModel: Point[] = [];

  for (const [thetaL, thetaR] of elementBounds) {
    if (type === 1) {
      // Trapèze : coins intérieurs (Ri) et extérieurs (Re) le long des rayons de coupe.
      elementModelPaths.push([
        mpt(Ri, thetaL),
        mpt(Ri, thetaR),
        mpt(Re, thetaR),
        mpt(Re, thetaL),
      ]);
      arcsInPath.push([]);
    } else if (type === 2) {
      // Rectangle : arête intérieure = corde entre coins intérieurs (Ri) ; extérieure
      // décalée de B selon la normale sortante de CE pavé (radiale à son axe θc).
      const thetaC = (thetaL + thetaR) / 2;
      const n: Point = { x: Math.sin(thetaC), y: -Math.cos(thetaC) };
      const icL = mpt(Ri, thetaL);
      const icR = mpt(Ri, thetaR);
      elementModelPaths.push([
        icL,
        icR,
        { x: icR.x + B * n.x, y: icR.y + B * n.y },
        { x: icL.x + B * n.x, y: icL.y + B * n.y },
      ]);
      arcsInPath.push([]);
    } else {
      // Bordure : stade (rectangle + 2 demi-cercles B/2) autour de la corde pivot→pivot (sur Rm).
      const pL = mpt(Rm, thetaL);
      const pR = mpt(Rm, thetaR);
      pivotsModel.push(pL, pR);
      const dx = pR.x - pL.x;
      const dy = pR.y - pL.y;
      const len = Math.hypot(dx, dy) || 1;
      const px = -dy / len; // perpendiculaire unitaire
      const py = dx / len;
      const h = B / 2;
      elementModelPaths.push([
        { x: pL.x + h * px, y: pL.y + h * py }, // P1
        { x: pR.x + h * px, y: pR.y + h * py }, // P2 (cap autour de pR jusqu'à P3)
        { x: pR.x - h * px, y: pR.y - h * py }, // P3
        { x: pL.x - h * px, y: pL.y - h * py }, // P4 (cap autour de pL jusqu'à P1)
      ]);
      arcsInPath.push([
        { i: 1, sweep: 1, rMm: h }, // arc entre P2 et P3
        { i: 3, sweep: 1, rMm: h }, // arc entre P4 et P1
      ]);
    }
  }

  // --- Boîte englobante (modèle) : O, coins d'éléments, extrêmes des arcs de rayon ---
  const pad = 0.5 * u;
  const thetaMin = -3 * u - pad;
  const thetaMax = 3 * u + pad;
  const bboxPts: Point[] = [{ x: 0, y: 0 }, mpt(Re, 0)];
  for (const poly of elementModelPaths) bboxPts.push(...poly);
  for (const r of [Ri, Re]) {
    bboxPts.push(mpt(r, thetaMin), mpt(r, thetaMax));
  }
  const minX = Math.min(...bboxPts.map((p) => p.x));
  const maxX = Math.max(...bboxPts.map((p) => p.x));
  const minY = Math.min(...bboxPts.map((p) => p.y));
  const maxY = Math.max(...bboxPts.map((p) => p.y));
  const modelWidth = Math.max(maxX - minX, 1);
  const modelHeight = Math.max(maxY - minY, 1);

  const effectiveScale: DrawingScale =
    drawingScale.mode === 'fit' && !drawingScale.fitTargetMm
      ? { ...drawingScale, fitTargetMm: FIT_TARGET_MM }
      : drawingScale;
  const resolvedScale = resolveDrawingScale(effectiveScale, { width: modelWidth, height: modelHeight });
  const toDrawing = (p: Point): Point => ({
    x: modelToDrawing(p.x - minX, resolvedScale),
    y: modelToDrawing(p.y - minY, resolvedScale),
  });
  const dRadius = (r: number): number => modelToDrawing(r, resolvedScale);

  // --- Contours en mm de dessin (avec arcs pour le type 3) ---
  const elementPaths = elementModelPaths.map((poly, idx) => {
    const dp = poly.map(toDrawing);
    const arcs = arcsInPath[idx] ?? [];
    const start = dp[0];
    if (!start) return '';
    let d = `M ${start.x} ${start.y}`;
    for (let i = 1; i <= dp.length; i++) {
      const target = dp[i % dp.length];
      if (!target) continue;
      const arc = arcs.find((a) => a.i === i - 1);
      if (arc) {
        const rMm = dRadius(arc.rMm);
        d += ` A ${rMm} ${rMm} 0 0 ${arc.sweep} ${target.x} ${target.y}`;
      } else {
        d += ` L ${target.x} ${target.y}`;
      }
    }
    return d + ' Z';
  });

  // --- Arcs des 4 rayons (polylignes échantillonnées) ---
  const SAMPLES = 40;
  const sampleArc = (r: number): string => {
    const pts: string[] = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const theta = thetaMin + ((thetaMax - thetaMin) * k) / SAMPLES;
      const p = toDrawing(mpt(r, theta));
      pts.push(`${p.x},${p.y}`);
    }
    return pts.join(' ');
  };
  const arcSpec = (r: number, color: string, name: string) => ({
    points: sampleArc(r),
    color,
    name,
    labelPoint: toDrawing(mpt(r, thetaMax)),
  });
  const radiusArcs = [
    arcSpec(Re, RADIUS_COLORS.Re, 'Re'),
    arcSpec(Ra, RADIUS_COLORS.Ra, 'Ra'),
    arcSpec(Rm, RADIUS_COLORS.Rm, 'Rm'),
    arcSpec(Ri, RADIUS_COLORS.Ri, 'Ri'),
  ];

  // --- Rayons-vecteurs O → joints (légèrement au-delà de Re) ---
  const centerO = toDrawing({ x: 0, y: 0 });
  const rayEnd = Re + (Re - Ri) * 0.2;
  const jointRays = jointThetas.map((theta) => ({ from: centerO, to: toDrawing(mpt(rayEnd, theta)) }));

  // --- Cotation de α au centre : arc entre les rayons −u et +u ---
  const dirLeft = norm(Math.atan2(toDrawing(mpt(Re, -u)).y - centerO.y, toDrawing(mpt(Re, -u)).x - centerO.x));
  const dirRight = norm(Math.atan2(toDrawing(mpt(Re, u)).y - centerO.y, toDrawing(mpt(Re, u)).x - centerO.x));
  // Choix de l'ordre donnant le petit secteur (α), pas son complément.
  const alphaArc =
    norm(dirRight - dirLeft) <= Math.PI
      ? { center: centerO, radiusMm: ALPHA_ARC_RADIUS_MM, startAngleRad: dirLeft, endAngleRad: dirRight }
      : { center: centerO, radiusMm: ALPHA_ARC_RADIUS_MM, startAngleRad: dirRight, endAngleRad: dirLeft };

  const drawing: Arc2PolyDrawing = {
    elementPaths,
    centerO,
    jointRays,
    radiusArcs,
    alphaArc,
    pivots: pivotsModel.map(toDrawing),
    overhangs: [],
    resolvedScale,
    drawingWidth: modelToDrawing(modelWidth, resolvedScale),
    drawingHeight: modelToDrawing(modelHeight, resolvedScale),
    viewBox: {
      minX: -MARGIN_MM,
      minY: -MARGIN_MM,
      width: modelToDrawing(modelWidth, resolvedScale) + 2 * MARGIN_MM,
      height: modelToDrawing(modelHeight, resolvedScale) + 2 * MARGIN_MM + SCALE_BAR_EXTRA_MM,
    },
  };

  // --- Annotations par type ---
  if (type === 1) {
    // Angle de coupe (onglet) = u au coin extérieur droit du joint +u : entre la coupe
    // radiale réelle (vers O) et une référence de coupe droite (perpendiculaire à la rive).
    // Traits de longueur FIXE en mm de dessin (annotation), calculés en espace dessin.
    const vd = toDrawing(mpt(Re, u));
    const towardO = toDrawing(mpt(Ri, u)); // le long de la coupe radiale
    const towardEdge = toDrawing(mpt(Re, -u)); // le long de la rive extérieure
    const unit = (from: Point, to: Point): Point => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    };
    const rad = unit(vd, towardO);
    const edge = unit(vd, towardEdge);
    // Perpendiculaire à la rive, orientée du même côté que la coupe radiale (vers O).
    let perp: Point = { x: -edge.y, y: edge.x };
    if (perp.x * rad.x + perp.y * rad.y < 0) perp = { x: -perp.x, y: -perp.y };
    drawing.cut = {
      vertex: vd,
      radial: { x: vd.x + rad.x * ANGLE_REF_LEN_MM, y: vd.y + rad.y * ANGLE_REF_LEN_MM },
      square: { x: vd.x + perp.x * ANGLE_REF_LEN_MM, y: vd.y + perp.y * ANGLE_REF_LEN_MM },
    };
  }

  if (type === 2 || type === 3) {
    // Angle rentrant 180° − α, au joint +u : entre les axes des deux éléments adjacents.
    // Sommet sur le rayon +u, arête a vers le centre de l'élément gauche, b vers le droit.
    const rMid = type === 2 ? Ri : Rm;
    drawing.rentrant = {
      vertex: toDrawing(mpt(rMid, u)),
      a: toDrawing(mpt(rMid, 0)),
      b: toDrawing(mpt(rMid, 2 * u)),
    };
  }

  if (type === 2) {
    // Ouverture O : entre les deux angles extérieurs voisins du joint +u.
    const thetaC0 = 0; // pavé central
    const thetaC1 = 2 * u; // pavé droit
    const n0: Point = { x: Math.sin(thetaC0), y: -Math.cos(thetaC0) };
    const n1: Point = { x: Math.sin(thetaC1), y: -Math.cos(thetaC1) };
    const icR0 = mpt(Ri, u);
    const oc0 = { x: icR0.x + B * n0.x, y: icR0.y + B * n0.y };
    const oc1 = { x: icR0.x + B * n1.x, y: icR0.y + B * n1.y };
    drawing.opening = { from: toDrawing(oc0), to: toDrawing(oc1) };
  }

  if (type === 3) {
    // Cercle de rotule illustratif au pivot du joint +u.
    drawing.rotule = { center: toDrawing(mpt(Rm, u)), radiusMm: dRadius(B / 2) };
  }

  // --- Cotes de débord (best-effort) ---
  if (showOverhangs) {
    const push = (from: Point, to: Point, key: Arc2PolyDrawing['overhangs'][number]['key']) =>
      drawing.overhangs.push({ from: toDrawing(from), to: toDrawing(to), key });
    // Ei min aux joints (côté gauche), Ee max aux joints (côté droit) ; Ei max / Ee min à mi-longueur.
    push(mpt(Ra, -u), mpt(Ri, -u), 'EiMin');
    push(mpt(Ra, u), mpt(Re, u), 'EeMax');
    push({ x: 0, y: -Ra }, { x: 0, y: -(Ra - result.EiMax) }, 'EiMax');
    push({ x: 0, y: -Ra }, { x: 0, y: -(Ra + result.EeMin) }, 'EeMin');
  }

  return drawing;
}
