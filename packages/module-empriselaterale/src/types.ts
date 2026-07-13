import type { DrawingScale } from '@railtools/commun';

export interface VehicleSpec {
  /** Nom descriptif du véhicule, repris tel quel dans les exports. */
  name: string;
  longueurCaisseMm: number;
  largeurCaisseMaxMm: number;
  largeurCaisseExtremiteMm: number;
  angleBiaisExtremiteDeg: number;
  empattementMm: number;
}

export interface VehicleLibraryItem extends VehicleSpec {
  id: string;
}

export type TrackSegmentType = 'line' | 'curve';
export type TrackDirection = 'left' | 'right';

export interface TrackSegment {
  type: TrackSegmentType;
  lengthMm?: number;
  radiusMm?: number;
  angleDeg?: number;
  direction?: TrackDirection;
}

export interface TrackElementLibraryItem {
  id: string;
  name: string;
  type: TrackSegmentType;
  lengthMm?: number;
  radiusMm?: number;
  angleDeg?: number;
}

export type CalcStepMm = 5 | 10 | 20 | 50;

export interface EmpriseLateraleProjectData {
  vehicle: VehicleSpec;
  track: TrackSegment[];
  calcStepMm: CalcStepMm;
  marginMm: number;
  drawingScale: DrawingScale;
}
