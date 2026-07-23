# Changelog — module Arc2Poly (ArcToPolygone)

Toutes les évolutions notables de ce module sont documentées ici. Versionnement
`majeur.mineur` indépendant de la base commune et des autres modules.

## 0.1 — en cours

### Phase 1 — moteur de calcul (fait)

- Moteur de discrétisation d'arc pour les trois types de support (§2 du CDC) :
  - type 1 (planches trapézoïdales, coupes radiales) : résolution de la contrainte de
    centrage par bissection sur `]0 ; π/8]` (= α ∈ ]0 ; 45°]) ;
  - type 2 (pavés rectangulaires) : solution analytique fermée, sans itération ;
  - type 3 (bordures à emboîtement, rotule B/2) : bissection, `Lm* = Lm + j`, rayon
    intérieur `Ri` par la formule de tangence (extremum radial hors joint).
- Découpage de l'arc complet : `n`, angle résiduel `βr`, corde résiduelle `cr`
  (α jamais recalé sur β/n).
- Neuf validations V1–V9, chaque erreur nommant le paramètre bloquant. V8 (α > 45°)
  est bloquante.
- Suite de tests (`node:test`) : cas T1–T5, les 4 invariants (dont l'anti-régression
  `Ri = Rm − B/2` du type 3) et 5 cas d'erreur — tous verts.

### Phase 2 — câblage package + portail (fait)

- Package `@railtools/module-arc2polygone` : manifest, icône, i18n fr (texte descriptif
  public repris du CDC §1.3), types (données projet + entrée bibliothèque figée), barrel.
- Intégration portail : registry, route `/modules/arc2polygone`, merge i18n,
  `transpilePackages`, dépendance workspace, `version.json` ajouté au `prebuild`.

### Phase 3 — interface de saisie + tableau (fait)

- Sélecteur de type (1/2/3) ; le formulaire s'adapte (champ `jeu` visible au type 3
  seulement, libellé Lm → « entraxe des rotules » au type 3).
- Calcul en direct branché sur le moteur ; reproduit T1/T2/T3 à l'affichage.
- Tableau de résultats à colonnes masquées selon le type (CDC §8.2), valeurs saisies en
  gras, longueurs au mm et angles au dixième de degré (CDC §8.1).
- Messages d'erreur nommant le paramètre bloquant et le sens de correction ; tableau
  masqué en cas d'entrée invalide.
- Message de découpage (arc couvert exactement / élément spécial à ajuster + βr, cr).
- Gestion de projets (ProjectManager + Enregistrer avec rafraîchissement de la liste),
  export/import d'environnement, exports PDF/Markdown (tableau) via `ExportButtons`.

### À venir

- Phase 4 : dessin (3 éléments, 4 rayons aux couleurs imposées, barre d'échelle,
  cotation des débords) + export PNG.
- Phase 5 : bibliothèque de modèles (copie figée) + exports PDF/Markdown/PNG.
- Ultérieur : gabarit de coupe 1:1 imprimable (type 1), pavage multi-pages.
