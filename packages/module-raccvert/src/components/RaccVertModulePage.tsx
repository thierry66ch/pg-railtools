'use client';

import { useRef, useState, type ReactNode, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import {
  DrawingLightbox,
  DrawingScaleSelector,
  EnvironmentTransfer,
  ExportButtons,
  GraduationAxis,
  NumberInput,
  PointLabel,
  ProjectManager,
  ResultPageLayout,
  lineStyleToSvgProps,
  modelToDrawingX,
  modelToDrawingY,
  resolveProfileDrawingScale,
  updateProject,
  type DrawingScale,
  type Point,
  type Project,
  type ResolvedProfileScale,
  type ResultData,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import {
  arcAndSegmentationFrom2a,
  arcAndSegmentationFrom2b,
  arcFromRadius,
  arcFromSagitta,
  arcFromTangent,
  buildKeyPointsTable,
  buildPolylineVertices,
  sampleArc,
  segmentationFromDeltaTarget,
  segmentationFromLength,
  type ArcCore,
  type CommonInputs,
  type RaccVertErrorCode,
  type Segmentation,
  type SegmentDistributionMode,
} from '../math/raccvert';
import type {
  Approche1Part1Mode,
  Approche1Part2Mode,
  Approche2SubMode,
  RaccVertApproach,
  RaccVertProjectData,
} from '../types';

const MODULE_ID = 'raccvert';

const DEFAULT_I0_PER_MILLE = -40;
const DEFAULT_IN_PER_MILLE = 30;
const DEFAULT_KV_MM = 0;
const DEFAULT_HV_MM = 100;
const DEFAULT_RADIUS_MM = 500;
const DEFAULT_SAGITTA_MM = 5;
const DEFAULT_TANGENT_MM = 100;
const DEFAULT_DELTA_TARGET_PER_MILLE = 30;
const DEFAULT_APPROCHE1_LENGTH_MM = 50;
const DEFAULT_N_SEGMENTS = 5;
const DEFAULT_APPROCHE2_LENGTH_MM = 50;
const DEFAULT_DELTA_I2B_PER_MILLE = 5;

/** Conversion ‰ ↔ ° pour les champs Δi cible liés (mêmes conventions "petits angles" que math/raccvert.ts). */
function permilleToDeg(permille: number): number {
  return (permille / 1000) * (180 / Math.PI);
}
function degToPermille(deg: number): number {
  return deg * (Math.PI / 180) * 1000;
}

const DEFAULT_DELTA_TARGET_DEG = Math.round(permilleToDeg(DEFAULT_DELTA_TARGET_PER_MILLE) * 1000) / 1000;
const DEFAULT_DELTA_I2B_DEG = Math.round(permilleToDeg(DEFAULT_DELTA_I2B_PER_MILLE) * 1000) / 1000;
const DEFAULT_DECIMALS = 1;
const MAX_DECIMALS = 6;
const DEFAULT_VERTICAL_EXAGGERATION = 5;

/** Marges (mm de dessin, fixes) autour de la géométrie — réservées aux axes gradués. */
const LEFT_MARGIN_MM = 22;
const RIGHT_MARGIN_MM = 10;
const TOP_MARGIN_MM = 15;
const BOTTOM_MARGIN_MM = 15;
const BOTTOM_CAPTION_EXTRA_MM = 20;

/**
 * Dimensions cible (mm de dessin) utilisées par le mode d'échelle de dessin "fit", pour le
 * CONTENU (géométrie) uniquement — le SVG exporté est plus grand que ça une fois les marges
 * ci-dessus ajoutées (axes gradués + barre d'échelle), et c'est bien la taille TOTALE du SVG
 * qui doit tenir sur la page PDF choisie (image placée à l'échelle réelle, 1mm dessin = 1mm
 * papier, cf. docs/integration.md §2ter). Cible donc réduite pour qu'une fois les marges
 * ajoutées, le total reste sous la largeur/hauteur utile la plus contraignante parmi les 4
 * formats PDF (portrait A4 : ~190mm de large ; page 1 en paysage, une fois cartouche +
 * description + tableau récapitulatif déjà posés : ~140mm de haut restants) — vérifié par
 * export réel (bug initial : un FIT_TARGET_MM non ajusté aux marges produisait un SVG de
 * 212mm de large, débordant les ~190mm utiles d'une page portrait).
 */
const FIT_TARGET_MM = {
  width: 150 - LEFT_MARGIN_MM - RIGHT_MARGIN_MM,
  height: 80 - TOP_MARGIN_MM - BOTTOM_MARGIN_MM - BOTTOM_CAPTION_EXTRA_MM,
};
const ARC_STROKE_WIDTH_MM = 1;
const SEGMENTS_STROKE_WIDTH_MM = 1.2;
const KEY_POINT_DOT_RADIUS_MM = 1.3;
const EXTENSION_LINE_COLOR = '#666666';
const HORIZON_LINE_COLOR = '#999999';
const ARC_COLOR = '#1f5f8b';
const SEGMENTS_COLOR = '#b3261e';
/**
 * Directions (radians) des étiquettes des 4 points clés, en éventail plutôt que toutes vers
 * le haut : V et P partagent EXACTEMENT le même K en cas C-F (P = projection verticale de V,
 * par définition — pas un cas rare) et peuvent aussi coïncider en cas A/B symétrique
 * (|i0|=|iN|) ; sans cet éventail, leurs étiquettes se chevauchent systématiquement.
 */
const KEY_POINT_LABEL_DIRECTIONS: Record<string, number> = {
  TC: (-3 * Math.PI) / 4,
  V: (-2 * Math.PI) / 3,
  P: -Math.PI / 3,
  CT: -Math.PI / 4,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Arrondit puis évite l'artefact "-0.000" (zéro négatif issu d'une imprécision flottante). */
function formatFixed(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  return fixed.startsWith('-') && Number(fixed) === 0 ? fixed.slice(1) : fixed;
}

function formatNumber(value: number, decimals: number): string {
  return formatFixed(value, decimals);
}

/** Pentes affichées en entier (‰), sans décimale — CDC §6.4. */
function formatGrade(value: number): string {
  return formatFixed(value, 0);
}

/**
 * Écart de pente entre "avant" et "après" un point, converti en degrés selon la convention
 * petits angles déjà utilisée dans tout le module (angle_rad ≈ pente, cf. `deltaIRad =
 * deltaI/1000` dans math/raccvert.ts) — pas de conversion trigonométrique (atan), qui
 * introduirait une correction non-linéaire incohérente avec le reste des formules.
 */
function deltaIDeg(gradeBeforePerMille?: number, gradeAfterPerMille?: number): number | undefined {
  if (gradeBeforePerMille === undefined || gradeAfterPerMille === undefined) return undefined;
  return ((gradeAfterPerMille - gradeBeforePerMille) / 1000) * (180 / Math.PI);
}

/** Angles de déviation affichés avec 2 décimales fixes, indépendamment des décimales globales. */
function formatDeltaIDeg(value: number): string {
  return formatFixed(value, 2);
}

/**
 * Formate un dénominateur d'échelle 1/N pour l'étiquette du dessin. Entier → tel quel ;
 * ≥1 non entier → 1 décimale ; <1 (dessin agrandi, cas fréquent ici car la géométrie modèle
 * est petite) → 2 chiffres significatifs, sans zéros terminaux inutiles.
 */
function formatRatio(ratio: number): string {
  if (Number.isInteger(ratio)) return String(ratio);
  if (ratio >= 1) return ratio.toFixed(1);
  return ratio.toPrecision(2).replace(/\.?0+$/, '');
}

/** "Pas" arrondi (1/2/5 × 10^n) pour une graduation lisible, visant environ `targetTicks` ticks. */
function niceStep(range: number, targetTicks: number): number {
  if (!(range > 0)) return 1;
  const roughStep = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  const niceResidual = residual < 1.5 ? 1 : residual < 3 ? 2 : residual < 7 ? 5 : 10;
  return niceResidual * magnitude;
}

/** Décimales nécessaires pour distinguer des ticks espacés de `step` (ex. step=0.5 → 1 décimale). */
function decimalsForStep(step: number): number {
  return step >= 1 ? 0 : Math.max(0, Math.ceil(-Math.log10(step)));
}

/**
 * Valeurs de graduation "rondes" couvrant [minMm, maxMm], espacées d'un pas arrondi, avec
 * un libellé dont la précision suit ce pas (évite des libellés dupliqués/ambigus quand le
 * pas est fractionnaire, ex. graduation H sur une flèche de quelques mm).
 */
function buildTicks(minMm: number, maxMm: number, targetTicks: number): { value: number; label: string }[] {
  const step = niceStep(maxMm - minMm, targetTicks);
  const decimals = decimalsForStep(step);
  const values: number[] = [];
  const start = Math.ceil(minMm / step) * step;
  for (let v = start; v <= maxMm + step * 1e-6; v += step) {
    values.push(Math.round(v * 1000) / 1000);
  }
  return values.map((value) => ({ value, label: formatFixed(value, decimals) }));
}

/** Espacement minimal (mm de dessin) entre deux libellés de tick consécutifs, sous peine de chevauchement. */
const MIN_TICK_LABEL_SPACING_MM = 4;

/** Retire les ticks trop rapprochés (en position de dessin) pour laisser leurs libellés lisibles. */
function dropCrowdedTicks<T extends { positionMm: number }>(ticks: T[]): T[] {
  const kept: T[] = [];
  let lastKeptPos: number | undefined;
  for (const tick of ticks) {
    if (lastKeptPos === undefined || Math.abs(tick.positionMm - lastKeptPos) >= MIN_TICK_LABEL_SPACING_MM) {
      kept.push(tick);
      lastKeptPos = tick.positionMm;
    }
  }
  return kept;
}

/** Géométrie du dessin SVG (mm dessin), dérivée uniquement pour une configuration valide. */
interface DrawingGeometry {
  resolvedScale: ResolvedProfileScale;
  viewBox: { minX: number; minY: number; width: number; height: number };
  drawingWidth: number;
  drawingHeight: number;
  arcPathD: string;
  polylinePathD: string;
  upstreamLine: { from: Point; to: Point };
  downstreamLine: { from: Point; to: Point };
  horizonLineY: number;
  keyPointsDrawing: { name: string; point: Point }[];
  horizontalTicks: { positionMm: number; label: string }[];
  verticalTicks: { positionMm: number; label: string }[];
  /** Dénominateurs d'échelle (1/N) horizontale et verticale, pour l'étiquette du dessin. */
  scaleHorizontalRatio: number;
  scaleVerticalRatio: number;
}

/**
 * Calcule toute la géométrie de dessin à partir d'un ArcCore/Segmentation déjà validés.
 * Étendue horizontale fixe à 4T (CDC §7.2), élargie si nécessaire pour englober les sommets
 * matérialisés qui déborderaient de TC/CT théoriques (Approche 1 "L imposé", cf. décision #4
 * du plan) ou la ligne d'horizon.
 */
function buildDrawingGeometry(
  core: ArcCore,
  seg: Segmentation,
  horizonHMm: number,
  drawingScale: DrawingScale,
  verticalExaggeration: number,
): DrawingGeometry {
  const kOrigineMm = core.kVMm - 2 * core.tMm;
  const kEndMm = core.kVMm + 2 * core.tMm;
  const upstreamStartH = core.hTcMm - (core.i0PerMille / 1000) * core.tMm;
  const downstreamEndH = core.hCtMm + (core.inPerMille / 1000) * core.tMm;

  const vertices = buildPolylineVertices(core, seg);

  const allKs = [
    kOrigineMm,
    kEndMm,
    core.kTcMm,
    core.kCtMm,
    core.kPMm,
    core.kVMm,
    ...vertices.map((v) => v.kMm),
  ];
  const allHs = [
    upstreamStartH,
    downstreamEndH,
    core.hTcMm,
    core.hCtMm,
    core.hPMm,
    core.hVMm,
    horizonHMm,
    ...vertices.map((v) => v.hMm),
  ];

  const modelMinK = Math.min(...allKs);
  const modelMaxK = Math.max(...allKs);
  const modelMinH = Math.min(...allHs);
  const modelMaxH = Math.max(...allHs);
  const modelWidth = Math.max(modelMaxK - modelMinK, 1);
  const modelHeight = Math.max(modelMaxH - modelMinH, 1);

  const effectiveScale: DrawingScale =
    drawingScale.mode === 'fit' && !drawingScale.fitTargetMm
      ? { ...drawingScale, fitTargetMm: FIT_TARGET_MM }
      : drawingScale;
  const resolvedScale = resolveProfileDrawingScale(
    { horizontal: effectiveScale, verticalExaggeration },
    { width: modelWidth, height: modelHeight },
  );

  function toDrawing(kMm: number, hMm: number): Point {
    return {
      x: modelToDrawingX(kMm - modelMinK, resolvedScale),
      y: modelToDrawingY(modelMaxH - hMm, resolvedScale),
    };
  }

  const drawingWidth = modelToDrawingX(modelWidth, resolvedScale);
  const drawingHeight = modelToDrawingY(modelHeight, resolvedScale);

  const arcPoints = sampleArc(core, 200).map((p) => toDrawing(p.kMm, p.hMm));
  const arcPathD = arcPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const polylinePoints = vertices.map((v) => toDrawing(v.kMm, v.hMm));
  const polylinePathD = polylinePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const upstreamLine = {
    from: toDrawing(kOrigineMm, upstreamStartH),
    to: toDrawing(core.kTcMm, core.hTcMm),
  };
  const downstreamLine = {
    from: toDrawing(core.kCtMm, core.hCtMm),
    to: toDrawing(kEndMm, downstreamEndH),
  };

  const horizonLineY = toDrawing(kOrigineMm, horizonHMm).y;

  const keyPointsDrawing = [
    { name: 'TC', point: toDrawing(core.kTcMm, core.hTcMm) },
    { name: 'V', point: toDrawing(core.kVMm, core.hVMm) },
    { name: 'P', point: toDrawing(core.kPMm, core.hPMm) },
    { name: 'CT', point: toDrawing(core.kCtMm, core.hCtMm) },
  ];

  const horizontalTicks = dropCrowdedTicks(
    buildTicks(modelMinK, modelMaxK, 6).map((tick) => ({
      positionMm: toDrawing(tick.value, modelMaxH).x,
      label: tick.label,
    })),
  );
  const verticalTicks = dropCrowdedTicks(
    buildTicks(modelMinH, modelMaxH, 5).map((tick) => ({
      positionMm: toDrawing(modelMinK, tick.value).y,
      label: tick.label,
    })),
  );

  return {
    resolvedScale,
    viewBox: {
      minX: -LEFT_MARGIN_MM,
      minY: -TOP_MARGIN_MM,
      width: drawingWidth + LEFT_MARGIN_MM + RIGHT_MARGIN_MM,
      height: drawingHeight + TOP_MARGIN_MM + BOTTOM_MARGIN_MM + BOTTOM_CAPTION_EXTRA_MM,
    },
    drawingWidth,
    drawingHeight,
    arcPathD,
    polylinePathD,
    upstreamLine,
    downstreamLine,
    horizonLineY,
    keyPointsDrawing,
    horizontalTicks,
    verticalTicks,
    // Éch. V = Éch. H / facteur de déformation (l'axe H est agrandi de ce facteur, donc son
    // dénominateur 1/N est divisé d'autant — cf. profileScale.modelToDrawingY).
    scaleHorizontalRatio: resolvedScale.horizontal.ratio,
    scaleVerticalRatio: resolvedScale.horizontal.ratio / verticalExaggeration,
  };
}

export function RaccVertModulePage() {
  const t = useTranslations('moduleRaccVert');
  const tCommon = useTranslations('common');

  const [i0PerMille, setI0PerMille] = useState(DEFAULT_I0_PER_MILLE);
  const [inPerMille, setInPerMille] = useState(DEFAULT_IN_PER_MILLE);
  const [kVMm, setKVMm] = useState(DEFAULT_KV_MM);
  const [hVMm, setHVMm] = useState(DEFAULT_HV_MM);

  const [activeApproach, setActiveApproach] = useState<RaccVertApproach>('approche1');

  const [approche1Part1Mode, setApproche1Part1Mode] = useState<Approche1Part1Mode>('radius');
  const [radiusMm, setRadiusMm] = useState(DEFAULT_RADIUS_MM);
  const [sagittaMm, setSagittaMm] = useState(DEFAULT_SAGITTA_MM);
  const [tangentMm, setTangentMm] = useState(DEFAULT_TANGENT_MM);
  const [approche1Part2Mode, setApproche1Part2Mode] = useState<Approche1Part2Mode>('deltaITarget');
  const [deltaITargetPerMille, setDeltaITargetPerMille] = useState(DEFAULT_DELTA_TARGET_PER_MILLE);
  const [deltaITargetDeg, setDeltaITargetDeg] = useState(DEFAULT_DELTA_TARGET_DEG);
  const [approche1LengthMm, setApproche1LengthMm] = useState(DEFAULT_APPROCHE1_LENGTH_MM);

  const [approche2SubMode, setApproche2SubMode] = useState<Approche2SubMode>('2a');
  const [nSegments, setNSegments] = useState(DEFAULT_N_SEGMENTS);
  const [approche2LengthMm, setApproche2LengthMm] = useState(DEFAULT_APPROCHE2_LENGTH_MM);
  const [deltaI2bPerMille, setDeltaI2bPerMille] = useState(DEFAULT_DELTA_I2B_PER_MILLE);
  const [deltaI2bDeg, setDeltaI2bDeg] = useState(DEFAULT_DELTA_I2B_DEG);
  const [approche2DistributionMode, setApproche2DistributionMode] =
    useState<SegmentDistributionMode>('midpointSlope');

  const [decimals, setDecimals] = useState(DEFAULT_DECIMALS);
  const [drawingScale, setDrawingScale] = useState<DrawingScale>({ mode: 'fit' });
  const [verticalExaggeration, setVerticalExaggeration] = useState<1 | 2 | 5 | 10>(
    DEFAULT_VERTICAL_EXAGGERATION,
  );
  const [horizonHMm, setHorizonHMm] = useState(0);
  const [horizonEdited, setHorizonEdited] = useState(false);

  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>();
  // Remonte ProjectManager (via sa `key`) après un import en vrac ou un save, pour qu'il
  // relise sa liste de projets — sinon rouvrir le même projet reservirait l'ancien état.
  const [projectListVersion, setProjectListVersion] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const common: CommonInputs = { i0PerMille, inPerMille, kVMm, hVMm };

  let core: ArcCore | undefined;
  let seg: Segmentation | undefined;
  let inputError: RaccVertErrorCode | undefined;

  if (activeApproach === 'approche1') {
    const part1Result =
      approche1Part1Mode === 'radius'
        ? arcFromRadius(common, radiusMm)
        : approche1Part1Mode === 'sagitta'
          ? arcFromSagitta(common, sagittaMm)
          : arcFromTangent(common, tangentMm);

    if (part1Result.ok) {
      core = part1Result.value;
      const part2Result =
        approche1Part2Mode === 'deltaITarget'
          ? segmentationFromDeltaTarget(core, deltaITargetPerMille)
          : segmentationFromLength(core, approche1LengthMm);
      if (part2Result.ok) seg = part2Result.value;
      else inputError = part2Result.error;
    } else {
      inputError = part1Result.error;
    }
  } else {
    const result =
      approche2SubMode === '2a'
        ? arcAndSegmentationFrom2a(common, nSegments, approche2LengthMm, approche2DistributionMode)
        : arcAndSegmentationFrom2b(
            common,
            approche2LengthMm,
            deltaI2bPerMille,
            approche2DistributionMode,
          );
    if (result.ok) {
      core = result.value;
      seg = result.value;
    } else {
      inputError = result.error;
    }
  }

  let resultData: ResultData | undefined;
  let keyPoints: ReturnType<typeof buildKeyPointsTable> | undefined;
  let polylineVertices: ReturnType<typeof buildPolylineVertices> | undefined;

  if (core && seg) {
    keyPoints = buildKeyPointsTable(core, seg.deltaIEffPerMille);
    polylineVertices = buildPolylineVertices(core, seg);

    // Contexte textuel repris dans les exports PDF (avant le dessin) et Markdown (avant le
    // tableau récapitulatif) : données de base, ΔI au sommet V, approche/mode/répartition, et
    // l'avertissement de répartition uniforme le cas échéant.
    const deltaITotal = inPerMille - i0PerMille;
    const descriptionLines = [
      t('export.grades', { i0: formatGrade(i0PerMille), iN: formatGrade(inPerMille) }),
      t('export.vertex', { kV: formatNumber(kVMm, decimals), hV: formatNumber(hVMm, decimals) }),
      t('export.deltaI', {
        permille: formatGrade(deltaITotal),
        deg: formatDeltaIDeg(permilleToDeg(deltaITotal)),
      }),
      activeApproach === 'approche1'
        ? t('export.approche1', {
            approach: t('approach.approche1'),
            part1: t(`approche1.part1.${approche1Part1Mode}`),
            part2: t(`approche1.part2.${approche1Part2Mode}`),
          })
        : t('export.approche2', {
            approach: t('approach.approche2'),
            subMode: t(`approche2.subMode.${approche2SubMode}`),
            distribution: t(`approche2.distributionMode.${approche2DistributionMode}`),
          }),
    ];
    if (seg.distributionMode === 'uniform') {
      descriptionLines.push(t('approche2.uniformNotice'));
    }

    resultData = {
      title: t('title'),
      // Séparateur "  \n" = saut de ligne dur Markdown (deux espaces + retour) : chaque ligne
      // reste distincte dans l'export Markdown (un simple \n y serait fusionné en un seul
      // paragraphe), tout en restant un \n exploité tel quel par le PDF (jsPDF découpe sur \n,
      // les espaces en fin de ligne sont sans effet visible).
      description: descriptionLines.join('  \n'),
      summaryTable: {
        headers: [
          t('result.summary.r'),
          t('result.summary.f'),
          t('result.summary.t'),
          t('result.summary.n'),
          t('result.summary.lEff'),
          t('result.summary.deltaIEff'),
          t('result.summary.rInt'),
        ],
        rows: [
          [
            formatNumber(core.rMm, decimals),
            formatNumber(core.fMm, decimals),
            formatNumber(core.tMm, decimals),
            seg.n,
            formatNumber(seg.lMm, decimals),
            formatGrade(seg.deltaIEffPerMille),
            formatNumber(seg.rIntMm, decimals),
          ],
        ],
      },
      // Le dessin (échelle réelle) occupe déjà toute la page 1 : les deux tableaux passent
      // systématiquement en page 2, sinon le second (voire les deux) déborde hors page.
      pageBreakBeforeTable: true,
      tableIntro: {
        headers: [
          t('table.pointsCles.point'),
          t('table.pointsCles.k'),
          t('table.pointsCles.h'),
          t('table.pointsCles.gradeBefore'),
          t('table.pointsCles.gradeAfter'),
          t('table.pointsCles.deltaIDeg'),
        ],
        rows: keyPoints.map((p) => {
          const deg = deltaIDeg(p.gradeBeforePerMille, p.gradeAfterPerMille);
          return [
            p.name,
            formatNumber(p.kMm, decimals),
            formatNumber(p.hMm, decimals),
            p.gradeBeforePerMille === undefined ? '—' : formatGrade(p.gradeBeforePerMille),
            p.gradeAfterPerMille === undefined ? '—' : formatGrade(p.gradeAfterPerMille),
            deg === undefined ? '—' : formatDeltaIDeg(deg),
          ];
        }),
      },
      table: {
        headers: [
          t('table.sommets.index'),
          t('table.pointsCles.k'),
          t('table.pointsCles.h'),
          t('table.pointsCles.gradeBefore'),
          t('table.pointsCles.gradeAfter'),
          t('table.pointsCles.deltaIDeg'),
        ],
        rows: polylineVertices.map((v) => {
          const deg = deltaIDeg(v.gradeBeforePerMille, v.gradeAfterPerMille);
          return [
            v.index,
            formatNumber(v.kMm, decimals),
            formatNumber(v.hMm, decimals),
            v.gradeBeforePerMille === undefined ? '—' : formatGrade(v.gradeBeforePerMille),
            v.gradeAfterPerMille === undefined ? '—' : formatGrade(v.gradeAfterPerMille),
            deg === undefined ? '—' : formatDeltaIDeg(deg),
          ];
        }),
      },
    };
  }

  if (core && !horizonEdited) {
    const minHMm = Math.min(core.hTcMm, core.hCtMm, core.hPMm);
    // Arrondi au 10 mm inférieur (pas 100 mm, cf. retour utilisateur : la suggestion
    // pouvait "tomber" jusqu'à 0 si H_min était juste au-dessus d'un multiple de 100 —
    // 10 mm garde une suggestion toujours proche de la courbe, tout en restant ronde).
    const autoHorizonHMm = Math.floor(minHMm / 10) * 10;
    if (autoHorizonHMm !== horizonHMm) setHorizonHMm(autoHorizonHMm);
  }

  const drawing: DrawingGeometry | undefined =
    core && seg
      ? buildDrawingGeometry(core, seg, horizonHMm, drawingScale, verticalExaggeration)
      : undefined;

  function handleDecimalsChange(next: number) {
    setDecimals(clamp(Math.round(next), 0, MAX_DECIMALS));
  }

  function handleHorizonChange(next: number) {
    setHorizonEdited(true);
    setHorizonHMm(next);
  }

  function handleDeltaITargetPerMilleChange(next: number) {
    const roundedPerMille = Math.round(next * 100) / 100;
    setDeltaITargetPerMille(roundedPerMille);
    setDeltaITargetDeg(Math.round(permilleToDeg(roundedPerMille) * 1000) / 1000);
  }

  function handleDeltaITargetDegChange(next: number) {
    const roundedDeg = Math.round(next * 1000) / 1000;
    setDeltaITargetDeg(roundedDeg);
    setDeltaITargetPerMille(Math.round(degToPermille(roundedDeg) * 100) / 100);
  }

  function handleDeltaI2bPerMilleChange(next: number) {
    const roundedPerMille = Math.round(next * 100) / 100;
    setDeltaI2bPerMille(roundedPerMille);
    setDeltaI2bDeg(Math.round(permilleToDeg(roundedPerMille) * 1000) / 1000);
  }

  function handleDeltaI2bDegChange(next: number) {
    const roundedDeg = Math.round(next * 1000) / 1000;
    setDeltaI2bDeg(roundedDeg);
    setDeltaI2bPerMille(Math.round(degToPermille(roundedDeg) * 100) / 100);
  }

  function createDefaultData(): RaccVertProjectData {
    return {
      i0PerMille,
      inPerMille,
      kVMm,
      hVMm,
      activeApproach,
      approche1Part1Mode,
      radiusMm,
      sagittaMm,
      tangentMm,
      approche1Part2Mode,
      deltaITargetPerMille,
      deltaITargetDeg,
      approche1LengthMm,
      approche2SubMode,
      nSegments,
      approche2LengthMm,
      deltaI2bPerMille,
      deltaI2bDeg,
      approche2DistributionMode,
      decimals,
      drawingScale,
      verticalExaggeration,
      horizonHMm,
    };
  }

  function handleOpen(project: Project<RaccVertProjectData>) {
    setI0PerMille(project.data.i0PerMille);
    setInPerMille(project.data.inPerMille);
    setKVMm(project.data.kVMm);
    setHVMm(project.data.hVMm);
    setActiveApproach(project.data.activeApproach);
    setApproche1Part1Mode(project.data.approche1Part1Mode);
    setRadiusMm(project.data.radiusMm);
    setSagittaMm(project.data.sagittaMm);
    setTangentMm(project.data.tangentMm);
    setApproche1Part2Mode(project.data.approche1Part2Mode);
    setDeltaITargetPerMille(project.data.deltaITargetPerMille);
    setDeltaITargetDeg(project.data.deltaITargetDeg);
    setApproche1LengthMm(project.data.approche1LengthMm);
    setApproche2SubMode(project.data.approche2SubMode);
    setNSegments(project.data.nSegments);
    setApproche2LengthMm(project.data.approche2LengthMm);
    setDeltaI2bPerMille(project.data.deltaI2bPerMille);
    setDeltaI2bDeg(project.data.deltaI2bDeg);
    setApproche2DistributionMode(project.data.approche2DistributionMode);
    setDecimals(project.data.decimals);
    setDrawingScale(project.data.drawingScale);
    setVerticalExaggeration(project.data.verticalExaggeration);
    setHorizonHMm(project.data.horizonHMm);
    setHorizonEdited(true);
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<RaccVertProjectData>(MODULE_ID, activeProjectId, createDefaultData());
    setProjectListVersion((v) => v + 1);
  }

  function handleDrawingScaleChange(next: DrawingScale) {
    setDrawingScale(
      next.mode === 'fit' && !next.fitTargetMm ? { ...next, fitTargetMm: FIT_TARGET_MM } : next,
    );
  }

  /**
   * Rendu du dessin SVG, factorisé pour être affiché deux fois : une fois sur la page (avec
   * `svgRef`, utilisé par l'export), une fois — sans ref, purement visuel — dans `DrawingLightbox`.
   */
  function renderDrawing(g: DrawingGeometry, ref?: Ref<SVGSVGElement>): ReactNode {
    return (
      <svg
        ref={ref}
        viewBox={`${g.viewBox.minX} ${g.viewBox.minY} ${g.viewBox.width} ${g.viewBox.height}`}
        width="100%"
        style={{ maxWidth: 640, height: 'auto', background: 'transparent' }}
      >
        <line
          x1={0}
          y1={g.horizonLineY}
          x2={g.drawingWidth}
          y2={g.horizonLineY}
          {...lineStyleToSvgProps({ kind: 'solid', color: HORIZON_LINE_COLOR, widthMm: 0.2 })}
        />

        <GraduationAxis
          orientation="vertical"
          baselinePos={0}
          from={0}
          to={g.drawingHeight}
          ticks={g.verticalTicks.map((tick) => ({ ...tick, major: true }))}
        />
        <GraduationAxis
          orientation="horizontal"
          baselinePos={g.drawingHeight}
          from={0}
          to={g.drawingWidth}
          ticks={g.horizontalTicks.map((tick) => ({ ...tick, major: true }))}
        />

        <line
          x1={g.upstreamLine.from.x}
          y1={g.upstreamLine.from.y}
          x2={g.upstreamLine.to.x}
          y2={g.upstreamLine.to.y}
          {...lineStyleToSvgProps({ kind: 'solid', color: EXTENSION_LINE_COLOR, widthMm: 0.3 })}
        />
        <line
          x1={g.downstreamLine.from.x}
          y1={g.downstreamLine.from.y}
          x2={g.downstreamLine.to.x}
          y2={g.downstreamLine.to.y}
          {...lineStyleToSvgProps({ kind: 'solid', color: EXTENSION_LINE_COLOR, widthMm: 0.3 })}
        />

        <path d={g.arcPathD} stroke={ARC_COLOR} strokeWidth={ARC_STROKE_WIDTH_MM} fill="none" />
        <path
          d={g.polylinePathD}
          stroke={SEGMENTS_COLOR}
          strokeWidth={SEGMENTS_STROKE_WIDTH_MM}
          fill="none"
        />

        {g.keyPointsDrawing.map((p) => (
          <g key={p.name}>
            <circle cx={p.point.x} cy={p.point.y} r={KEY_POINT_DOT_RADIUS_MM} fill="#000000" />
            <PointLabel
              point={p.point}
              label={p.name}
              directionRad={KEY_POINT_LABEL_DIRECTIONS[p.name]}
            />
          </g>
        ))}

        {/* Étiquette d'échelle : un profil en long a des échelles H et V distinctes (V
            déformée), donc une barre d'échelle graduée à axe unique serait trompeuse — les
            axes gradués K et H ci-dessus tiennent ce rôle. On indique ici les deux ratios
            (CDC §7.1). */}
        <g fontFamily="Arial, Helvetica, sans-serif" fill="#1a1a1a">
          <text x={0} y={g.drawingHeight + BOTTOM_MARGIN_MM} fontSize={3}>
            {t('drawing.scales', {
              h: formatRatio(g.scaleHorizontalRatio),
              v: formatRatio(g.scaleVerticalRatio),
              factor: verticalExaggeration,
            })}
          </text>
          <text x={0} y={g.drawingHeight + BOTTOM_MARGIN_MM + 5} fontSize={3}>
            {t('drawing.unit')}
          </text>
        </g>
      </svg>
    );
  }

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-toolbar">
        <label className="rt-field rt-field--inline">
          <span>{t('common.decimals')}</span>
          <NumberInput value={decimals} onChange={handleDecimalsChange} />
        </label>
        {activeProjectId && (
          <button type="button" className="rt-button" onClick={() => void handleSave()}>
            {tCommon('actions.save')}
          </button>
        )}
      </div>

      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('common.i0')}</span>
          <NumberInput value={i0PerMille} onChange={setI0PerMille} />
        </label>
        <label className="rt-field">
          <span>{t('common.iN')}</span>
          <NumberInput value={inPerMille} onChange={setInPerMille} />
        </label>
        <label className="rt-field">
          <span>{t('common.kV')}</span>
          <NumberInput value={kVMm} onChange={setKVMm} />
        </label>
        <label className="rt-field">
          <span>{t('common.hV')}</span>
          <NumberInput value={hVMm} onChange={setHVMm} />
        </label>
      </div>

      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('approach.label')}</span>
          <select
            className="rt-select"
            value={activeApproach}
            onChange={(event) => setActiveApproach(event.target.value as RaccVertApproach)}
          >
            <option value="approche1">{t('approach.approche1')}</option>
            <option value="approche2">{t('approach.approche2')}</option>
          </select>
        </label>
      </div>

      {activeApproach === 'approche1' ? (
        <>
          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('approche1.part1.label')}</span>
              <select
                className="rt-select"
                value={approche1Part1Mode}
                onChange={(event) =>
                  setApproche1Part1Mode(event.target.value as Approche1Part1Mode)
                }
              >
                <option value="radius">{t('approche1.part1.radius')}</option>
                <option value="sagitta">{t('approche1.part1.sagitta')}</option>
                <option value="tangent">{t('approche1.part1.tangent')}</option>
              </select>
            </label>
            {approche1Part1Mode === 'radius' && (
              <label className="rt-field">
                <span>{t('approche1.part1.radius')}</span>
                <NumberInput value={radiusMm} onChange={setRadiusMm} />
              </label>
            )}
            {approche1Part1Mode === 'sagitta' && (
              <label className="rt-field">
                <span>{t('approche1.part1.sagitta')}</span>
                <NumberInput value={sagittaMm} onChange={setSagittaMm} />
              </label>
            )}
            {approche1Part1Mode === 'tangent' && (
              <label className="rt-field">
                <span>{t('approche1.part1.tangent')}</span>
                <NumberInput value={tangentMm} onChange={setTangentMm} />
              </label>
            )}
          </div>

          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('approche1.part2.label')}</span>
              <select
                className="rt-select"
                value={approche1Part2Mode}
                onChange={(event) =>
                  setApproche1Part2Mode(event.target.value as Approche1Part2Mode)
                }
              >
                <option value="deltaITarget">{t('approche1.part2.deltaITarget')}</option>
                <option value="length">{t('approche1.part2.length')}</option>
              </select>
            </label>
            {approche1Part2Mode === 'deltaITarget' && (
              <>
                <label className="rt-field">
                  <span>{t('approche1.part2.deltaITarget')}</span>
                  <NumberInput
                    value={deltaITargetPerMille}
                    onChange={handleDeltaITargetPerMilleChange}
                  />
                </label>
                <label className="rt-field">
                  <span>{t('approche1.part2.deltaITargetDeg')}</span>
                  <NumberInput value={deltaITargetDeg} onChange={handleDeltaITargetDegChange} />
                </label>
              </>
            )}
            {approche1Part2Mode === 'length' && (
              <label className="rt-field">
                <span>{t('approche1.part2.length')}</span>
                <NumberInput value={approche1LengthMm} onChange={setApproche1LengthMm} />
              </label>
            )}
          </div>
        </>
      ) : (
        <div className="rt-toolbar">
          <label className="rt-field">
            <span>{t('approche2.subMode.label')}</span>
            <select
              className="rt-select"
              value={approche2SubMode}
              onChange={(event) => setApproche2SubMode(event.target.value as Approche2SubMode)}
            >
              <option value="2a">{t('approche2.subMode.2a')}</option>
              <option value="2b">{t('approche2.subMode.2b')}</option>
            </select>
          </label>
          <label className="rt-field">
            <span>{t('approche2.distributionMode.label')}</span>
            <select
              className="rt-select"
              value={approche2DistributionMode}
              onChange={(event) =>
                setApproche2DistributionMode(event.target.value as SegmentDistributionMode)
              }
            >
              <option value="midpointSlope">{t('approche2.distributionMode.midpointSlope')}</option>
              <option value="uniform">{t('approche2.distributionMode.uniform')}</option>
            </select>
          </label>
          {approche2SubMode === '2a' && (
            <>
              <label className="rt-field">
                <span>{t('approche2.n')}</span>
                <NumberInput value={nSegments} onChange={(v) => setNSegments(Math.round(v))} />
              </label>
              <label className="rt-field">
                <span>{t('approche2.length')}</span>
                <NumberInput value={approche2LengthMm} onChange={setApproche2LengthMm} />
              </label>
            </>
          )}
          {approche2SubMode === '2b' && (
            <>
              <label className="rt-field">
                <span>{t('approche2.length')}</span>
                <NumberInput value={approche2LengthMm} onChange={setApproche2LengthMm} />
              </label>
              <label className="rt-field">
                <span>{t('approche2.deltaI2b')}</span>
                <NumberInput value={deltaI2bPerMille} onChange={handleDeltaI2bPerMilleChange} />
              </label>
              <label className="rt-field">
                <span>{t('approche2.deltaI2bDeg')}</span>
                <NumberInput value={deltaI2bDeg} onChange={handleDeltaI2bDegChange} />
              </label>
            </>
          )}
        </div>
      )}

      {inputError && <p className="rt-error">{t(`errors.${inputError}`)}</p>}

      {core && seg && (
        <p
          style={{
            margin: 0,
            fontSize: '1.15rem',
            fontWeight: 600,
            color: 'var(--rt-color-primary)',
          }}
        >
          R = {formatNumber(core.rMm, decimals)} mm — f = {formatNumber(core.fMm, decimals)} mm —
          T = {formatNumber(core.tMm, decimals)} mm — n = {seg.n}
        </p>
      )}

      {seg?.distributionMode === 'uniform' && (
        <p className="rt-error" style={{ fontWeight: 400 }}>
          {t('approche2.uniformNotice')}
        </p>
      )}

      {drawing && (
        <>
          <div className="rt-toolbar">
            <DrawingScaleSelector
              value={drawingScale}
              onChange={handleDrawingScaleChange}
              className="rt-field rt-field--inline"
            />
            <label className="rt-field">
              <span>{t('common.verticalExaggeration')}</span>
              <select
                className="rt-select"
                value={verticalExaggeration}
                onChange={(event) =>
                  setVerticalExaggeration(Number(event.target.value) as 1 | 2 | 5 | 10)
                }
              >
                <option value={1}>×1</option>
                <option value={2}>×2</option>
                <option value={5}>×5</option>
                <option value={10}>×10</option>
              </select>
            </label>
            <label className="rt-field rt-field--inline">
              <span>{t('common.horizonH')}</span>
              <NumberInput value={horizonHMm} onChange={handleHorizonChange} />
            </label>
            <DrawingLightbox
              label={tCommon('drawing.enlarge')}
              closeLabel={tCommon('actions.close')}
              zoomInLabel={tCommon('drawing.zoomIn')}
              zoomOutLabel={tCommon('drawing.zoomOut')}
              resetLabel={tCommon('drawing.resetZoom')}
            >
              {renderDrawing(drawing)}
            </DrawingLightbox>
          </div>

          {renderDrawing(drawing, svgRef)}
        </>
      )}

      {resultData && (
        <ExportButtons
          filenameBase={`raccvert-r${Math.round(core?.rMm ?? 0)}`}
          resultData={resultData}
          getSvgElement={() => svgRef.current}
          projectName={activeProjectName}
        />
      )}

      {keyPoints && (
        <table>
          <caption>{t('table.pointsCles.title')}</caption>
          <thead>
            <tr>
              <th>{t('table.pointsCles.point')}</th>
              <th>{t('table.pointsCles.k')}</th>
              <th>{t('table.pointsCles.h')}</th>
              <th>{t('table.pointsCles.gradeBefore')}</th>
              <th>{t('table.pointsCles.gradeAfter')}</th>
              <th>{t('table.pointsCles.deltaIDeg')}</th>
            </tr>
          </thead>
          <tbody>
            {keyPoints.map((p) => {
              const deg = deltaIDeg(p.gradeBeforePerMille, p.gradeAfterPerMille);
              return (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{formatNumber(p.kMm, decimals)}</td>
                  <td>{formatNumber(p.hMm, decimals)}</td>
                  <td>{p.gradeBeforePerMille === undefined ? '—' : formatGrade(p.gradeBeforePerMille)}</td>
                  <td>{p.gradeAfterPerMille === undefined ? '—' : formatGrade(p.gradeAfterPerMille)}</td>
                  <td>{deg === undefined ? '—' : formatDeltaIDeg(deg)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {polylineVertices && (
        <table>
          <caption>{t('table.sommets.title')}</caption>
          <thead>
            <tr>
              <th>{t('table.sommets.index')}</th>
              <th>{t('table.pointsCles.k')}</th>
              <th>{t('table.pointsCles.h')}</th>
              <th>{t('table.pointsCles.gradeBefore')}</th>
              <th>{t('table.pointsCles.gradeAfter')}</th>
              <th>{t('table.pointsCles.deltaIDeg')}</th>
            </tr>
          </thead>
          <tbody>
            {polylineVertices.map((v) => {
              const deg = deltaIDeg(v.gradeBeforePerMille, v.gradeAfterPerMille);
              return (
                <tr key={v.index}>
                  <td>{v.index}</td>
                  <td>{formatNumber(v.kMm, decimals)}</td>
                  <td>{formatNumber(v.hMm, decimals)}</td>
                  <td>{v.gradeBeforePerMille === undefined ? '—' : formatGrade(v.gradeBeforePerMille)}</td>
                  <td>{v.gradeAfterPerMille === undefined ? '—' : formatGrade(v.gradeAfterPerMille)}</td>
                  <td>{deg === undefined ? '—' : formatDeltaIDeg(deg)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ProjectManager<RaccVertProjectData>
        key={projectListVersion}
        moduleId={MODULE_ID}
        activeProjectId={activeProjectId}
        createDefaultData={createDefaultData}
        onOpen={handleOpen}
      />

      <EnvironmentTransfer
        moduleId={MODULE_ID}
        onImported={() => setProjectListVersion((v) => v + 1)}
      />
    </ResultPageLayout>
  );
}
