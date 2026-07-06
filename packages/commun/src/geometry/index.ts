/**
 * Briques génériques de géométrie 2D partagées entre modules.
 * Aucune logique métier spécifique à un module ne doit être ajoutée ici.
 */

export interface Point {
  x: number;
  y: number;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Ramène un angle (en radians) dans l'intervalle [0, 2π). */
export function normalizeAngle(rad: number): number {
  const twoPi = 2 * Math.PI;
  return ((rad % twoPi) + twoPi) % twoPi;
}

export function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subPoints(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scalePoint(p: Point, factor: number): Point {
  return { x: p.x * factor, y: p.y * factor };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Angle (en radians) du vecteur allant de l'origine à `v`. */
export function angleOf(v: Point): number {
  return Math.atan2(v.y, v.x);
}

/** Point situé sur un cercle de centre `center` et rayon `radius`, à l'angle `angleRad`. */
export function pointOnCircle(center: Point, radius: number, angleRad: number): Point {
  return {
    x: center.x + radius * Math.cos(angleRad),
    y: center.y + radius * Math.sin(angleRad),
  };
}

/** Longueur d'un arc de cercle de rayon `radius` sur un angle `angleRad` (radians). */
export function arcLength(radius: number, angleRad: number): number {
  return radius * Math.abs(angleRad);
}

/** Vecteur unitaire perpendiculaire à la direction `a → b`. */
export function perpendicularUnit(a: Point, b: Point): Point {
  const d = subPoints(b, a);
  const len = Math.hypot(d.x, d.y) || 1;
  return { x: -d.y / len, y: d.x / len };
}

/** Décale `p` perpendiculairement à la direction `a → b`, de `distance` (peut être négatif). */
export function offsetPoint(p: Point, a: Point, b: Point, distance: number): Point {
  const n = perpendicularUnit(a, b);
  return { x: p.x + n.x * distance, y: p.y + n.y * distance };
}

/** Direction tangente (radians) à un cercle, au point situé à `angleRad`. */
export function tangentDirection(angleRad: number): number {
  return normalizeAngle(angleRad + Math.PI / 2);
}

/**
 * Intersection de deux segments/droites définis par deux points chacun.
 * Retourne le point d'intersection des droites infinies portées par (p1,p2) et (p3,p4),
 * ou `null` si elles sont parallèles.
 */
export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d1 = subPoints(p2, p1);
  const d2 = subPoints(p4, p3);
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-12) {
    return null;
  }
  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / denom;
  return {
    x: p1.x + t * d1.x,
    y: p1.y + t * d1.y,
  };
}

/**
 * Intersection de deux cercles. Retourne 0, 1 ou 2 points d'intersection.
 */
export function circleCircleIntersection(
  c1: Point,
  r1: number,
  c2: Point,
  r2: number,
): Point[] {
  const d = distance(c1, c2);

  if (d > r1 + r2 || d < Math.abs(r1 - r2) || (d === 0 && r1 === r2)) {
    return [];
  }

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSquared = r1 * r1 - a * a;
  const h = hSquared > 0 ? Math.sqrt(hSquared) : 0;

  const mid: Point = {
    x: c1.x + (a * (c2.x - c1.x)) / d,
    y: c1.y + (a * (c2.y - c1.y)) / d,
  };

  if (h === 0) {
    return [mid];
  }

  const rx = -(c2.y - c1.y) * (h / d);
  const ry = (c2.x - c1.x) * (h / d);

  return [
    { x: mid.x + rx, y: mid.y + ry },
    { x: mid.x - rx, y: mid.y - ry },
  ];
}
