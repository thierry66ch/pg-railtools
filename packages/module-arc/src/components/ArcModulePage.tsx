'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArcLengthCote,
  DEFAULT_COTE_OFFSET_MM,
  DEFAULT_DRAWING_SCALE,
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
import { computeImplantation, localOffset, radiusFromChordSagitta, sagittaFromRadiusChord } from '../math/arc';
import type { ArcInputMode, ArcProjectData } from '../types';

const MODULE_ID = 'arc';

const DEFAULT_CHORD_MM = 1000;
const DEFAULT_SAGITTA_MM = 50;
const DEFAULT_RADIUS_MM = 2500;
const DEFAULT_INTERVALS = 10;
const DEFAULT_DECIMALS = 1;
const MIN_INTERVALS = 2;
const MAX_DECIMALS = 6;

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
 * textSizeMm*0.4+1 + textSizeMm ≈ 5.2 mm au-delà de leur propre ligne (LengthCote,
 * dominantBaseline="text-after-edge") : rester nettement en dessous de 10-5.2=4.8 pour
 * garder de la marge avant la cote totale.
 */
const SUB_COTE_OFFSET_MM = 3;
/** Directions (radians) des étiquettes A/B (horizontales, vers l'extérieur) et C/D (en diagonale, à l'écart des cotes). */
const LABEL_LEFT_RAD = Math.PI;
const LABEL_RIGHT_RAD = 0;
const LABEL_UP_LEFT_RAD = Math.PI + Math.PI / 4;
const LABEL_DOWN_LEFT_RAD = Math.PI - Math.PI / 4;

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
  dPointC: Point;
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
): DrawingGeometry {
  const angleAtA = Math.PI / 2 + alphaRad;
  const angleAtB = Math.PI / 2 - alphaRad;
  const angleAtD = Math.PI / 2;
  const arcCenterModel: Point = { x: chordMm / 2, y: -(radiusMm - sagittaMm) };

  const modelMinX = Math.min(...geometryPoints.map((p) => p.x));
  const modelMaxX = Math.max(...geometryPoints.map((p) => p.x));
  const modelMinY = Math.min(...geometryPoints.map((p) => p.y));
  const modelMaxY = Math.max(...geometryPoints.map((p) => p.y));
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
  const dPointC = toDrawing({ x: chordMm / 2, y: 0 });
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

  return {
    chordMm,
    sagittaMm,
    radiusMm,
    pathD,
    dPointA,
    dPointB,
    dPointC,
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
    viewBox: {
      minX: -LEFT_MARGIN_MM,
      minY: -TOP_MARGIN_MM,
      width: drawingWidth + LEFT_MARGIN_MM + RIGHT_MARGIN_MM,
      height: drawingHeight + TOP_MARGIN_MM + BOTTOM_GAP_MM + SCALE_BAR_EXTRA_MM,
    },
  };
}

