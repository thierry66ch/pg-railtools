import { normalizeAngle, pointOnCircle, tangentDirection, type Point } from '../../geometry';
import { lineStyleToSvgProps, type LineStyle } from '../lineStyle';
import { DEFAULT_COTE_OFFSET_MM, suggestDimensionSizing } from '../sizing';
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
  const resolvedSizing = sizing ?? suggestDimensionSizing();
  const resolvedStyle: LineStyle = style ?? { kind: 'solid' };
  const svgProps = lineStyleToSvgProps(resolvedStyle);
  const offset = offsetMm ?? DEFAULT_COTE_OFFSET_MM;
  const gapSigned = Math.sign(offset) * resolvedSizing.gapMm;
  const dimRadius = radiusMm + offset;

  const sweep = normalizeAngle(endAngleRad - startAngleRad);
  const largeArcFlag = sweep > Math.PI ? 1 : 0;

  const witnessStart = pointOnCircle(center, radiusMm + gapSigned, startAngleRad);
  const witnessEnd = pointOnCircle(center, radiusMm + gapSigned, endAngleRad);
  const dimStart = pointOnCircle(center, dimRadius, startAngleRad);
  const dimEnd = pointOnCircle(center, dimRadius, endAngleRad);
  const midAngle = startAngleRad + sweep / 2;
  // Écarte le texte du trait de cote courbé (au-delà du simple rayon de cote).
  const labelRadius = dimRadius + Math.sign(offset) * (resolvedSizing.textSizeMm * 0.2 + 0.5);
  const labelPoint = pointOnCircle(center, labelRadius, midAngle);

  const startArrowDir = tangentDirection(startAngleRad) + Math.PI;
  const endArrowDir = tangentDirection(endAngleRad);

  return (
    <g {...svgProps} fill="none" fontFamily="Arial, Helvetica, sans-serif">
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
        // Sans ceci, la baseline par défaut ("alphabetic") place le corps du texte en
        // grande partie *avant* labelPoint (côté ligne de cote), annulant presque tout le
        // décalage voulu par labelRadius : le libellé touchait quasiment l'arc de cote.
        // On pousse le texte du côté opposé à la ligne de cote (away = sens de l'offset).
        dominantBaseline={offset >= 0 ? 'text-before-edge' : 'text-after-edge'}
      >
        {label}
      </text>
    </g>
  );
}
