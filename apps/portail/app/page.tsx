'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { InfoButton, VersionBadge } from '@railtools/commun';
import { moduleRegistry } from '../lib/moduleRegistry';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rt-spacing-lg)' }}>
      <div>
        <h1 style={{ marginBottom: 'var(--rt-spacing-xs)' }}>{t('portail.home.title')}</h1>
        <p style={{ margin: 0, color: 'var(--rt-color-text-muted)' }}>{t('portail.home.subtitle')}</p>
      </div>

      <div>
        <h2 style={{ marginBottom: 'var(--rt-spacing-md)' }}>{t('portail.home.modulesTitle')}</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--rt-spacing-md)',
          }}
        >
          {moduleRegistry.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} href={module.route} className="rt-module-card">
                <div className="rt-module-card__header">
                  {Icon && (
                    <span className="rt-module-card__icon">
                      <Icon />
                    </span>
                  )}
                  <h3 className="rt-module-card__title">{t(`${module.i18nNamespace}.title`)}</h3>
                  <span
                    className="rt-module-card__info"
                    onClick={(event) => event.preventDefault()}
                  >
                    <InfoButton
                      label={t('portail.home.moduleInfo')}
                      closeLabel={t('common.actions.close')}
                    >
                      <h3>{t(`${module.i18nNamespace}.title`)}</h3>
                      <p>{t(`${module.i18nNamespace}.description`)}</p>
                    </InfoButton>
                  </span>
                </div>
                <p className="rt-module-card__description">
                  {t(`${module.i18nNamespace}.description`)}
                </p>
                <VersionBadge version={module.version.version} build={module.version.build} subtle />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
