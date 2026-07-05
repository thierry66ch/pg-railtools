/**
 * Gestion générique de "projets" utilisateur, identique pour tous les modules.
 * La structure du champ `data` reste propre à chaque module.
 */

import { moduleStorage } from '../storage';
import { downloadJsonFile, generateId, readJsonFile } from '../transfer/files';

export interface Project<T> {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: T;
}

interface ProjectFileEnvelope<T> {
  kind: 'railtools-project';
  moduleId: string;
  project: Project<T>;
}

const INDEX_KEY = 'projects:index';

function projectKey(id: string): string {
  return `project:${id}`;
}

async function readIndex(moduleId: string): Promise<string[]> {
  const index = await moduleStorage(moduleId).get<string[]>(INDEX_KEY);
  return index ?? [];
}

async function writeIndex(moduleId: string, ids: string[]): Promise<void> {
  await moduleStorage(moduleId).set(INDEX_KEY, ids);
}

export async function listProjects<T>(moduleId: string): Promise<Project<T>[]> {
  const storage = moduleStorage(moduleId);
  const ids = await readIndex(moduleId);
  const projects: Project<T>[] = [];
  for (const id of ids) {
    const project = await storage.get<Project<T>>(projectKey(id));
    if (project) projects.push(project);
  }
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject<T>(moduleId: string, id: string): Promise<Project<T> | undefined> {
  return moduleStorage(moduleId).get<Project<T>>(projectKey(id));
}

export async function createProject<T>(moduleId: string, name: string, data: T): Promise<Project<T>> {
  const now = new Date().toISOString();
  const project: Project<T> = { id: generateId(), name, createdAt: now, updatedAt: now, data };
  const storage = moduleStorage(moduleId);
  await storage.set(projectKey(project.id), project);
  const ids = await readIndex(moduleId);
  await writeIndex(moduleId, [...ids, project.id]);
  return project;
}

export async function updateProject<T>(moduleId: string, id: string, data: T): Promise<Project<T>> {
  const storage = moduleStorage(moduleId);
  const existing = await storage.get<Project<T>>(projectKey(id));
  if (!existing) {
    throw new Error(`Project ${id} not found for module ${moduleId}`);
  }
  const updated: Project<T> = { ...existing, data, updatedAt: new Date().toISOString() };
  await storage.set(projectKey(id), updated);
  return updated;
}

export async function renameProject(moduleId: string, id: string, newName: string): Promise<void> {
  const storage = moduleStorage(moduleId);
  const existing = await storage.get<Project<unknown>>(projectKey(id));
  if (!existing) {
    throw new Error(`Project ${id} not found for module ${moduleId}`);
  }
  await storage.set(projectKey(id), {
    ...existing,
    name: newName,
    updatedAt: new Date().toISOString(),
  });
}

export async function duplicateProject<T>(
  moduleId: string,
  id: string,
  newName?: string,
): Promise<Project<T>> {
  const existing = await getProject<T>(moduleId, id);
  if (!existing) {
    throw new Error(`Project ${id} not found for module ${moduleId}`);
  }
  return createProject(moduleId, newName ?? `${existing.name} (copie)`, existing.data);
}

export async function deleteProject(moduleId: string, id: string): Promise<void> {
  const storage = moduleStorage(moduleId);
  await storage.remove(projectKey(id));
  const ids = await readIndex(moduleId);
  await writeIndex(
    moduleId,
    ids.filter((existingId) => existingId !== id),
  );
}

/** Déclenche le téléchargement d'un unique projet sous forme de fichier JSON. */
export async function exportProjectToFile(moduleId: string, id: string): Promise<void> {
  const project = await getProject(moduleId, id);
  if (!project) {
    throw new Error(`Project ${id} not found for module ${moduleId}`);
  }
  const envelope: ProjectFileEnvelope<unknown> = { kind: 'railtools-project', moduleId, project };
  const safeName = project.name.replace(/[^a-z0-9-_]+/gi, '_');
  downloadJsonFile(`${moduleId}-projet-${safeName}.json`, envelope);
}

/** Importe un projet exporté par `exportProjectToFile`, en le créant comme nouveau projet local. */
export async function importProjectFromFile<T>(moduleId: string, file: File): Promise<Project<T>> {
  const envelope = await readJsonFile<ProjectFileEnvelope<T>>(file);
  if (envelope.kind !== 'railtools-project') {
    throw new Error('Fichier de projet invalide');
  }
  return createProject(moduleId, envelope.project.name, envelope.project.data);
}
