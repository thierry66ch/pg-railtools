/**
 * Structure de données commune décrivant une page de résultat, consommée par les trois
 * fonctions d'export (PDF, Markdown, PNG) sans que chaque module ait à les réimplémenter.
 */

export interface ResultTable {
  headers: string[];
  rows: (string | number)[][];
  /**
   * Cellules à mettre en gras (ex. valeurs saisies par l'utilisateur, par opposition aux
   * valeurs déduites) — mêmes dimensions que `rows`. Optionnel : si absent, ou si une
   * ligne/cellule n'y figure pas, la cellule reste en style normal.
   */
  boldCells?: boolean[][];
}

export interface ResultData {
  title: string;
  description?: string;
  /** Tableau récapitulatif court (ex. grandeurs clés), rendu avant le dessin. */
  summaryTable?: ResultTable;
  /** Tableau court rendu juste avant `table` (ex. paramètres ayant produit ce tableau). */
  tableIntro?: ResultTable;
  table?: ResultTable;
  notes?: string[];
  /** Texte alternatif du dessin, utilisé si un dessin est embarqué dans l'export Markdown. */
  drawingAlt?: string;
  /** Insère un saut de page (PDF) / séparateur (Markdown) entre le dessin et `tableIntro`/`table`. */
  pageBreakBeforeTable?: boolean;
}
