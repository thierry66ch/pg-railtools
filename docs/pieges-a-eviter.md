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

## Déclarer le module dans `apps/portail/package.json` (pas seulement l'importer)

`integration.md` §3 liste quatre points d'intégration (manifest/registre, route, i18n,
`transpilePackages`) mais **omet** une étape indispensable : un package workspace importé
par `apps/portail` doit aussi être **déclaré comme dépendance** dans
`apps/portail/package.json`, exactement comme `module-demo` :

```json
"dependencies": {
  "@railtools/module-<nom>": "workspace:*"
}
```

Sans cette déclaration, ça peut passer **en développement** (Next résout le module via un
symlink `node_modules/@railtools/module-<nom>` déjà présent, ou via `transpilePackages`),
mais un **install propre échoue** — en particulier `pnpm install --frozen-lockfile` en
CI/prod : le lien workspace n'est pas recréé et le `pnpm-lock.yaml` est jugé désynchronisé,
donc le build de déploiement casse. Le bug est invisible en local et n'apparaît qu'au
déploiement.

Après avoir ajouté la dépendance, régénérer le `pnpm-lock.yaml` (`pnpm install`) et vérifier
qu'il contient bien l'importer `packages/module-<nom>` **et** le lien
`@railtools/module-<nom>` sous `apps/portail`. Si l'`install` est bloqué dans
l'environnement, ces deux entrées peuvent être ajoutées à la main en copiant le bloc d'un
module aux dépendances identiques (valider ensuite en parsant le YAML).

## `RadiusCote` ancré au point de symétrie d'une géométrie centrée : risque de collision de libellé

`RadiusCote` tire un trait de longueur fixe (20 mm de dessin) depuis le point de l'arc vers
le centre (sans jamais atteindre le centre réel, potentiellement très éloigné — voir
`RadiusCote.tsx`). Ce trait part toujours **vers le centre**, direction déterminée
uniquement par la géométrie (le point choisi et le centre), pas par un paramètre.

Pour une géométrie **symétrique** (ex. arc défini par une corde, où le sommet est
exactement au milieu de la corde), si `pointOnArc` est ce sommet, le trait de la cote de
rayon remonte **exactement à la verticale du milieu de la corde** — précisément là où le
libellé d'une `LengthCote` couvrant toute la corde se retrouve centré (le texte d'une
`LengthCote` est toujours positionné au milieu du segment coté). Les deux libellés
peuvent alors se chevaucher, en particulier quand la géométrie est peu profonde par
rapport aux marges fixes (petite flèche, ou échelle de dessin "fit" qui réduit la
géométrie sans réduire les cotes — voir plus haut "Dimensionnement des cotes"). Le
chevauchement n'est pas toujours visible sur le premier cas testé (ex. à l'échelle 1:1
avec une flèche confortable) : il faut re-tester avec une flèche faible et en mode "fit"
avant de conclure que c'est bon.

