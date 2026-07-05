#!/usr/bin/env node
/**
 * Incrémente le numéro de build (compteur strictement croissant, indépendant du numéro de
 * version majeur.mineur) d'un package/app, en le lisant/écrivant dans son `version.json`.
 *
 * Lancé automatiquement via le script "prebuild" de chaque package/app, donc à chaque
 * `next build` — et donc à chaque déploiement Vercel — sans configuration CI additionnelle.
 *
 * Usage :
 *   node ../../scripts/bump-build.mjs                 (bump ./version.json, relatif au cwd)
 *   node ../../scripts/bump-build.mjs ../../version.json  (bump un fichier version.json précis)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const target = process.argv[2] ?? 'version.json';
const versionFilePath = resolve(process.cwd(), target);

async function readVersionFile() {
  try {
    const raw = await readFile(versionFilePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { version: '0.1', build: 0 };
  }
}

const current = await readVersionFile();
const next = { version: current.version ?? '0.1', build: (current.build ?? 0) + 1 };

await writeFile(versionFilePath, `${JSON.stringify(next, null, 2)}\n`);

console.log(`[bump-build] ${versionFilePath} -> version ${next.version}, build ${next.build}`);
