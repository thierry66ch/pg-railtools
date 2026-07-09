# Documentation d'intégration — Ajouter un nouveau module

Ce document explique, concrètement, comment brancher un nouveau module de calcul
géométrique sur la base commune (`apps/portail` + `packages/commun`). Il complète
`scaffold-module.md` (gabarit de démarrage à copier dans le projet Claude Code du
module) en donnant les emplacements exacts de fichiers et les commandes à exécuter.

`packages/module-demo` est un exemple fonctionnel qui illustre chacune des étapes
ci-dessous — s'y référer en cas de doute.

**Avant de commencer**, lire [`pieges-a-eviter.md`](pieges-a-eviter.md) : des erreurs
réelles rencontrées pendant le développement de la base commune (certaines corrigées puis
réintroduites par erreur), qui coûteront moins cher à éviter qu'à redécouvrir.

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

| Besoin                                                                                                                                                                                     | Import depuis `@railtools/commun`                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Géométrie 2D (points, angles, arcs, intersections)                                                                                                                                         | `geometry` (barrel racine)                                                                                                                                                                       |
| Unités et échelles (mm/cm/m, Z/N/TT/H0/0/I/G, conversions)                                                                                                                                 | `units`                                                                                                                                                                                          |
| Dessin technique annoté à l'échelle (si le module produit un dessin SVG) : échelle de dessin, styles de trait CAO, cotes (longueur, rayon, angle, longueur d'arc, niveau), barre d'échelle | `drawing` (barrel — voir §2bis)                                                                                                                                                                  |
| Champ numérique tolérant virgule/point (saisie utilisateur)                                                                                                                                | `ui` (`NumberInput`) — ne pas utiliser `<input type="number">` nu, voir `pieges-a-eviter.md`                                                                                                     |
| Stockage local générique                                                                                                                                                                   | `commonStorage`, `moduleStorage(moduleId)`                                                                                                                                                       |
| Projets utilisateur (CRUD + export/import individuel)                                                                                                                                      | `projects` (`listProjects`, `createProject`, `updateProject`, `renameProject`, `duplicateProject`, `deleteProject`, `exportProjectToFile`, `importProjectFromFile`)                              |
| Export/import en vrac de l'environnement du module                                                                                                                                         | `transfer/bulk` (`exportModuleEnvironment`, `importModuleEnvironment`)                                                                                                                           |
| Export PDF / Markdown / PNG à l'échelle                                                                                                                                                    | `ui` (`<ExportButtons resultData={...} getSvgElement={...} projectName={...} />` — voir §2ter, gère tout automatiquement)                                                                        |
| Composants UI communs                                                                                                                                                                      | `ui` (`Button`, `VersionBadge`, `LanguageSelector`, `UnitScaleSelector`, `DrawingScaleSelector`, `NumberInput`, `ExportButtons`, `ProjectManager<T>`, `EnvironmentTransfer`, `ResultPageLayout`) |
| Thème visuel                                                                                                                                                                               | `import '@railtools/commun/theme/tokens.css'` (déjà importé une fois dans `apps/portail/app/globals.css` — ne pas le réimporter dans le module, réutiliser les classes `.rt-*`)                  |

Tout appel à ces fonctions se fait avec l'identifiant du module (`moduleId`, ex. `'demo'`)
en paramètre pour les fonctions liées au stockage/projets — c'est cet identifiant qui
isole les données du module des autres (voir `src/storage/index.ts` et
`src/projects/index.ts` dans `packages/commun`).

Si un besoin générique manque dans `packages/commun`, l'ajouter là plutôt que de le
dupliquer localement dans le module (voir `packages/commun/src/index.ts` pour le barrel
à mettre à jour).

## 2bis. Dessin technique annoté (si le module produit un dessin SVG)

Uniquement pertinent pour un module qui dessine une géométrie à l'échelle (voir
`packages/module-demo/src/components/DemoModulePage.tsx` pour un exemple complet). Le
pipeline à suivre, dans l'ordre :

1. Calculer toute la géométrie en **mm modèle réduit** (après conversion unité →
   `realToScale`, comme avant).
2. Résoudre l'échelle de dessin choisie par l'utilisateur (`DrawingScale`, distincte de
   l'échelle modèle — voir `pieges-a-eviter.md`) via `resolveDrawingScale(drawingScale,
   { width, height })`, où `{width, height}` est la taille de la géométrie en mm modèle.
3. Convertir chaque coordonnée en **mm de dessin** via `modelToDrawing(mm, resolved)`
   juste avant de les utiliser dans le SVG (jamais avant).
4. Construire le `viewBox` du SVG avec une marge interne par côté (mm de dessin) —
   suffisante pour que les cotes ne soient pas coupées, mais pas plus (voir
   `pieges-a-eviter.md` pour l'alignement de cette marge dans les exports).
5. Annoter avec les primitives de `drawing/cotes` : `LengthCote`, `RadiusCote`,
   `AngleCote`, `ArcLengthCote`, `LevelCote` — chacune prend un `sizing?:
   DimensionSizing` (calculé une fois via `suggestDimensionSizing()`, sans paramètre, et
   partagé entre toutes les cotes du dessin pour un rendu cohérent) et un `style?:
   LineStyle` (`drawing/lineStyle.ts` : continu, traitillé long/court, trait d'axe,
   pointillé).
6. Ajouter `<ScaleBar resolved={resolved} x={...} y={...} unitCaption="Cotes en mm" />`
   pour indiquer l'échelle de dessin réellement utilisée.
7. Ajouter `<DrawingScaleSelector value={drawingScale} onChange={...} />` dans la barre
   d'outils pour laisser l'utilisateur choisir l'échelle de dessin (1:1 à 1:50, ou "fit").

Persistance de l'échelle de dessin choisie : à la discrétion du module (préférence
globale via `getPreferredDrawingScale`/`setPreferredDrawingScale`, ou par projet en
l'ajoutant à la structure de données du projet — c'est le choix fait par `module-demo`).

## 2ter. Exports (PDF / Markdown / PNG) via `ExportButtons`

Un module n'a normalement **jamais besoin d'appeler directement**
`exportElementToPdfFile`/`resultToMarkdown`/`exportSvgToPngFile` : le composant
`<ExportButtons>` s'en charge à partir de `resultData` (voir `export/types.ts` pour
`ResultData`/`ResultTable`) :

```tsx
<ExportButtons
  filenameBase={`mon-module-${scale}`}
  resultData={resultData}       // { title, table?, notes?, drawingAlt? }
  getSvgElement={() => svgRef.current}  // omettre si le module ne dessine rien
  projectName={activeProjectName}       // nom du projet actif, pour le cartouche PDF et l'en-tête Markdown
