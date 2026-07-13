/**
 * CRUD générique pour une "bibliothèque" d'éléments propres à un module (ex. véhicules,
 * éléments de voie), indépendante des projets utilisateur et partagée entre eux.
 *
 * Un module peut avoir plusieurs bibliothèques distinctes (formes d'item différentes) :
 * elles sont isolées entre elles par le paramètre `kind`. Même mécanisme de stockage que
 * `projects/index.ts` (index + `moduleStorage(moduleId)`), mais paramétré par un type
 * d'item générique plutôt que figé sur la notion de "projet".
 */

import { moduleStorage } from '../storage';
import { generateId } from '../transfer/files';

export interface LibraryItem {
  id: string;
  name: string;
}

export interface LibraryHandle<T extends LibraryItem> {
  listItems(): Promise<T[]>;
  createItem(data: Omit<T, 'id'>): Promise<T>;
  updateItem(id: string, data: Omit<T, 'id'>): Promise<T>;
  deleteItem(id: string): Promise<void>;
  duplicateItem(id: string, newName?: string): Promise<T>;
}

function indexKey(kind: string): string {
  return `library:${kind}:index`;
}

function itemKey(kind: string, id: string): string {
  return `library:${kind}:item:${id}`;
}

/** Crée un handle CRUD pour une bibliothèque `kind` propre au module `moduleId`. */
export function itemLibrary<T extends LibraryItem>(moduleId: string, kind: string): LibraryHandle<T> {
  const storage = moduleStorage(moduleId);

  async function readIndex(): Promise<string[]> {
    return (await storage.get<string[]>(indexKey(kind))) ?? [];
  }

  async function writeIndex(ids: string[]): Promise<void> {
    await storage.set(indexKey(kind), ids);
  }

  async function listItems(): Promise<T[]> {
    const ids = await readIndex();
    const items: T[] = [];
    for (const id of ids) {
      const item = await storage.get<T>(itemKey(kind, id));
      if (item) items.push(item);
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function createItem(data: Omit<T, 'id'>): Promise<T> {
    const item = { ...data, id: generateId() } as T;
    await storage.set(itemKey(kind, item.id), item);
    const ids = await readIndex();
    await writeIndex([...ids, item.id]);
    return item;
  }

  async function updateItem(id: string, data: Omit<T, 'id'>): Promise<T> {
    const existing = await storage.get<T>(itemKey(kind, id));
    if (!existing) {
      throw new Error(`Library item ${id} not found for ${moduleId}/${kind}`);
    }
    const updated = { ...existing, ...data, id } as T;
    await storage.set(itemKey(kind, id), updated);
    return updated;
  }

  async function deleteItem(id: string): Promise<void> {
    await storage.remove(itemKey(kind, id));
    const ids = await readIndex();
    await writeIndex(ids.filter((existingId) => existingId !== id));
  }

  async function duplicateItem(id: string, newName?: string): Promise<T> {
    const existing = await storage.get<T>(itemKey(kind, id));
    if (!existing) {
      throw new Error(`Library item ${id} not found for ${moduleId}/${kind}`);
    }
    const rest = { ...existing };
    delete (rest as Partial<T>).id;
    return createItem({ ...rest, name: newName ?? `${existing.name} (copie)` });
  }

  return { listItems, createItem, updateItem, deleteItem, duplicateItem };
}
