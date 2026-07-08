# Changelog — Base commune (portail + packages/commun)

Toutes les évolutions fonctionnelles notables de la base commune sont documentées ici.
Format de version : majeur.mineur (voir §9 du cahier des charges). Chaque module a son propre
`CHANGELOG.md` (ex. [packages/module-demo/CHANGELOG.md](packages/module-demo/CHANGELOG.md)).

## 1.8 — 2026-07-09

Retouches suite aux retours sur la refonte esthétique v1.7 :

- **Page d'accueil** : la description de chaque carte de module est tronquée à ~20 mots
  suivis de "…" (le texte complet reste accessible via le bouton "?").
- **Cotes de longueur/arc** (`LengthCote`, `ArcLengthCote`) : distance entre le trait de
  cote et le texte réduite de moitié (`textSizeMm*0.2+0.5` au lieu de `textSizeMm*0.4+1`).
  Revérifié avec une géométrie exigeante (corde 200 mm, flèche 50 mm, curseur E à 40 mm) :
  tous les libellés restent du bon côté de leur trait, sans chevauchement.
- **Export PDF** : nouvelle icône dédiée (document avec libellé "PDF"), plus distinctive
  que l'icône générique précédente partagée avec l'export Markdown.
- **`ExportButtons`** : le sélecteur de format PDF et les 3 boutons d'export sont désormais
  alignés sur leur bord inférieur (`align-items: flex-end`).

## 1.7 — 2026-07-08

Refonte esthétique (sans impact fonctionnel) :

- **Jetons de thème** (`theme/tokens.css`) : palette légèrement enrichie (surface alt,
  bordure forte, texte "faint"), rayons de coin agrandis, ombres portées (`--rt-shadow-*`),
  transitions douces, police Inter (via `next/font/google`, avec repli système). Nouvelles
  classes utilitaires : `.rt-field--inline` (libellé à côté du champ pour un champ isolé sur
  sa ligne, plutôt qu'empilé au-dessus), `.rt-field--check`/`.rt-check-group` (cases à cocher
  visuellement distinguées), `.rt-section`/`.rt-section-title`, `.rt-badge--subtle` (version
  discrète, sans pastille), `.rt-module-card` (carte de module cliquable).
- **Page d'accueil** : liste de modules remplacée par une grille de cartes cliquables (toute
  la carte est un lien vers le module ; le bouton "Ouvrir" a disparu) ; numéro de
  version/build affiché discrètement dans un coin de chaque carte.
- **`ProjectManager`** : liste de projets compactée (lignes plus denses, surbrillance au
  survol/actif) et marges internes réduites.
- **`ResultPageLayout`** : rythme vertical uniforme entre sections via `gap` flexbox, version
  affichée discrètement en pied de page.
