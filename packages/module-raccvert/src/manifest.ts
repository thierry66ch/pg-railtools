import type { ModuleManifest } from '@railtools/commun';
import versionInfo from '../version.json';
import { RaccVertModuleIcon } from './icon';

export const raccVertModuleManifest: ModuleManifest = {
  id: 'raccvert',
  route: '/modules/raccvert',
  i18nNamespace: 'moduleRaccVert',
  version: versionInfo,
  icon: RaccVertModuleIcon,
};
