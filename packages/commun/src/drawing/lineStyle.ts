/**
 * Styles de trait façon CAD, réutilisables par tout dessin SVG (géométrie ou cotes).
 */

export type LineStyleKind = 'solid' | 'dashedLong' | 'dashedShort' | 'centerline' | 'dotted';

export interface LineStyle {
  kind: LineStyleKind;
  /** Couleur CSS du trait, défaut noir. */
  color?: string;
  /** Épaisseur du trait en mm, défaut 0.3 mm. */
  widthMm?: number;
}

export const DEFAULT_LINE_STYLE: LineStyle = { kind: 'solid', color: '#000000', widthMm: 0.3 };

/** Motif de tirets (mm) pour `stroke-dasharray`, ou `undefined` pour un trait continu. */
export function getDashArray(kind: LineStyleKind): number[] | undefined {
  switch (kind) {
    case 'solid':
      return undefined;
    case 'dashedLong':
      return [5, 2];
    case 'dashedShort':
      return [3, 1];
    case 'centerline':
      return [5, 2, 1, 2];
    case 'dotted':
      return [1, 2];
    default:
      return undefined;
  }
}

export function lineStyleToSvgProps(style: LineStyle): {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
} {
  const dashArray = getDashArray(style.kind);
  return {
    stroke: style.color ?? DEFAULT_LINE_STYLE.color!,
    strokeWidth: style.widthMm ?? DEFAULT_LINE_STYLE.widthMm!,
    strokeDasharray: dashArray?.join(' '),
  };
}
