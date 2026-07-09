#!/usr/bin/env node
/**
 * Fixe le numéro de build (indépendant du numéro de version majeur.mineur) d'un ou
 * plusieurs `version.json`, calculé à partir de l'heure de build — pas un compteur lu puis
 * incrémenté depuis le fichier.
 *
 * Pourquoi un calcul plutôt qu'un compteur persistant : Vercel ne build QUE
 * `apps/portail` (les modules sont consommés comme source TypeScript via
 * `transpilePackages`, jamais buildés séparément — voir `docs/integration.md`). Le
 * `version.json` réécrit par ce script pendant le build Vercel vit dans un système de
 * fichiers **éphémère** : rien ne le committe dans le dépôt Git. Un vrai compteur
 * "lire N, écrire N+1" repartirait donc de la même valeur figée dans Git à chaque
 * déploiement (observé en usage réel : le build semblait "revenir à 0 ou 1" à chaque
 * push, voir `docs/pieges-a-eviter.md`). Un nombre dérivé de l'heure de build n'a pas ce
 * problème : il n'a besoin d'aucun état persistant, donc rien à perdre entre deux builds.
 *
 * Lancé via le script "prebuild" de chaque package/app (déclenché avant `next build`) —
 * voir `apps/portail/package.json` pour la liste des `version.json` à jour à chaque
 * déploiement.
 *
 * Usage :
 *   node ../../scripts/bump-build.mjs                              (./version.json)
 *   node ../../scripts/bump-build.mjs ../../version.json ../../packages/module-x/version.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Référence (avant le premier commit du projet) pour garder des numéros de build courts. */
const BUILD_EPOCH_MS = Date.parse('2026-07-01T00:00:00Z');

/** Minutes écoulées depuis `BUILD_EPOCH_MS` : entier croissant avec le temps, jamais réinitialisé. */
function computeBuildNumber() {
  return Math.floor((Date.now() - BUILD_EPOCH_MS) / 60_000);
}

const targets = process.argv.slice(2);
const buildNumber = computeBuildNumber();

async function setOne(target) {
  const versionFilePath = resolve(process.cwd(), target);

  let current;
  try {
    current = JSON.parse(await readFile(versionFilePath, 'utf8'));
  } catch {
    current = { version: '0.1' };
  }

  const next = { version: current.version ?? '0.1', build: buildNumber };
  await writeFile(versionFilePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`[bump-build] ${versionFilePath} -> version ${next.version}, build ${next.build}`);
}

for (const target of targets.length > 0 ? targets : ['version.json']) {
  await setOne(target);
}
