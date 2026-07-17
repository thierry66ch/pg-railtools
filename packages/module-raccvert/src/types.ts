import type { DrawingScale } from '@railtools/commun';
import type { SegmentDistributionMode } from './math/raccvert';

export type RaccVertApproach = 'approche1' | 'approche2';
export type Approche1Part1Mode = 'radius' | 'sagitta' | 'tangent';
export type Approche1Part2Mode = 'deltaITarget' | 'length';
export type Approche2SubMode = '2a' | '2b';

export interface RaccVertProjectData {
  i0PerMille: number;
  inPerMille: number;
  kVMm: number;
  hVMm: number;

  activeApproach: RaccVertApproach;

  approche1Part1Mode: Approche1Part1Mode;
  radiusMm: number;
  sagittaMm: number;
  tangentMm: number;
  approche1Part2Mode: Approche1Part2Mode;
  deltaITargetPerMille: number;
  deltaITargetDeg: number;
  approche1LengthMm: number;

  approche2SubMode: Approche2SubMode;
  nSegments: number;
  approche2LengthMm: number;
  deltaI2bPerMille: number;
  deltaI2bDeg: number;
  approche2DistributionMode: SegmentDistributionMode;

  decimals: number;
  drawingScale: DrawingScale;
  verticalExaggeration: 1 | 2 | 5 | 10;
  horizonHMm: number;
}
