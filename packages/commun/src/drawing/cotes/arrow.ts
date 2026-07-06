import { degToRad, pointOnCircle, type Point } from '../../geometry';

const ARROW_SPREAD_RAD = degToRad(20);

/**
 * Points (attribut SVG `points`) d'un triangle de flèche dont la pointe est en `tip`,
 * orientée dans la direction `dirRad`.
 */
export function arrowHeadPoints(tip: Point, dirRad: number, size: number): string {
  const backAngle = dirRad + Math.PI;
  const p1 = pointOnCircle(tip, size, backAngle - ARROW_SPREAD_RAD);
  const p2 = pointOnCircle(tip, size, backAngle + ARROW_SPREAD_RAD);
  return `${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
}
