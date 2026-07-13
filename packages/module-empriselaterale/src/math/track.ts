/**
 * Cœur métier « tracé » du module Emprise latérale : position sur une polyligne de
 * segments droits/courbes, paramétrée par l'abscisse curviligne `s` (mm), et
 * échantillonnage des poses du véhicule le long de ce tracé.
 *
 * Port direct de `pointOnTrackAtS`/`computeTrack` du prototype
 * `simulation-emprise-wagon.html`, en mm et avec direction par segment (au lieu d'une
 * direction globale). Ce moteur reste propre au module pour cette livraison (voir
 * CHANGELOG.md) — à réévaluer comme candidat `@railtools/commun` si un futur module en a
 * besoin.
 */

import { degToRad, type Point } from '@railtools/commun';
import type { TrackSegment } from '../types';

export type TrackErrorCode =
  | 'aucun-segment'
  | 'segment-longueur-non-positive'
  | 'segment-rayon-non-positif'
  | 'segment-angle-non-positif'
  | 'empattement-superieur-longueur-trace';

export type TrackResult<T> = { ok: true; value: T } | { ok: false; error: TrackErrorCode };

function ok<T>(value: T): TrackResult<T> {
  return { ok: true, value };
}
function err<T>(error: TrackErrorCode): TrackResult<T> {
  return { ok: false, error };
}

/** Longueur totale du tracé (somme des longueurs de segment, un arc comptant `R·angle`). */
export function trackLength(segments: TrackSegment[]): number {
  return segments.reduce((total, seg) => {
    if (seg.type === 'line') return total + (seg.lengthMm ?? 0);
    const radiusMm = Math.max(0.001, seg.radiusMm ?? 0.001);
    return total + radiusMm * Math.abs(degToRad(seg.angleDeg ?? 0));
  }, 0);
}

/** Vérifie que le tracé et l'empattement forment une configuration valide. */
export function validateTrack(segments: TrackSegment[], wheelbaseMm: number): TrackResult<{ totalLengthMm: number }> {
  if (segments.length < 1) return err('aucun-segment');
  for (const segment of segments) {
    if (segment.type === 'line') {
      if (!((segment.lengthMm ?? 0) > 0)) return err('segment-longueur-non-positive');
    } else {
      if (!((segment.radiusMm ?? 0) > 0)) return err('segment-rayon-non-positif');
      if (!((segment.angleDeg ?? 0) > 0)) return err('segment-angle-non-positif');
    }
  }
  const totalLengthMm = trackLength(segments);
  if (wheelbaseMm > totalLengthMm) return err('empattement-superieur-longueur-trace');
  return ok({ totalLengthMm });
}

/**
 * Point + cap sur le tracé à l'abscisse curviligne `sTargetMm` (clampée à [0, longueur]).
 * Fonction volontairement non validante (appelée en continu sur un tracé déjà validé par
 * `validateTrack`), à l'image de `localOffset`/`centralAngleFromRadiusChord` dans
 * `math/arc.ts`.
 */
export function pointOnTrackAtS(segments: TrackSegment[], sTargetMm: number): { point: Point; thetaRad: number } {
  let x = 0;
  let y = 0;
  let theta = 0;
  let sAcc = 0;

  if (sTargetMm <= 0) return { point: { x, y }, thetaRad: theta };

  for (const seg of segments) {
    if (seg.type === 'line') {
      const lenMm = seg.lengthMm ?? 0;
      if (sTargetMm <= sAcc + lenMm) {
        const ds = sTargetMm - sAcc;
        return { point: { x: x + ds * Math.cos(theta), y: y + ds * Math.sin(theta) }, thetaRad: theta };
      }
      x += lenMm * Math.cos(theta);
      y += lenMm * Math.sin(theta);
      sAcc += lenMm;
    } else {
      const radiusMm = Math.max(0.001, seg.radiusMm ?? 0.001);
      const totalRad = Math.abs(degToRad(seg.angleDeg ?? 0));
      const sign = seg.direction === 'right' ? -1 : 1;
      const arcMm = radiusMm * totalRad;
      if (sTargetMm <= sAcc + arcMm) {
        const ds = sTargetMm - sAcc;
        const dphi = ds / radiusMm;
        const theta2 = theta + sign * dphi;
        let xx = x;
        let yy = y;
        if (sign > 0) {
          xx += radiusMm * (Math.sin(theta2) - Math.sin(theta));
          yy += -radiusMm * (Math.cos(theta2) - Math.cos(theta));
        } else {
          xx += radiusMm * (-Math.sin(theta2) + Math.sin(theta));
          yy += radiusMm * (Math.cos(theta2) - Math.cos(theta));
        }
        return { point: { x: xx, y: yy }, thetaRad: theta2 };
      }
      const theta2 = theta + sign * totalRad;
      if (sign > 0) {
        x += radiusMm * (Math.sin(theta2) - Math.sin(theta));
        y += -radiusMm * (Math.cos(theta2) - Math.cos(theta));
      } else {
        x += radiusMm * (-Math.sin(theta2) + Math.sin(theta));
        y += radiusMm * (Math.cos(theta2) - Math.cos(theta));
      }
      theta = theta2;
      sAcc += arcMm;
    }
  }
  return { point: { x, y }, thetaRad: theta };
}

/** Pose du véhicule (points de guidage arrière/avant + cap de la corde) pour une abscisse `sRearMm` donnée. */
export interface TrackPose {
  sRearMm: number;
  sFrontMm: number;
  rear: Point;
  front: Point;
  thetaRad: number;
}

/**
 * Pose à une abscisse arrière donnée : point de guidage avant à `sRearMm + wheelbaseMm`,
 * cap de la caisse = direction de la corde arrière→avant (jamais la tangente au tracé,
 * CDC §7).
 */
export function poseAtSRear(segments: TrackSegment[], sRearMm: number, wheelbaseMm: number): TrackPose {
  const rear = pointOnTrackAtS(segments, sRearMm);
  const front = pointOnTrackAtS(segments, sRearMm + wheelbaseMm);
  const thetaRad = Math.atan2(front.point.y - rear.point.y, front.point.x - rear.point.x);
  return { sRearMm, sFrontMm: sRearMm + wheelbaseMm, rear: rear.point, front: front.point, thetaRad };
}

/** Abscisse arrière maximale valide, pour que le point de guidage avant reste sur le tracé. */
export function maxSRear(totalLengthMm: number, wheelbaseMm: number): number {
  return Math.max(0, totalLengthMm - wheelbaseMm);
}

/** Échantillonne les poses du véhicule le long de tout le tracé, au pas `stepMm`. */
export function computeTrackSamples(segments: TrackSegment[], wheelbaseMm: number, stepMm: number): TrackPose[] {
  const totalLengthMm = trackLength(segments);
  const sRearMax = maxSRear(totalLengthMm, wheelbaseMm);
  const poses: TrackPose[] = [];
  for (let sRear = 0; sRear <= sRearMax + 1e-9; sRear += stepMm) {
    poses.push(poseAtSRear(segments, Math.min(sRear, sRearMax), wheelbaseMm));
  }
  return poses;
}
