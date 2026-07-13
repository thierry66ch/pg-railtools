/**
 * Cœur métier « véhicule » du module Emprise latérale : géométrie de la caisse à
 * extrémités chanfreinées (rectangle à coins tronqués) définie par sa longueur (L), sa
 * largeur max (Wmax), sa largeur d'extrémité (Wend), l'angle de chanfrein (θ) et
 * l'empattement essieux/bogies (E).
 *
 * Ce fichier ne dépend d'aucun composant ni d'aucune brique de `@railtools/commun`
 * (uniquement `Math` et le type `Point`), pour rester trivialement testable en isolation.
 * Toutes les longueurs sont en mm modèle, les angles de saisie en degrés.
 */

import type { Point } from '@railtools/commun';
import type { VehicleSpec } from '../types';

/** Codes d'erreur de validation (traduits côté UI via `t('errors.<code>')`). */
export type VehicleErrorCode =
  | 'longueur-non-positive' // L ≤ 0
  | 'largeur-max-non-positive' // Wmax ≤ 0
  | 'largeur-extremite-non-positive' // Wend ≤ 0
  | 'angle-hors-plage' // θ hors [0°, 90°]
  | 'empattement-non-positif' // E ≤ 0
  | 'largeur-extremite-superieure' // Wend > Wmax
  | 'chanfrein-angle-nul-largeurs-incoherentes' // θ=0° mais Wend ≠ Wmax
  | 'chanfrein-trop-long' // Ltaper > L/2
  | 'empattement-superieur-longueur'; // E > L

/** Résultat d'un calcul : succès typé, ou échec avec un code d'erreur de validation. */
export type VehicleResult<T> = { ok: true; value: T } | { ok: false; error: VehicleErrorCode };

function ok<T>(value: T): VehicleResult<T> {
  return { ok: true, value };
}
function err<T>(error: VehicleErrorCode): VehicleResult<T> {
  return { ok: false, error };
}

/**
 * Valide un `VehicleSpec` et calcule la longueur du chanfrein le long de l'axe :
 * `Ltaper = (Wmax − Wend) / (2·tan(θ))`, avec les cas particuliers θ=0° (chanfrein nul,
 * Wend doit alors être égal à Wmax) et θ=90° (chanfrein de longueur nulle, coupe franche).
 */
export function computeChanfrein(vehicle: VehicleSpec): VehicleResult<{ ltaperMm: number }> {
  const { longueurCaisseMm, largeurCaisseMaxMm, largeurCaisseExtremiteMm, angleBiaisExtremiteDeg, empattementMm } =
    vehicle;

  if (!(longueurCaisseMm > 0)) return err('longueur-non-positive');
  if (!(largeurCaisseMaxMm > 0)) return err('largeur-max-non-positive');
  if (!(largeurCaisseExtremiteMm > 0)) return err('largeur-extremite-non-positive');
  if (!(angleBiaisExtremiteDeg >= 0 && angleBiaisExtremiteDeg <= 90)) return err('angle-hors-plage');
  if (!(empattementMm > 0)) return err('empattement-non-positif');
  if (largeurCaisseExtremiteMm > largeurCaisseMaxMm) return err('largeur-extremite-superieure');
  if (empattementMm > longueurCaisseMm) return err('empattement-superieur-longueur');

  let ltaperMm: number;
  if (angleBiaisExtremiteDeg === 0) {
    if (largeurCaisseExtremiteMm !== largeurCaisseMaxMm) return err('chanfrein-angle-nul-largeurs-incoherentes');
    ltaperMm = 0;
  } else if (angleBiaisExtremiteDeg === 90) {
    ltaperMm = 0;
  } else {
    const thetaRad = (angleBiaisExtremiteDeg * Math.PI) / 180;
    ltaperMm = (largeurCaisseMaxMm - largeurCaisseExtremiteMm) / (2 * Math.tan(thetaRad));
  }

  if (ltaperMm > longueurCaisseMm / 2) return err('chanfrein-trop-long');

  return ok({ ltaperMm });
}

/**
 * Longueur du chanfrein telle qu'un modéliste la mesure au double-décimètre sur une
 * maquette : l'HYPOTÉNUSE du triangle rectangle formé par le chanfrein (côtés `ltaperMm`
 * le long de l'axe et `(Wmax−Wend)/2` en travers), pas `ltaperMm` lui-même (qui suppose de
 * repérer précisément l'axe longitudinal, peu pratique à mesurer directement).
 */
export function chanfreinHypotenuseFromLtaper(vehicle: VehicleSpec, ltaperMm: number): number {
  const halfDeltaW = (vehicle.largeurCaisseMaxMm - vehicle.largeurCaisseExtremiteMm) / 2;
  return Math.hypot(ltaperMm, halfDeltaW);
}

