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

/** Demi-longueur (mm de dessin) des traits courts marquant chaque extrémité de l'arc. */
const TICK_HALF_LENGTH_MM = 1.5;

/**
 * Cote d'angle : arc + une flèche à chaque extrémité + un trait court traversant l'arc à
 * chaque extrémité (repère visuel, comme `ArcLengthCote`) + texte. Ne redessine pas les
 * deux rayons — c'est à l'appelant de les tracer comme géométrie normale s'il le souhaite.
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
  // Décalé du milieu exact de l'arc (souvent occupé par une cote de rayon centrée) et
  // rapproché de l'arc pour rester lisible sans trop s'écarter.
  const labelAngle = midAngle - sweep * 0.2;
  // Décalage radial (au-delà de l'arc) + petite marge (gapMm) avant le texte, comme les
  // autres cotes. `dominantBaseline="middle"` centre le texte SUR ce point quelle que soit
  // sa position autour du cercle (contrairement à la baseline par défaut "alphabetic", qui
  // laisse la moitié du texte du côté de l'arc — d'où le chevauchement avec la ligne de
  // cote dès que le libellé n'est pas au-dessus du dessin, cf. pieges-a-eviter.md).
  const labelPoint = pointOnCircle(
    center,
    radiusMm + resolvedSizing.textSizeMm + resolvedSizing.gapMm * 2,
    labelAngle,
  );

  const startArrowDir = tangentDirection(startAngleRad) + Math.PI;
  const endArrowDir = tangentDirection(endAngleRad);

  const startTickFrom = pointOnCircle(center, radiusMm - TICK_HALF_LENGTH_MM, startAngleRad);
  const startTickTo = pointOnCircle(center, radiusMm + TICK_HALF_LENGTH_MM, startAngleRad);
  const endTickFrom = pointOnCircle(center, radiusMm - TICK_HALF_LENGTH_MM, endAngleRad);
  const endTickTo = pointOnCircle(center, radiusMm + TICK_HALF_LENGTH_MM, endAngleRad);

  return (
    <g {...svgProps} fill="none" fontFamily="Arial, Helvetica, sans-serif">
      <path
        d={`M ${startPoint.x} ${startPoint.y} A ${radiusMm} ${radiusMm} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`}
      />
      <line x1={startTickFrom.x} y1={startTickFrom.y} x2={startTickTo.x} y2={startTickTo.y} />
      <line x1={endTickFrom.x} y1={endTickFrom.y} x2={endTickTo.x} y2={endTickTo.y} />
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
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}
