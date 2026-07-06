import { normalizeAngle, pointOnCircle, tangentDirection, type Point } from '../../geometry';
import { lineStyleToSvgProps, type LineStyle } from '../lineStyle';
import { suggestDimensionSizing } from '../sizing';
import { arrowHeadPoints } from './arrow';
import type { CoteBaseProps } from './types';

export interface AngleCoteProps extends CoteBaseProps {
  center: Point;
  startAngleRad: number;
  endAngleRad: number;
  radiusMm: number;
  label: string;
}

/**
 * Cote d'angle : arc + une flèche à chaque extrémité + texte. Ne redessine pas les deux
 * rayons — c'est à l'appelant de les tracer comme géométrie normale s'il le souhaite.
 */
export function AngleCote({
  center,
  startAngleRad,
  endAngleRad,
  radiusMm,
  label,
  style,
  sizing,
}: AngleCoteProps) {
  const resolvedSizing = sizing ?? suggestDimensionSizing();
  const resolvedStyle: LineStyle = style ?? { kind: 'solid' };
  const svgProps = lineStyleToSvgProps(resolvedStyle);

  const sweep = normalizeAngle(endAngleRad - startAngleRad);
  const largeArcFlag = sweep > Math.PI ? 1 : 0;

  const startPoint = pointOnCircle(center, radiusMm, startAngleRad);
  const endPoint = pointOnCircle(center, radiusMm, endAngleRad);
  const midAngle = startAngleRad + sweep / 2;
  const labelPoint = pointOnCircle(center, radiusMm + resolvedSizing.textSizeMm, midAngle);

  const startArrowDir = tangentDirection(startAngleRad) + Math.PI;
  const endArrowDir = tangentDirection(endAngleRad);

  return (
    <g {...svgProps} fill="none">
      <path
        d={`M ${startPoint.x} ${startPoint.y} A ${radiusMm} ${radiusMm} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`}
      />
      <polygon
        points={arrowHeadPoints(startPoint, startArrowDir, resolvedSizing.arrowSizeMm)}
        fill={svgProps.stroke}
        stroke="none"
      />
      <polygon
        points={arrowHeadPoints(endPoint, endArrowDir, resolvedSizing.arrowSizeMm)}
        fill={svgProps.stroke}
        stroke="none"
      />
      <text
        x={labelPoint.x}
        y={labelPoint.y}
        fontSize={resolvedSizing.textSizeMm}
        stroke="none"
        fill={svgProps.stroke}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}