/**
 * Angle de biais (degrés) tel que le chanfrein ait pour hypoténuse `hypotenuseMm`, pour les
 * largeurs (Wmax, Wend) données — sens inverse de `chanfreinHypotenuseFromLtaper`, utilisé
 * quand l'utilisateur saisit la longueur du chanfrein plutôt que l'angle directement.
 * `undefined` si géométriquement indéterminé (Wend = Wmax : le chanfrein est nul quel que
 * soit l'angle, rien à en déduire) ou si `hypotenuseMm` n'est pas strictement positif.
 */
export function angleFromChanfreinHypotenuse(vehicle: VehicleSpec, hypotenuseMm: number): number | undefined {
  const halfDeltaW = (vehicle.largeurCaisseMaxMm - vehicle.largeurCaisseExtremiteMm) / 2;
  if (halfDeltaW <= 0 || !(hypotenuseMm > 0)) return undefined;
  // Une hypoténuse plus courte que le côté (Wmax−Wend)/2 est géométriquement impossible :
  // on ramène au cas limite θ=90° (chanfrein nul) plutôt que de renvoyer `undefined`, pour
  // rester tolérant à une saisie légèrement en dessous de ce plancher.
  const ratio = Math.min(1, halfDeltaW / hypotenuseMm);
  return (Math.asin(ratio) * 180) / Math.PI;
}

/** Point exprimé dans le repère local de la caisse (along = axe longitudinal, lat = latéral, + = gauche). */
export interface LocalPoint {
  along: number;
  lat: number;
}

/**
 * Les 8 points du contour de la caisse (octogone, rectangle à coins tronqués), dans
 * l'ordre de tracé du cahier des charges : transition-arrière-gauche → ARG → ARD →
 * transition-arrière-droite → transition-avant-droite → AVD → AVG →
 * transition-avant-gauche → (fermeture).
 */
export function vehicleContourLocalPoints(vehicle: VehicleSpec, ltaperMm: number): LocalPoint[] {
  const halfL = vehicle.longueurCaisseMm / 2;
  const halfWmax = vehicle.largeurCaisseMaxMm / 2;
  const halfWend = vehicle.largeurCaisseExtremiteMm / 2;
  const transAlong = halfL - ltaperMm;

  return [
    { along: -transAlong, lat: halfWmax }, // transition arrière gauche
    { along: -halfL, lat: halfWend }, // ARG
    { along: -halfL, lat: -halfWend }, // ARD
    { along: -transAlong, lat: -halfWmax }, // transition arrière droite
    { along: transAlong, lat: -halfWmax }, // transition avant droite
    { along: halfL, lat: -halfWend }, // AVD
    { along: halfL, lat: halfWend }, // AVG
    { along: transAlong, lat: halfWmax }, // transition avant gauche
  ];
}

/** Pose (position + orientation) de la caisse, définie par son centre et son cap (radians). */
export interface VehiclePose {
  center: Point;
  thetaRad: number;
}

/** Projette un point du repère local de la caisse dans le repère monde, pour une pose donnée. */
export function localPointToWorld(local: LocalPoint, pose: VehiclePose): Point {
  const u = { x: Math.cos(pose.thetaRad), y: Math.sin(pose.thetaRad) };
  const n = { x: -Math.sin(pose.thetaRad), y: Math.cos(pose.thetaRad) };
  return {
    x: pose.center.x + local.along * u.x + local.lat * n.x,
    y: pose.center.y + local.along * u.y + local.lat * n.y,
  };
}

/** Contour complet de la caisse (8 points), projeté dans le repère monde pour une pose donnée. */
export function vehicleContourWorldPoints(vehicle: VehicleSpec, ltaperMm: number, pose: VehiclePose): Point[] {
  return vehicleContourLocalPoints(vehicle, ltaperMm).map((local) => localPointToWorld(local, pose));
}

/** Les 6 points caractéristiques suivis pour le calcul d'emprise (§4 du CDC). */
export interface VehicleFramePoints {
  AVG: Point;
  AVD: Point;
  MG: Point;
  MD: Point;
  ARG: Point;
  ARD: Point;
}

export function vehicleFramePoints(vehicle: VehicleSpec, pose: VehiclePose): VehicleFramePoints {
  const halfL = vehicle.longueurCaisseMm / 2;
  const halfWmax = vehicle.largeurCaisseMaxMm / 2;
  const halfWend = vehicle.largeurCaisseExtremiteMm / 2;
  const at = (along: number, lat: number) => localPointToWorld({ along, lat }, pose);

  return {
    AVG: at(halfL, halfWend),
    AVD: at(halfL, -halfWend),
    MG: at(0, halfWmax),
    MD: at(0, -halfWmax),
    ARG: at(-halfL, halfWend),
    ARD: at(-halfL, -halfWend),
  };
}
