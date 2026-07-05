/**
 * Export / import "en vrac" de tout l'environnement d'un module : configuration,
 * librairie d'éléments types, et l'ensemble des projets enregistrés — en une seule opération.
 */

import { dumpNamespace, moduleNamespace, restoreNamespace } from '../storage';
import { downloadJsonFile, readJsonFile } from './files';

interface ModuleEnvironmentEnvelope {
  kind: 'railtools-module-environment';
  moduleId: string;
  exportedAt: string;
  data: Record<string, unknown>;
}

export async function exportModuleEnvironment(moduleId: string): Promise<void> {
  const data = await dumpNamespace(moduleNamespace(moduleId));
  const envelope: ModuleEnvironmentEnvelope = {
    kind: 'railtools-module-environment',
    moduleId,
    exportedAt: new Date().toISOString(),
    data,
  };
  downloadJsonFile(`${moduleId}-environnement-complet.json`, envelope);
}

export async function importModuleEnvironment(moduleId: string, file: File): Promise<void> {
  const envelope = await readJsonFile<ModuleEnvironmentEnvelope>(file);
  if (envelope.kind !== 'railtools-module-environment' || envelope.moduleId !== moduleId) {
    throw new Error("Ce fichier ne correspond pas à l'environnement attendu pour ce module.");
  }
  await restoreNamespace(moduleNamespace(moduleId), envelope.data);
}
