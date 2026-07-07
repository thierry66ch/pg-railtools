## Contexte

Je développe une PWA de calcul géométrique pour un arc de cercle défini par une corde AB et sa flèche.

Notations (voir schéma) :

- A, B : extrémités de la corde, avec AB = c... (longueur de la corde, notée c ci-dessous dans les formules)
- C : milieu de la corde AB
- D : sommet de l'arc (point de l'arc le plus éloigné de la corde, sur la médiatrice de AB)
- f : flèche = CD, distance perpendiculaire entre C (milieu de la corde) et D (sommet de l'arc)
- centre du cercle (noté R sur le schéma, à ne pas confondre avec le rayon R utilisé dans les formules) : point équidistant de A, B et D
- R : rayon du cercle (grandeur scalaire, distance entre le centre et n'importe quel point du cercle)
- E : point mobile sur la corde AB, avec AE + EB = AB
- F : projection de E sur l'arc, perpendiculairement à la corde AB
- EF : flèche locale au point E (= 0 en A et B, = f quand E est au milieu de AB, c'est-à-dire quand E = C)

![](Calcul%20d'arc.assets/d3ae626465d7e16cff9f9212f4e1109bd935c1c1.png)

## Fonctionnalité 1 — Calcul du rayon R

Entrées : c (corde AB), f (flèche CD)
Sortie : R

Formule :
R = (c² + 4f²) / (8f)

Cas limite : f doit être strictement positif. Si f = 0, l'arc dégénère en droite (R → ∞) : afficher un message d'erreur plutôt qu'un calcul.

## Fonctionnalité 2 — Calcul de la flèche f

Entrées : R (rayon), c (corde AB)
Sortie : f

Formule :
f = R − √(R² − (c/2)²)

Contrainte de validité : R doit être ≥ c/2 (sinon la corde est plus longue que le diamètre, cas géométriquement impossible). Si R < c/2, afficher une erreur explicite.

## Fonctionnalité 3 — Tableau d'implantation de l'arc

Objectif : générer un tableau de points F répartis UNIFORMÉMENT LE LONG DE L'ARC (et non le long de la corde), avec pour chacun la distance AE et l'écart EF (flèche locale), permettant l'implantation physique de l'arc sur le terrain.

Entrées :

- R (rayon)
- c (longueur de la corde AB)
- n (nombre d'intervalles souhaité le long de l'arc, entier ≥ 2)

Étapes de calcul :

1. Demi-angle au centre sous-tendu par la demi-corde :
   α = asin((c/2) / R)

2. Pas angulaire pour une répartition uniforme le long de l'arc :
   Δβ = 2α / n

3. Pour chaque point i de 0 à n (n+1 points, incluant A et B) :
   β_i = −α + i × Δβ
   
   AE_i = R × sin(β_i) + c/2
   EF_i = R × cos(β_i) − R + f
   
   (Vérifications : au point i=0 → AE=0, EF=0 (point A) ; au point i=n → AE=c, EF=0 (point B) ; au point milieu → EF=f)

4. Chaque ligne du tableau doit contenir au minimum : index du point, AE (distance depuis A le long de la corde), EF (écart perpendiculaire à la corde).

Optionnel utile : ajouter aussi l'abscisse curviligne s_i le long de l'arc (s_i = R × (β_i + α), variant de 0 à l'arc total L = 2Rα), pour un piquetage par longueur d'arc plutôt que par angle.

## Comportement UI attendu

- Un point E doit pouvoir être déplacé/glissé sur la corde AB (slider ou champ numérique borné entre 0 et c) et afficher en temps réel EF correspondant, en utilisant la formule générale de l'offset :
  Pour un point à l'abscisse x mesurée depuis le milieu de la corde (x = AE − c/2) :
  EF(x) = √(R² − x²) − (R − f)
  
  (Cette formule continue, indépendante de tout découpage en n intervalles, sert au mode "curseur libre" ; la formule angulaire ci-dessus sert au mode "tableau d'implantation à n intervalles".)

- Le tableau d'implantation doit être recalculé dynamiquement quand n, R ou c changent.

## Cas limites à gérer

- f ≤ 0 ou R ≤ 0 : refuser le calcul avec message clair
- c/2 > R : configuration géométriquement impossible, message d'erreur
- n < 2 : imposer un minimum (ex. n ≥ 2)
- Arrondis : proposer un nombre de décimales configurable (par défaut 3) pour l'affichage des résultats et du tableau
