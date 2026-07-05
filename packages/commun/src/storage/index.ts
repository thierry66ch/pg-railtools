/**
 * Couche de stockage local générique, commune à tous les modules.
 *
 * - Espace de nommage "global" pour les données communes partagées (langue, unité/échelle
 *   préférée...), accessible via `commonStorage`.
 * - Un espace de nommage par module pour ses données propres (config, librairie d'éléments
 *   types, projets), obtenu via `moduleStorage(moduleId)`.
 *
 * L'API est volontairement asynchrone (bien que l'implémentation actuelle repose sur
 * `localStorage`, qui est synchrone) afin de pouvoir basculer vers IndexedDB plus tard
 * sans changer l'API consommée par les modules.
 */

const STORAGE_PREFIX = 'railtools';
const GLOBAL_NAMESPACE = 'global';
const SCHEMA_VERSION_SUFFIX = '__schemaVersion';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function buildKey(namespace: string, key: string): string {
  return `${STORAGE_PREFIX}:${namespace}:${key}`;
}

function parseKey(rawKey: string, namespace: string): string | null {
  const prefix = `${STORAGE_PREFIX}:${namespace}:`;
  return rawKey.startsWith(prefix) ? rawKey.slice(prefix.length) : null;
}

export interface NamespacedStorage {
  /** Lit une valeur. Retourne `undefined` si absente. */
  get<T>(key: string): Promise<T | undefined>;
  /** Écrit une valeur (sérialisée en JSON). */
  set<T>(key: string, value: T): Promise<void>;
  /** Supprime une clé. */
  remove(key: string): Promise<void>;
  /** Liste les clés (sans le préfixe interne) présentes dans cet espace de nommage. */
  list(): Promise<string[]>;
  /** Supprime toutes les clés de cet espace de nommage. */
  clear(): Promise<void>;
  /** Numéro de schéma courant stocké pour cet espace de nommage (pour migrations futures). */
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;
}

function createNamespacedStorage(namespace: string): NamespacedStorage {
  return {
    async get<T>(key: string): Promise<T | undefined> {
      if (!isBrowser()) return undefined;
      const raw = window.localStorage.getItem(buildKey(namespace, key));
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      if (!isBrowser()) return;
      window.localStorage.setItem(buildKey(namespace, key), JSON.stringify(value));
    },

    async remove(key: string): Promise<void> {
      if (!isBrowser()) return;
      window.localStorage.removeItem(buildKey(namespace, key));
    },

    async list(): Promise<string[]> {
      if (!isBrowser()) return [];
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const rawKey = window.localStorage.key(i);
        if (!rawKey) continue;
        const parsed = parseKey(rawKey, namespace);
        if (parsed !== null && parsed !== SCHEMA_VERSION_SUFFIX) {
          keys.push(parsed);
        }
      }
      return keys;
    },

    async clear(): Promise<void> {
      if (!isBrowser()) return;
      const keys = await this.list();
      for (const key of keys) {
        window.localStorage.removeItem(buildKey(namespace, key));
      }
      window.localStorage.removeItem(buildKey(namespace, SCHEMA_VERSION_SUFFIX));
    },

    async getSchemaVersion(): Promise<number> {
      const version = await this.get<number>(SCHEMA_VERSION_SUFFIX);
      return version ?? 1;
    },

    async setSchemaVersion(version: number): Promise<void> {
      await this.set(SCHEMA_VERSION_SUFFIX, version);
    },
  };
}

/** Stockage des données communes partagées entre tous les modules. */
export const commonStorage: NamespacedStorage = createNamespacedStorage(GLOBAL_NAMESPACE);

/** Stockage propre à un module donné (config, éléments types, projets). */
export function moduleStorage(moduleId: string): NamespacedStorage {
  return createNamespacedStorage(`module-${moduleId}`);
}

/** Dump brut de toutes les paires clé/valeur d'un espace de nommage (pour l'export en vrac). */
export async function dumpNamespace(namespace: string): Promise<Record<string, unknown>> {
  if (!isBrowser()) return {};
  const prefix = `${STORAGE_PREFIX}:${namespace}:`;
  const dump: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const rawKey = window.localStorage.key(i);
    if (!rawKey || !rawKey.startsWith(prefix)) continue;
    const raw = window.localStorage.getItem(rawKey);
    if (raw === null) continue;
    try {
      dump[rawKey.slice(prefix.length)] = JSON.parse(raw);
    } catch {
      // Ignore une entrée corrompue plutôt que de faire échouer tout le dump.
    }
  }
  return dump;
}

/** Restaure un dump produit par `dumpNamespace` dans un espace de nommage (écrase les clés existantes). */
export async function restoreNamespace(
  namespace: string,
  dump: Record<string, unknown>,
): Promise<void> {
  if (!isBrowser()) return;
  for (const [key, value] of Object.entries(dump)) {
    window.localStorage.setItem(buildKey(namespace, key), JSON.stringify(value));
  }
}

export function moduleNamespace(moduleId: string): string {
  return `module-${moduleId}`;
}

export { GLOBAL_NAMESPACE };
