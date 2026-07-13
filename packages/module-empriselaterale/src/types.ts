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

/** Copie figée d'un item de bibliothèque en `VehicleSpec` (sans `id`), pour insertion dans un projet. */
export function vehicleSpecFromLibraryItem(item: VehicleLibraryItem): VehicleSpec {
  return {
    name: item.name,
    longueurCaisseMm: item.longueurCaisseMm,
    largeurCaisseMaxMm: item.largeurCaisseMaxMm,
    largeurCaisseExtremiteMm: item.largeurCaisseExtremiteMm,
    angleBiaisExtremiteDeg: item.angleBiaisExtremiteDeg,
    empattementMm: item.empattementMm,
  };
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

/** Copie figée d'un item de bibliothèque en `TrackSegment` (sans `id`/`name`), pour insertion dans un tracé. */
export function segmentFromLibraryItem(item: TrackElementLibraryItem): TrackSegment {
  return item.type === 'line'
    ? { type: 'line', lengthMm: item.lengthMm }
    : { type: 'curve', radiusMm: item.radiusMm, angleDeg: item.angleDeg, direction: 'left' };
}

export type CalcStepMm = 5 | 10 | 20 | 50;

export interface EmpriseLateraleProjectData {
  vehicle: VehicleSpec;
  track: TrackSegment[];
  calcStepMm: CalcStepMm;
  marginMm: number;
  drawingScale: DrawingScale;
}
