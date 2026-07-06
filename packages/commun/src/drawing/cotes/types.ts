import type { LineStyle } from '../lineStyle';
import type { DimensionSizing } from '../sizing';

export interface CoteBaseProps {
  /** Défaut : trait continu noir 0.3 mm. */
  style?: LineStyle;
  /** Défaut : calculé via `suggestDimensionSizing` sur une taille de référence raisonnable. */
  sizing?: DimensionSizing;
}
