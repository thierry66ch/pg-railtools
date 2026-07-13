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

export type CalcStepMm = 5 | 10 | 20 | 50;

export interface EmpriseLateraleProjectData {
  vehicle: VehicleSpec;
  track: TrackSegment[];
  calcStepMm: CalcStepMm;
  marginMm: number;
  drawingScale: DrawingScale;
}
