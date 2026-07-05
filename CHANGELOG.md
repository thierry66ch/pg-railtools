# Changelog — Base commune (portail + packages/commun)

Toutes les évolutions fonctionnelles notables de la base commune sont documentées ici.
Format de version : majeur.mineur (voir §9 du cahier des charges). Chaque module a son propre
`CHANGELOG.md` (ex. [packages/module-demo/CHANGELOG.md](packages/module-demo/CHANGELOG.md)).

## 0.1 — 2026-07-05

Version initiale de la base commune :

- **Portail** (`apps/portail`) : page d'accueil listant les modules disponibles (nom, texte
  descriptif, version), layout commun, thème visuel de base, sélecteur de langue fonctionnel
  (FR uniquement), page "À propos" avec historique des versions.
- **Librairie commune** (`packages/commun`) : utilitaires géométriques 2D, gestion des
  unités/échelles, couche de stockage local générique (données communes vs données par module),
  gestion de projets utilisateur (CRUD + export/import individuel), export/import en vrac de
  l'environnement d'un module, export PDF/Markdown/PNG à l'échelle, composants UI partagés,
  utilitaire d'affichage de version/build, i18n prête pour la traduction.
- Module de démonstration (`packages/module-demo`) illustrant l'utilisation de chaque brique
  commune, servant de référence pour les futurs projets de modules.
