# Cahier des charges — Base commune du portail de modules de calcul géométrique (modélisme ferroviaire)

## 1. Contexte et objectif

Le projet consiste à créer une **base commune** destinée à fédérer une série de petits modules web indépendants, chacun dédié à un calcul géométrique précis dans le cadre de la planification de tracés de voie pour modèles réduits de chemin de fer (rayons de courbure, raccordements, aiguillages, gabarits, etc.).

Chaque module sera conçu, développé et maintenu séparément (dans son propre projet Claude Code), mais tous s'appuient sur :
- un **portail** commun qui les fédère et permet la navigation entre eux ;
- une **librairie de fonctions partagées** (géométrie, unités, stockage, gestion de projets, export) ;
- des **conventions communes** de structure, de design, de versionnage et de comportement.

Ce document couvre uniquement la **base commune** : le portail et la librairie partagée. Le développement de chaque module fait l'objet d'un projet Claude Code séparé, initié à partir du document de gabarit associé (`scaffold-module.md`).

Public cible : modélistes ferroviaires amateurs. Usage occasionnel, pas de charge serveur significative attendue.

## 2. Architecture générale

**Monorepo** avec workspaces (npm ou pnpm — pnpm recommandé), structuré ainsi :

```
/ (racine du monorepo)
├── apps/
│   └── portail/              → App Next.js (React), portail + toutes les routes de modules
├── packages/
│   ├── commun/               → Librairie partagée (voir §4)
│   └── module-<nom>/         → Un dossier par module (ajouté au fil du temps)
├── package.json              → Racine, définit les workspaces
└── ...
```

- **Un seul déploiement Vercel** pour l'app `portail`, qui contient une route par module (ex. `/modules/rayon-courbure`).
- Chaque `packages/module-<nom>` contient la logique métier et les composants du module ; l'app `portail` les importe comme dépendances locales de workspace (pas de publication npm).
- Aucune base de données ni backend applicatif : tout ce qui doit persister (configurations, librairies d'éléments types, projets utilisateur) est stocké **côté client** (localStorage / IndexedDB selon le volume de données).
- Pas d'authentification utilisateur dans cette première version.

## 3. Le portail (`apps/portail`)

### 3.1 Fonctions du portail
- Page d'accueil listant les modules disponibles (nom, **texte descriptif court** — but et limites en un coup d'œil —, icône/vignette, lien, numéro de version affiché).
- Layout commun (en-tête, pied de page, navigation) partagé par toutes les pages de modules.
- Système de thème visuel cohérent (couleurs, typographie, composants UI de base) utilisé par tous les modules.
- Sélecteur de langue (voir §7 — internationalisation), même si seul le français est disponible au lancement.
- Page "À propos" / mentions, incluant un espace pour l'historique des versions de la base commune (voir §9).

### 3.2 Ce que le portail n'est PAS responsable de faire
- Le portail ne connaît pas le détail métier de chaque module ; il se contente de les afficher et d'assurer la navigation. La logique de calcul reste dans chaque `packages/module-<nom>`.

## 4. Librairie commune (`packages/commun`)

Cette librairie regroupe tout ce qui est réutilisable entre modules. Elle doit être pensée comme une **API stable** que les futurs modules pourront consommer sans redévelopper ces briques.