- **`module-arc`** : champs isolés sur leur ligne (décimales, position du curseur E, échelle
  de dessin, nombre d'intervalles) alignés à côté de leur libellé plutôt qu'au-dessus ; cases
  "afficher l'abscisse curviligne"/"afficher le cumul des angles" regroupées dans un liseré
  dédié ; résultat du rayon/flèche mis en évidence.

## 1.6 — 2026-07-06

Rafraîchissement cosmétique (sans impact fonctionnel) :

- **Page d'accueil** : la description du module n'est plus affichée en clair mais
  accessible via un petit bouton "?" (`InfoButton`, popup natif `<dialog>`) ; chaque
  module peut désormais fournir un petit logo (`ModuleManifest.icon?: ComponentType`,
  affiché à côté de son titre — voir `DemoModuleIcon` dans `module-demo`).
- **Gestion de projets** (`ProjectManager`) et **exports** (`ExportButtons`) : les gros
  boutons texte sont remplacés par des boutons icône compacts (`IconButton`), avec
  infobulle au survol (attribut `title`) et libellé accessible (`aria-label`) — nouveau
  jeu d'icônes minimal dans `ui/icons.tsx` (aucune dépendance externe).

## 1.5 — 2026-07-06

- **Correctif de fond** : le tableau de résultats de l'export PDF est désormais dessiné
  nativement (texte vectoriel jsPDF), et non plus capturé depuis le DOM via html2canvas —
  qui avalait les espaces entre les mots ("Longueur réelle" → "Longueurréelle"), et avait
  déjà causé un rendu totalement vide avec `foreignObjectRendering`. html2canvas est
  retiré du projet (plus aucun usage). `exportElementToPdfFile` prend maintenant un
  `table?: ResultTable` au lieu d'un élément DOM ; `ExportButtonsProps.getResultElement`
  est supprimé (devenu inutile).
- **Export PDF** : le dessin s'aligne maintenant exactement avec le cartouche/tableau à
  gauche — la marge interne du viewBox du dessin (réservée aux cotes) n'est plus comptée
  en plus de la marge de page.

**Rupture de compatibilité** : `exportElementToPdfFile(element, filename, options)`
devient `exportElementToPdfFile(filename, options)` avec `options.table?: ResultTable` ;
`ExportButtonsProps.getResultElement` est supprimé.

## 1.4 — 2026-07-06

- **Correctif critique** : `foreignObjectRendering` (activé en 1.2 pour corriger un bug
  d'espacement html2canvas) rendait en réalité le tableau de résultats **totalement vide**
  dans le PDF, dans certaines conditions de rendu — confirmé sur un export réel fourni par
  l'utilisateur (le cartouche restait correct, seul le tableau disparaissait). Retiré :
  `exportElementToPdfFile` utilise à nouveau le rendu html2canvas par défaut.
- **Export PDF** : le format est désormais un choix explicite parmi 4 combinaisons (A4
  paysage, A4 portrait, A3 paysage, A3 portrait) au lieu d'une orientation auto-détectée
  à partir du dessin.

## 1.3 — 2026-07-06

Corrections suite au deuxième essai :

- **Cote de longueur d'arc** : la distance à l'arc redevient identique à celle de la cote
  de longueur droite (10 mm de dessin) — les deux traits de cote se rejoignent exactement
  au point de tangence, sans décalage visible (le point précédent avait introduit une
  distance différente par erreur, recréant le décalage qu'il devait supprimer).
- **Cartouche PDF** : le rendu du logo n'empêche plus jamais l'affichage du nom du
  module/projet/date même en cas d'échec (garde-fou ajouté) ; taille du texte
  projet/date légèrement augmentée (6.5 → 7.5 pt), la réduction précédente la rendant
  quasi illisible.

## 1.2 — 2026-07-06

Deuxième vague d'ajustements suite aux essais :

- **Cotes** : police Arial/compatible sur toutes les primitives, correction d'un bug où le
  trait de rappel ("witness line") des cotes de longueur/longueur d'arc pouvait traverser
  le dessin lorsque la cote était décalée du côté négatif, texte davantage écarté du trait
  de cote, cote d'angle rapprochée et décalée angulairement pour éviter le conflit avec une
  cote de rayon centrée, flèche de la cote de niveau doublée.
- **`ScaleBar`** : la subdivision millimétrique est désormais intégrée au premier
  intervalle (0-1 cm) plutôt qu'ajoutée comme segment séparé avant le zéro ; police Arial.
- **Export PDF** : `foreignObjectRendering` activé pour éviter un bug html2canvas qui
  avalait parfois les espaces entre les mots du tableau ; taille de texte réduite pour le
  nom du projet et la date dans le cartouche ; le logo de l'application (favicon) est
  désormais utilisé dans le cartouche au lieu d'un pictogramme simplifié ; résolution du
  dessin doublée.
- **Export Markdown** : résolution du dessin embarqué doublée par défaut.
- **Portail** : logo affiché dans l'en-tête (`PortailHeader`), avec la classe utilitaire
  `.rt-brand`.

## 1.1 — 2026-07-06

Ajustements suite aux premiers essais de la librairie de dessin :

- **Dimensionnement des cotes** (`drawing/sizing.ts`) : texte, flèches et distances des
  cotes sont désormais des valeurs fixes en mm "papier" (espace dessin), indépendantes de
  l'échelle de dessin ET de la taille du dessin (`suggestDimensionSizing()` ne prend plus
  de taille de référence). Nouvelle constante `DEFAULT_COTE_OFFSET_MM` (10 mm) partagée
  par les cotes de longueur/longueur d'arc.
- **`ScaleBar`** : nouvelle prop `unitCaption` pour afficher une légende ("Cotes en mm")
  sous le ratio d'échelle.
- **Export PDF** (`export/pdf.ts`) : choix du format A4/A3, cartouche (app, module, projet,
  date/heure), et le dessin SVG est désormais placé à l'échelle réelle (1 mm de dessin =
  1 mm papier), sans mise à l'échelle automatique — à l'utilisateur de choisir une échelle
  de dessin adaptée si le dessin ne tient pas sur la page.
- **Export Markdown** : la description du module n'est plus incluse ; le nom du projet
  actif et la date/heure de génération le sont.
- **`NumberInput`** (`ui/NumberInput.tsx`) : nouveau champ numérique tolérant à la fois la
  virgule et le point comme séparateur décimal (certains navigateurs, sous locale FR,
  imposaient la virgule dans un `<input type="number">`).
- Icône provisoire de l'application (`apps/portail/app/icon.svg`).

**Rupture de compatibilité mineure** : `suggestDimensionSizing()` ne prend plus de
paramètre ; `MarkdownDrawingOptions` est renommé `MarkdownExportOptions` (et perd le champ
implicite de description) ; `exportElementToPdfFile` prend un troisième paramètre
`options` (rétrocompatible, optionnel).

## 1.0 — 2026-07-06

Ajout d'une librairie de dessin technique dans `packages/commun`, réutilisable par tout
module :

- **Échelle de dessin** (`drawing/scale.ts`) : notion distincte de l'échelle modèle
  (`ScaleKey`), pour réduire davantage un dessin trop grand pour la page (ratios fixes
  1:1 à 1:50, ou mode "fit" calé sur des dimensions de page).
- **Styles de trait CAD** (`drawing/lineStyle.ts`) : continu, traitillé long/court, trait
  d'axe, pointillé.
- **Dimensionnement adaptatif** (`drawing/sizing.ts`) : taille de texte/flèches calculée
  à partir de la taille du dessin (mm de dessin), jamais de l'échelle.
- **5 primitives de cote** (`drawing/cotes/`) : longueur, rayon, angle, longueur d'arc,
  niveau.
- **Barre d'échelle** (`drawing/ScaleBar.tsx`) et sélecteur d'échelle de dessin
  (`ui/DrawingScaleSelector.tsx`).
- **Export Markdown** : le dessin SVG peut désormais être embarqué (PNG base64) dans le
  fichier exporté.

**Rupture de compatibilité** : `resultToMarkdown` et `exportResultToMarkdownFile`
(`packages/commun/src/export/markdown.ts`) sont désormais asynchrones (retournent une
`Promise`).

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
