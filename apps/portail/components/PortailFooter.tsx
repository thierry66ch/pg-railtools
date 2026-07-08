import { useTranslations } from 'next-intl';
import { VersionBadge } from '@railtools/commun';
import baseCommuneVersion from '../../../version.json';

export function PortailFooter() {
  const t = useTranslations('portail');

  return (
    <footer className="rt-toolbar rt-footer">
      <span>{t('footer.baseCommuneLabel')}</span>
      <VersionBadge version={baseCommuneVersion.version} build={baseCommuneVersion.build} subtle />
    </footer>
  );
}
