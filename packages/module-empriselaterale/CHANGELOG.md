# Changelog — module-empriselaterale

## 0.4 — 2026-07-13

Retours d'usage sur le dessin :

- Bouton « Enregistrer » du projet déplacé dans un bandeau dédié (« Projet ouvert :
  {nom} ») sous l'en-tête, décorrélé du formulaire véhicule où il semait la confusion
  (l'utilisateur croyait qu'il était lié au chargement d'un véhicule depuis la
  bibliothèque, alors qu'il enregistre le projet ouvert, sans rapport).
- Axe de la voie redessiné en **trait d'axe** (tiret long/tiret court, norme CAO) plus fin
  qu'avant (0.6 mm au lieu de 1.2 mm de dessin à l'échelle 1:1), au lieu d'un simple trait
  plein.
- **Jonctions entre segments de tracé** matérialisées par un trait transversal
  (perpendiculaire à la tangente réelle de la voie, pas la corde), long d'un tiers de la
  largeur max du véhicule, centré sur chaque limite de segment (y compris les deux
  extrémités du tracé) — nouvelle fonction pure `segmentBoundaries` dans `math/track.ts`.
- **Épaisseurs de trait atténuées aux échelles de dessin réduites** (ratio > 1:1) : tous
  les traits de géométrie (axe voie, 6 polylignes d'emprise, silhouette, axe
  longitudinal/transversal de la caisse, traits d'essieux, jonctions) sont désormais
  fonction de l'échelle de dessin résolue (`largeur = base / √ratio`, plancher à 35 % de
  la base pour rester visible jusqu'à 1:50) plutôt que fixes — à 1:1 rien ne change,
  au-delà les traits s'affinent proportionnellement pour ne pas écraser un dessin devenu
  plus petit. Distinct du principe "cotes toujours en mm papier fixes"
  (`pieges-a-eviter.md`) : cette règle concerne les cotes techniques (texte/flèches/traits
  de cote), pas les traits de géométrie eux-mêmes, qu'aucun module de ce repo n'utilisait
  encore comme convention de trait d'épaisseur variable selon l'échelle.

Point soulevé par l'utilisateur (débordement du point de transition du chanfrein en
courbe, potentiellement plus encombrant que les 6 points suivis) : **évalué, pas
implémenté** — voir la note de décision dans la mémoire de session ; débordement jugé
minime par l'utilisateur, marge de sécurité déjà prévue par ailleurs, vérification externe
(CAO) déjà nécessaire pour d'autres besoins.

Vérifié dans le navigateur : bandeau projet actif affiché correctement à la création d'un
projet, 3 marques de jonction pour un tracé à 2 segments (aux 2 bouts + la limite
intermédiaire), épaisseurs revenant exactement aux valeurs de base à 1:1 et réduites à une
échelle plus large (ex. facteur ≈0.51 à 1:3.8, cohérent avec `1/√ratio`), zéro erreur
console.

## 0.3 — 2026-07-13

Retours d'usage sur les bibliothèques et la saisie du véhicule (v0.2) :

- **Sélecteurs de bibliothèque en place** : un sélecteur « Charger depuis la
  bibliothèque » apparaît désormais directement dans le formulaire véhicule et dans
  chaque cadre de segment de tracé (au lieu de devoir descendre jusqu'aux panneaux de
  bibliothèque en bas de page, choisir « Utiliser dans le projet », puis remonter). Les
  listes de bibliothèque sont désormais tenues au niveau de la page et rafraîchies dès
  qu'un élément est ajouté/modifié/supprimé dans un panneau (`onChanged` propagé vers un
  compteur de version côté page, sur le même principe que le rafraîchissement de
  `ProjectManager` après import en vrac). Les boutons « Utiliser dans le projet » des
  panneaux restent disponibles en complément, pas remplacés.
- **Empattement déplacé avant l'angle de biais**, qui vient maintenant juste à côté de la
  longueur du chanfrein — les deux ouverts à la modification et liés dans les deux sens.
- **Longueur du chanfrein éditable et redéfinie comme l'HYPOTÉNUSE** du triangle du
  chanfrein (`Math.hypot(Ltaper, (Wmax−Wend)/2)`), pas l'ancien `Ltaper` (le côté le long
  de l'axe) : c'est la longueur qu'un modéliste mesure réellement au double-décimètre sur
  une maquette, sans avoir à repérer précisément l'axe longitudinal. Modifier l'angle
  recalcule le chanfrein ; modifier le chanfrein recalcule l'angle
  (`angleFromChanfreinHypotenuse`, via `asin`). `Ltaper` reste utilisé en interne pour la
  géométrie du contour (`vehicleContourLocalPoints`) et pour la validation
  `chanfrein-trop-long`, inchangée.
  - Piège évité : un champ contrôlé dont la valeur est recalculée par aller-retour
    trigonométrique (asin/sin) n'est quasiment jamais bit-exact à la frappe — sans
    arrondi, `NumberInput` re-synchronisait le texte affiché vers une valeur à 17
    décimales à chaque frappe (`parseDecimal(text) !== value` déclenchant son `useEffect`
    de resynchronisation). Arrondi à 0.1 mm (chanfrein) / 0.1° (angle) après chaque
    recalcul pour que l'aller-retour soit stable pour une frappe normale — vérifié en
    tapant caractère par caractère via de vrais événements clavier, aucun figeage ni
    valeur parasite affichée pendant la frappe.

## 0.2 — 2026-07-13

Retours d'usage sur la v0.1 déployée :

