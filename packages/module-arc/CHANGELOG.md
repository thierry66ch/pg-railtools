# Changelog — module-arc

## 1.11 — 2026-07-23

Deux ajouts sur la v1.10, sur retour d'usage :

- **Ajout générique** (`packages/commun`, `ResultTable`) : nouveau champ optionnel
  `boldCells` (mêmes dimensions que `rows`), respecté par `drawTable` (PDF) et
  `tableToMarkdownLines` (Markdown, via `**gras**`) — les valeurs saisies par
  l'utilisateur dans le tableau de caractéristiques sont maintenant en gras
  dans les exports PDF/Markdown, pas seulement à l'écran. Rétrocompatible
  (champ absent ⟹ aucun changement pour les autres modules).
- Cotes de tangente (A-S, B-S) et de contre-flèche (S-D) ajoutées au dessin,
  affichées uniquement quand le sommet S est représenté (case cochée et angle
  < 135°). La cote de contre-flèche est décalée du côté opposé à la cote de
  flèche M-D pour ne pas chevaucher l'étiquette de la cote de longueur d'arc,
  qui tombe naturellement tout près de D pour les arcs très surbaissés
  (vérifié dans le navigateur, y compris au zoom, sur le cas par défaut
  corde=1000/flèche=50 qui est le plus serré).

## 1.10 — 2026-07-20

Sommet S (intersection des tangentes en A et B) et tableau de caractéristiques
standardisé, sur demande de l'utilisateur :

- Point C (milieu de la corde) renommé **M** pour ne plus être confondu avec le
  centre du cercle.
- Nouvelles grandeurs caractéristiques du sommet S : **tangente** (A-S = B-S),
  **bissectrice** (S-M) et **contre-flèche** (S-D, distance externe standard des
  tracés routiers/ferroviaires). Le point S de la cote d'angle existante (entre
  tangentes) est désormais calculé par formule fermée (`tangentGeometryFromRadiusAngle`)
  au lieu d'une intersection de droites, et étiqueté « S » sur le dessin. Au cas
  limite du demi-cercle (angle → 180°, tangentes parallèles), ces 3 valeurs
  affichent « ∞ » plutôt qu'un nombre flottant sans sens physique.
- 2 nouvelles méthodes de calcul : **tangente + angle au centre** et
  **tangente + corde** → toutes les autres valeurs.
- Toutes les valeurs caractéristiques (données comme calculées) sont désormais
  regroupées dans un **tableau standard à 2 colonnes** (désignation → valeur),
  identique pour les 5 méthodes, avec les valeurs saisies en gras — remplace
  l'ancien paragraphe de résultat qui variait selon le mode. Le même tableau
  alimente le résumé d'export PDF/Markdown (auparavant une ligne à 5 colonnes,
  incomplète). Ce tableau reste affiché même si le nombre d'intervalles est
  invalide (la longueur d'arc n'a plus besoin du tableau d'implantation pour se
  calculer).
- Libellés des méthodes de calcul uniformisés : la partie après la flèche (`→`)
  devient « autres valeurs » pour toutes, cohérent avec les 2 nouvelles méthodes.

## 1.9 — 2026-07-10

Retouche cosmétique : la ligne "Nombre d'intervalles" avait un `justifyContent:
'space-between'` isolé qui créait un grand vide face à "Angle par intervalle", au lieu du
regroupement serré déjà utilisé pour "Position de E" / "Écart EF" juste au-dessus — retiré
pour rester cohérent.

## 1.8 — 2026-07-09

Retours d'usage sur la v1.7 (cote d'angle + vue agrandie du dessin) :

- **Correctif générique** (`packages/commun`, `AngleCote`) : le libellé n'avait pas de
  `dominantBaseline` (contrairement à `LengthCote`/`ArcLengthCote`), donc le texte
  chevauchait sa propre ligne de cote dès que le centre de l'angle ne se trouvait pas
  au-dessus du dessin (ne fonctionnait « par chance » que dans un cas précis). Corrigé avec
  `dominantBaseline="middle"` (direction-agnostique, comme `PointLabel`) et un décalage
  radial élargi (`textSizeMm + gapMm*2`) — garantit un dégagement fixe (5 mm) entre le
  texte et l'arc de cote, quel que soit l'angle du libellé autour du cercle.
- **Ajout générique** (`packages/commun`, `AngleCote`) : traits courts marquant chaque
  extrémité de l'arc de cote, comme `ArcLengthCote`.