export function ArcModulePage() {
  const t = useTranslations('moduleArc');
  const tCommon = useTranslations('common');

  const [inputMode, setInputMode] = useState<ArcInputMode>('chordSagitta');
  const [chordMm, setChordMm] = useState(DEFAULT_CHORD_MM);
  const [sagittaMm, setSagittaMm] = useState(DEFAULT_SAGITTA_MM);
  const [radiusMm, setRadiusMm] = useState(DEFAULT_RADIUS_MM);
  const [intervals, setIntervals] = useState(DEFAULT_INTERVALS);
  const [decimals, setDecimals] = useState(DEFAULT_DECIMALS);
  const [showArcLength, setShowArcLength] = useState(true);
  const [showAngleCumul, setShowAngleCumul] = useState(true);
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

  const primaryResult =
    inputMode === 'chordSagitta'
      ? radiusFromChordSagitta(chordMm, sagittaMm)
      : sagittaFromRadiusChord(radiusMm, chordMm);

  // Triplet (R, c, f) cohérent, calculé une seule fois — `undefined` tant que la config
  // est invalide, ce qui empêche structurellement (au niveau des types) tout accès à une
  // grandeur non définie plus bas (c'est cette confusion qui causait un crash réel avant).
  const geometryInputs = primaryResult.ok
    ? {
        chordMm,
        radiusMm: inputMode === 'chordSagitta' ? primaryResult.value : radiusMm,
        sagittaMm: inputMode === 'chordSagitta' ? sagittaMm : primaryResult.value,
      }
    : undefined;

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
      );

      resultData = {
        title: t('title'),
        drawingAlt: t('title'),
        summaryTable: {
          headers: [t('summary.chord'), t('summary.sagitta'), t('summary.radius'), t('summary.arcLength')],
          rows: [[formatCoteLength(c), formatCoteLength(s), formatCoteLength(r), formatCoteLength(table.totalArcLengthMm)]],
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
      intervals,
      decimals,
      showArcLength,
      showAngleCumul,
      drawingScale,
    };
  }

  function handleOpen(project: Project<ArcProjectData>) {
    setInputMode(project.data.inputMode);
    setChordMm(project.data.chordMm);
    setSagittaMm(project.data.sagittaMm);
    setRadiusMm(project.data.radiusMm);
    setIntervals(project.data.intervals);
    setDecimals(project.data.decimals);
    setShowArcLength(project.data.showArcLength);
    setShowAngleCumul(project.data.showAngleCumul);
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

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-toolbar">
        <label className="rt-field">
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
          </select>
        </label>
        <label className="rt-field">
          <span>{t('form.chord')}</span>
          <NumberInput value={chordMm} onChange={setChordMm} />
        </label>
        {inputMode === 'chordSagitta' ? (
          <label className="rt-field">
            <span>{t('form.sagitta')}</span>
            <NumberInput value={sagittaMm} onChange={setSagittaMm} />
          </label>
        ) : (
          <label className="rt-field">
            <span>{t('form.radius')}</span>
            <NumberInput value={radiusMm} onChange={setRadiusMm} />
          </label>
        )}
        {activeProjectId && (
          <button type="button" className="rt-button" onClick={() => void handleSave()}>
            {tCommon('actions.save')}
          </button>
        )}
      </div>

      {!primaryResult.ok && <p className="rt-error">{t(`errors.${primaryResult.error}`)}</p>}

      {geometryInputs && (
        <p>
          <strong>
            {inputMode === 'chordSagitta'
              ? t('result.radius', { value: formatNumber(geometryInputs.radiusMm, decimals) })
              : t('result.sagitta', { value: formatNumber(geometryInputs.sagittaMm, decimals) })}
          </strong>
        </p>
      )}

      {geometryInputs && (
        <div className="rt-toolbar">
          <label className="rt-field">
            <span>{t('form.cursorPosition')}</span>
            <NumberInput value={clampedCursorAeMm} onChange={handleCursorChange} />
          </label>
          {cursorOffsetMm !== undefined && (
            <p>{t('result.cursorOffset', { value: formatNumber(cursorOffsetMm, decimals) })}</p>
          )}
        </div>
      )}

      {drawing && (
        <>
          <div className="rt-toolbar">
            <DrawingScaleSelector value={drawingScale} onChange={handleDrawingScaleChange} />
          </div>

          <svg
            ref={svgRef}
            viewBox={`${drawing.viewBox.minX} ${drawing.viewBox.minY} ${drawing.viewBox.width} ${drawing.viewBox.height}`}
            width="100%"
            style={{ maxWidth: 640, height: 'auto', background: 'transparent' }}
          >
            <path
              d={drawing.pathD}
              stroke="#1f5f8b"
              strokeWidth={RAIL_STROKE_WIDTH_MM}
              strokeLinecap="round"
              fill="none"
            />

            {/* Lignes de construction : corde A-B et axe de la flèche C-D. */}
            <line
              x1={drawing.dPointA.x}
              y1={drawing.dPointA.y}
              x2={drawing.dPointB.x}
              y2={drawing.dPointB.y}
              {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#999999', widthMm: 0.2 })}
            />
            <line
              x1={drawing.dPointC.x}
              y1={drawing.dPointC.y}
              x2={drawing.dPointD.x}
              y2={drawing.dPointD.y}
              {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#999999', widthMm: 0.2 })}
            />

            <LengthCote
              from={drawing.dPointA}
              to={drawing.dPointB}
              offsetMm={-DEFAULT_COTE_OFFSET_MM}
              label={formatCoteLength(drawing.chordMm)}
              sizing={suggestDimensionSizing()}
            />
            <LengthCote
              from={drawing.dPointC}
              to={drawing.dPointD}
              offsetMm={-DEFAULT_COTE_OFFSET_MM}
              label={formatCoteLength(drawing.sagittaMm)}
              sizing={suggestDimensionSizing()}
            />
            {showCursorAnnotations && (
              <>
                <LengthCote
                  from={drawing.dPointA}
                  to={drawing.dCursorE}
                  offsetMm={-SUB_COTE_OFFSET_MM}
                  label={formatCoteLength(clampedCursorAeMm)}
                  sizing={suggestDimensionSizing()}
                />
                <LengthCote
                  from={drawing.dCursorE}
                  to={drawing.dPointB}
                  offsetMm={-SUB_COTE_OFFSET_MM}
                  label={formatCoteLength(drawing.chordMm - clampedCursorAeMm)}
                  sizing={suggestDimensionSizing()}
                />
              </>
            )}

            <PointLabel point={drawing.dPointA} label="A" directionRad={LABEL_LEFT_RAD} />
            <PointLabel point={drawing.dPointB} label="B" directionRad={LABEL_RIGHT_RAD} />
            <PointLabel point={drawing.dPointC} label="C" directionRad={LABEL_UP_LEFT_RAD} />
            <PointLabel point={drawing.dPointD} label="D" directionRad={LABEL_DOWN_LEFT_RAD} />

            <RadiusCote
              center={drawing.dCenter}
              pointOnArc={drawing.dRadiusAnchor}
              label={`R${formatCoteLength(drawing.radiusMm)}`}
              sizing={suggestDimensionSizing()}
            />
            {resultData?.table && (
              <ArcLengthCote
                center={drawing.dCenter}
                radiusMm={drawing.dRadius}
                startAngleRad={drawing.angleAtB}
                endAngleRad={drawing.angleAtA}
                offsetMm={DEFAULT_COTE_OFFSET_MM}
                label={formatCoteLength(drawing.totalArcLengthMm)}
                sizing={suggestDimensionSizing()}
              />
            )}

            {showCursorAnnotations && cursorOffsetMm !== undefined && (
              <>
                <line
                  x1={drawing.dCursorE.x}
                  y1={drawing.dCursorE.y}
                  x2={drawing.dCursorF.x}
                  y2={drawing.dCursorF.y}
                  {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#333333', widthMm: 0.3 })}
                />
                <circle
                  cx={drawing.dCursorE.x}
                  cy={drawing.dCursorE.y}
                  r={CURSOR_MARKER_RADIUS_MM}
                  fill="#333333"
                />
                <circle
                  cx={drawing.dCursorF.x}
                  cy={drawing.dCursorF.y}
                  r={CURSOR_MARKER_RADIUS_MM}
                  fill="#b3261e"
                />
                <LevelCote
                  point={drawing.dCursorF}
                  label={`EF = ${formatCoteLength(cursorOffsetMm)}`}
                  sizing={suggestDimensionSizing()}
                />
              </>
            )}

            <ScaleBar
              resolved={drawing.resolvedScale}
              x={0}
              y={drawing.drawingHeight + BOTTOM_GAP_MM}
              unitCaption={tCommon('drawing.cotesInUnit', { unit: 'mm' })}
            />
          </svg>

          {resultData && (
            <ExportButtons
              filenameBase={`arc-c${Math.round(drawing.chordMm)}-r${Math.round(drawing.radiusMm)}`}
              resultData={resultData}
              getSvgElement={() => svgRef.current}
              projectName={activeProjectName}
            />
          )}

          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('form.intervals')}</span>
              <NumberInput value={intervals} onChange={handleIntervalsChange} />
            </label>
            {anglePerIntervalDeg !== undefined && (
              <p>{t('result.anglePerInterval', { value: formatNumber(anglePerIntervalDeg, decimals) })}</p>
            )}
          </div>

          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('form.showArcLength')}</span>
              <input
                type="checkbox"
                checked={showArcLength}
                onChange={(event) => setShowArcLength(event.target.checked)}
              />
            </label>
            <label className="rt-field">
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
