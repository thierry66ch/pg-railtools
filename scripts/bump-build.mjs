#!/usr/bin/env node
/**
 * Incrémente le numéro de build (compteur strictement croissant, indépendant du numéro de
 * version majeur.mineur) d'un ou plusieurs `version.json`.
 *
 * Lancé automatiquement via le script "prebuild" de chaque package/app, donc à chaque
 * `next build` — et donc à chaque déploiement Vercel — sans configuration CI additionnelle.
 *
 * ATTENTION : seul le `prebuild` d'`apps/portail` s'exécute réellement lors d'un
 * déploiement (Vercel ne build que le portail ; les modules sont consommés comme source
 * TypeScript via `transpilePackages`, leur propre script `build`/`prebuild` n'est donc
 * jamais déclenché en prod). C'est pourquoi le `prebuild` du portail passe explicitement
 * le `version.json` du portail **et** celui de chaque module actif — voir
 * `apps/portail/package.json` et `docs/pieges-a-eviter.md`. Oublier d'ajouter un nouveau
 * module à cette liste laisse son numéro de build figé indéfiniment.
 *
 * Usage :
 *   node ../../scripts/bump-build.mjs                              (bump ./version.json)
 *   node ../../scripts/bump-build.mjs ../../version.json ../../packages/module-x/version.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const targets = process.argv.slice(2);

async function bumpOne(target) {
  const versionFilePath = resolve(process.cwd(), target);

  let current;
  try {
    current = JSON.parse(await readFile(versionFilePath, 'utf8'));
  } catch {
    current = { version: '0.1', build: 0 };
  }

  const next = { version: current.version ?? '0.1', build: (current.build ?? 0) + 1 };
  await writeFile(versionFilePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`[bump-build] ${versionFilePath} -> version ${next.version}, build ${next.build}`);
}

for (const target of targets.length > 0 ? targets : ['version.json']) {
  await bumpOne(target);
}
