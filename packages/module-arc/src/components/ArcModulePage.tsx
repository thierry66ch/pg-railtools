'use client';

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import {
  AngleCote,
  ArcLengthCote,
  DEFAULT_COTE_OFFSET_MM,
  DEFAULT_DRAWING_SCALE,
  DrawingLightbox,
  DrawingScaleSelector,
  EnvironmentTransfer,
  ExportButtons,
  LengthCote,
  LevelCote,
  NumberInput,
  PointLabel,
  ProjectManager,
  RadiusCote,
  ResultPageLayout,
  ScaleBar,
  degToRad,
  getPreferredDrawingScale,
  lineStyleToSvgProps,
  modelToDrawing,
  pointOnCircle,
  radToDeg,
  resolveDrawingScale,
  suggestDimensionSizing,
  updateProject,
  type DrawingScale,
  type Point,
  type Project,
  type ResolvedDrawingScale,
  type ResultData,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import {
  centralAngleFromRadiusChord,
  chordSagittaFromRadiusAngle,
  computeImplantation,
  localOffset,
  radiusAngleFromTangentChord,
  radiusFromChordSagitta,
  radiusFromTangentAngle,
  sagittaFromRadiusChord,
  tangentGeometryFromRadiusAngle,
  type ArcErrorCode,
  type TangentGeometry,
} from '../math/arc';
import type { ArcInputMode, ArcProjectData } from '../types';

const MODULE_ID = 'arc';

const DEFAULT_CHORD_MM = 1000;
const DEFAULT_SAGITTA_MM = 50;
const DEFAULT_RADIUS_MM = 2500;
const DEFAULT_CENTRAL_ANGLE_DEG = 30;
/** Strictement > DEFAULT_CHORD_MM/2 (500) pour rester valide par défaut en mode `tangentChord`. */
const DEFAULT_TANGENT_MM = 550;
const DEFAULT_INTERVALS = 10;
const DEFAULT_DECIMALS = 1;
const MIN_INTERVALS = 2;
const MAX_DECIMALS = 6;
/**
 * Seuil (angle au centre plein, en degrés) sous lequel la cote d'angle est représentée
 * entre les tangentes (sommet S proche) plutôt qu'au centre (R proche pour les grands
 * angles, mais tend vers l'infini pour les petits — cf. RadiusCote qui ne trace jamais
 * jusqu'au centre réel). Au-delà de ce seuil c'est l'inverse : S s'éloigne à l'infini
 * (tangentes parallèles à 180°) alors que R reste modeste. Chaque représentation reste
 * donc compacte exactement dans la plage où l'autre exploserait.
 */
const CENTRAL_ANGLE_TANGENT_THRESHOLD_DEG = 135;
/** Rayon fixe (mm de dessin) de la cote d'angle tracée entre les tangentes, en S. */
const TANGENT_ANGLE_COTE_RADIUS_MM = 15;

/** Dimensions cible (mm de dessin) utilisées par le mode d'échelle de dessin "fit". */
const FIT_TARGET_MM = { width: 260, height: 180 };
/** Marges (mm de dessin, fixes) autour de la géométrie — réservées aux cotes. */
const LEFT_MARGIN_MM = 20;
const RIGHT_MARGIN_MM = 20;
/** Cote de corde (au-dessus) + cote de rayon (20 mm fixes, remontant vers le centre). */
const TOP_MARGIN_MM = 40;
/** Cote de longueur d'arc (en dessous de l'arc). */
const BOTTOM_GAP_MM = 25;
const SCALE_BAR_EXTRA_MM = 26;
const RAIL_STROKE_WIDTH_MM = 1.5;
const CURSOR_MARKER_RADIUS_MM = 1.5;
/** Position (fraction de α, entre D et B) de l'ancrage de la cote de rayon. */
const RADIUS_COTE_ANGLE_FRACTION = 0.7;
/**
 * Décalage (mm de dessin) des cotes AE/EB, entre la corde et la cote totale A-B (offset
 * -DEFAULT_COTE_OFFSET_MM = -10). Le texte de ces cotes s'étend lui-même d'environ
 * textSizeMm*0.2+0.5 + textSizeMm ≈ 4.1 mm au-delà de leur propre ligne (LengthCote,
 * dominantBaseline="text-after-edge") : rester nettement en dessous de 10-4.1=5.9 pour
 * garder de la marge avant la cote totale.
 */
const SUB_COTE_OFFSET_MM = 3;
/** Directions (radians) des étiquettes A/B (horizontales, vers l'extérieur) et M/D (en diagonale, à l'écart des cotes). */
const LABEL_LEFT_RAD = Math.PI;
const LABEL_RIGHT_RAD = 0;
const LABEL_UP_LEFT_RAD = Math.PI + Math.PI / 4;
const LABEL_DOWN_LEFT_RAD = Math.PI - Math.PI / 4;
/** Direction (radians) de l'étiquette S : en diagonale, du côté opposé à D pour ne pas s'y superposer. */
const LABEL_DOWN_RIGHT_RAD = Math.PI / 4;

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

/** Longueur/rayon affichés sur le dessin : précision fixe, indépendante des décimales globales. */
function formatCoteLength(mm: number): string {
  return formatFixed(mm, 1);
}

/** Géométrie du dessin SVG (mm dessin), dérivée uniquement pour une configuration valide. */
interface DrawingGeometry {
  chordMm: number;
  sagittaMm: number;
  radiusMm: number;
  pathD: string;
  dPointA: Point;
  dPointB: Point;
  dPointM: Point;
  dPointD: Point;
  dCenter: Point;
  dRadius: number;
  dRadiusAnchor: Point;
  angleAtA: number;
  angleAtB: number;
  dCursorE: Point;
  dCursorF: Point;
  drawingHeight: number;
  resolvedScale: ResolvedDrawingScale;
  totalArcLengthMm: number;
  viewBox: { minX: number; minY: number; width: number; height: number };
  /** Angle au centre plein (°), utile pour l'étiquette de la cote d'angle. */
  centralAngleDeg: number;
  /**
   * Cote d'angle optionnelle (absente si non demandée) : entre les tangentes (centrée en
   * S, angle < seuil) ou au centre réel du cercle (angle ≥ seuil).
   */
  angleCote?: {
    mode: 'tangent' | 'center';
    center: Point;
    radiusMm: number;
    startAngleRad: number;
    endAngleRad: number;
  };
}

/**
 * Calcule toute la géométrie de dessin à partir d'une configuration déjà validée
 * (rayon/flèche/corde réels, pas de valeur `undefined`) — n'est appelé que lorsque le
 * résultat principal et le tableau d'implantation sont tous deux valides.
 */
function buildDrawingGeometry(
  radiusMm: number,
  sagittaMm: number,
  chordMm: number,
  cursorAeMm: number,
  cursorOffsetMm: number,
  alphaRad: number,
  drawingScale: DrawingScale,
  geometryPoints: Point[],
  showCentralAngleCote: boolean,
): DrawingGeometry {
  const angleAtA = Math.PI / 2 + alphaRad;
  const angleAtB = Math.PI / 2 - alphaRad;
  const angleAtD = Math.PI / 2;
  const arcCenterModel: Point = { x: chordMm / 2, y: -(radiusMm - sagittaMm) };
  const centralAngleDeg = radToDeg(angleAtA - angleAtB);

  // Cote d'angle : décide entre les 2 représentations et, pour la variante "entre
  // tangentes", localise S (sommet, intersection des tangentes en A et B) en espace
  // modèle — avant le calcul de la boîte englobante, pour que S y soit inclus si
  // besoin. S est sur l'axe de symétrie (x = corde/2), à la distance "bissectrice" de
  // M — formule fermée (tangentGeometryFromRadiusAngle), pas d'intersection de droites.
  let angleCoteModelCenter: Point | null = null;
  let angleCoteResolvedMode: 'tangent' | 'center' | 'none' = 'none';
  if (showCentralAngleCote) {
    if (centralAngleDeg < CENTRAL_ANGLE_TANGENT_THRESHOLD_DEG) {
      const tangentGeometry = tangentGeometryFromRadiusAngle(radiusMm, 2 * alphaRad);
      if (tangentGeometry) {
        angleCoteModelCenter = { x: chordMm / 2, y: tangentGeometry.bisectorMm };
        angleCoteResolvedMode = 'tangent';
      }
    } else {
      angleCoteResolvedMode = 'center';
    }
  }

  const boundsPoints =
    angleCoteResolvedMode === 'tangent' && angleCoteModelCenter
      ? [...geometryPoints, angleCoteModelCenter]
      : geometryPoints;
  const modelMinX = Math.min(...boundsPoints.map((p) => p.x));
  const modelMaxX = Math.max(...boundsPoints.map((p) => p.x));
  const modelMinY = Math.min(...boundsPoints.map((p) => p.y));
  const modelMaxY = Math.max(...boundsPoints.map((p) => p.y));
  const modelWidth = Math.max(modelMaxX - modelMinX, 1);
  const modelHeight = Math.max(modelMaxY - modelMinY, 1);

  const effectiveDrawingScale: DrawingScale =
    drawingScale.mode === 'fit' && !drawingScale.fitTargetMm
      ? { ...drawingScale, fitTargetMm: FIT_TARGET_MM }
      : drawingScale;
  const resolvedScale = resolveDrawingScale(effectiveDrawingScale, { width: modelWidth, height: modelHeight });

  function toDrawing(p: Point): Point {
    return {
      x: modelToDrawing(p.x - modelMinX, resolvedScale),
      y: modelToDrawing(p.y - modelMinY, resolvedScale),
    };
  }

  const dCenter = toDrawing(arcCenterModel);
  const dRadius = modelToDrawing(radiusMm, resolvedScale);
  const dPointA = toDrawing(pointOnCircle(arcCenterModel, radiusMm, angleAtA));
  const dPointB = toDrawing(pointOnCircle(arcCenterModel, radiusMm, angleAtB));
  const dPointM = toDrawing({ x: chordMm / 2, y: 0 });
  const dPointD = toDrawing(pointOnCircle(arcCenterModel, radiusMm, angleAtD));
  // Ancre la cote de rayon décalée vers B (pas au sommet D) : évite qu'elle ne se
  // superpose au libellé de la cote de corde, centré lui aussi sur le milieu (x=c/2).
  const radiusCoteAngle = angleAtD + (angleAtB - angleAtD) * RADIUS_COTE_ANGLE_FRACTION;
  const dRadiusAnchor = toDrawing(pointOnCircle(arcCenterModel, radiusMm, radiusCoteAngle));
  const drawingWidth = modelToDrawing(modelWidth, resolvedScale);
  const drawingHeight = modelToDrawing(modelHeight, resolvedScale);

  const dCursorE = toDrawing({ x: cursorAeMm, y: 0 });
  const dCursorF = toDrawing({ x: cursorAeMm, y: cursorOffsetMm });

  const pathD = `M ${dPointA.x} ${dPointA.y} A ${dRadius} ${dRadius} 0 0 0 ${dPointB.x} ${dPointB.y}`;

  const angleCote: DrawingGeometry['angleCote'] =
    angleCoteResolvedMode === 'tangent' && angleCoteModelCenter
      ? {
          mode: 'tangent',
          center: toDrawing(angleCoteModelCenter),
          radiusMm: TANGENT_ANGLE_COTE_RADIUS_MM,
          startAngleRad: angleAtB - Math.PI / 2,
          endAngleRad: angleAtA - Math.PI / 2,
        }
      : angleCoteResolvedMode === 'center'
        ? {
            mode: 'center',
            center: dCenter,
            // Rayon nettement en retrait de l'arc (RadiusCote occupe déjà la bande des
            // 20 derniers mm avant l'arc) ; plancher à mi-rayon pour rester positif.
            radiusMm: Math.max(dRadius - 3 * DEFAULT_COTE_OFFSET_MM, dRadius * 0.5),
            startAngleRad: angleAtB,
            endAngleRad: angleAtA,
          }
        : undefined;

  return {
    chordMm,
    sagittaMm,
    radiusMm,
    pathD,
    dPointA,
    dPointB,
    dPointM,
    dPointD,
    dCenter,
    dRadius,
    dRadiusAnchor,
    angleAtA,
    angleAtB,
    dCursorE,
    dCursorF,
    drawingHeight,
    resolvedScale,
    totalArcLengthMm: 2 * radiusMm * alphaRad,
    centralAngleDeg,
    angleCote,
    viewBox: {
      minX: -LEFT_MARGIN_MM,
      minY: -TOP_MARGIN_MM,
      width: drawingWidth + LEFT_MARGIN_MM + RIGHT_MARGIN_MM,
      height: drawingHeight + TOP_MARGIN_MM + BOTTOM_GAP_MM + SCALE_BAR_EXTRA_MM,
    },
  };
}

/** Une ligne du tableau de caractéristiques (désignation → valeur), commun aux 5 modes. */
interface CharacteristicRow {
  labelKey: 'chord' | 'sagitta' | 'radius' | 'centralAngle' | 'tangent' | 'bisector' | 'external' | 'arcLength';
  value: string;
  /** Vrai si cette grandeur est saisie par l'utilisateur dans le mode courant (affichée en gras). */
  given: boolean;
}

/** Valeur affichée pour tangente/bissectrice/contre-flèche à la limite du demi-cercle (S à l'infini). */
const INFINITE_SYMBOL = '∞';

export function ArcModulePage() {
  const t = useTranslations('moduleArc');
  const tCommon = useTranslations('common');

  const [inputMode, setInputMode] = useState<ArcInputMode>('chordSagitta');
  const [chordMm, setChordMm] = useState(DEFAULT_CHORD_MM);
  const [sagittaMm, setSagittaMm] = useState(DEFAULT_SAGITTA_MM);
  const [radiusMm, setRadiusMm] = useState(DEFAULT_RADIUS_MM);
  const [centralAngleDeg, setCentralAngleDeg] = useState(DEFAULT_CENTRAL_ANGLE_DEG);
  const [tangentMm, setTangentMm] = useState(DEFAULT_TANGENT_MM);
  const [intervals, setIntervals] = useState(DEFAULT_INTERVALS);
  const [decimals, setDecimals] = useState(DEFAULT_DECIMALS);
  const [showArcLength, setShowArcLength] = useState(true);
  const [showAngleCumul, setShowAngleCumul] = useState(true);
  const [showCentralAngleCote, setShowCentralAngleCote] = useState(false);
  const [cursorAeMm, setCursorAeMm] = useState(0);
  const [drawingScale, setDrawingScale] = useState<DrawingScale>(DEFAULT_DRAWING_SCALE);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>();
  // Remonte ProjectManager (via sa `key`) après un import en vrac, pour qu'il relise
  // sa liste de projets — l'import ne rafraîchit pas son état interne autrement.
  const [projectListVersion, setProjectListVersion] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!activeProjectId) {
      void getPreferredDrawingScale().then(setDrawingScale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Triplet (R, c, f) cohérent, calculé une seule fois par mode — `undefined` tant que la
  // config est invalide, ce qui empêche structurellement (au niveau des types) tout accès
  // à une grandeur non définie plus bas (c'est cette confusion qui causait un crash réel
  // avant). Branché par mode plutôt que via un résultat "primaire" partagé au type ambigu
  // (nombre selon 2 modes, paire {chord,sagitta} selon le 3e).
  let geometryInputs: { chordMm: number; radiusMm: number; sagittaMm: number } | undefined;
  let inputError: ArcErrorCode | undefined;

  if (inputMode === 'chordSagitta') {
    const result = radiusFromChordSagitta(chordMm, sagittaMm);
    if (result.ok) geometryInputs = { chordMm, sagittaMm, radiusMm: result.value };
    else inputError = result.error;
  } else if (inputMode === 'radiusChord') {
    const result = sagittaFromRadiusChord(radiusMm, chordMm);
    if (result.ok) geometryInputs = { chordMm, sagittaMm: result.value, radiusMm };
    else inputError = result.error;
  } else if (inputMode === 'radiusAngle') {
    const result = chordSagittaFromRadiusAngle(radiusMm, degToRad(centralAngleDeg));
    if (result.ok) {
      geometryInputs = { chordMm: result.value.chordMm, sagittaMm: result.value.sagittaMm, radiusMm };
    } else {
      inputError = result.error;
    }
  } else if (inputMode === 'tangentAngle') {
    const angleRad = degToRad(centralAngleDeg);
    const radiusResult = radiusFromTangentAngle(tangentMm, angleRad);
    if (radiusResult.ok) {
      const csResult = chordSagittaFromRadiusAngle(radiusResult.value, angleRad);
      if (csResult.ok) {
        geometryInputs = {
          chordMm: csResult.value.chordMm,
          sagittaMm: csResult.value.sagittaMm,
          radiusMm: radiusResult.value,
        };
      } else {
        inputError = csResult.error;
      }
    } else {
      inputError = radiusResult.error;
    }
  } else {
    const raResult = radiusAngleFromTangentChord(tangentMm, chordMm);
    if (raResult.ok) {
      const sagittaResult = sagittaFromRadiusChord(raResult.value.radiusMm, chordMm);
      if (sagittaResult.ok) {
        geometryInputs = { chordMm, sagittaMm: sagittaResult.value, radiusMm: raResult.value.radiusMm };
      } else {
        inputError = sagittaResult.error;
      }
    } else {
      inputError = raResult.error;
    }
  }

  const centralAngleRad = geometryInputs
    ? inputMode === 'radiusAngle' || inputMode === 'tangentAngle'
      ? degToRad(centralAngleDeg)
      : centralAngleFromRadiusChord(geometryInputs.radiusMm, geometryInputs.chordMm)
    : undefined;

  const tangentGeometry: TangentGeometry | undefined =
    geometryInputs && centralAngleRad !== undefined
      ? tangentGeometryFromRadiusAngle(geometryInputs.radiusMm, centralAngleRad)
      : undefined;

  // Tableau de caractéristiques (désignation → valeur), identique pour les 5 modes et
  // indépendant de la validité du nombre d'intervalles (longueur d'arc = R×angle, pas
  // besoin du tableau d'implantation) : reste visible même si `intervals` est invalide.
  // Réutilisé tel quel pour l'export (`resultData.summaryTable` plus bas).
  const characteristicsRows: CharacteristicRow[] =
    geometryInputs && centralAngleRad !== undefined
      ? [
          {
            labelKey: 'chord',
            value: formatNumber(geometryInputs.chordMm, decimals),
            given: inputMode === 'chordSagitta' || inputMode === 'radiusChord' || inputMode === 'tangentChord',
          },
          {
            labelKey: 'sagitta',
            value: formatNumber(geometryInputs.sagittaMm, decimals),
            given: inputMode === 'chordSagitta',
          },
          {
            labelKey: 'radius',
            value: formatNumber(geometryInputs.radiusMm, decimals),
            given: inputMode === 'radiusChord' || inputMode === 'radiusAngle',
          },
          {
            labelKey: 'centralAngle',
            value: formatNumber(radToDeg(centralAngleRad), decimals),
            given: inputMode === 'radiusAngle' || inputMode === 'tangentAngle',
          },
          {
            labelKey: 'tangent',
            value: tangentGeometry ? formatNumber(tangentGeometry.tangentMm, decimals) : INFINITE_SYMBOL,
            given: inputMode === 'tangentAngle' || inputMode === 'tangentChord',
          },
          {
            labelKey: 'bisector',
            value: tangentGeometry ? formatNumber(tangentGeometry.bisectorMm, decimals) : INFINITE_SYMBOL,
            given: false,
          },
          {
            labelKey: 'external',
            value: tangentGeometry ? formatNumber(tangentGeometry.externalMm, decimals) : INFINITE_SYMBOL,
            given: false,
          },
          {
            labelKey: 'arcLength',
            value: formatNumber(geometryInputs.radiusMm * centralAngleRad, decimals),
            given: false,
          },
        ]
      : [];

  const clampedCursorAeMm = clamp(cursorAeMm, 0, chordMm);
  // N'affiche E et ses cotes que si E est strictement entre A et B (sinon rien de plus
  // à montrer que la corde elle-même) — E démarre par défaut en A (AE=0), donc masqué.
  const showCursorAnnotations = clampedCursorAeMm > 0 && clampedCursorAeMm < chordMm;

  let cursorOffsetMm: number | undefined;
  let drawing: DrawingGeometry | undefined;
  let resultData: ResultData | undefined;
  let anglePerIntervalDeg: number | undefined;

  if (geometryInputs) {
    const { radiusMm: r, sagittaMm: s, chordMm: c } = geometryInputs;
    cursorOffsetMm = localOffset(clampedCursorAeMm, r, c, s);
    const tableResult = computeImplantation(r, c, intervals);

    if (tableResult.ok) {
      const table = tableResult.value;
      anglePerIntervalDeg = radToDeg((2 * table.alphaRad) / intervals);

      const geometryPoints: Point[] = table.points.map((p) => ({ x: p.aeMm, y: p.efMm }));
      drawing = buildDrawingGeometry(
        r,
        s,
        c,
        clampedCursorAeMm,
        cursorOffsetMm,
        table.alphaRad,
        drawingScale,
        geometryPoints,
        showCentralAngleCote,
      );

      resultData = {
        title: t('title'),
        drawingAlt: t('title'),
        summaryTable: {
          headers: [t('summary.designation'), t('summary.value')],
          rows: characteristicsRows.map((row) => [t(`summary.${row.labelKey}`), row.value]),
        },
        pageBreakBeforeTable: true,
        tableIntro: {
          headers: [t('summary.intervals'), t('summary.anglePerInterval')],
          rows: [[intervals, formatNumber(anglePerIntervalDeg, decimals)]],
        },
        table: {
          headers: [
            t('table.index'),
            t('table.ae'),
            t('table.eb'),
            t('table.ef'),
            ...(showArcLength ? [t('table.arcLength')] : []),
            ...(showAngleCumul ? [t('table.angleCumul')] : []),
          ],
          rows: table.points.map((point) => [
            point.index,
            formatNumber(point.aeMm, decimals),
            formatNumber(point.ebMm, decimals),
            formatNumber(point.efMm, decimals),
            ...(showArcLength ? [formatNumber(point.arcLengthMm, decimals)] : []),
            ...(showAngleCumul
              ? [formatNumber(radToDeg(point.betaRad + table.alphaRad), decimals)]
              : []),
          ]),
        },
      };
    }
  }

  function handleIntervalsChange(next: number) {
    setIntervals(Math.max(MIN_INTERVALS, Math.round(next)));
  }

  function handleDecimalsChange(next: number) {
    setDecimals(clamp(Math.round(next), 0, MAX_DECIMALS));
  }

  function handleCursorChange(next: number) {
    setCursorAeMm(clamp(next, 0, chordMm));
  }

  function handleDrawingScaleChange(next: DrawingScale) {
    setDrawingScale(
      next.mode === 'fit' && !next.fitTargetMm ? { ...next, fitTargetMm: FIT_TARGET_MM } : next,
    );
  }

  function createDefaultData(): ArcProjectData {
    return {
      inputMode,
      chordMm,
      sagittaMm,
      radiusMm,
      centralAngleDeg,
      tangentMm,
      intervals,
      decimals,
      showArcLength,
      showAngleCumul,
      showCentralAngleCote,
      drawingScale,
    };
  }

  function handleOpen(project: Project<ArcProjectData>) {
    setInputMode(project.data.inputMode);
    setChordMm(project.data.chordMm);
    setSagittaMm(project.data.sagittaMm);
    setRadiusMm(project.data.radiusMm);
    setCentralAngleDeg(project.data.centralAngleDeg);
    setTangentMm(project.data.tangentMm);
    setIntervals(project.data.intervals);
    setDecimals(project.data.decimals);
    setShowArcLength(project.data.showArcLength);
    setShowAngleCumul(project.data.showAngleCumul);
    setShowCentralAngleCote(project.data.showCentralAngleCote);
    setDrawingScale(project.data.drawingScale);
    setCursorAeMm(0);
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<ArcProjectData>(MODULE_ID, activeProjectId, createDefaultData());
    // ProjectManager garde sa propre liste en mémoire (chargée au montage) : sans ce
    // remount, rouvrir ce même projet juste après resservirait les anciennes valeurs,
    // donnant l'impression que "Enregistrer" n'a rien fait (voir pieges-a-eviter.md).
    setProjectListVersion((v) => v + 1);
  }

  /**
   * Rendu du dessin SVG, factorisé pour être affiché deux fois : une fois sur la page
   * (avec `svgRef`, utilisé par l'export), une fois — sans ref, purement visuel — dans
   * `DrawingLightbox` (vue agrandie avec zoom/pan).
   */
  function renderDrawing(g: DrawingGeometry, ref?: Ref<SVGSVGElement>): ReactNode {
    return (
      <svg
        ref={ref}
        viewBox={`${g.viewBox.minX} ${g.viewBox.minY} ${g.viewBox.width} ${g.viewBox.height}`}
        width="100%"
        style={{ maxWidth: 640, height: 'auto', background: 'transparent' }}
      >
        <path d={g.pathD} stroke="#1f5f8b" strokeWidth={RAIL_STROKE_WIDTH_MM} strokeLinecap="round" fill="none" />

        {/* Lignes de construction : corde A-B et axe de la flèche M-D. */}
        <line
          x1={g.dPointA.x}
          y1={g.dPointA.y}
          x2={g.dPointB.x}
          y2={g.dPointB.y}
          {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#999999', widthMm: 0.2 })}
        />
        <line
          x1={g.dPointM.x}
          y1={g.dPointM.y}
          x2={g.dPointD.x}
          y2={g.dPointD.y}
          {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#999999', widthMm: 0.2 })}
        />

        <LengthCote
          from={g.dPointA}
          to={g.dPointB}
          offsetMm={-DEFAULT_COTE_OFFSET_MM}
          label={formatCoteLength(g.chordMm)}
          sizing={suggestDimensionSizing()}
        />
        <LengthCote
          from={g.dPointM}
          to={g.dPointD}
          offsetMm={-DEFAULT_COTE_OFFSET_MM}
          label={formatCoteLength(g.sagittaMm)}
          sizing={suggestDimensionSizing()}
        />
        {showCursorAnnotations && (
          <>
            <LengthCote
              from={g.dPointA}
              to={g.dCursorE}
              offsetMm={-SUB_COTE_OFFSET_MM}
              label={formatCoteLength(clampedCursorAeMm)}
              sizing={suggestDimensionSizing()}
            />
            <LengthCote
              from={g.dCursorE}
              to={g.dPointB}
              offsetMm={-SUB_COTE_OFFSET_MM}
              label={formatCoteLength(g.chordMm - clampedCursorAeMm)}
              sizing={suggestDimensionSizing()}
            />
          </>
        )}

        <PointLabel point={g.dPointA} label="A" directionRad={LABEL_LEFT_RAD} />
        <PointLabel point={g.dPointB} label="B" directionRad={LABEL_RIGHT_RAD} />
        <PointLabel point={g.dPointM} label="M" directionRad={LABEL_UP_LEFT_RAD} />
        <PointLabel point={g.dPointD} label="D" directionRad={LABEL_DOWN_LEFT_RAD} />

        <RadiusCote
          center={g.dCenter}
          pointOnArc={g.dRadiusAnchor}
          label={`R${formatCoteLength(g.radiusMm)}`}
          sizing={suggestDimensionSizing()}
        />
        {resultData?.table && (
          <ArcLengthCote
            center={g.dCenter}
            radiusMm={g.dRadius}
            startAngleRad={g.angleAtB}
            endAngleRad={g.angleAtA}
            offsetMm={DEFAULT_COTE_OFFSET_MM}
            label={formatCoteLength(g.totalArcLengthMm)}
            sizing={suggestDimensionSizing()}
          />
        )}

        {g.angleCote && (
          <>
            {g.angleCote.mode === 'tangent' && (
              <>
                <line
                  x1={g.angleCote.center.x}
                  y1={g.angleCote.center.y}
                  x2={g.dPointA.x}
                  y2={g.dPointA.y}
                  {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#999999', widthMm: 0.2 })}
                />
                <line
                  x1={g.angleCote.center.x}
                  y1={g.angleCote.center.y}
                  x2={g.dPointB.x}
                  y2={g.dPointB.y}
                  {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#999999', widthMm: 0.2 })}
                />
                <PointLabel point={g.angleCote.center} label="S" directionRad={LABEL_DOWN_RIGHT_RAD} />
              </>
            )}
            <AngleCote
              center={g.angleCote.center}
              radiusMm={g.angleCote.radiusMm}
              startAngleRad={g.angleCote.startAngleRad}
              endAngleRad={g.angleCote.endAngleRad}
              label={`${formatNumber(g.centralAngleDeg, decimals)}°`}
              sizing={suggestDimensionSizing()}
            />
          </>
        )}

        {showCursorAnnotations && cursorOffsetMm !== undefined && (
          <>
            <line
              x1={g.dCursorE.x}
              y1={g.dCursorE.y}
              x2={g.dCursorF.x}
              y2={g.dCursorF.y}
              {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#333333', widthMm: 0.3 })}
            />
            <circle cx={g.dCursorE.x} cy={g.dCursorE.y} r={CURSOR_MARKER_RADIUS_MM} fill="#333333" />
            <circle cx={g.dCursorF.x} cy={g.dCursorF.y} r={CURSOR_MARKER_RADIUS_MM} fill="#b3261e" />
            <LevelCote
              point={g.dCursorF}
              label={`EF = ${formatCoteLength(cursorOffsetMm)}`}
              sizing={suggestDimensionSizing()}
            />
          </>
        )}

        <ScaleBar
          resolved={g.resolvedScale}
          x={0}
          y={g.drawingHeight + BOTTOM_GAP_MM}
          unitCaption={tCommon('drawing.cotesInUnit', { unit: 'mm' })}
        />
      </svg>
    );
  }

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-toolbar">
        <label className="rt-field rt-field--inline">
          <span>{t('form.decimals')}</span>
          <NumberInput value={decimals} onChange={handleDecimalsChange} />
        </label>
      </div>

      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('mode.label')}</span>
          <select
            className="rt-select"
            value={inputMode}
            onChange={(event) => setInputMode(event.target.value as ArcInputMode)}
          >
            <option value="chordSagitta">{t('mode.chordSagitta')}</option>
            <option value="radiusChord">{t('mode.radiusChord')}</option>
            <option value="radiusAngle">{t('mode.radiusAngle')}</option>
            <option value="tangentAngle">{t('mode.tangentAngle')}</option>
            <option value="tangentChord">{t('mode.tangentChord')}</option>
          </select>
        </label>
        {inputMode === 'chordSagitta' && (
          <>
            <label className="rt-field">
              <span>{t('form.chord')}</span>
              <NumberInput value={chordMm} onChange={setChordMm} />
            </label>
            <label className="rt-field">
              <span>{t('form.sagitta')}</span>
              <NumberInput value={sagittaMm} onChange={setSagittaMm} />
            </label>
          </>
        )}
        {inputMode === 'radiusChord' && (
          <>
            <label className="rt-field">
              <span>{t('form.chord')}</span>
              <NumberInput value={chordMm} onChange={setChordMm} />
            </label>
            <label className="rt-field">
              <span>{t('form.radius')}</span>
              <NumberInput value={radiusMm} onChange={setRadiusMm} />
            </label>
          </>
        )}
        {inputMode === 'radiusAngle' && (
          <>
            <label className="rt-field">
              <span>{t('form.radius')}</span>
              <NumberInput value={radiusMm} onChange={setRadiusMm} />
            </label>
            <label className="rt-field">
              <span>{t('form.centralAngle')}</span>
              <NumberInput value={centralAngleDeg} onChange={setCentralAngleDeg} />
            </label>
          </>
        )}
        {inputMode === 'tangentAngle' && (
          <>
            <label className="rt-field">
              <span>{t('form.tangent')}</span>
              <NumberInput value={tangentMm} onChange={setTangentMm} />
            </label>
            <label className="rt-field">
              <span>{t('form.centralAngle')}</span>
              <NumberInput value={centralAngleDeg} onChange={setCentralAngleDeg} />
            </label>
          </>
        )}
        {inputMode === 'tangentChord' && (
          <>
            <label className="rt-field">
              <span>{t('form.tangent')}</span>
              <NumberInput value={tangentMm} onChange={setTangentMm} />
            </label>
            <label className="rt-field">
              <span>{t('form.chord')}</span>
              <NumberInput value={chordMm} onChange={setChordMm} />
            </label>
          </>
        )}
        {activeProjectId && (
          <button type="button" className="rt-button" onClick={() => void handleSave()}>
            {tCommon('actions.save')}
          </button>
        )}
      </div>

      {inputError && <p className="rt-error">{t(`errors.${inputError}`)}</p>}

      {geometryInputs && centralAngleRad !== undefined && (
        <table>
          <caption>{t('summary.title')}</caption>
          <thead>
            <tr>
              <th>{t('summary.designation')}</th>
              <th>{t('summary.value')}</th>
            </tr>
          </thead>
          <tbody>
            {characteristicsRows.map((row) => (
              <tr key={row.labelKey}>
                <td>{t(`summary.${row.labelKey}`)}</td>
                <td style={row.given ? { fontWeight: 700 } : undefined}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {geometryInputs && (
        <div className="rt-toolbar">
          <label className="rt-field rt-field--inline">
            <span>{t('form.cursorPosition')}</span>
            <NumberInput value={clampedCursorAeMm} onChange={handleCursorChange} />
          </label>
          {cursorOffsetMm !== undefined && (
            <p style={{ margin: 0, color: 'var(--rt-color-text-muted)' }}>
              {t('result.cursorOffset', { value: formatNumber(cursorOffsetMm, decimals) })}
            </p>
          )}
        </div>
      )}

      {drawing && (
        <>
          <div className="rt-check-group">
            <DrawingScaleSelector
              value={drawingScale}
              onChange={handleDrawingScaleChange}
              className="rt-field rt-field--inline"
            />
            <label className="rt-field rt-field--check">
              <span>{t('form.showCentralAngleCote')}</span>
              <input
                type="checkbox"
                checked={showCentralAngleCote}
                onChange={(event) => setShowCentralAngleCote(event.target.checked)}
              />
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

          {resultData && (
            <ExportButtons
              filenameBase={`arc-c${Math.round(drawing.chordMm)}-r${Math.round(drawing.radiusMm)}`}
              resultData={resultData}
              getSvgElement={() => svgRef.current}
              projectName={activeProjectName}
            />
          )}

          <div className="rt-toolbar">
            <label className="rt-field rt-field--inline">
              <span>{t('form.intervals')}</span>
              <NumberInput value={intervals} onChange={handleIntervalsChange} />
            </label>
            {anglePerIntervalDeg !== undefined && (
              <p style={{ margin: 0, color: 'var(--rt-color-text-muted)' }}>
                {t('result.anglePerInterval', { value: formatNumber(anglePerIntervalDeg, decimals) })}
              </p>
            )}
          </div>

          <div className="rt-check-group">
            <label className="rt-field rt-field--check">
              <span>{t('form.showArcLength')}</span>
              <input
                type="checkbox"
                checked={showArcLength}
                onChange={(event) => setShowArcLength(event.target.checked)}
              />
            </label>
            <label className="rt-field rt-field--check">
              <span>{t('form.showAngleCumul')}</span>
              <input
                type="checkbox"
                checked={showAngleCumul}
                onChange={(event) => setShowAngleCumul(event.target.checked)}
              />
            </label>
          </div>

          {resultData?.table && (
            <table>
              <caption>{t('table.title')}</caption>
              <thead>
                <tr>
                  {resultData.table.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultData.table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <ProjectManager<ArcProjectData>
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
