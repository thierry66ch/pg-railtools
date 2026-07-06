import { modelToDrawing, type ResolvedDrawingScale } from './scale';

export interface ScaleBarProps {
  resolved: ResolvedDrawingScale;
  /** Position (mm de dessin) de l'origine (graduation "0") de la barre. */
  x: number;
  y: number;
  /** Légende affichée sous le ratio, ex. "Cotes en mm" (texte déjà formaté par l'appelant). */
  unitCaption?: string;
}

const TICK_HEIGHT_MM = 3;
const MM_TICK_HEIGHT_MM = 1.5;
const MAX_FONT_SIZE_MM = 3;
const MIN_FONT_SIZE_MM = 1;
/** En dessous de cet espacement (mm de dessin) par cm, les chiffres de 1 à 9 se chevauchent. */
const MIN_CM_LABEL_SPACING_MM = 4;
const STROKE_WIDTH_MM = 0.25;
const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

function formatRatio(ratio: number): string {
  return Number.isInteger(ratio) ? String(ratio) : ratio.toFixed(1);
}

/**
 * Barre d'échelle représentant l'échelle de dessin (pas l'échelle modèle) : 10 cm de
 * distance modèle réduit, graduée tous les 1 cm, avec le premier intervalle (0-1 cm)
 * subdivisé en mm pour la précision près de l'origine.
 */
export function ScaleBar({ resolved, x, y, unitCaption }: ScaleBarProps) {
  const cm = modelToDrawing(10, resolved);
  const mm = modelToDrawing(1, resolved);
  const barLength = cm * 10;

  const fontSize = Math.min(Math.max(cm * 0.5, MIN_FONT_SIZE_MM), MAX_FONT_SIZE_MM);
  // En dessous du seuil, n'afficher que les extrémités (0 et 10) pour éviter le chevauchement.
  const labelEveryCm = cm >= MIN_CM_LABEL_SPACING_MM;

  const mmTicks = Array.from({ length: 11 }, (_, i) => x + i * mm);
  const cmTicks = Array.from({ length: 11 }, (_, i) => x + i * cm);

  return (
    <g stroke="#1a1a1a" strokeWidth={STROKE_WIDTH_MM} fill="none" fontFamily={FONT_FAMILY}>
      <line x1={x} y1={y} x2={x + barLength} y2={y} />
      {mmTicks.map((tickX, i) => (
        <line key={`mm-${i}`} x1={tickX} y1={y} x2={tickX} y2={y - MM_TICK_HEIGHT_MM} />
      ))}
      {cmTicks.map((tickX, i) => (
        <g key={`cm-${i}`}>
          <line x1={tickX} y1={y} x2={tickX} y2={y - TICK_HEIGHT_MM} />
          {(labelEveryCm || i === 0 || i === cmTicks.length - 1) && (
            <text
              x={tickX}
              y={y - TICK_HEIGHT_MM - 1}
              fontSize={fontSize}
              stroke="none"
              fill="#1a1a1a"
              textAnchor="middle"
            >
              {i}
            </text>
          )}
        </g>
      ))}
      <text
        x={x}
        y={y + MAX_FONT_SIZE_MM + 2}
        fontSize={MAX_FONT_SIZE_MM}
        stroke="none"
        fill="#1a1a1a"
        textAnchor="start"
      >
        {`1:${formatRatio(resolved.ratio)} — cm`}
      </text>
      {unitCaption && (
        <text
          x={x}
          y={y + MAX_FONT_SIZE_MM * 2 + 4}
          fontSize={MAX_FONT_SIZE_MM}
          stroke="none"
          fill="#1a1a1a"
          textAnchor="start"
        >
          {unitCaption}
        </text>
      )}
    </g>
  );
}
