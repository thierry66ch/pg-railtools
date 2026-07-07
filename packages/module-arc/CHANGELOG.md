# Changelog — module-arc

## 1.3 — 2026-07-07

- **Correctif** : le bouton « Enregistrer » semblait inopérant — la liste de
  `ProjectManager` n'était pas rafraîchie après une sauvegarde, si bien que
  rouvrir le même projet resservait les anciennes valeurs (le stockage était
  pourtant correctement mis à jour). Corrigé en forçant un rafraîchissement de
  la liste après chaque `Enregistrer`, comme pour l'import d'environnement.
- Exports PDF/Markdown affinés : le tableau récapitulatif ne contient plus que
  corde/flèche/rayon/longueur d'arc et repasse en tête de document (avant le
  dessin) ; nombre d'intervalles et angle par intervalle forment désormais un
  second petit tableau, placé juste avant le tableau de piquetage. Un saut de
  page (PDF réel via `pdf.addPage()`, séparateur `---` en Markdown) sépare le
  dessin de cette section piquetage. Ajout générique dans `packages/commun` :
  `ResultData.tableIntro` et `pageBreakBeforeTable` — vérifié sans régression
  sur `module-demo`.

## 1.2 — 2026-07-07

- Exports PDF/Markdown restructurés : le résumé (corde, flèche, rayon,
  longueur d'arc, nombre d'intervalles, **angle par intervalle** — jusqu'ici
  absent de l'export) est désormais présenté sous forme de tableau plutôt que
  de texte libre, placé après le dessin et juste avant le tableau
  d'implantation (au lieu d'avant le dessin). Ajout générique dans
  `packages/commun` : `ResultData.summaryTable` (rendu par `pdf.ts` et
  `markdown.ts` entre le dessin et `table`) — vérifié sans régression sur
  `module-demo`.
- Sur la page, les cases « Afficher l'abscisse curviligne » et « Afficher le
  cumul des angles » passent sur leur propre ligne, séparée du champ nombre
  d'intervalles, pour décompacter l'affichage.

## 1.1 — 2026-07-07

Retours d'usage après la v1.0 :

- Décimales affichées devient un réglage global du module, déplacé en haut de
  la page (sous le texte descriptif) ; défaut passé de 3 à 1.
- Résultat principal (rayon ou flèche calculée) affiché en gras.
- Réorganisation : le tableau d'implantation et son sélecteur de nombre
  d'intervalles passent sous le dessin (fonction complémentaire qui ne
  l'influence pas) ; la position de E et l'écart EF restent au-dessus du
  dessin, non intercalés.
- Angle par intervalle (déduit du nombre d'intervalles) affiché à côté du
  champ correspondant.
- Nouvelle colonne « Angle cumulé » dans le tableau d'implantation, togglable
  comme l'abscisse curviligne (`showAngleCumul` ajouté à `ArcProjectData`).
- **Correctif** : validation manquante en mode « corde et flèche → rayon »
  quand la flèche dépasse la moitié de la corde (au-delà d'un demi-cercle,
  géométrie non prise en charge par ce module) — provoquait un dessin hors
  cadre ou, en mode « rayon et corde → flèche », un **crash de l'application**
  sur certaines combinaisons invalides (accès à une valeur non définie lors de
  la construction du résumé d'export). Les deux cas sont désormais rejetés
  avec un message d'erreur clair, sans crash.
- **Correctif** (`packages/commun`, `NumberInput`) : vider un champ pour
  retaper une nouvelle valeur committait prématurément un 0 (`Number('')`
  vaut 0, pas `NaN`), pouvant perturber la saisie en partant d'une valeur à 0.

## 1.0 — 2026-07-07

Première version fonctionnelle complète du module :

- Calcul du rayon R (corde + flèche) ou de la flèche f (rayon + corde), avec
  sélecteur de mode et messages d'erreur traduits pour les configurations
  géométriquement invalides.
- Tableau d'implantation dynamique (n intervalles, décimales configurables,
  colonne abscisse curviligne s togglable) et curseur E/F en temps réel (mode
  "curseur libre").
- Dessin technique de l'arc à l'échelle (corde, flèche, arc, cotes de
  longueur/rayon/longueur d'arc, barre d'échelle, sélecteur d'échelle de
  dessin 1:1 à 1:50 / "fit").
- Export PDF/Markdown/PNG (`ExportButtons`), gestion de projets (créer,
  ouvrir, renommer, dupliquer, supprimer, export/import individuel), et
  export/import en vrac de l'environnement du module.

## 0.1 — 2026-07-07

Scaffold initial du module de calcul d'arc : package branché sur le portail (manifest,
route `/modules/arc`, i18n `moduleArc`, `transpilePackages`), icône, page placeholder
affichant titre, texte descriptif et version. La logique de calcul (rayon, flèche,
tableau d'implantation) et le dessin seront ajoutés dans les phases suivantes.
