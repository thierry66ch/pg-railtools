# Changelog — module-demo

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
