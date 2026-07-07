# Gabarit de démarrage — Nouveau module du portail de calcul géométrique ferroviaire

> Ce document est à copier et compléter au début de chaque nouveau projet Claude Code de module. Les parties entre `[...]` sont à remplacer par les informations spécifiques au module. Les parties sans crochets décrivent le cadre commun à respecter, valable pour tous les modules.

## 0. Contexte du méta-projet (à ne pas modifier)

Ce module fait partie d'un ensemble de petits outils de calcul géométrique pour la planification de tracé de voie de modélisme ferroviaire. Il vient se greffer sur une **base commune** (portail + librairie partagée), développée séparément, disponible dans le même monorepo sous :

- `apps/portail` — le portail Next.js qui héberge la route de ce module,
- `packages/commun` — la librairie partagée (géométrie de base, unités/échelles, stockage local générique, gestion de projets, import/export, export PDF/Markdown/PNG, composants UI communs, gestion de version/build).

Ce module vit dans son propre dossier `packages/module-[nom-du-module]` et doit :

- réutiliser `packages/commun` pour tout ce qui est générique (ne pas redévelopper l'export PDF, la gestion des unités, la gestion de projets, etc.),
- exposer une page/route consommée par `apps/portail`,
- respecter les conventions ci-dessous pour rester cohérent avec les autres modules.

**Avant de commencer à coder**, lire `docs/integration.md` (marche à suivre détaillée,
emplacements de fichiers exacts) et surtout `docs/pieges-a-eviter.md` (erreurs réelles
déjà rencontrées — certaines corrigées puis réintroduites par erreur — sur l'échelle de
dessin, le dimensionnement des cotes, l'alignement des dessins dans les exports, et
l'export PDF/Markdown en général).

## 1. Description du module

- **Nom du module** : [Calculs d'arc]
- **Objectif** : [Développer une PWA de calcul géométrique pour dimensionner un arc de cercle à partir de sa corde et de sa flèche, et générer un tableau d'implantation de points répartis uniformément le long de l'arc pour le piquetage sur le terrain.]
- **Texte descriptif public** : [Calcule le rayon et la flèche d'un arc circulaire à partir de la corde, et génère un tableau d'implantation par écarts perpendiculaires (méthode des ordonnées). Hypothèse : arc de cercle parfait dans un plan horizontal ; ne prend pas en compte le dévers, le profil en long ni les tolérances de chantier.]
- **Entrées utilisateur** : [soit la corde AB et la flèche CD, soit le rayon et la corde AB, et le nombre d'intervalles pour un piquetage]
- **Résultats produits** : [selon données introduite, le rayon ou la flèche CD — valeur unique, si un intervalle de piquetage est donné, un tableau avec pour chaque distance AE/EB sur la corde la longueur perpendiculaire EF]
- **Besoin d'une librairie d'éléments types personnalisable ?** [Non]

## 2. Utilisation de la base commune

À réutiliser depuis `packages/commun` (ne pas dupliquer) :

- [ ] Fonctions géométriques de base nécessaires (préciser lesquelles : arcs, intersections, angles, etc.)

- [ ] Gestion des unités/échelles (préciser les échelles pertinentes pour ce module si restriction particulière)

- [ ] Champs numériques via `NumberInput` (jamais `<input type="number">` nu — voir `pieges-a-eviter.md`)

- [ ] Si le module produit un dessin technique : librairie `drawing` (échelle de dessin,
  
      styles de trait CAO, cotes de longueur/rayon/angle/longueur d'arc/niveau, barre
      d'échelle, `DrawingScaleSelector`) — voir `docs/integration.md` §2bis pour le
      pipeline exact (mm modèle → résolution de l'échelle de dessin → mm de dessin)

- [ ] Couche de stockage local générique

- [ ] Gestion de projets utilisateur (créer/lister/ouvrir/renommer/dupliquer/supprimer, export/import individuel)

- [ ] Fonction d'export/import en vrac de l'environnement du module (config + librairie d'éléments + tous les projets)

- [ ] `<ExportButtons resultData={...} getSvgElement={...} projectName={...} />` — gère
  
      automatiquement l'export PDF (tableau + dessin à l'échelle réelle + cartouche,
      choix du format A4/A3 paysage/portrait), Markdown (avec nom du projet + date) et
      PNG à l'échelle (fond transparent, si le module fournit `getSvgElement`) ; voir
      `docs/integration.md` §2ter — ne pas appeler les fonctions d'export bas niveau
      directement ni tenter de capturer le DOM soi-même

- [ ] Composants UI partagés (sélecteurs, boutons d'export, gestion de librairie d'éléments, gestion de projets)

- [ ] Composant d'affichage du numéro de version/build (voir §7)

## 3. Données du module

À bien distinguer dès la conception :

- **Données communes partagées** (gérées par `packages/commun`, ex. langue, unité/échelle préférée par défaut) : le module les lit/écrit via l'API commune, sans les redéfinir localement.
- **Données propres au module** :
  - configuration spécifique au module (préférences propres),
  - librairie d'éléments types personnalisables, si applicable (§1),
  - **projets utilisateur** : les données saisies par l'utilisateur pour un cas d'usage donné, enregistrées sous forme de projet nommé (ex. « Réseau du grenier »), via le mécanisme commun de gestion de projets. C'est la structure interne de ces projets (les champs, leur format) qui est propre à ce module — le mécanisme de sauvegarde/chargement/export est fourni par la base commune.

## 4. Spécificités du module (logique métier propre)

- **Calculs propres à ce module** : [voir le document Calcul_d_arc.md et la figure Calcul_d_arc.png]
- **Structure de données propre** : [un projet enregistre les valeurs saisies]
- **Règles de validation des entrées** : [voir le document Calcul_d_arc.md]
- **Cas particuliers à gérer** : [voir le document Calcul_d_arc.md]

## 5. Interface utilisateur du module

- Route dans le portail : `/modules/arc`
- Bandeau/en-tête reprenant le texte descriptif public (but et limites du module).
- Gestion de projets visible (créer un nouveau projet, ouvrir un projet existant, sauvegarder, exporter/importer ce projet).
- Formulaire de saisie des paramètres d'entrée (champs numériques via `NumberInput`).
- Zone de résultat : [tableau / dessin SVG à l'échelle (avec cotes et barre d'échelle, si pertinent) / les deux]
- Boutons d'action (via `<ExportButtons>`, voir §2) : Export PDF, Export Markdown, Export PNG (si dessin), Exporter ce projet, Importer un projet, Exporter tout l'environnement du module, Importer un environnement.
- Numéro de version/build du module affiché (ex. pied de page).
- Respect du thème visuel et du layout communs du portail (ne pas créer de style propre divergent).

## 6. Internationalisation

- Tous les textes du module passent par le système de traduction commun (aucun texte en dur), y compris le texte descriptif public du module.
- Les clés de traduction propres au module sont ajoutées dans un fichier de traduction dédié au module (structure alignée sur celle de `packages/commun`).
- Langue livrée initialement : français uniquement, mais structure prête pour l'ajout d'autres langues.

## 7. Versionnage et builds

- Ce module a son propre numéro de version **majeur.mineur**, indépendant de celui de la base commune et des autres modules :
  - mineur incrémenté pour une évolution fonctionnelle sans rupture,
  - majeur incrémenté pour un changement significatif ou une rupture de compatibilité (ex. changement de structure d'un projet nécessitant une migration).
- Chaque build de ce module est numéroté systématiquement (compteur indépendant du numéro de version).
- Un `CHANGELOG.md` propre au module documente chaque changement de version, avec une description des modifications fonctionnelles apportées.
- Le numéro de version (et idéalement le build) est affiché dans l'interface du module via le composant commun prévu à cet effet.

## 8. Contraintes techniques

- Stack : Next.js / React, TypeScript.
- Aucun backend ni base de données propre au module : toute donnée persistante (config, librairie d'éléments, projets) passe par la couche de stockage local commune.
- Le module doit rester autonome en termes de logique métier, mais ne jamais dupliquer une fonction déjà présente dans `packages/commun` — si un besoin générique manque dans la base commune, le signaler plutôt que de le redévelopper localement.

## 9. Checklist de conformité avant livraison

- [ ] Le module utilise bien les fonctions communes listées en §2 (pas de réimplémentation).

- [ ] Le texte descriptif public (but + limites) est présent et traduisible.

- [ ] Distinction claire entre données communes partagées et données propres au module (§3) respectée dans le code.

- [ ] Gestion de projets fonctionnelle (créer, ouvrir, renommer, dupliquer, supprimer) via le mécanisme commun.

- [ ] Export/import individuel d'un projet fonctionnel (transfert d'un navigateur à l'autre testé).

- [ ] Export/import en vrac de l'environnement du module fonctionnel (config + librairie + tous les projets).

- [ ] Tous les textes sont traduisibles (pas de chaîne en dur).

- [ ] Export PDF fonctionnel et fidèle au contenu affiché (tableau + dessin le cas
  
      échéant, cartouche correct, testé dans au moins 2 des 4 formats A4/A3
      paysage/portrait).

- [ ] Export Markdown fonctionnel (nom du projet + date présents, dessin embarqué le cas échéant).

- [ ] Export PNG à l'échelle avec fond transparent fonctionnel (si applicable).

- [ ] Si le module dessine une géométrie : cotes lisibles à toutes les échelles de
  
      dessin proposées (1:1 à 1:50 et "fit"), sans chevauchement ni élément coupé par la
      marge du `viewBox`.

- [ ] Numéro de version (majeur.mineur) et numéro de build affichés, `CHANGELOG.md` du module à jour.

- [ ] Le module s'intègre dans la navigation du portail (visible depuis la page d'accueil, avec son texte descriptif et sa version).

- [ ] Design cohérent avec le reste du portail (thème, composants communs).

- [ ] Responsive testé au moins sur ordinateur et tablette.

## 10. Questions à trancher au démarrage de ce module spécifique

- [Lister ici toute question ouverte propre à ce module — ex. quelles échelles supporter en priorité, quel niveau de détail pour la librairie d'éléments types, structure précise d'un "projet" pour ce module, etc.]
