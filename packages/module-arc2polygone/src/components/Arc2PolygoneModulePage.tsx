'use client';

import { useTranslations } from 'next-intl';
import { ResultPageLayout } from '@railtools/commun';
import versionInfo from '../../version.json';

/**
 * Page du module Arc2Poly.
 *
 * Phase 2 : câblage au portail. Le corps de page (formulaire adaptatif, tableau de
 * résultats, dessin, bibliothèque de modèles) est ajouté dans les phases suivantes ;
 * le moteur de calcul (src/calc/arc2poly.ts) est déjà en place et testé.
 */
export function Arc2PolygoneModulePage() {
  const t = useTranslations('moduleArc2Polygone');

  return (
    <ResultPageLayout title={t('title')} description={t('description')} version={versionInfo}>
      <p className="rt-note">{t('wip')}</p>
    </ResultPageLayout>
  );
}
