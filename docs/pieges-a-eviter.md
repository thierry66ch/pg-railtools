# Pièges à éviter

Enseignements tirés du développement de `packages/commun` et de `module-demo`. À lire
avant de démarrer un nouveau module — plusieurs de ces pièges ont déjà causé de vrais
bugs (parfois corrigés puis réintroduits par erreur) et coûté plusieurs itérations.

## Échelle de dessin ≠ échelle modèle

Deux notions d'échelle distinctes, à ne jamais confondre :

- **Échelle modèle** (`ScaleKey`, `units`) : rapport réel → modèle réduit (Z/N/TT/H0/0/I/G).
- **Échelle de dessin** (`DrawingScale`, `drawing/scale.ts`) : rapport modèle réduit →
  dessin affiché/imprimé. Nécessaire car un tronçon peut mesurer plusieurs mètres à
  taille modèle réduit (grandes échelles comme 0 ou I) — il faut alors le réduire encore
  pour qu'il tienne sur une page.

Toute coordonnée géométrique doit être calculée en mm modèle réduit, puis convertie en mm
de dessin via `modelToDrawing()` **juste avant** le rendu SVG — jamais avant. Voir
`DemoModulePage.tsx` (fonction `toDrawing`) pour le pattern à suivre.

## Dimensionnement des cotes : toujours des mm papier fixes

Taille de texte, taille de flèche, écart cote-dessin, épaisseur de trait des cotes :
**valeurs fixes** en mm de dessin ("mm papier", au sens CAO), jamais dérivées de la taille
du dessin ni de l'échelle de dessin. `suggestDimensionSizing()` (dans `drawing/sizing.ts`)
ne prend volontairement aucun paramètre de taille — ne pas réintroduire de logique du
genre `suggestDimensionSizing(referenceSize)` : ça a été essayé, puis retiré, car ça
produisait des cotes illisibles sur les petits dessins et énormes sur les grands.

## Le "gap" d'une cote à offset variable doit suivre le signe de l'offset

Bug réel rencontré dans `LengthCote`/`ArcLengthCote` : ces cotes acceptent un `offsetMm`
qui peut être positif ou négatif (choix du côté du décalage par l'appelant). Le petit
espace ("gap") entre la géométrie et le début du trait de rappel doit utiliser **le même
signe** que l'offset (`Math.sign(offset) * gapMm`) — une valeur de gap toujours positive
fait partir le trait de rappel du mauvais côté quand l'offset est négatif, et il traverse
alors le dessin (visible comme un "décalage"/une rupture disgracieuse à l'écran).

## Ne jamais pré-décaler un rayon avant de le passer à `ArcLengthCote`

`ArcLengthCote` applique lui-même un offset interne (`dimRadius = radiusMm + offset`). Lui
passer un `radiusMm` déjà décalé par l'appelant cause un double-décalage silencieux (pas
d'erreur, juste un rayon de cote incorrect). Toujours passer le rayon **réel** de la
géométrie et laisser le composant gérer son propre offset (par défaut ou explicite via
`offsetMm`).

## Aligner un dessin SVG (avec marge interne) dans un export PDF/PNG

Un SVG avec un `viewBox` du type `"-10 -30 W H"` a 10/30 mm de marge interne (réservée aux
cotes) **avant même le contenu réel**. Si l'image rasterisée est placée telle quelle à
`x = MARGE_PAGE`, le contenu (pas l'image) se retrouve décalé de cette marge interne en
plus — visible comme un espace excessif à gauche/en haut du dessin par rapport aux autres
éléments de la page (cartouche, tableau). Il faut calculer
`x = MARGE_PAGE + viewBox.x` (`viewBox.x` étant négatif) pour aligner le **contenu**, pas
le bord de l'image. Voir `getSvgMmSize()` (`export/png.ts`, retourne aussi `x`/`y`) et son
usage dans `export/pdf.ts`.

## html2canvas n'est pas fiable pour du texte — dessiner nativement à la place

Deux bugs distincts rencontrés avec html2canvas (utilisé un temps pour capturer le
tableau de résultat depuis le DOM) :

1. Espaces entre les mots avalés par défaut ("Longueur réelle" → "Longueurréelle").
2. Rendu **totalement vide** avec l'option `foreignObjectRendering: true` (censée
   corriger le bug 1) — silencieux, sans erreur, découvert seulement en inspectant un
   export réel.

Solution retenue : pour des données structurées (`ResultTable`), dessiner le tableau
nativement avec les primitives texte/ligne de jsPDF (`export/pdf.ts`, fonction
`drawTable`) plutôt que de capturer un élément DOM. Le cartouche PDF utilise déjà ce
principe depuis le début et n'a jamais eu ce genre de problème. html2canvas a été retiré
du projet — ne pas le réintroduire pour du texte sans une vraie raison (capture d'un
contenu réellement impossible à décrire comme donnée structurée).

## Vérifier un export binaire exige d'inspecter les octets, pas la taille du fichier

jsPDF stocke les images **sans compression** par défaut : une image blanche et une image
avec du contenu réel ont exactement la même taille de flux (largeur × hauteur × canaux).
Comparer des tailles de fichier ne prouve rien sur le contenu. Pour vérifier qu'une image
embarquée n'est pas vide : extraire le flux brut de l'objet `/Image` correspondant
(`stream ... endstream`) et échantillonner les octets (variance, nombre de valeurs
distinctes) plutôt que de se fier à la taille du blob.

## Champ numérique et locale du navigateur

`<input type="number">` peut imposer la virgule comme séparateur décimal sous certains
navigateurs/locales FR, empêchant complètement la saisie du point — piège classique et
difficile à repérer en developpant sous une locale EN. Utiliser un champ texte avec
`inputMode="decimal"` et un parsing tolérant virgule/point (voir `NumberInput` dans
`packages/commun/src/ui/NumberInput.tsx`) plutôt qu'un `<input type="number">` natif pour
toute saisie numérique utilisateur.

## Techniques utiles pour déboguer un export (PDF/Markdown/PNG) en session Claude Code

- Intercepter `URL.createObjectURL` dans la page (via l'outil d'évaluation du navigateur)
  pour récupérer le `Blob` généré par un export, sans dépendre du téléchargement réel
  (qui peut atterrir dans un dossier inattendu, ex. un dossier synchronisé dans le cloud).
- `blob.text()` fonctionne pour inspecter un PDF non compressé (jsPDF ne compresse pas
  les flux de contenu texte par défaut) : chercher les blocs `stream ... endstream`
  contenant des opérateurs `Tj`/`TJ` pour lire le texte réellement positionné, avec ses
  coordonnées — bien plus fiable qu'une capture d'écran pour vérifier l'alignement ou
  l'espacement du texte.
- Pour un fichier réellement volumineux ou binaire (images), utiliser `blob.arrayBuffer()`
  et échantillonner les octets plutôt que de décoder en texte.
