/**
 * Configuration des locales supportées par le portail. Un seul point à modifier pour
 * ajouter une langue : chaque module et la base commune fournissent alors leur propre
 * fichier de traduction pour cette locale.
 */

export const SUPPORTED_LOCALES = ['fr'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'fr';

export const LOCALE_COOKIE_NAME = 'railtools_locale';

/** Clé de stockage commune sous laquelle la langue préférée est également mirroée. */
export const LOCALE_STORAGE_KEY = 'locale';

export function isSupportedLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
