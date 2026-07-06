import type { ModuleManifest } from '@railtools/commun';
import versionInfo from '../version.json';
import { DemoModuleIcon } from './icon';

export const demoModuleManifest: ModuleManifest = {
  id: 'demo',
  route: '/modules/demo',
  i18nNamespace: 'moduleDemo',
  version: versionInfo,
  icon: DemoModuleIcon,
};
