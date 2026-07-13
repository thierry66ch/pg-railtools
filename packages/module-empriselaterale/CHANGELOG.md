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
