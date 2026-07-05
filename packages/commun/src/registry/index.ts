import type { VersionInfo } from '../version';

/**
 * Contrat minimal qu'un module doit exposer pour être listé et routé par le portail.
 * Le portail ne connaît que cette structure ; toute la logique métier reste dans le module.
 *
 * Convention : `i18nNamespace` doit correspondre à la clé sous laquelle les traductions du
 * module sont fusionnées dans la configuration i18n du portail (voir docs/integration.md).
 * Ce namespace doit exposer au moins les clés `title` et `description`.
 */
export interface ModuleManifest {
  id: string;
  route: string;
  i18nNamespace: string;
  version: VersionInfo;
}
