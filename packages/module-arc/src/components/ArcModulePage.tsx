'use client';

import { useTranslations } from 'next-intl';
import { ResultPageLayout } from '@railtools/commun';
import versionInfo from '../../version.json';

export function ArcModulePage() {
  const t = useTranslations('moduleArc');

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <p>{t('placeholder')}</p>
    </ResultPageLayout>
  );
}
