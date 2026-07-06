import { pointOnCircle, type Point } from '../../geometry';
import { lineStyleToSvgProps, type LineStyle } from '../lineStyle';
import { suggestDimensionSizing } from '../sizing';
import { arrowHeadPoints } from './arrow';
import type { CoteBaseProps } from './types';

/** Distance fixe (mm de dessin) du texte au point coté, pour éviter les conflits avec les cotes de longueur. */
const LEADER_LENGTH_MM = 20;

export interface LevelCoteProps extends CoteBaseProps {
  point: Point;
  label: string;
  /** Direction (radians) du trait de rappel depuis `point`. Défaut : vers le haut. */
  directionRad?: number;
}

/** Cote de niveau : flèche avec texte, la plus simple des 5 primitives. */
export function LevelCote({
  point,
  label,
  directionRad = -Math.PI / 2,
  style,
  sizing,
}: LevelCoteProps) {
  const resolvedSizing = sizing ?? suggestDimensionSizing();
  const resolvedStyle: LineStyle = style ?? { kind: 'solid' };
  const svgProps = lineStyleToSvgProps(resolvedStyle);

  const tail = pointOnCircle(point, LEADER_LENGTH_MM, directionRad);
  const arrowDir = directionRad + Math.PI;
  const textPoint = pointOnCircle(tail, resolvedSizing.textSizeMm * 0.5, directionRad);
  const textAnchor = Math.cos(directionRad) >= 0 ? 'start' : 'end';

  return (
    <g {...svgProps} fill="none">
      <line x1={tail.x} y1={tail.y} x2={point.x} y2={point.y} />
      <polygon
        points={arrowHeadPoints(point, arrowDir, resolvedSizing.arrowSizeMm)}
        fill={svgProps.stroke}
        stroke="none"
      />
      <text
        x={textPoint.x}
        y={textPoint.y}
        fontSize={resolvedSizing.textSizeMm}
        stroke="none"
        fill={svgProps.stroke}
        textAnchor={textAnchor}
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}
