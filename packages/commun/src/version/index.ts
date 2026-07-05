/**
 * Types communs pour le versionnage (voir §9 du cahier des charges) : un numéro de version
 * fonctionnelle majeur.mineur, indépendant d'un numéro de build strictement croissant.
 */

export interface VersionInfo {
  /** Format "majeur.mineur", ex. "1.3". */
  version: string;
  /** Compteur de build strictement croissant, indépendant du numéro de version. */
  build: number;
}

export function formatVersion(info: VersionInfo): string {
  return `v${info.version} (build ${info.build})`;
}
