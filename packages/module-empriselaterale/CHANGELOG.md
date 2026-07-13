# Changelog — module-empriselaterale

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
