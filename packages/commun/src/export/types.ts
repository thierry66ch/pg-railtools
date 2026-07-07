/**
 * Structure de données commune décrivant une page de résultat, consommée par les trois
 * fonctions d'export (PDF, Markdown, PNG) sans que chaque module ait à les réimplémenter.
 */

export interface ResultTable {
  headers: string[];
  rows: (string | number)[][];
}

export interface ResultData {
  title: string;
  description?: string;
  /** Tableau récapitulatif court (ex. grandeurs clés), rendu après le dessin et avant `table`. */
  summaryTable?: ResultTable;
  table?: ResultTable;
  notes?: string[];
  /** Texte alternatif du dessin, utilisé si un dessin est embarqué dans l'export Markdown. */
  drawingAlt?: string;
}