- **Nouveau** : bouton « Agrandir le dessin » à côté du sélecteur d'échelle, ouvrant le
  dessin dans une boîte de dialogue plein écran avec zoom (molette/pincement trackpad,
  boutons +/−) et déplacement (glisser-déposer). Nouveau composant générique
  `DrawingLightbox` dans `packages/commun`, réutilisable par tout module affichant un
  dessin SVG.

## 1.7 — 2026-07-09

Deux ajustements sur la v1.6, signalés après relecture du rendu :

- Mode « rayon + angle au centre » : le résultat n'affiche plus l'angle au
  centre (déjà donné en saisie), seulement corde et flèche calculées — cohérent
  avec les 2 autres méthodes qui n'affichent que leur(s) valeur(s) déduite(s).
- Case « Représenter l'angle au centre sur le dessin » déplacée : elle
  n'avait pas sa place parmi les options du tableau d'implantation. Regroupée
  avec le sélecteur d'échelle de dessin dans une boîte `.rt-check-group` (même
  style que le groupe d'options du tableau).

## 1.6 — 2026-07-09

Nouvelle méthode de calcul et affichage de l'angle au centre :

- 3e méthode de calcul : **rayon + angle au centre → flèche et corde**
  (`chordSagittaFromRadiusAngle`), à côté des deux méthodes existantes.
- L'angle au centre (calculé ou saisi) est désormais affiché à côté du
  résultat principal, quelle que soit la méthode.
- Nouvelle option de dessin (case à cocher, désactivée par défaut) :
  représente l'angle au centre sur le SVG — **entre les deux tangentes** (au
  point d'intersection T) si l'angle plein est < 135°, **au centre réel**
  du cercle sinon. Seuil choisi car R diverge pour les petits angles (arc peu
  courbé) alors que la distance de T diverge pour les grands angles
  (tangentes parallèles à 180°) : chaque représentation reste compacte
  exactement là où l'autre exploserait. Case décochée par défaut : aucun
  changement de cadrage/échelle du dessin existant.
- Colonne angle au centre ajoutée au résumé d'export PDF/Markdown.

## 1.5 — 2026-07-07

Deux corrections de rendu sur le dessin, signalées avec capture annotée :

- **Correctif générique** (`packages/commun`, `ArcLengthCote`) : le libellé de
  la cote de longueur d'arc n'avait pas de `dominantBaseline` (contrairement à
  `LengthCote`), si bien que le texte touchait quasiment sa propre ligne de
  cote au lieu de s'en écarter. Ajout d'une baseline dépendant du signe de
  l'offset (miroir de la logique déjà utilisée par `LengthCote`) — bénéficie
  aussi à `module-demo`, qui utilise la même primitive.
- Cotes AE/EB de `module-arc` : leur décalage (5 mm) laissait le texte
  toucher/chevaucher la cote totale A-B juste au-dessus. Réduit à 3 mm pour
  garder une marge nette entre les deux lignes de cote empilées.

Vérifié dans le navigateur (serveur redémarré à froid), y compris en
reproduisant le scénario signalé (E à 300 mm, échelle 1:5) : écart net entre
« 300.0 »/« 700.0 » et la cote totale « 1000.0 » (comparaison de bounding
boxes), libellé de longueur d'arc clairement sous son arc de cote ; aucune
régression sur `module-demo`.

## 1.4 — 2026-07-07

Ajouts au dessin :

- Points A, B, C, D identifiés (petit disque + étiquette). Nouvelle primitive
  générique dans `packages/commun` : `PointLabel` (disque + texte, sans ligne
  de rappel ni flèche — plus léger que `LevelCote` pour du simple repérage de
  points), ajoutée au barrel `drawing`.
- Cotes horizontales A-E et E-B (en plus de la cote totale A-B existante),
  décalées entre la corde et cette dernière.
- Traitillés fins de construction : corde A-B (horizontal) et axe de la
  flèche C-D (vertical).
- Le point E (et toutes ses cotes : A-E, E-B, écart EF) ne s'affiche
  désormais que si E est strictement entre A et B ; valeur par défaut de la
  position de E ramenée à 0 (E confondu avec A, donc rien à afficher tant que
  l'utilisateur ne le déplace pas).

Vérifié dans le navigateur (serveur redémarré à froid) : aucun chevauchement
de libellé (comparaison de `getBoundingClientRect()`) à l'échelle 1:1, en
mode "fit" et sur un cas de flèche très faible avec curseur actif ; masquage
correct de E à AE=0 et AE=corde ; exports PDF/Markdown/PNG toujours
fonctionnels ; aucune régression sur `module-demo`.

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
