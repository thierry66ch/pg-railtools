# Changelog — module-raccvert

## 1.3 — 2026-07-17

Enrichissement des exports PDF/Markdown et du dessin :

- Les exports (PDF avant le dessin, Markdown avant le tableau récapitulatif) mentionnent
  désormais un bloc de contexte : données de base (pentes i0/iN, sommet K_V/H_V), variation
  totale de pente au sommet V en ‰ **et** en degrés, l'approche + le mode (+ la répartition
  des Δi en Approche 2), et le texte d'avertissement complet quand la répartition uniforme
  est active.
- Dessin : l'étiquette d'échelle indique maintenant les **deux** échelles (horizontale et
  verticale déformée, CDC §7.1 : « Éch. H : 1/X — Éch. V : 1/Y ») au lieu de la seule
  échelle horizontale.
- **Correctif dessin** : l'ancienne barre d'échelle graduée (référence fixe de 10 cm modèle)
  débordait largement du dessin et était tronquée dès que la géométrie était petite (T de
  quelques dizaines de mm) — elle était de toute façon trompeuse sur un profil à échelle
  verticale déformée (valide pour un seul axe). Remplacée par l'étiquette de double échelle
  ci-dessus ; les axes gradués K (horizontal) et H (vertical) restent la graduation de
  référence, désormais entièrement dans le cadre du dessin (plus de troncature à l'export).
- **Correctif générique `packages/commun` (export PDF)** : avant de placer le dessin, si sa
  hauteur ne tient pas dans l'espace restant de la page, il est reporté sur une page neuve
  plutôt que tronqué silencieusement par le bord de page (`pdf.addImage` coupe sans
  avertir). Au pire le dessin occupe seul une page. Sans régression sur module-arc
  (vérifié par export réel).
- Note : les libellés du bloc de contexte PDF utilisent des formes ASCII (« i0 »/« iN »
  plutôt que les indices « i₀ »/« iₙ » de l'interface) car la police standard de jsPDF ne
  dispose pas des caractères en indice — l'affichage à l'écran garde les indices.

## 1.2 — 2026-07-17

Nouvelle option en Approche 2 (2a et 2b) : **répartition de Δi entre segments**, au choix :

- **Régulière selon l'arc** (défaut, comportement inchangé) : chaque segment reprend la
  pente moyenne de la portion d'arc théorique qu'il remplace — la polyligne colle
  exactement à un arc de rayon R unique, au prix d'un écart de pente deux fois plus petit
  à TC/CT qu'aux joints intérieurs (ex. 25%-50%-25% pour 2 segments).
- **Strictement uniforme** (nouveau) : ΔI réparti à parts rigoureusement égales entre
  tous les joints, y compris TC et CT (ex. 33%-33%-33% pour 2 segments). Géométriquement,
  cette polyligne ne correspond alors plus à un arc à rayon constant — R/f/T/R_int
  restent affichés mais deviennent purement indicatifs, et l'arc théorique bleu du dessin
  ne passe plus exactement par les sommets de la polyligne rouge (mention explicite
  affichée à l'écran dans ce mode).

Cette option n'est proposée qu'en Approche 2 : en Approche 1, l'arc est déjà défini en
Partie 1, donc la répartition "régulière selon l'arc" reste la seule cohérente (une
répartition uniforme y dégraderait sciemment la fidélité à un arc déjà connu et voulu).

Discussion avec l'utilisateur à l'origine de cette option : la répartition non-uniforme du
comportement par défaut n'est pas un défaut de conception mais une conséquence géométrique
nécessaire — une répartition parfaitement égale des angles ferait "flotter" la polyligne à
côté des droites de pente i₀/iₙ plutôt que de les rejoindre exactement (courbe progressive
à 3 rayons plutôt qu'un raccordement propre), comme confirmé indépendamment par
l'utilisateur en y réfléchissant.

## 1.1 — 2026-07-17

Retouches suite aux premiers retours d'usage réel :

- Valeurs par défaut d'un nouveau projet rendues plus lisibles (i₀=−40‰, iₙ=30‰, R=500mm,
  Δi cible=30‰) — la courbe est désormais nettement visible dès l'ouverture du module.
- Libellé "Rayon R (mm, signé)" simplifié en "Rayon R (mm)".
- Nouvelle colonne "Δi (°)" dans les deux tableaux (points clés et sommets de la polyligne) :
  écart de pente avant/après converti en degrés (même convention petits angles que le reste
  du module, pas de conversion trigonométrique).
- Champs "Δi cible (°)" ajoutés à côté des champs "Δi cible (‰)" existants (Approche 1
  Partie 2 et Approche 2 option 2b), liés dans les deux sens : modifier l'un recalcule
  l'autre.
- Ligne d'horizon : champ déplacé à côté du sélecteur d'échelle/déformation verticale (plus
  visible, juste au-dessus du dessin, au lieu d'être isolé après les deux tableaux) ; la
  suggestion automatique arrondit désormais au 10mm inférieur (au lieu de 100mm) — évitait
  un retour utilisateur où la valeur proposée "tombait" parfois à 0, très loin de la courbe.
- **Correctif export PDF** : le `resultData` du module n'activait jamais
  `pageBreakBeforeTable`, contrairement à module-arc — en paysage, les deux tableaux
  (points clés + sommets) partageaient la page 1 avec le dessin et débordaient hors page
  (seul le premier tableau, tronqué, restait visible). Les deux tableaux passent
  maintenant systématiquement en page 2.
- **Correctif export PDF** : l'échelle de dessin "ajustée à la page" ne prenait en compte
  que la géométrie, pas les marges des axes gradués ni la barre d'échelle — le SVG exporté
  (212mm de large) débordait la largeur utile d'une page portrait (~190mm). `FIT_TARGET_MM`
  recalculé pour que la taille TOTALE du SVG exporté (marges comprises) reste sous la
  largeur/hauteur utile la plus contraignante des 4 formats PDF ; vérifié par export réel
  (paysage et portrait) : dessin désormais à 150×61.8mm dans les deux cas.

## 1.0 — 2026-07-16

Première version fonctionnelle complète du module :

- Calcul du raccordement en profil en long entre deux pentes i₀/iₙ par un arc de rayon R,
  en Approche 1 (arc défini via R/f/T, puis segments déduits via Δi cible ou L imposé) et
  Approche 2 (segments imposés via n+L ou L+Δi cible, arc déduit) — onglets mutuellement
  exclusifs, calcul en temps réel, tous les cas géométriques A-F pris en charge.
- Détermination du point remarquable P (pente nulle en cas A/B, projection verticale de V
  en cas C-F) et validation (ΔI=0, valeurs non positives requises selon le mode).
- Deux tableaux : points clés de l'arc théorique (TC/V/P/CT) et sommets de la polyligne
  rouge matérialisée (n+1 points), avec pentes avant/après.
- Dessin technique du profil à l'échelle : arc théorique échantillonné, polyligne rouge des
  segments, prolongements des pentes amont/aval, ligne d'horizon éditable, axes gradués K
  (horizontal) et H (vertical, avec facteur de déformation ×1/×2/×5/×10 indépendant de
  l'échelle horizontale), barre d'échelle, vue agrandie avec zoom.
- Export PDF/Markdown/PNG/SVG (`ExportButtons`), gestion de projets (créer, ouvrir,
  renommer, dupliquer, supprimer, export/import individuel), et export/import en vrac de
  l'environnement du module.
- Nouvelles primitives ajoutées à `packages/commun` (réutilisables par de futurs modules de
  profil en long) : `profileScale` (échelle horizontale + exagération verticale
  indépendante) et `GraduationAxis` (axe gradué horizontal/vertical).

Correction notable trouvée en implémentant les formules : la formule du CDC pour H_TC
contenait une erreur de signe (corrigée en H_TC = H_V − i₀·T/1000, vérifiée par symétrie
sur un cas dos d'âne i₀=−iₙ et par les dérivées aux bornes de la parabole de l'arc).

Vérifié dans le navigateur (serveur redémarré à froid, onglets neufs pour éviter les faux
positifs de console HMR) : cas A/B (dos d'âne symétrique et asymétrique) et cas C/D
(versant concave) avec dessin, cycle projet complet (créer/enregistrer/rouvrir), zéro
erreur console.

## 0.1 — 2026-07-16

Scaffold initial du module de raccordement vertical : package branché sur le portail
(manifest, route `/modules/raccvert`, i18n `moduleRaccVert`, `transpilePackages`), icône,
page placeholder affichant titre, texte descriptif et version. La logique de calcul (arc,
segmentation, points clés) et le dessin seront ajoutés dans les phases suivantes.
