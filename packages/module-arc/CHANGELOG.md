# Changelog — module-arc

## 1.0 — 2026-07-07

Première version fonctionnelle complète du module :

- Calcul du rayon R (corde + flèche) ou de la flèche f (rayon + corde), avec
  sélecteur de mode et messages d'erreur traduits pour les configurations
  géométriquement invalides.
- Tableau d'implantation dynamique (n intervalles, décimales configurables,
  colonne abscisse curviligne s togglable) et curseur E/F en temps réel (mode
  "curseur libre").
- Dessin technique de l'arc à l'échelle (corde, flèche, arc, cotes de
  longueur/rayon/longueur d'arc, barre d'échelle, sélecteur d'échelle de
  dessin 1:1 à 1:50 / "fit").
- Export PDF/Markdown/PNG (`ExportButtons`), gestion de projets (créer,
  ouvrir, renommer, dupliquer, supprimer, export/import individuel), et
  export/import en vrac de l'environnement du module.

## 0.1 — 2026-07-07

Scaffold initial du module de calcul d'arc : package branché sur le portail (manifest,
route `/modules/arc`, i18n `moduleArc`, `transpilePackages`), icône, page placeholder
affichant titre, texte descriptif et version. La logique de calcul (rayon, flèche,
tableau d'implantation) et le dessin seront ajoutés dans les phases suivantes.
