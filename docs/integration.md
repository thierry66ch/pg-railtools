# Documentation d'intégration — Ajouter un nouveau module

Ce document explique, concrètement, comment brancher un nouveau module de calcul
géométrique sur la base commune (`apps/portail` + `packages/commun`). Il complète
`scaffold-module.md` (gabarit de démarrage à copier dans le projet Claude Code du
module) en donnant les emplacements exacts de fichiers et les commandes à exécuter.

`packages/module-demo` est un exemple fonctionnel qui illustre chacune des étapes
ci-dessous — s'y référer en cas de doute.

## 1. Créer le package du module

```
packages/module-<nom>/
├── package.json
├── tsconfig.json
├── version.json          → { "version": "0.1", "build": 0 }
├── CHANGELOG.md           → changelog propre au module (voir §4)
└── src/
    ├── index.ts           → barrel exporté par le package
    ├── manifest.ts         → ModuleManifest (voir §2)
    ├── types.ts             → types des données du module (dont le contenu des projets)
    ├── i18n/
    │   ├── locales/fr.json
    │   └── messages.ts
    └── components/
        └── <Nom>ModulePage.tsx  → composant de page, consommé par apps/portail
```

`package.json` du module (copier depuis `packages/module-demo/package.json`) :

```json
{
  "name": "@railtools/module-<nom>",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "prebuild": "node ../../scripts/bump-build.mjs",
    "build": "echo 'no build step: consumed as TypeScript source via transpilePackages'"
  },
  "dependencies": {
    "@railtools/commun": "workspace:*",
    "next-intl": "^4.13.1"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

`tsconfig.json` étend `tsconfig.base.json` à la racine (voir celui de
`packages/module-demo`) ; `include` doit couvrir `src` et `version.json` (le manifest
importe ce fichier directement).

Le module est consommé comme **source TypeScript**, sans étape de build séparée : c'est
`transpilePackages` côté `apps/portail` (§3) qui le compile à la volée. Le script
`build` du package ne fait donc rien d'autre que confirmer ce choix.

## 2. Consommer `packages/commun`

Ne jamais redévelopper ce qui existe déjà dans `@railtools/commun` :

| Besoin | Import depuis `@railtools/commun` |
|---|---|
| Géométrie 2D (points, angles, arcs, intersections) | `geometry` (barrel racine) |
| Unités et échelles (mm/cm/m, Z/N/TT/H0/0/I/G, conversions) | `units` |
| Stockage local générique | `commonStorage`, `moduleStorage(moduleId)` |
| Projets utilisateur (CRUD + export/import individuel) | `projects` (`listProjects`, `createProject`, `updateProject`, `renameProject`, `duplicateProject`, `deleteProject`, `exportProjectToFile`, `importProjectFromFile`) |
| Export/import en vrac de l'environnement du module | `transfer/bulk` (`exportModuleEnvironment`, `importModuleEnvironment`) |
| Export PDF / Markdown / PNG à l'échelle | `export` (`exportElementToPdfFile`, `resultToMarkdown`/`exportResultToMarkdownFile`, `exportSvgToPngFile`) |
| Composants UI communs | `ui` (`Button`, `VersionBadge`, `LanguageSelector`, `UnitScaleSelector`, `ExportButtons`, `ProjectManager<T>`, `EnvironmentTransfer`, `ResultPageLayout`) |
| Thème visuel | `import '@railtools/commun/theme/tokens.css'` (déjà importé une fois dans `apps/portail/app/globals.css` — ne pas le réimporter dans le module, réutiliser les classes `.rt-*`) |

Tout appel à ces fonctions se fait avec l'identifiant du module (`moduleId`, ex. `'demo'`)
en paramètre pour les fonctions liées au stockage/projets — c'est cet identifiant qui
isole les données du module des autres (voir `src/storage/index.ts` et
`src/projects/index.ts` dans `packages/commun`).

Si un besoin générique manque dans `packages/commun`, l'ajouter là plutôt que de le
dupliquer localement dans le module (voir `packages/commun/src/index.ts` pour le barrel
à mettre à jour).

## 3. S'enregistrer dans le portail

Trois points d'intégration dans `apps/portail`, tous illustrés par le module `demo` :

1. **Manifest et registre** — le module exporte un `ModuleManifest`
   (`src/manifest.ts`, ex. `demoModuleManifest`) avec `id`, `route`, `i18nNamespace` et
   `version` (relu depuis `version.json`). Ajouter ce manifest dans
   [`apps/portail/lib/moduleRegistry.ts`](../apps/portail/lib/moduleRegistry.ts) :

   ```ts
   import { monModuleManifest } from '@railtools/module-<nom>';

   export const moduleRegistry: ModuleManifest[] = [demoModuleManifest, monModuleManifest];
   ```

   La page d'accueil (`apps/portail/app/page.tsx`) parcourt ce tableau automatiquement —
   aucune autre modification n'est nécessaire pour apparaître sur la page d'accueil.

2. **Route** — créer `apps/portail/app/modules/<nom>/page.tsx` :

   ```tsx
   import { MonModulePage } from '@railtools/module-<nom>';

   export default function Page() {
     return <MonModulePage />;
   }
   ```

   La `route` déclarée dans le manifest doit correspondre exactement à ce chemin.

3. **Traductions** — merger les messages du module dans
   [`apps/portail/i18n/request.ts`](../apps/portail/i18n/request.ts) :

   ```ts
   import { monModuleMessages } from '@railtools/module-<nom>';

   messages: {
     common: commonMessages[locale],
     portail: portailMessages[locale],
     moduleDemo: demoMessages[locale],
     monModule: monModuleMessages[locale], // clé = i18nNamespace du manifest
   }
   ```

   La clé utilisée ici doit correspondre au `i18nNamespace` du manifest : c'est cette
   clé que la page d'accueil utilise pour aller chercher dynamiquement
   `t(\`${module.i18nNamespace}.title\`)` et `t(\`${module.i18nNamespace}.description\`)`
   (texte descriptif public, but et limites du module — voir `fr.json` du module).

4. **transpilePackages** — ajouter le nom du package dans
   [`apps/portail/next.config.ts`](../apps/portail/next.config.ts) :

   ```ts
   transpilePackages: ['@railtools/commun', '@railtools/module-demo', '@railtools/module-<nom>'],
   ```

Aucune autre modification du portail n'est nécessaire : il ignore le détail métier du
module et se contente de l'afficher/router.

## 4. Versionnage et builds

- Le module a son propre `version.json` (`{ "version": "majeur.mineur", "build": n }`),
  indépendant de la base commune et des autres modules.
- Le script racine `scripts/bump-build.mjs` incrémente le `build` à chaque exécution du
  script `prebuild` du package (déclenché automatiquement avant `pnpm build` /
  `pnpm -r build`, via le hook npm standard `prebuild` → `build`). Le `version`
  (majeur.mineur) n'est **jamais** modifié automatiquement : il se change à la main dans
  `version.json` lors d'une évolution fonctionnelle, en même temps qu'une entrée est
  ajoutée au `CHANGELOG.md` du module.
- Incrémenter le **mineur** pour une évolution sans rupture, le **majeur** pour un
  changement significatif ou une rupture de compatibilité (ex. migration de structure de
  projet).
- Afficher la version dans l'interface du module via `<VersionBadge version={...}
  build={...} />` (voir `packages/module-demo/src/components/DemoModulePage.tsx` pour
  l'usage exact, en pied de page du module).
- La base commune (portail + `packages/commun`) est versionnée séparément, comme **une
  seule unité**, via le `version.json` et le `CHANGELOG.md` à la racine du monorepo — un
  module ne doit jamais modifier ces fichiers racine.

## 5. Checklist rapide

Voir `scaffold-module.md` §9 pour la checklist complète de conformité avant livraison
d'un module. En résumé, avant d'intégrer un module dans le portail :

- [ ] `pnpm --filter @railtools/module-<nom> typecheck` et `lint` passent.
- [ ] Le manifest est ajouté à `moduleRegistry.ts`, la route créée, les messages fusionnés
      dans `i18n/request.ts`, le package ajouté à `transpilePackages`.
- [ ] `pnpm build` (racine) réussit et bump correctement le build du module (vérifier
      `packages/module-<nom>/version.json`).
- [ ] `pnpm dev` — vérifier manuellement : apparition sur la page d'accueil avec texte
      descriptif et version, page du module fonctionnelle, sélecteur de langue,
      export PDF/Markdown/PNG, gestion de projets, export/import en vrac.
