import type { ModuleManifest } from '@railtools/commun';
import { demoModuleManifest } from '@railtools/module-demo';

/**
 * Liste des modules affichés sur le portail. Chaque nouveau module ajoute son manifeste ici
 * (voir docs/integration.md pour la procédure d'enregistrement complète).
 */
export const moduleRegistry: ModuleManifest[] = [demoModuleManifest];
