# Changelog — module-raccvert

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
