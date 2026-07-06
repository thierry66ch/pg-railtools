'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AngleCote,
  ArcLengthCote,
  DEFAULT_COTE_OFFSET_MM,
  DEFAULT_DRAWING_SCALE,
  DEFAULT_PREFERRED_SCALE,
  DEFAULT_PREFERRED_UNIT,
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
  UnitScaleSelector,
  arcLength,
  convertLength,
  degToRad,
  getPreferredDrawingScale,
  lineStyleToSvgProps,
  modelToDrawing,
  pointOnCircle,
  realToScale,
  resolveDrawingScale,
  suggestDimensionSizing,
  updateProject,
  type DrawingScale,
  type LengthUnit,
  type Point,
  type Project,
  type ResultData,
  type ScaleKey,
} from '@railtools/commun';
import versionInfo from '../../version.json';
import type { DemoProjectData } from '../types';

const MODULE_ID = 'demo';
const DEFAULT_CURVE_RADIUS_MM = 300;
const DEFAULT_CURVE_ANGLE_DEG = 30;
/** Dimensions cible (mm) utilisées par le mode d'échelle de dessin "fit". */
const FIT_TARGET_MM = { width: 180, height: 260 };
/** Marges (mm de dessin) autour de la géométrie — la gauche est réduite au minimum pour
 * laisser le maximum de place au dessin ; les autres côtés gardent de la place pour les
 * cotes (H en haut, rayon/angle/longueur d'arc à droite et en bas). */
const LEFT_MARGIN_MM = 10;
const TOP_MARGIN_MM = 30;
const RIGHT_MARGIN_MM = 20;
const BOTTOM_GAP_MM = 30;
const SCALE_BAR_EXTRA_MM = 26;
/** Épaisseur du trait de voie, en mm de dessin — fixe, indépendante de l'échelle/taille. */
const RAIL_STROKE_WIDTH_MM = 2;

function formatMm(mm: number): string {
  return `${mm.toFixed(1)} mm`;
}

/** Valeur de cote sans unité (l'unité est indiquée une seule fois sous la barre d'échelle). */
function formatCoteLength(mm: number): string {
  return mm.toFixed(1);
}

/** Angle jusqu'à 2 décimales, sans zéro forcé (30, 30.5, 30.25...). */
function formatAngle(deg: number): string {
  return `${Number(deg.toFixed(2))}°`;
}

