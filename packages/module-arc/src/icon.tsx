/** Petit logo du module, affiché sur la page d'accueil du portail. */
export function ArcModuleIcon() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <rect x="0" y="0" width="32" height="32" rx="7" fill="#1f5f8b" />
      {/* Arc (corde AB en bas, arc au-dessus) */}
      <path
        d="M6 12 Q 16 26 26 12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Corde AB */}
      <line x1="6" y1="12" x2="26" y2="12" stroke="#dfe7ee" strokeWidth="1.6" strokeLinecap="round" />
      {/* Flèche f (milieu de la corde vers le sommet de l'arc) */}
      <line x1="16" y1="12" x2="16" y2="21" stroke="#dfe7ee" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
