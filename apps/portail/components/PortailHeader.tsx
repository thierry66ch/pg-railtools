import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@railtools/commun';

export function PortailHeader() {
  const t = useTranslations('portail');

  return (
    <header className="rt-toolbar rt-header">
      <nav className="rt-toolbar">
        <Link href="/">{t('nav.home')}</Link>
        <Link href="/a-propos">{t('nav.about')}</Link>
      </nav>
      <LanguageSelector />
    </header>
  );
}
