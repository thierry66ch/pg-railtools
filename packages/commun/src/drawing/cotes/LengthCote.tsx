import { angleOf, offsetPoint, radToDeg, subPoints, type Point } from '../../geometry';
import { lineStyleToSvgProps, type LineStyle } from '../lineStyle';
import { DEFAULT_COTE_OFFSET_MM, suggestDimensionSizing } from '../sizing';
import { arrowHeadPoints } from './arrow';
import type { CoteBaseProps } from './types';

export interface LengthCoteProps extends CoteBaseProps {
  from: Point;
  to: Point;
  /** Distance (mm de dessin) entre la géométrie et le trait de cote. Défaut : gap + flèche. */
  offsetMm?: number;
  label: string;
}

/** Cote de longueur : trait parallèle au segment, décalé, avec 1 mm d'espace au départ. */
export function LengthCote({ from, to, offsetMm, label, style, sizing }: LengthCoteProps) {
  const resolvedSizing = sizing ?? suggestDimensionSizing();
  const resolvedStyle: LineStyle = style ?? { kind: 'solid' };
  const svgProps = lineStyleToSvgProps(resolvedStyle);
  const offset = offsetMm ?? DEFAULT_COTE_OFFSET_MM;
  const gapSigned = Math.sign(offset) * resolvedSizing.gapMm;

  const dimFrom = offsetPoint(from, from, to, offset);
  const dimTo = offsetPoint(to, from, to, offset);
  const witnessFromStart = offsetPoint(from, from, to, gapSigned);
  const witnessToStart = offsetPoint(to, from, to, gapSigned);

  const dirRad = angleOf(subPoints(to, from));
  const angleDeg = radToDeg(dirRad);
  const mid: Point = { x: (dimFrom.x + dimTo.x) / 2, y: (dimFrom.y + dimTo.y) / 2 };
  // Écarte le texte du trait de cote (au-delà du simple `dominantBaseline`).
  const textPoint = offsetPoint(mid, from, to, Math.sign(offset) * (resolvedSizing.textSizeMm * 0.4 + 1));

  return (
    <g {...svgProps} fill="none" fontFamily="Arial, Helvetica, sans-serif">
      <line x1={witnessFromStart.x} y1={witnessFromStart.y} x2={dimFrom.x} y2={dimFrom.y} />
      <line x1={witnessToStart.x} y1={witnessToStart.y} x2={dimTo.x} y2={dimTo.y} />
      <line x1={dimFrom.x} y1={dimFrom.y} x2={dimTo.x} y2={dimTo.y} />
      <polygon
        points={arrowHeadPoints(dimFrom, dirRad + Math.PI, resolvedSizing.arrowSizeMm)}
        fill={svgProps.stroke}
        stroke="none"
      />
      <polygon
        points={arrowHeadPoints(dimTo, dirRad, resolvedSizing.arrowSizeMm)}
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
        dominantBaseline="text-after-edge"
        transform={`rotate(${angleDeg}, ${textPoint.x}, ${textPoint.y})`}
      >
        {label}
      </text>
    </g>
  );
}
