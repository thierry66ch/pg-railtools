/** Petit logo du module, affiché sur la page d'accueil du portail. */
export function Arc2PolygoneModuleIcon() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <rect x="0" y="0" width="32" height="32" rx="7" fill="#7a3e1d" />
      {/* Trois cordes discrétisant un arc (polyligne) */}
      <polyline
        points="5,20 12,13 20,13 27,20"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arc théorique sous-jacent, en pointillé */}
      <path
        d="M5 20 Q 16 6 27 20"
        fill="none"
        stroke="#e8d4c6"
        strokeWidth="1.4"
        strokeDasharray="2 2"
        strokeLinecap="round"
      />
    </svg>
  );
}