Solution appliquée dans `module-arc` : ancrer `pointOnArc` non pas au sommet de symétrie,
mais à un point décalé sur l'arc (ex. 70 % de la distance angulaire vers une extrémité) —
le trait de la cote de rayon garde une direction majoritairement verticale mais son
ancrage x s'éloigne du centre de la corde, évacuant le conflit avec le libellé de la
`LengthCote`. Vérifier après coup par comparaison de `getBoundingClientRect()` des
libellés concernés (pas seulement à l'œil sur une capture), y compris à l'échelle "fit"
et avec une flèche/hauteur réduite.

## Extraire le texte d'un PDF jsPDF pour vérification : décoder en windows-1252, pas en UTF-8

Complète la technique décrite plus haut (« blob.text() fonctionne pour inspecter un PDF non
compressé »). Cette technique fonctionne telle quelle pour du texte ASCII pur, mais **pas**
dès que le contenu contient des caractères accentués ou des signes comme le tiret cadratin
(—) : jsPDF, avec les polices standard (Helvetica), encode ces caractères en un seul octet
suivant WinAnsiEncoding (essentiellement CP1252/windows-1252), pas en UTF-8. `blob.text()`
décode tout le fichier en UTF-8 par défaut : un octet isolé ≥ 0x80 qui ne forme pas une
séquence UTF-8 valide (ex. `è` = 0xE8, `—` = 0x97 en CP1252) est remplacé par `�`
(U+FFFD) — ça ressemble à une corruption réelle du texte dans le PDF, mais ce n'est qu'un
artefact de la méthode de vérification.

Pour vérifier correctement un PDF contenant des caractères accentués, décoder avec le bon
encodage avant d'appliquer la regex `Tj`/`TJ` :

```js
const buf = await blob.arrayBuffer();
const text = new TextDecoder('windows-1252').decode(buf);
```

## Éviter l'artefact "-0.000" dans un affichage numérique arrondi

`(valeur_tres_proche_de_zero).toFixed(n)` peut produire `"-0.000"` au lieu de `"0.000"`
quand la valeur réelle est une infime quantité négative issue d'une imprécision flottante
(ex. un point de fin de tableau censé être exactement 0 par construction mathématique,
mais légèrement négatif après un aller-retour par `asin`/`sin`/`cos`). Le calcul en
lui-même est correct (l'erreur est de l'ordre de 1e-13, physiquement insignifiante) — seul
l'affichage arrondi révèle un signe qui n'a aucun sens pour l'utilisateur final (ex. un
tableau d'implantation destiné à être imprimé et utilisé sur le terrain).

Solution : après `toFixed()`, si le résultat commence par `-` et que sa valeur numérique
est exactement 0, retirer le signe :

```ts
function formatFixed(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  return fixed.startsWith('-') && Number(fixed) === 0 ? fixed.slice(1) : fixed;
}
```

Ne pas essayer de « corriger » le calcul source pour forcer un zéro exact (spécial-caser
les points de contrôle) : la fonction de calcul reste plus simple et tout aussi correcte
sans ce cas particulier — c'est uniquement la couche d'affichage qui doit absorber ce bruit
flottant.

## `EnvironmentTransfer` : brancher `onImported` pour rafraîchir `ProjectManager`

`ProjectManager` charge sa liste de projets une seule fois au montage (et après ses propres
actions internes créer/renommer/dupliquer/supprimer/importer un projet) — il n'a aucun
moyen de savoir qu'un import d'environnement en vrac (`EnvironmentTransfer`) vient de
modifier le stockage sous-jacent. Sans rien faire, la liste affichée reste **périmée**
après un import en vrac (le stockage est pourtant correctement mis à jour — bug de
rafraîchissement de l'UI, pas de persistance), jusqu'à un rechargement de page complet.

`EnvironmentTransfer` expose justement un prop `onImported?: () => void` prévu pour ça — à
brancher systématiquement. Un remount forcé de `ProjectManager` via une `key` d'état
incrémentée dans ce callback suffit :

```tsx
const [projectListVersion, setProjectListVersion] = useState(0);
// ...
<ProjectManager key={projectListVersion} ... />
<EnvironmentTransfer moduleId={MODULE_ID} onImported={() => setProjectListVersion((v) => v + 1)} />
```

**Piège identique côté bouton "Enregistrer" propre au module** (celui qui appelle
`updateProject` directement, hors de `ProjectManager`) : lui non plus n'a, par défaut,
**aucun** callback de rafraîchissement — après un clic sur "Enregistrer", la liste de
`ProjectManager` reste périmée jusqu'à un rechargement de page ou une autre action
(renommer/dupliquer/...), donnant l'impression trompeuse que le bouton ne fonctionne pas
(alors que le stockage est bien mis à jour — un utilisateur de `module-arc` s'y est fait
prendre en usage réel). C'était présent à l'identique dans `module-demo` (limitation
architecturale de `ProjectManager`, pas un bug introduit par un module particulier), mais
la CORRECTION n'a besoin d'aucun changement dans `packages/commun` : il suffit que le
`handleSave` du module bump lui aussi `projectListVersion`, exactement comme le fait déjà
`EnvironmentTransfer.onImported` :

```tsx
async function handleSave() {
  if (!activeProjectId) return;
  await updateProject(MODULE_ID, activeProjectId, createDefaultData());
  setProjectListVersion((v) => v + 1); // sans ça, rouvrir ce projet reservirait l'ancien état
}
```

Appliqué dans `module-arc` (v1.3) ; `module-demo` a toujours le défaut latent (non corrigé,
car non demandé) — à traiter de la même façon si ça gêne un jour.

À vérifier explicitement : importer un environnement **sans recharger la page** et
constater que la liste de projets affichée change immédiatement (pas seulement après un
rechargement, qui masquerait le bug).
