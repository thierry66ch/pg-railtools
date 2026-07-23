import type { ModuleManifest } from '@railtools/commun';
import versionInfo from '../version.json';
import { Arc2PolygoneModuleIcon } from './icon';

export const arc2polygoneModuleManifest: ModuleManifest = {
  id: 'arc2polygone',
  route: '/modules/arc2polygone',
  i18nNamespace: 'moduleArc2Polygone',
  version: versionInfo,
  icon: Arc2PolygoneModuleIcon,
};
