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

### À venir

- Phase 2 : câblage package + portail (manifest, i18n, route, transpile, prebuild).
- Phase 3 : interface (formulaire adaptatif, tableau à colonnes masquées par type).
- Phase 4 : dessin (3 éléments, 4 rayons aux couleurs imposées, barre d'échelle,
  cotation des débords).
- Phase 5 : bibliothèque de modèles (copie figée) + exports PDF/Markdown/PNG.
- Ultérieur : gabarit de coupe 1:1 imprimable (type 1), pavage multi-pages.
