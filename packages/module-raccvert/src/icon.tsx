/** Petit logo du module, affiché sur la page d'accueil du portail. */
export function RaccVertModuleIcon() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <rect x="0" y="0" width="32" height="32" rx="7" fill="#1f5f8b" />
      {/* Pente descendante puis remontante, raccordées par un arc court (dos d'âne/creux) */}
      <path
        d="M4 10 L13 18 Q16 20.4 19 18 L28 10"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ligne d'horizon */}
      <line x1="4" y1="24" x2="28" y2="24" stroke="#dfe7ee" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
