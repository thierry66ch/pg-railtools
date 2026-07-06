import type { DrawingScale, ScaleKey } from '@railtools/commun';

export interface DemoProjectData {
  realLengthMm: number;
  scale: ScaleKey;
  curveRadiusMm: number;
  curveAngleDeg: number;
  drawingScale: DrawingScale;
}
