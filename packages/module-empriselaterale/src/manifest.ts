import type { ModuleManifest } from '@railtools/commun';
import versionInfo from '../version.json';
import { EmpriseLateraleModuleIcon } from './icon';

export const empriseLateraleModuleManifest: ModuleManifest = {
  id: 'empriselaterale',
  route: '/modules/empriselaterale',
  i18nNamespace: 'moduleEmpriseLaterale',
  version: versionInfo,
  icon: EmpriseLateraleModuleIcon,
};
