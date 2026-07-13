'use client';

import { useMemo, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import {
  DrawingLightbox,
  DrawingScaleSelector,
  ScaleBar,
  lineStyleToSvgProps,
  modelToDrawing,
  resolveDrawingScale,
  type DrawingScale,
  type Point,
} from '@railtools/commun';
import type { CalcStepMm, TrackSegment, VehicleSpec } from '../types';
import {
  localPointToWorld,
  vehicleContourLocalPoints,
  vehicleFramePoints,
  type LocalPoint,
  type VehiclePose,
} from '../math/vehicle';
import { computeTrackSamples, maxSRear, pointOnTrackAtS, poseAtSRear, trackLength, type TrackPose } from '../math/track';

const COLORS: Record<'AVG' | 'AVD' | 'MG' | 'MD' | 'ARG' | 'ARD', string> = {
  AVG: '#e53935',
  AVD: '#f48fb1',
  MG: '#fb8c00',
  MD: '#fdd835',
  ARG: '#64b5f6',
  ARD: '#26c6da',
};
const ENVELOPE_KEYS = ['AVG', 'AVD', 'MG', 'MD', 'ARG', 'ARD'] as const;

/** Cible du mode "fit", en mm de dessin — proche d'une page A4 utile pour rester raisonnable en export PDF/PNG. */
const FIT_TARGET_MM = { width: 260, height: 180 };
const SCALE_BAR_Y_GAP_MM = 8;
const SCALE_BAR_BOTTOM_SPACE_MM = 14;
const LEGEND_GAP_MM = 4;
const LEGEND_ROW_HEIGHT_MM = 5;
const LEGEND_ITEM_SPACING_MM = 20;
const LEGEND_SWATCH_LENGTH_MM = 6;
const LEGEND_FONT_SIZE_MM = 3;

function vehiclePoseFromTrack(pose: TrackPose): VehiclePose {
  return {
    center: { x: (pose.rear.x + pose.front.x) / 2, y: (pose.rear.y + pose.front.y) / 2 },
    thetaRad: pose.thetaRad,
  };
}

/** Transforme une paire de points locaux (repère caisse) en une paire de points monde, pour tracer un segment. */
function localSegmentToWorld(a: LocalPoint, b: LocalPoint, pose: VehiclePose): [Point, Point] {
  return [localPointToWorld(a, pose), localPointToWorld(b, pose)];
}

export interface DrawingViewProps {
  vehicle: VehicleSpec;
  ltaperMm: number;
  track: TrackSegment[];
  calcStepMm: CalcStepMm;
  sRearMm: number;
  marginMm: number;
  drawingScale: DrawingScale;
  onDrawingScaleChange: (value: DrawingScale) => void;
  svgRef?: Ref<SVGSVGElement>;
}

export function DrawingView({
  vehicle,
  ltaperMm,
  track,
  calcStepMm,
  sRearMm,
  marginMm,
  drawingScale,
  onDrawingScaleChange,
  svgRef,
}: DrawingViewProps) {
  const t = useTranslations('moduleEmpriseLaterale');
  const tCommon = useTranslations('common');

  const geometry = useMemo(() => {
    const totalLengthMm = trackLength(track);
    const sRearMax = maxSRear(totalLengthMm, vehicle.empattementMm);
    const clampedSRearMm = Math.min(Math.max(sRearMm, 0), sRearMax);

    const axisPoints: Point[] = [];
    for (let s = 0; s <= totalLengthMm + 1e-9; s += calcStepMm) {
      axisPoints.push(pointOnTrackAtS(track, Math.min(s, totalLengthMm)).point);
    }

    const poses = computeTrackSamples(track, vehicle.empattementMm, calcStepMm);
    const envelopePoints: Record<(typeof ENVELOPE_KEYS)[number], Point[]> = {
      AVG: [],
      AVD: [],
      MG: [],
      MD: [],
      ARG: [],
      ARD: [],
    };
    for (const pose of poses) {
      const frame = vehicleFramePoints(vehicle, vehiclePoseFromTrack(pose));
      for (const key of ENVELOPE_KEYS) envelopePoints[key].push(frame[key]);
    }

    const currentPose = poseAtSRear(track, clampedSRearMm, vehicle.empattementMm);
    const currentVehiclePose = vehiclePoseFromTrack(currentPose);
    const silhouettePoints = vehicleContourLocalPoints(vehicle, ltaperMm).map((local) =>
      localPointToWorld(local, currentVehiclePose),
    );

    const halfL = vehicle.longueurCaisseMm / 2;
    const halfWmax = vehicle.largeurCaisseMaxMm / 2;
    const halfWheelbase = vehicle.empattementMm / 2;
    const [longAxisA, longAxisB] = localSegmentToWorld({ along: -halfL, lat: 0 }, { along: halfL, lat: 0 }, currentVehiclePose);
    const [centerCrossA, centerCrossB] = localSegmentToWorld(
      { along: 0, lat: -halfWmax },
      { along: 0, lat: halfWmax },
      currentVehiclePose,
    );
    const [rearAxleA, rearAxleB] = localSegmentToWorld(
      { along: -halfWheelbase, lat: -halfWmax },
      { along: -halfWheelbase, lat: halfWmax },
      currentVehiclePose,
    );
    const [frontAxleA, frontAxleB] = localSegmentToWorld(
      { along: halfWheelbase, lat: -halfWmax },
      { along: halfWheelbase, lat: halfWmax },
      currentVehiclePose,
    );

    const allPoints: Point[] = [...axisPoints, ...Object.values(envelopePoints).flat(), ...silhouettePoints];
    const rawMinX = Math.min(...allPoints.map((p) => p.x));
    const rawMaxX = Math.max(...allPoints.map((p) => p.x));
    const rawMinY = Math.min(...allPoints.map((p) => p.y));
    const rawMaxY = Math.max(...allPoints.map((p) => p.y));
    const modelMinX = rawMinX - marginMm;
    const modelMaxX = rawMaxX + marginMm;
    const modelMinY = rawMinY - marginMm;
    const modelMaxY = rawMaxY + marginMm;
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
        // Flip vertically: SVG y grows downward, model y grows "left" (positive lateral).
        y: modelToDrawing(modelMaxY - p.y, resolvedScale),
      };
    }

    const drawingWidth = modelToDrawing(modelWidth, resolvedScale);
    const drawingHeight = modelToDrawing(modelHeight, resolvedScale);
    const legendY = drawingHeight + SCALE_BAR_Y_GAP_MM + SCALE_BAR_BOTTOM_SPACE_MM + LEGEND_GAP_MM + LEGEND_ROW_HEIGHT_MM / 2;

    return {
      dAxisPoints: axisPoints.map(toDrawing),
      dEnvelope: Object.fromEntries(
        ENVELOPE_KEYS.map((key) => [key, envelopePoints[key].map(toDrawing)]),
      ) as Record<(typeof ENVELOPE_KEYS)[number], Point[]>,
      dSilhouette: silhouettePoints.map(toDrawing),
      dLongAxis: [toDrawing(longAxisA), toDrawing(longAxisB)] as [Point, Point],
      dCenterCross: [toDrawing(centerCrossA), toDrawing(centerCrossB)] as [Point, Point],
      dRearAxle: [toDrawing(rearAxleA), toDrawing(rearAxleB)] as [Point, Point],
      dFrontAxle: [toDrawing(frontAxleA), toDrawing(frontAxleB)] as [Point, Point],
      resolvedScale,
      drawingWidth,
      drawingHeight,
      legendY,
      viewBox: {
        width: drawingWidth,
        height: drawingHeight + SCALE_BAR_Y_GAP_MM + SCALE_BAR_BOTTOM_SPACE_MM + LEGEND_GAP_MM + LEGEND_ROW_HEIGHT_MM,
      },
      sRearMax,
    };
  }, [vehicle, ltaperMm, track, calcStepMm, sRearMm, marginMm, drawingScale]);

  function renderSvg(ref?: Ref<SVGSVGElement>) {
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${geometry.viewBox.width} ${geometry.viewBox.height}`}
        width="100%"
        style={{ maxWidth: 720, height: 'auto', background: 'transparent' }}
      >
        <polyline
          points={geometry.dAxisPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#1f5f8b"
          strokeWidth={1.2}
        />
        {ENVELOPE_KEYS.map((key) => (
          <polyline
            key={key}
            points={geometry.dEnvelope[key].map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={COLORS[key]}
            strokeWidth={0.8}
          />
        ))}
        <polygon
          points={geometry.dSilhouette.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(31,95,139,0.15)"
          stroke="#1f5f8b"
          strokeWidth={1}
        />
        {/* Axe longitudinal de la caisse, de bout en bout. */}
        <line
          x1={geometry.dLongAxis[0].x}
          y1={geometry.dLongAxis[0].y}
          x2={geometry.dLongAxis[1].x}
          y2={geometry.dLongAxis[1].y}
          {...lineStyleToSvgProps({ kind: 'centerline', color: '#555555', widthMm: 0.3 })}
        />
        {/* Trait transversal au centre longitudinal (MG-MD). */}
        <line
          x1={geometry.dCenterCross[0].x}
          y1={geometry.dCenterCross[0].y}
          x2={geometry.dCenterCross[1].x}
          y2={geometry.dCenterCross[1].y}
          {...lineStyleToSvgProps({ kind: 'dashedShort', color: '#555555', widthMm: 0.3 })}
        />
        {/* Essieux/bogies : traits transversaux fins à l'arrière et à l'avant. */}
        <line
          x1={geometry.dRearAxle[0].x}
          y1={geometry.dRearAxle[0].y}
          x2={geometry.dRearAxle[1].x}
          y2={geometry.dRearAxle[1].y}
          stroke="#333333"
          strokeWidth={0.5}
        />
        <line
          x1={geometry.dFrontAxle[0].x}
          y1={geometry.dFrontAxle[0].y}
          x2={geometry.dFrontAxle[1].x}
          y2={geometry.dFrontAxle[1].y}
          stroke="#333333"
          strokeWidth={0.5}
        />
        <ScaleBar
          resolved={geometry.resolvedScale}
          x={0}
          y={geometry.drawingHeight + SCALE_BAR_Y_GAP_MM}
          unitCaption={tCommon('drawing.cotesInUnit', { unit: 'mm' })}
        />
        {ENVELOPE_KEYS.map((key, index) => {
          const x = index * LEGEND_ITEM_SPACING_MM;
          return (
            <g key={key}>
              <line
                x1={x}
                y1={geometry.legendY}
                x2={x + LEGEND_SWATCH_LENGTH_MM}
                y2={geometry.legendY}
                stroke={COLORS[key]}
                strokeWidth={1.4}
              />
              <text
                x={x + LEGEND_SWATCH_LENGTH_MM + 1.5}
                y={geometry.legendY}
                fontSize={LEGEND_FONT_SIZE_MM}
                fill="#1a1a1a"
                fontFamily="Arial, Helvetica, sans-serif"
                dominantBaseline="middle"
              >
                {key}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div className="rt-section">
      <h3 className="rt-section-title">{t('drawing.title')}</h3>
      <div className="rt-check-group">
        <DrawingScaleSelector value={drawingScale} onChange={onDrawingScaleChange} />
        <DrawingLightbox
          label={tCommon('drawing.enlarge')}
          closeLabel={tCommon('actions.close')}
          zoomInLabel={tCommon('drawing.zoomIn')}
          zoomOutLabel={tCommon('drawing.zoomOut')}
          resetLabel={tCommon('drawing.resetZoom')}
        >
          {renderSvg()}
        </DrawingLightbox>
      </div>
      {renderSvg(svgRef)}
    </div>
  );
}
