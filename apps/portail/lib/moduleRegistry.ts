import type { ModuleManifest } from '@railtools/commun';
import { demoModuleManifest } from '@railtools/module-demo';
import { arcModuleManifest } from '@railtools/module-arc';

/**
 * Liste des modules affichés sur le portail. Chaque nouveau module ajoute son manifeste ici
 * (voir docs/integration.md pour la procédure d'enregistrement complète).
 */
export const moduleRegistry: ModuleManifest[] = [demoModuleManifest, arcModuleManifest];