- **Chanfrein déplacé** : la longueur du chanfrein calculée est maintenant un champ en
  lecture seule dans les specs du véhicule (pas dans le résumé du tracé, dont elle ne
  faisait pas partie) — cohérent aussi dans l'export PDF (`summaryTable` du véhicule vs
  `tableIntro` du tracé, désormais deux tables distinctes).
- **Dessin complété** : trait d'axe longitudinal de la caisse de bout en bout (style
  `centerline`), trait transversal au centre (corde MG-MD, `dashedShort`), et un trait
  transversal fin par essieu/bogie (position exacte = ± empattement/2 depuis le centre de
  la caisse, pas les extrémités de la caisse — ces deux distances ne coïncident que si
  L = E).
- **Légende intégrée au dessin SVG** (plutôt qu'un bloc HTML à côté) : apparaît donc
  automatiquement dans la vue agrandie et dans les exports Markdown/PNG (qui rastérisent
  ce même SVG), là où elle manquait.
- **Vue agrandie plus nette** (`packages/commun`, générique — bénéficie aussi à
  `module-arc`) : le SVG dans `DrawingLightbox` était limité à 800px de large avant zoom
  CSS, et `will-change: transform` forçait une promotion de calque rastérisée tôt à cette
  taille — flou visible en zoomant sur un tracé large. Largeur de base portée à
  `min(96vw, 1800px)` et `will-change` retiré ; non-régression vérifiée sur `module-arc`.
- **Échelle de dessin par défaut passée à "fit"** (au lieu d'hériter la préférence globale,
  généralement 1:1) : les tracés de ce module font typiquement plusieurs centaines de mm,
  donc 1:1 produisait un export PDF où le dessin débordait presque entièrement de la page
  (contenu visible réduit à un coin). Cible du mode "fit" alignée sur celle de
  `module-arc` (260×180 mm) pour rester dans une page A4/A3 raisonnable, plutôt que la
  valeur d'affichage écran (520×320) utilisée jusqu'ici.
- **PDF corrigé** (conséquence directe des deux points précédents) : dessin désormais
  visible et non tronqué, tableau récapitulatif du véhicule qui ne mélange plus des
  informations de tracé/affichage sans rapport (déplacées dans le `tableIntro`, sur la
  page 2 après le saut de page).
- **Animation** : cliquer sur "Pas arrière"/"Pas avant" pendant la lecture automatique
  arrête maintenant la lecture avant d'appliquer le pas, au lieu de continuer à avancer en
  parallèle du clic.

Vérifié dans le navigateur : structure PDF à 2 pages avec les bonnes tables et une image
non vide (échantillonnage d'octets), légende présente comme pixels réels dans l'export PNG,
pas à pas pendant la lecture stoppe bien l'animation (position figée après le clic, pas de
reprise), non-régression de la vue agrandie sur `module-arc`, zéro erreur console.

## 0.1 — 2026-07-13

Première version du module. Calcule et visualise l'emprise latérale balayée par un
véhicule ferroviaire (caisse à extrémités chanfreinées, guidée par deux points
essieu/bogie) le long d'un tracé droites+courbes.

Portage restructuré du prototype `simulation-emprise-wagon.html` (calcul/rendu canvas
validés) vers l'architecture RailTools (SVG React + `packages/commun`) : véhicule et tracé
saisis directement en mm modèle réduit (pas de sélecteur d'échelle modèle), échelle de
dessin (`DrawingScaleSelector`) pour l'affichage/export, animation du véhicule le long du
tracé (lecture/stop/pas/curseur rapide) remplaçant les « frames » de contrôle statiques du
prototype.

Deux bibliothèques indépendantes des projets (éléments de voie, véhicules), avec copie
figée à l'insertion dans un projet. Le CRUD générique de bibliothèque
(`itemLibrary<T>`) a été ajouté à `packages/commun` plutôt que dupliqué localement :
d'autres modules futurs devraient avoir le même besoin avec des formes d'item différentes.

Le moteur de tracé (abscisse curviligne sur une polyligne droites+courbes) reste en
revanche propre à ce module pour cette livraison — à réévaluer comme candidat commun
seulement si un futur module (ex. piquetage) en a besoin.

Validations bloquantes du véhicule (largeur d'extrémité > largeur max, chanfrein dépassant
le milieu de la caisse, incohérence largeurs à angle de biais nul, empattement > longueur
caisse) et du tracé (empattement > longueur totale du tracé, segment dégénéré), chacune
avec un message identifiant le paramètre en cause.

Dessin : axe du tracé + 6 polylignes d'emprise colorées (AVG/AVD/MG/MD/ARG/ARD) + silhouette
de la caisse à la position d'animation courante, à l'échelle de dessin choisie (1:1 à 1:50
ou "fit") avec échelle graduée et légende — volontairement sans cotes techniques
(`LengthCote`/`RadiusCote`/`AngleCote`) : c'est un tracé/graphe d'emprise balayée, pas un
dessin coté façon CAO comme `module-arc`.

Exports (PDF/Markdown/PNG) : le résumé reprend le nom du véhicule saisi et ses
caractéristiques ; le dessin exporté représente le véhicule tel que placé par l'animation
au moment de l'export (silhouette à la position courante, pas une vue générique). Vérifié
dans le navigateur : cycle projet complet (créer/enregistrer/recharger/rouvrir), export/
import d'environnement en vrac, PDF (texte du cartouche et du tableau décodés et vérifiés,
image embarquée non vide), Markdown (nom de projet + véhicule présents), PNG réellement
transparent (échantillonné pixel par pixel), zéro erreur console.
