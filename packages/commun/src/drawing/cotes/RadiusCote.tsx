import { angleOf, pointOnCircle, subPoints, type Point } from '../../geometry';
import { lineStyleToSvgProps, type LineStyle } from '../lineStyle';
import { suggestDimensionSizing } from '../sizing';
import { arrowHeadPoints } from './arrow';
import type { CoteBaseProps } from './types';

/** Longueur fixe (mm de dessin) du trait de cote de rayon : le centre peut être très éloigné. */
const RADIUS_LINE_LENGTH_MM = 20;

export interface RadiusCoteProps extends CoteBaseProps {
  center: Point;
  pointOnArc: Point;
  label: string;
}

/**
 * Cote de rayon : flèche côté arc, trait de 20 mm fixe en direction du centre (ne va
 * jamais jusqu'au centre réel, qui peut être très éloigné).
 */
export function RadiusCote({ center, pointOnArc, label, style, sizing }: RadiusCoteProps) {
  const resolvedSizing = sizing ?? suggestDimensionSizing(RADIUS_LINE_LENGTH_MM * 5);
  const resolvedStyle: LineStyle = style ?? { kind: 'solid' };
  const svgProps = lineStyleToSvgProps(resolvedStyle);

  const outwardRad = angleOf(subPoints(pointOnArc, center));
  const inwardRad = outwardRad + Math.PI;
  const innerEnd = pointOnCircle(pointOnArc, RADIUS_LINE_LENGTH_MM, inwardRad);
  const textPoint = pointOnCircle(innerEnd, resolvedSizing.textSizeMm, inwardRad);

  return (
    <g {...svgProps} fill="none">
      <line x1={pointOnArc.x} y1={pointOnArc.y} x2={innerEnd.x} y2={innerEnd.y} />
      <polygon
        points={arrowHeadPoints(pointOnArc, outwardRad, resolvedSizing.arrowSizeMm)}
        fill={svgProps.stroke}
        stroke="none"
      />
      <text
        x={textPoint.x}
        y={textPoint.y}
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
