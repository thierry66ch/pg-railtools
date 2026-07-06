import { normalizeAngle, pointOnCircle, tangentDirection, type Point } from '../../geometry';
import { lineStyleToSvgProps, type LineStyle } from '../lineStyle';
import { suggestDimensionSizing } from '../sizing';
import { arrowHeadPoints } from './arrow';
import type { CoteBaseProps } from './types';

export interface ArcLengthCoteProps extends CoteBaseProps {
  center: Point;
  radiusMm: number;
  startAngleRad: number;
  endAngleRad: number;
  /** Distance (mm de dessin) entre l'arc et l'arc de cote. Défaut : gap + flèche. */
  offsetMm?: number;
  label: string;
}

/** Cote de longueur d'arc : comme la cote de longueur, mais le trait de cote est courbé. */
export function ArcLengthCote({
  center,
  radiusMm,
  startAngleRad,
  endAngleRad,
  offsetMm,
  label,
  style,
  sizing,
}: ArcLengthCoteProps) {
  const resolvedSizing = sizing ?? suggestDimensionSizing(radiusMm * 2);
  const resolvedStyle: LineStyle = style ?? { kind: 'solid' };
  const svgProps = lineStyleToSvgProps(resolvedStyle);
  const offset = offsetMm ?? resolvedSizing.gapMm + resolvedSizing.arrowSizeMm;
  const dimRadius = radiusMm + offset;

  const sweep = normalizeAngle(endAngleRad - startAngleRad);
  const largeArcFlag = sweep > Math.PI ? 1 : 0;

  const witnessStart = pointOnCircle(center, radiusMm + resolvedSizing.gapMm, startAngleRad);
  const witnessEnd = pointOnCircle(center, radiusMm + resolvedSizing.gapMm, endAngleRad);
  const dimStart = pointOnCircle(center, dimRadius, startAngleRad);
  const dimEnd = pointOnCircle(center, dimRadius, endAngleRad);
  const midAngle = startAngleRad + sweep / 2;
  const labelPoint = pointOnCircle(center, dimRadius, midAngle);

  const startArrowDir = tangentDirection(startAngleRad) + Math.PI;
  const endArrowDir = tangentDirection(endAngleRad);

  return (
    <g {...svgProps} fill="none">
      <line x1={witnessStart.x} y1={witnessStart.y} x2={dimStart.x} y2={dimStart.y} />
      <line x1={witnessEnd.x} y1={witnessEnd.y} x2={dimEnd.x} y2={dimEnd.y} />
      <path
        d={`M ${dimStart.x} ${dimStart.y} A ${dimRadius} ${dimRadius} 0 ${largeArcFlag} 1 ${dimEnd.x} ${dimEnd.y}`}
      />
      <polygon
        points={arrowHeadPoints(dimStart, startArrowDir, resolvedSizing.arrowSizeMm)}
        fill={svgProps.stroke}
        stroke="none"
      />
      <polygon
        points={arrowHeadPoints(dimEnd, endArrowDir, resolvedSizing.arrowSizeMm)}
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
