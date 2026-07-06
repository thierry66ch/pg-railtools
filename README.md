# RailTools

Portail de modules web indépendants de calcul géométrique pour la planification de
tracés de voie en modélisme ferroviaire.

Monorepo pnpm :

- `apps/portail` — portail Next.js (navigation, layout commun, i18n, thème).
- `packages/commun` — librairie partagée (géométrie, unités/échelles, dessin technique
  annoté à l'échelle avec cotes CAO, stockage local, gestion de projets, exports
  PDF/Markdown/PNG, composants UI, versionnage).
- `packages/module-demo` — module de démonstration, référence pour tout nouveau module.

## Démarrer

```
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
```

## Ajouter un module

Voir [`docs/integration.md`](docs/integration.md) pour la marche à suivre détaillée,
[`docs/pieges-a-eviter.md`](docs/pieges-a-eviter.md) pour les erreurs déjà rencontrées à
ne pas reproduire, et `scaffold-module.md` pour le gabarit à copier au démarrage du
projet Claude Code d'un nouveau module.

## Versionnage

Voir [`CHANGELOG.md`](CHANGELOG.md) pour l'historique de la base commune. Chaque module a
son propre `CHANGELOG.md` et `version.json` (voir §4 de `docs/integration.md`).
