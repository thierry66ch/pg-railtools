import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@railtools/commun';

export function PortailHeader() {
  const t = useTranslations('portail');

  return (
    <header className="rt-toolbar rt-header">
      <div className="rt-toolbar">
        <Link href="/" className="rt-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={28} height={28} />
          <span>RailTools</span>
        </Link>
        <nav className="rt-toolbar">
          <Link href="/">{t('nav.home')}</Link>
          <Link href="/a-propos">{t('nav.about')}</Link>
        </nav>
      </div>
      <LanguageSelector />
    </header>
  );
}
