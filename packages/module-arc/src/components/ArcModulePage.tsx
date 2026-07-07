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
  ProjectManager,
  RadiusCote,
  ResultPageLayout,
  ScaleBar,
  getPreferredDrawingScale,
  lineStyleToSvgProps,
  modelToDrawing,
  pointOnCircle,
  resolveDrawingScale,
  suggestDimensionSizing,
  updateProject,
  type DrawingScale,
  type Point,
  type Project,
  type ResultData,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import {
  computeImplantation,
  localOffset,
  radiusFromChordSagitta,
  sagittaFromRadiusChord,
} from '../math/arc';
import type { ArcInputMode, ArcProjectData } from '../types';

const MODULE_ID = 'arc';

const DEFAULT_CHORD_MM = 1000;
const DEFAULT_SAGITTA_MM = 50;
const DEFAULT_RADIUS_MM = 2500;
const DEFAULT_INTERVALS = 10;
const DEFAULT_DECIMALS = 3;
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

/** Longueur/rayon affichés sur le dessin : précision fixe, indépendante des décimales du tableau. */
function formatCoteLength(mm: number): string {
  return formatFixed(mm, 1);
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
  const [cursorAeMm, setCursorAeMm] = useState(DEFAULT_CHORD_MM / 2);
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

  const effectiveRadiusMm =
    inputMode === 'chordSagitta' ? (primaryResult.ok ? primaryResult.value : undefined) : radiusMm;
  const effectiveSagittaMm =
    inputMode === 'chordSagitta' ? sagittaMm : primaryResult.ok ? primaryResult.value : undefined;

  const tableResult = primaryResult.ok
    ? computeImplantation(effectiveRadiusMm as number, chordMm, intervals)
    : undefined;

  const clampedCursorAeMm = clamp(cursorAeMm, 0, chordMm);
  const cursorOffsetMm = primaryResult.ok
    ? localOffset(clampedCursorAeMm, effectiveRadiusMm as number, chordMm, effectiveSagittaMm as number)
    : undefined;

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
    return { inputMode, chordMm, sagittaMm, radiusMm, intervals, decimals, showArcLength, drawingScale };
  }

  function handleOpen(project: Project<ArcProjectData>) {
    setInputMode(project.data.inputMode);
    setChordMm(project.data.chordMm);
    setSagittaMm(project.data.sagittaMm);
    setRadiusMm(project.data.radiusMm);
    setIntervals(project.data.intervals);
    setDecimals(project.data.decimals);
    setShowArcLength(project.data.showArcLength);
    setDrawingScale(project.data.drawingScale);
    setCursorAeMm(project.data.chordMm / 2);
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<ArcProjectData>(MODULE_ID, activeProjectId, createDefaultData());
  }

  // --- Géométrie du dessin (mm modèle réduit), calculée uniquement si la config est valide. ---
  const radiusMmValue = effectiveRadiusMm as number;
  const sagittaMmValue = effectiveSagittaMm as number;
  const alphaRad = tableResult?.ok ? tableResult.value.alphaRad : 0;
  const angleAtA = Math.PI / 2 + alphaRad;
  const angleAtB = Math.PI / 2 - alphaRad;
  const angleAtD = Math.PI / 2;
  const arcCenterModel: Point = { x: chordMm / 2, y: -(radiusMmValue - sagittaMmValue) };

  const geometryPoints: Point[] = tableResult?.ok
    ? tableResult.value.points.map((p) => ({ x: p.aeMm, y: p.efMm }))
    : [{ x: 0, y: 0 }];
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
  const resolvedScale = resolveDrawingScale(effectiveDrawingScale, {
    width: modelWidth,
    height: modelHeight,
  });

  function toDrawing(p: Point): Point {
    return {
      x: modelToDrawing(p.x - modelMinX, resolvedScale),
      y: modelToDrawing(p.y - modelMinY, resolvedScale),
    };
  }

  const dCenter = toDrawing(arcCenterModel);
  const dRadius = modelToDrawing(radiusMmValue, resolvedScale);
  const dPointA = toDrawing(pointOnCircle(arcCenterModel, radiusMmValue, angleAtA));
  const dPointB = toDrawing(pointOnCircle(arcCenterModel, radiusMmValue, angleAtB));
  const dPointC = toDrawing({ x: chordMm / 2, y: 0 });
  const dPointD = toDrawing(pointOnCircle(arcCenterModel, radiusMmValue, angleAtD));
  // Ancre la cote de rayon décalée vers B (pas au sommet D) : évite qu'elle ne se
  // superpose au libellé de la cote de corde, centré lui aussi sur le milieu (x=c/2).
  const radiusCoteAngle = angleAtD + (angleAtB - angleAtD) * RADIUS_COTE_ANGLE_FRACTION;
  const dRadiusAnchor = toDrawing(pointOnCircle(arcCenterModel, radiusMmValue, radiusCoteAngle));
  const drawingWidth = modelToDrawing(modelWidth, resolvedScale);
  const drawingHeight = modelToDrawing(modelHeight, resolvedScale);

  const dCursorE = toDrawing({ x: clampedCursorAeMm, y: 0 });
  const dCursorF = toDrawing({ x: clampedCursorAeMm, y: cursorOffsetMm ?? 0 });

  const sizing = suggestDimensionSizing();
  const pathD = `M ${dPointA.x} ${dPointA.y} A ${dRadius} ${dRadius} 0 0 0 ${dPointB.x} ${dPointB.y}`;
  const cursorLineProps = lineStyleToSvgProps({ kind: 'dashedShort', color: '#333333', widthMm: 0.3 });

  const viewBoxMinX = -LEFT_MARGIN_MM;
  const viewBoxMinY = -TOP_MARGIN_MM;
  const viewBoxWidth = drawingWidth + LEFT_MARGIN_MM + RIGHT_MARGIN_MM;
  const viewBoxHeight = drawingHeight + TOP_MARGIN_MM + BOTTOM_GAP_MM + SCALE_BAR_EXTRA_MM;

  const resultData: ResultData = {
    title: t('title'),
    drawingAlt: t('title'),
    description: t('export.summary', {
      chord: formatCoteLength(chordMm),
      sagitta: formatCoteLength(sagittaMmValue),
      radius: formatCoteLength(radiusMmValue),
      arcLength: tableResult?.ok ? formatCoteLength(tableResult.value.totalArcLengthMm) : '—',
      intervals,
    }),
    table: tableResult?.ok
      ? {
          headers: [
            t('table.index'),
            t('table.ae'),
            t('table.eb'),
            t('table.ef'),
            ...(showArcLength ? [t('table.arcLength')] : []),
          ],
          rows: tableResult.value.points.map((point) => [
            point.index,
            formatNumber(point.aeMm, decimals),
            formatNumber(point.ebMm, decimals),
            formatNumber(point.efMm, decimals),
            ...(showArcLength ? [formatNumber(point.arcLengthMm, decimals)] : []),
          ]),
        }
      : undefined,
  };

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
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

      {primaryResult.ok && (
        <>
          <p>
            {inputMode === 'chordSagitta'
              ? t('result.radius', { value: formatNumber(effectiveRadiusMm as number, decimals) })
              : t('result.sagitta', { value: formatNumber(effectiveSagittaMm as number, decimals) })}
          </p>

          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('form.intervals')}</span>
              <NumberInput value={intervals} onChange={handleIntervalsChange} />
            </label>
            <label className="rt-field">
              <span>{t('form.decimals')}</span>
              <NumberInput value={decimals} onChange={handleDecimalsChange} />
            </label>
            <label className="rt-field">
              <span>{t('form.showArcLength')}</span>
              <input
                type="checkbox"
                checked={showArcLength}
                onChange={(event) => setShowArcLength(event.target.checked)}
              />
            </label>
          </div>

          <div className="rt-toolbar">
            <label className="rt-field">
              <span>{t('form.cursorPosition')}</span>
              <NumberInput value={clampedCursorAeMm} onChange={handleCursorChange} />
            </label>
            {cursorOffsetMm !== undefined && (
              <p>{t('result.cursorOffset', { value: formatNumber(cursorOffsetMm, decimals) })}</p>
            )}
          </div>

          {tableResult?.ok && (
            <table>
              <caption>{t('table.title')}</caption>
              <thead>
                <tr>
                  <th>{t('table.index')}</th>
                  <th>{t('table.ae')}</th>
                  <th>{t('table.eb')}</th>
                  <th>{t('table.ef')}</th>
                  {showArcLength && <th>{t('table.arcLength')}</th>}
                </tr>
              </thead>
              <tbody>
                {tableResult.value.points.map((point) => (
                  <tr key={point.index}>
                    <td>{point.index}</td>
                    <td>{formatNumber(point.aeMm, decimals)}</td>
                    <td>{formatNumber(point.ebMm, decimals)}</td>
                    <td>{formatNumber(point.efMm, decimals)}</td>
                    {showArcLength && <td>{formatNumber(point.arcLengthMm, decimals)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="rt-toolbar">
            <DrawingScaleSelector value={drawingScale} onChange={handleDrawingScaleChange} />
          </div>

          <svg
            ref={svgRef}
            viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`}
            width="100%"
            style={{ maxWidth: 640, height: 'auto', background: 'transparent' }}
          >
            <path d={pathD} stroke="#1f5f8b" strokeWidth={RAIL_STROKE_WIDTH_MM} strokeLinecap="round" fill="none" />

            <LengthCote
              from={dPointA}
              to={dPointB}
              offsetMm={-DEFAULT_COTE_OFFSET_MM}
              label={formatCoteLength(chordMm)}
              sizing={sizing}
            />
            <LengthCote
              from={dPointC}
              to={dPointD}
              offsetMm={-DEFAULT_COTE_OFFSET_MM}
              label={formatCoteLength(sagittaMmValue)}
              sizing={sizing}
            />
            <RadiusCote
              center={dCenter}
              pointOnArc={dRadiusAnchor}
              label={`R${formatCoteLength(radiusMmValue)}`}
              sizing={sizing}
            />
            {tableResult?.ok && (
              <ArcLengthCote
                center={dCenter}
                radiusMm={dRadius}
                startAngleRad={angleAtB}
                endAngleRad={angleAtA}
                offsetMm={DEFAULT_COTE_OFFSET_MM}
                label={formatCoteLength(tableResult.value.totalArcLengthMm)}
                sizing={sizing}
              />
            )}

            {cursorOffsetMm !== undefined && (
              <>
                <line
                  x1={dCursorE.x}
                  y1={dCursorE.y}
                  x2={dCursorF.x}
                  y2={dCursorF.y}
                  {...cursorLineProps}
                />
                <circle cx={dCursorE.x} cy={dCursorE.y} r={CURSOR_MARKER_RADIUS_MM} fill="#333333" />
                <circle cx={dCursorF.x} cy={dCursorF.y} r={CURSOR_MARKER_RADIUS_MM} fill="#b3261e" />
                <LevelCote
                  point={dCursorF}
                  label={`EF = ${formatCoteLength(cursorOffsetMm)}`}
                  sizing={sizing}
                />
              </>
            )}

            <ScaleBar
              resolved={resolvedScale}
              x={0}
              y={drawingHeight + BOTTOM_GAP_MM}
              unitCaption={tCommon('drawing.cotesInUnit', { unit: 'mm' })}
            />
          </svg>

          <ExportButtons
            filenameBase={`arc-c${Math.round(chordMm)}-r${Math.round(radiusMmValue)}`}
            resultData={resultData}
            getSvgElement={() => svgRef.current}
            projectName={activeProjectName}
          />
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
