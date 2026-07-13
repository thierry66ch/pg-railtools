'use client';

import { useTranslations } from 'next-intl';
import { ResultPageLayout } from '@railtools/commun';
import versionInfo from '../../version.json';
import { VehicleLibraryPanel } from './VehicleLibraryPanel';
import { TrackElementLibraryPanel } from './TrackElementLibraryPanel';

export function EmpriseLateraleModulePage() {
  const t = useTranslations('moduleEmpriseLaterale');

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <p>Module en construction — bibliothèques disponibles ci-dessous, formulaire véhicule/tracé à venir.</p>
      <VehicleLibraryPanel onUseInProject={() => {}} />
      <TrackElementLibraryPanel onUseInProject={() => {}} />
    </ResultPageLayout>
  );
}
