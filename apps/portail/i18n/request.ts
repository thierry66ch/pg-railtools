import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, commonMessages, isSupportedLocale } from '@railtools/commun';
import { demoMessages } from '@railtools/module-demo';
import { portailMessages } from './messages';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = cookieLocale && isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: {
      common: commonMessages[locale],
      portail: portailMessages[locale],
      // Chaque nouveau module ajoute ici sa propre entrée (voir docs/integration.md).
      moduleDemo: demoMessages[locale],
    },
  };
});