/>
```

Points importants :

- Le **tableau** (`resultData.table`) est dessiné nativement dans le PDF (texte
  vectoriel jsPDF) — ne pas essayer de le capturer depuis le DOM (voir
  `pieges-a-eviter.md`, section html2canvas).
- Le **format PDF** (A4/A3 × paysage/portrait) est choisi par l'utilisateur via un
  sélecteur intégré à `ExportButtons` — rien à faire côté module.
- Le **cartouche PDF** (logo, nom de l'app, nom du module, projet, date) est généré
  automatiquement ; le nom du module vient de `resultData.title`.
- Si le module fournit un dessin (`getSvgElement`), il est placé à **l'échelle réelle**
  dans le PDF (1 mm de dessin = 1 mm papier, aucune mise à l'échelle automatique) — si le
  dessin dépasse la page, c'est à l'utilisateur de choisir une échelle de dessin adaptée
  et de refaire l'export (comportement voulu, pas un bug à corriger).
- L'export Markdown inclut le nom du projet et la date/heure de génération (pas la
  description du module).

## 3. S'enregistrer dans le portail

Trois points d'intégration dans `apps/portail`, tous illustrés par le module `demo` :

1. **Manifest et registre** — le module exporte un `ModuleManifest`
   (`src/manifest.ts`, ex. `demoModuleManifest`) avec `id`, `route`, `i18nNamespace`,
   `version` (relu depuis `version.json`) et, optionnellement, `icon` (petit composant
   React affiché à côté du titre sur la page d'accueil — voir `module-demo/src/icon.tsx`
   pour un exemple). Ajouter ce manifest dans
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

5. **Bump du build en déploiement** — ajouter le chemin du `version.json` du module au
   script `prebuild` d'[`apps/portail/package.json`](../apps/portail/package.json) :
   
   ```json
   "prebuild": "node ../../scripts/bump-build.mjs ../../version.json ../../packages/module-demo/version.json ../../packages/module-<nom>/version.json"
   ```
   
   **Indispensable** : le module est consommé comme source TypeScript (§1), son propre
   script `build`/`prebuild` n'est donc **jamais** exécuté par un déploiement réel (Vercel
   ne build qu'`apps/portail`). Sans cette ligne, le `build` de `packages/module-<nom>/
   version.json` reste figé à `0` indéfiniment, même après des dizaines de déploiements —
   voir §4 ci-dessous et `pieges-a-eviter.md`.

Aucune autre modification du portail n'est nécessaire : il ignore le détail métier du
module et se contente de l'afficher/router.

## 4. Versionnage et builds

- Le module a son propre `version.json` (`{ "version": "majeur.mineur", "build": n }`),
  indépendant de la base commune et des autres modules.
- Le script racine `scripts/bump-build.mjs` **calcule** le `build` d'un ou plusieurs
  `version.json` passés en argument, à partir de l'heure de build (minutes écoulées depuis
  une date de référence fixe) — ce n'est PAS un compteur relu puis incrémenté depuis le
  fichier. Le `version` (majeur.mineur) n'est **jamais** modifié automatiquement : il se
  change à la main dans `version.json` lors d'une évolution fonctionnelle, en même temps
  qu'une entrée est ajoutée au `CHANGELOG.md` du module.
- **Pourquoi un calcul plutôt qu'un compteur persistant** : un déploiement Vercel ne build
  QUE `apps/portail` (le module est consommé comme source TypeScript, §1) — le
  `version.json` réécrit par `prebuild` vit dans un système de fichiers **éphémère**, rien
  ne le committe dans Git. Un compteur "lire N, écrire N+1" repartirait donc de la même
  valeur figée dans Git à chaque déploiement, ce qui donnait l'impression que le build
  « revenait à 0 ou 1 » à chaque push (piège réel, voir `pieges-a-eviter.md`). Un nombre
  dérivé du temps n'a besoin d'aucun état persistant : rien à perdre entre deux builds,
  donc jamais de retour en arrière.
- Le `prebuild` d'`apps/portail` doit lister explicitement le `version.json` de chaque
  module actif (voir §3.5) : c'est le **seul** endroit qui s'exécute réellement à chaque
  déploiement. Oublier d'y ajouter un nouveau module laisse son build figé à sa valeur
  initiale indéfiniment.
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
