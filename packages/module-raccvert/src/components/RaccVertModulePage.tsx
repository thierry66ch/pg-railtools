'use client';

import { useTranslations } from 'next-intl';
import { ResultPageLayout } from '@railtools/commun';
import versionInfo from '../../version.json';

export function RaccVertModulePage() {
  const t = useTranslations('moduleRaccVert');

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <p>Module en construction.</p>
    </ResultPageLayout>
  );
}