### 4.1 Utilitaires géométriques de base
- Fonctions génériques de géométrie 2D réutilisables (points, vecteurs, angles, arcs, intersections, conversions degré/radian, etc.) — le socle mathématique commun à plusieurs calculs de tracé de voie.
- Ne pas inclure ici de logique métier spécifique à un module (ex. calcul d'un aiguillage particulier) : uniquement les briques génériques.

### 4.2 Gestion des unités et échelles
- Gestion des unités de longueur (mm, cm, m) et des échelles de modélisme ferroviaire courantes (Z, N, TT, H0, 0, I, G, etc., avec leur ratio réel/modèle).
- Fonctions de conversion entre unités réelles et unités à l'échelle.
- Valeurs par défaut configurables (unité préférée, échelle préférée).

### 4.3 Distinction données communes / données propres, et stockage local générique
Deux catégories de données coexistent, et la librairie commune doit permettre de les gérer de façon homogène :
- **Données communes partagées** : réglages qui ont du sens pour l'ensemble des modules (ex. langue choisie, unité/échelle préférée par défaut). Stockées via une clé de stockage commune, accessible à tous les modules.
- **Données propres à un module** : configuration spécifique, librairie d'éléments types personnalisables (ex. segments de voie type, véhicules types), et projets utilisateur (voir §4.4). Stockées sous un espace de nommage propre à chaque module, mais via la même API commune.

Cette API de stockage générique (get/set/remove/list, avec espace de nommage par module ou "global") garantit une manière homogène de faire évoluer le stockage (ex. migration de schéma) à travers tous les modules, tout en gardant les données de chaque module isolées les unes des autres.

### 4.4 Gestion de « projets » utilisateur
- Chaque module permet d'enregistrer les données saisies par l'utilisateur sous forme de **projets nommés** (ex. « Mon réseau du grenier »), sauvegardés localement.
- Fonctions communes attendues : créer, lister, ouvrir, renommer, dupliquer, supprimer un projet — la structure interne du contenu d'un projet reste propre à chaque module, mais le mécanisme de gestion (CRUD, stockage, listing) est fourni par la base commune afin d'être identique dans tous les modules.
- Chaque projet doit pouvoir être **exporté/importé individuellement**, pour être transféré facilement d'un navigateur/appareil à un autre (fichier téléchargeable, ou méthode plus légère à évaluer — voir §10), indépendamment de l'export/import en vrac décrit au §4.5.

### 4.5 Import / export et transfert entre navigateurs
Deux niveaux d'export/import, tous deux fournis comme utilitaires communs réutilisables (ex. boutons prêts à intégrer) :
1. **Par projet** (voir §4.4) : export/import ciblé d'un seul projet, pour un transfert rapide et léger.
2. **En vrac** : export/import de l'ensemble de l'environnement d'un module (configuration, librairie d'éléments types, et l'ensemble des projets enregistrés) en une seule opération — utile pour une sauvegarde complète ou un changement de navigateur/appareil.

Le contenu exact exporté à chaque niveau est propre à chaque module ; seul le mécanisme (format JSON, déclenchement, structure du fichier) est commun.

### 4.6 Export des pages de résultat
- **Export PDF** : fonction commune capable de transformer une page de résultat (dessin et/ou tableau) en PDF.
- **Export Markdown** : fonction commune capable de transformer les mêmes résultats (essentiellement les données tabulaires/texte) en fichier Markdown.
- **Export PNG du dessin** : lorsqu'un module produit un dessin à l'échelle (SVG), fonction commune pour l'exporter en PNG **à l'échelle définie**, avec fond transparent.
- Ces fonctions doivent être conçues comme des utilitaires génériques prenant en entrée une structure de données commune (ex. un composant React de résultat, ou un nœud SVG + un tableau de données), afin que chaque module n'ait qu'à fournir son contenu dans le format attendu, sans réimplémenter l'export.

### 4.7 Composants UI partagés
- Composants React communs réutilisables entre modules : boutons d'export, sélecteur d'unité/échelle, gestion de la librairie d'éléments types, gestion de projets (liste, création, ouverture, suppression), mise en page standard d'une page de résultat, affichage du numéro de version/build.

## 5. Contraintes techniques

- **Stack** : Next.js + React, TypeScript recommandé pour fiabiliser le partage de types entre `commun` et les modules.
- **Hébergement** : Vercel, un seul déploiement pour le portail incluant tous les modules.
- **Pas de backend** ni de base de données : toute donnée persistante est locale au navigateur.
- **Charge serveur faible** attendue (usage occasionnel) — pas d'exigence de scalabilité particulière, pas de cache serveur complexe nécessaire.
- **Responsive** : les modules doivent être utilisables sur ordinateur et tablette a minima (le mobile n'est pas prioritaire vu l'usage — dessins techniques).

## 6. Internationalisation (i18n)

- Langue de base : français.
- Bien que seule la version française soit livrée dans un premier temps, **toute l'architecture texte doit être prête pour la traduction** :
  - Aucun texte en dur dans les composants ; tous les libellés passent par un système de clés de traduction (ex. `react-i18next` ou équivalent Next.js natif).
  - Fichiers de traduction structurés par langue dans `packages/commun` (textes communs : boutons d'export, unités, etc.) et dans chaque module (textes spécifiques, y compris le texte descriptif du module).
  - Le sélecteur de langue du portail doit être fonctionnel dès le départ, même avec une seule langue disponible.

## 7. Exigences non-fonctionnelles

- Accessibilité de base (contrastes suffisants, navigation clavier sur les composants communs).
- Simplicité de maintenance : conventions de code, structure de dossiers et documentation claire pour qu'un futur projet Claude Code de module puisse s'y greffer sans ambiguïté.
- Pas de dépendance à des services tiers payants (au-delà de l'hébergement Vercel).

## 8. Livrables attendus de ce projet (base commune)

1. Structure du monorepo initialisée (workspaces, configuration TypeScript/Next.js partagée, linting).
2. App `apps/portail` fonctionnelle avec :
   - page d'accueil listant les modules (vide ou avec un module de démonstration), avec texte descriptif et numéro de version par module,
   - layout commun, thème visuel de base,
   - sélecteur de langue fonctionnel (FR uniquement pour l'instant).
3. Package `packages/commun` fonctionnel incluant :
   - utilitaires géométriques de base,
   - gestion des unités/échelles,
   - couche de stockage local générique avec distinction données communes / données propres à un module,
   - gestion de projets utilisateur (CRUD + export/import individuel),
   - fonctions d'export/import en vrac de l'environnement d'un module,
   - fonctions d'export PDF, Markdown, et PNG à l'échelle (fond transparent),
   - composants UI partagés de base,
   - utilitaire commun de gestion de version/build (voir §9).
4. Documentation d'intégration : comment un nouveau module doit consommer `packages/commun`, où placer son code, comment s'enregistrer dans la navigation du portail, comment appliquer les conventions de versionnage.
5. Un module de démonstration minimal (ou "module vide") illustrant l'utilisation de chaque brique commune, servant de référence pour les futurs projets de modules.
6. Un `CHANGELOG.md` initialisé pour la base commune (voir §9).

## 9. Gestion des versions et des builds

- **Numéro de build** : chaque build (de la base commune, et de chaque module indépendamment) est numéroté de façon systématique et strictement croissante (ex. incrémenté automatiquement à chaque déploiement ou à chaque commit significatif — modalité technique exacte à définir : script, ou métadonnée CI).
- **Numéro de version fonctionnelle** : en parallèle du build, chaque module ET la base commune ont chacun un numéro de version indépendant au format **majeur.mineur** (ex. `1.3`) :
  - incrémentation du **mineur** pour une évolution fonctionnelle sans rupture,
  - incrémentation du **majeur** pour un changement significatif ou une rupture de compatibilité,
  - le numéro de build n'influence pas ce numéro de version — ce sont deux compteurs indépendants (le build trace le processus de mise en production, la version trace l'évolution fonctionnelle perçue par l'utilisateur).
- **Historique des modifications** : chaque incrémentation de version (majeure ou mineure) doit être documentée dans un `CHANGELOG.md` propre à la base commune, et un `CHANGELOG.md` propre à chaque module, décrivant les changements fonctionnels apportés.
- **Affichage** : le numéro de version (et idéalement le build) de chaque module doit être visible sur sa page (ex. pied de page), et le numéro de version de la base commune doit être visible sur le portail. La librairie commune fournit un composant/utilitaire prêt à l'emploi pour cet affichage.

## 10. Points ouverts (à trancher pendant le développement)

- npm vs pnpm pour les workspaces (recommandation : pnpm).
- Choix de la librairie i18n exacte (react-i18next / next-intl / autre).
- Format exact de stockage local (localStorage simple vs IndexedDB) selon le volume de données des librairies d'éléments types et des projets.
- Mécanisme précis du "transfert facilité entre navigateurs" (simple fichier téléchargé/importé, ou méthode additionnelle comme un lien encodé/QR code) — à valider selon le volume de données, mais l'API commune (par projet et en vrac) doit rester la même dans son principe.
- Modalité technique exacte d'incrémentation automatique du numéro de build (script local, hook CI/Vercel, etc.).
