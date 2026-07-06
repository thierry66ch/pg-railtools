# Changelog — Base commune (portail + packages/commun)

Toutes les évolutions fonctionnelles notables de la base commune sont documentées ici.
Format de version : majeur.mineur (voir §9 du cahier des charges). Chaque module a son propre
`CHANGELOG.md` (ex. [packages/module-demo/CHANGELOG.md](packages/module-demo/CHANGELOG.md)).

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
