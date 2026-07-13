'use client';

import { useMemo, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import {
  DrawingLightbox,
  DrawingScaleSelector,
  ScaleBar,
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

const FIT_TARGET_MM = { width: 520, height: 320 };
const SCALE_BAR_Y_GAP_MM = 8;
const SCALE_BAR_BOTTOM_SPACE_MM = 14;

function vehiclePoseFromTrack(pose: TrackPose): VehiclePose {
  return {
    center: { x: (pose.rear.x + pose.front.x) / 2, y: (pose.rear.y + pose.front.y) / 2 },
    thetaRad: pose.thetaRad,
  };
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

    return {
      dAxisPoints: axisPoints.map(toDrawing),
      dEnvelope: Object.fromEntries(
        ENVELOPE_KEYS.map((key) => [key, envelopePoints[key].map(toDrawing)]),
      ) as Record<(typeof ENVELOPE_KEYS)[number], Point[]>,
      dSilhouette: silhouettePoints.map(toDrawing),
      resolvedScale,
      drawingWidth,
      drawingHeight,
      viewBox: {
        width: drawingWidth,
        height: drawingHeight + SCALE_BAR_Y_GAP_MM + SCALE_BAR_BOTTOM_SPACE_MM,
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
        <ScaleBar
          resolved={geometry.resolvedScale}
          x={0}
          y={geometry.drawingHeight + SCALE_BAR_Y_GAP_MM}
          unitCaption={tCommon('drawing.cotesInUnit', { unit: 'mm' })}
        />
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
      <div className="rt-toolbar">
        {ENVELOPE_KEYS.map((key) => (
          <span key={key} className="legend-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[key], display: 'inline-block' }}
            />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}
