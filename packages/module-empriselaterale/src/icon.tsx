/** Petit logo du module, affiché sur la page d'accueil du portail. */
export function EmpriseLateraleModuleIcon() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <rect x="0" y="0" width="32" height="32" rx="7" fill="#8b4a1f" />
      {/* Silhouette de caisse à extrémités chanfreinées (octogone) */}
      <path
        d="M9 10 L 20 10 L 25 15 L 25 17 L 20 22 L 9 22 L 6 17 L 6 15 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Axe de voie balayé en courbe */}
      <path
        d="M4 27 Q 16 24 28 27"
        fill="none"
        stroke="#dfe7ee"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
