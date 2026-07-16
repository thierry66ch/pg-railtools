import type { ModuleManifest } from '@railtools/commun';
import { demoModuleManifest } from '@railtools/module-demo';
import { arcModuleManifest } from '@railtools/module-arc';
import { empriseLateraleModuleManifest } from '@railtools/module-empriselaterale';
import { raccVertModuleManifest } from '@railtools/module-raccvert';

/**
 * Liste des modules affichés sur le portail. Chaque nouveau module ajoute son manifeste ici
 * (voir docs/integration.md pour la procédure d'enregistrement complète).
 */
export const moduleRegistry: ModuleManifest[] = [
  demoModuleManifest,
  arcModuleManifest,
  empriseLateraleModuleManifest,
  raccVertModuleManifest,
];
