import type { ModuleManifest } from '@railtools/commun';
import versionInfo from '../version.json';
import { ArcModuleIcon } from './icon';

export const arcModuleManifest: ModuleManifest = {
  id: 'arc',
  route: '/modules/arc',
  i18nNamespace: 'moduleArc',
  version: versionInfo,
  icon: ArcModuleIcon,
};
