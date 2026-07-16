import { lineStyleToSvgProps, type LineStyle } from './lineStyle';
import { suggestDimensionSizing } from './sizing';
import type { CoteBaseProps } from './cotes/types';

export interface AxisTick {
  /** Position du tick le long de l'axe, en mm de dessin. */
  positionMm: number;
  label: string;
  /** Tick "majeur" : trait légèrement plus long. Défaut : mineur. */
  major?: boolean;
}

export interface GraduationAxisProps extends CoteBaseProps {
  orientation: 'horizontal' | 'vertical';
  /** Position (mm de dessin) de la ligne de base : y pour un axe horizontal, x pour vertical. */
  baselinePos: number;
  /** Étendue (mm de dessin) de la ligne de base, de `from` à `to`. */
  from: number;
  to: number;
  ticks: AxisTick[];
  tickLengthMm?: number;
}

const DEFAULT_TICK_LENGTH_MM = 2;
const MAJOR_TICK_FACTOR = 1.6;
const LABEL_GAP_MM = 1;

/**
 * Axe gradué "bête" (ligne de base + ticks + libellés texte), réutilisable pour tout dessin
 * de type profil (graduation K horizontale, graduation H verticale déformée). L'appelant
 * choisit les positions de ticks et formate les valeurs réelles — ce composant ne fait que
 * les positionner et les dessiner, comme les primitives `cotes/*`.
 */
export function GraduationAxis({
  orientation,
  baselinePos,
  from,
  to,
  ticks,
  tickLengthMm = DEFAULT_TICK_LENGTH_MM,
  style,
  sizing,
}: GraduationAxisProps) {
  const resolvedSizing = sizing ?? suggestDimensionSizing();
  const resolvedStyle: LineStyle = style ?? { kind: 'solid', widthMm: 0.2 };
  const svgProps = lineStyleToSvgProps(resolvedStyle);
  const isHorizontal = orientation === 'horizontal';

  return (
    <g {...svgProps} fill="none" fontFamily="Arial, Helvetica, sans-serif">
      {isHorizontal ? (
        <line x1={from} y1={baselinePos} x2={to} y2={baselinePos} />
      ) : (
        <line x1={baselinePos} y1={from} x2={baselinePos} y2={to} />
      )}
      {ticks.map((tick, i) => {
        const length = tick.major ? tickLengthMm * MAJOR_TICK_FACTOR : tickLengthMm;
        if (isHorizontal) {
          const x = tick.positionMm;
          return (
            <g key={i}>
              <line x1={x} y1={baselinePos} x2={x} y2={baselinePos + length} />
              <text
                x={x}
                y={baselinePos + length + resolvedSizing.textSizeMm + LABEL_GAP_MM}
                fontSize={resolvedSizing.textSizeMm}
                stroke="none"
                fill={svgProps.stroke}
                textAnchor="middle"
              >
                {tick.label}
              </text>
            </g>
          );
        }
        const y = tick.positionMm;
        return (
          <g key={i}>
            <line x1={baselinePos} y1={y} x2={baselinePos - length} y2={y} />
            <text
              x={baselinePos - length - LABEL_GAP_MM}
              y={y}
              fontSize={resolvedSizing.textSizeMm}
              stroke="none"
              fill={svgProps.stroke}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {tick.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
