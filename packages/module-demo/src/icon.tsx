/** Petit logo du module, affiché sur la page d'accueil du portail. */
export function DemoModuleIcon() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <rect x="0" y="0" width="32" height="32" rx="7" fill="#1f5f8b" />
      <path
        d="M6 20 Q 16 20 24 12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g stroke="#dfe7ee" strokeWidth="1.3" strokeLinecap="round">
        <line x1="7" y1="24" x2="25" y2="24" />
        <line x1="9" y1="22.5" x2="9" y2="25.5" />
        <line x1="13.5" y1="22.5" x2="13.5" y2="25.5" />
        <line x1="18" y1="22.5" x2="18" y2="25.5" />
        <line x1="22.5" y1="22.5" x2="22.5" y2="25.5" />
      </g>
    </svg>
  );
}