export function DemoModulePage() {
  const t = useTranslations('moduleDemo');
  const tCommon = useTranslations('common');

  const [realLengthValue, setRealLengthValue] = useState(1000);
  const [unit, setUnit] = useState<LengthUnit>(DEFAULT_PREFERRED_UNIT);
  const [scale, setScale] = useState<ScaleKey>(DEFAULT_PREFERRED_SCALE);
  const [curveRadiusMm, setCurveRadiusMm] = useState(DEFAULT_CURVE_RADIUS_MM);
  const [curveAngleDeg, setCurveAngleDeg] = useState(DEFAULT_CURVE_ANGLE_DEG);
  const [drawingScale, setDrawingScale] = useState<DrawingScale>(DEFAULT_DRAWING_SCALE);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!activeProjectId) {
      void getPreferredDrawingScale().then(setDrawingScale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const realLengthMm = convertLength(realLengthValue, unit, 'mm');
  const modelLengthMm = realToScale(realLengthMm, scale);
  const railHeightMm = Math.max(modelLengthMm * 0.05, 2);
  const curveAngleRad = degToRad(curveAngleDeg);
  const arcLengthMm = arcLength(curveRadiusMm, curveAngleRad);

  // --- Géométrie (mm modèle réduit) : segment droit puis arc tangent. ---
  const startPoint: Point = { x: 0, y: 0 };
  const tangentPoint: Point = { x: modelLengthMm, y: 0 };
  const arcCenter: Point = { x: modelLengthMm, y: curveRadiusMm };
  const arcStartAngleRad = -Math.PI / 2;
  const arcEndAngleRad = arcStartAngleRad + curveAngleRad;
  const arcEndPoint = pointOnCircle(arcCenter, curveRadiusMm, arcEndAngleRad);
  const arcMidPoint = pointOnCircle(arcCenter, curveRadiusMm, arcStartAngleRad + curveAngleRad / 2);

  const ARC_SAMPLES = 12;
  const arcSamplePoints: Point[] = Array.from({ length: ARC_SAMPLES + 1 }, (_, i) =>
    pointOnCircle(arcCenter, curveRadiusMm, arcStartAngleRad + (curveAngleRad * i) / ARC_SAMPLES),
  );
  const geometryPoints = [startPoint, tangentPoint, ...arcSamplePoints];
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

  const dStart = toDrawing(startPoint);
  const dTangent = toDrawing(tangentPoint);
  const dArcCenter = toDrawing(arcCenter);
  const dArcEnd = toDrawing(arcEndPoint);
  const dArcMid = toDrawing(arcMidPoint);
  const dRadius = modelToDrawing(curveRadiusMm, resolvedScale);
  const drawingWidth = modelToDrawing(modelWidth, resolvedScale);
  const drawingHeight = modelToDrawing(modelHeight, resolvedScale);

  const sizing = suggestDimensionSizing();
  // Même distance (mm de dessin) que la cote de longueur droite : au point de tangence,
  // les deux traits de cote se rejoignent exactement, sans décalage/rupture visible.
  // Cote d'angle : toujours à l'intérieur.
  const angleDimRadius = Math.max(dRadius - DEFAULT_COTE_OFFSET_MM, 1);

  const largeArcFlag = curveAngleRad > Math.PI ? 1 : 0;
  const pathD = `M ${dStart.x} ${dStart.y} L ${dTangent.x} ${dTangent.y} A ${dRadius} ${dRadius} 0 ${largeArcFlag} 1 ${dArcEnd.x} ${dArcEnd.y}`;
  const centerlineProps = lineStyleToSvgProps({ kind: 'centerline', color: '#333333', widthMm: 0.3 });

  const viewBoxMinX = -LEFT_MARGIN_MM;
  const viewBoxMinY = -TOP_MARGIN_MM;
  const viewBoxWidth = drawingWidth + LEFT_MARGIN_MM + RIGHT_MARGIN_MM;
  const viewBoxHeight = drawingHeight + TOP_MARGIN_MM + BOTTOM_GAP_MM + SCALE_BAR_EXTRA_MM;

  const resultData: ResultData = useMemo(
    () => ({
      title: t('title'),
      drawingAlt: t('title'),
      table: {
        headers: [
          t('result.realLength'),
          t('result.scale'),
          t('result.modelLength'),
          t('result.curveRadius'),
          t('result.curveAngle'),
          t('result.arcLength'),
        ],
        rows: [
          [
            formatMm(realLengthMm),
            scale,
            formatMm(modelLengthMm),
            formatMm(curveRadiusMm),
            formatAngle(curveAngleDeg),
            formatMm(arcLengthMm),
          ],
        ],
      },
    }),
    [t, realLengthMm, scale, modelLengthMm, curveRadiusMm, curveAngleDeg, arcLengthMm],
  );

  function handleOpen(project: Project<DemoProjectData>) {
    setRealLengthValue(project.data.realLengthMm);
    setUnit('mm');
    setScale(project.data.scale);
    setCurveRadiusMm(project.data.curveRadiusMm);
    setCurveAngleDeg(project.data.curveAngleDeg);
    setDrawingScale(project.data.drawingScale);
    setActiveProjectId(project.id);
    setActiveProjectName(project.name);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    await updateProject<DemoProjectData>(MODULE_ID, activeProjectId, {
      realLengthMm,
      scale,
      curveRadiusMm,
      curveAngleDeg,
      drawingScale,
    });
  }

  function handleDrawingScaleChange(next: DrawingScale) {
    setDrawingScale(
      next.mode === 'fit' && !next.fitTargetMm ? { ...next, fitTargetMm: FIT_TARGET_MM } : next,
    );
  }

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <div className="rt-toolbar">
        <label className="rt-field">
          <span>{t('form.realLength')}</span>
          <NumberInput value={realLengthValue} onChange={setRealLengthValue} />
        </label>
        <label className="rt-field">
          <span>{t('form.curveRadius')}</span>
          <NumberInput value={curveRadiusMm} onChange={setCurveRadiusMm} />
        </label>
        <label className="rt-field">
          <span>{t('form.curveAngle')}</span>
          <NumberInput value={curveAngleDeg} onChange={setCurveAngleDeg} />
        </label>
        <UnitScaleSelector
          onChange={({ unit: nextUnit, scale: nextScale }) => {
            setUnit(nextUnit);
            setScale(nextScale);
          }}
        />
        <DrawingScaleSelector value={drawingScale} onChange={handleDrawingScaleChange} />
        {activeProjectId && (
          <button type="button" className="rt-button" onClick={() => void handleSave()}>
            {tCommon('actions.save')}
          </button>
        )}
      </div>

      <table>
        <thead>
          <tr>
            {resultData.table?.headers.map((header) => <th key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {resultData.table?.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <svg
        ref={svgRef}
        viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        style={{ maxWidth: 640, height: 'auto', background: 'transparent' }}
      >
        <path
          d={pathD}
          stroke="#1f5f8b"
          strokeWidth={RAIL_STROKE_WIDTH_MM}
          strokeLinecap="round"
          fill="none"
        />
        <path d={pathD} {...centerlineProps} fill="none" />

        <LengthCote
          from={dStart}
          to={dTangent}
          offsetMm={-DEFAULT_COTE_OFFSET_MM}
          label={formatCoteLength(modelLengthMm)}
          sizing={sizing}
        />
        <RadiusCote
          center={dArcCenter}
          pointOnArc={dArcMid}
          label={`R${curveRadiusMm.toFixed(0)}`}
          sizing={sizing}
        />
        <ArcLengthCote
          center={dArcCenter}
          radiusMm={dRadius}
          startAngleRad={arcStartAngleRad}
          endAngleRad={arcEndAngleRad}
          label={formatCoteLength(arcLengthMm)}
          sizing={sizing}
        />
        <AngleCote
          center={dArcCenter}
          radiusMm={angleDimRadius}
          startAngleRad={arcStartAngleRad}
          endAngleRad={arcEndAngleRad}
          label={formatAngle(curveAngleDeg)}
          sizing={sizing}
        />
        <LevelCote point={dStart} label={`H = ${formatCoteLength(railHeightMm)}`} sizing={sizing} />

        <ScaleBar
          resolved={resolvedScale}
          x={0}
          y={drawingHeight + BOTTOM_GAP_MM}
          unitCaption={tCommon('drawing.cotesInUnit', { unit: 'mm' })}
        />
      </svg>

      <ExportButtons
        filenameBase={`demo-rail-${scale}`}
        resultData={resultData}
        getSvgElement={() => svgRef.current}
        projectName={activeProjectName}
      />

      <ProjectManager<DemoProjectData>
        moduleId={MODULE_ID}
        activeProjectId={activeProjectId}
        createDefaultData={() => ({
          realLengthMm,
          scale,
          curveRadiusMm,
          curveAngleDeg,
          drawingScale,
        })}
        onOpen={handleOpen}
      />

      <EnvironmentTransfer moduleId={MODULE_ID} />
    </ResultPageLayout>
  );
}
