# Changelog — module-demo

## 1.6 — 2026-07-06

Ajout d'un petit logo de module (`icon.tsx`, `DemoModuleIcon`) affiché sur la page
d'accueil du portail, à côté du titre.

## 1.5 — 2026-07-06

Mise à jour suite au changement d'API PDF de `packages/commun` : `ExportButtons` n'a plus
besoin de `getResultElement` (le tableau est désormais dessiné nativement par la
librairie à partir de `resultData.table`).

## 1.4 — 2026-07-06

Marge gauche du dessin réduite à 1 cm (au lieu de 5 cm) pour laisser le maximum de place
au dessin dans l'export PDF ; les autres marges (haut/droite/bas) restent suffisantes pour
les cotes.

## 1.3 — 2026-07-06

La cote de longueur d'arc utilise à nouveau la même distance (10 mm de dessin) que la
cote de longueur droite, pour se rejoindre exactement au point de tangence.

## 1.2 — 2026-07-06

Correction du bug de trait de rappel qui traversait le dessin sur la cote de longueur
droite, distance de la cote de longueur d'arc désormais distincte de celle de la cote de
longueur droite (évite qu'elles coïncident à la jonction segment/arc), libellé de la cote
de niveau capitalisé ("H = ...").

## 1.1 — 2026-07-06

Ajustements suite aux premiers essais : formatage des angles (jusqu'à 2 décimales, sans
zéro forcé), cotes de longueur/niveau sans unité affichée (unité indiquée une fois sous
la barre d'échelle), cote d'angle déplacée à l'intérieur de l'arc et cote de longueur
d'arc toujours à l'extérieur (10 mm de dessin de part et d'autre du tracé), épaisseur du
trait de voie fixée (indépendante de l'échelle/taille), champs numériques remplacés par
`NumberInput` (accepte virgule et point), suivi du nom du projet actif pour l'export
PDF/Markdown.

## 1.0 — 2026-07-06

Refonte du dessin pour tester et valider la nouvelle librairie de dessin de
`packages/commun` : le rectangle unique est remplacé par un segment droit suivi d'une
courbe tangente (rayon et angle configurables), annoté par les 5 primitives de cote
(longueur, rayon, angle, longueur d'arc, niveau) et une barre d'échelle. Ajout du
sélecteur d'échelle de dessin dans la barre d'outils.

**Rupture de compatibilité** : la structure `DemoProjectData` gagne des champs requis
(`curveRadiusMm`, `curveAngleDeg`, `drawingScale`) — les projets enregistrés avec la
version précédente ne peuvent plus être rouverts tels quels.

## 0.1 — 2026-07-05

Version initiale : module de démonstration illustrant l'utilisation de chaque brique de
`packages/commun` (géométrie, unités/échelles, stockage, projets, exports, i18n, composants UI,
version). Sert de référence pour les futurs projets de modules.
