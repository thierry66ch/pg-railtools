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
  table?: ResultTable;
  notes?: string[];
}
