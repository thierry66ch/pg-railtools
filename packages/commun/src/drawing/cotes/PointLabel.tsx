import { pointOnCircle, type Point } from '../../geometry';
import { lineStyleToSvgProps, type LineStyle } from '../lineStyle';
import { suggestDimensionSizing } from '../sizing';
import type { CoteBaseProps } from './types';

/** Rayon fixe (mm de dessin) du disque marquant le point. */
const DOT_RADIUS_MM = 1;
/** Distance fixe (mm de dessin) entre le point et son étiquette. */
const LABEL_OFFSET_MM = 5;

export interface PointLabelProps extends CoteBaseProps {
  point: Point;
  label: string;
  /** Direction (radians) du décalage de l'étiquette depuis `point`. Défaut : vers le haut. */
  directionRad?: number;
}

/**
 * Marqueur de point simple : un petit disque plein et une étiquette texte à proximité
 * (ex. repérer les points A, B, C, D d'une construction géométrique). Plus léger que
 * `LevelCote` (pas de ligne de rappel ni de flèche) — à utiliser pour de la simple
 * identification de points, pas pour une cote à proprement parler.
 */
export function PointLabel({ point, label, directionRad = -Math.PI / 2, style, sizing }: PointLabelProps) {
  const resolvedSizing = sizing ?? suggestDimensionSizing();
  const resolvedStyle: LineStyle = style ?? { kind: 'solid' };
  const svgProps = lineStyleToSvgProps(resolvedStyle);

  const textPoint = pointOnCircle(point, LABEL_OFFSET_MM, directionRad);
  const textAnchor = Math.cos(directionRad) >= 0 ? 'start' : 'end';

  return (
    <g fontFamily="Arial, Helvetica, sans-serif">
      <circle cx={point.x} cy={point.y} r={DOT_RADIUS_MM} fill={svgProps.stroke} stroke="none" />
      <text
        x={textPoint.x}
        y={textPoint.y}
        fontSize={resolvedSizing.textSizeMm}
        fill={svgProps.stroke}
        stroke="none"
        textAnchor={textAnchor}
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}
