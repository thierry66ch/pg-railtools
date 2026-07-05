import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { VersionBadge } from '@railtools/commun';
import { moduleRegistry } from '../lib/moduleRegistry';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div>
      <h1>{t('portail.home.title')}</h1>
      <p>{t('portail.home.subtitle')}</p>

      <h2>{t('portail.home.modulesTitle')}</h2>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--rt-spacing-md)' }}>
        {moduleRegistry.map((module) => (
          <li key={module.id} className="rt-card">
            <h3>{t(`${module.i18nNamespace}.title`)}</h3>
            <p>{t(`${module.i18nNamespace}.description`)}</p>
            <div className="rt-toolbar">
              <VersionBadge version={module.version.version} build={module.version.build} />
              <Link href={module.route} className="rt-button">
                {t('portail.home.openModule')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
