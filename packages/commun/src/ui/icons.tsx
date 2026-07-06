/**
 * Petit jeu d'icônes ligne (style "feather"), utilisées par les boutons icône communs
 * (gestion de projets, exports...). Volontairement minimal — pas de dépendance externe.
 */

export interface IconProps {
  size?: number;
}

const commonProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconPlus({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconUpload({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <path d="M12 15V3" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 21h16" />
    </svg>
  );
}

export function IconDownload({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

export function IconFolderOpen({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" />
    </svg>
  );
}

export function IconPencil({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function IconCopy({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V5a1 1 0 0 1 1-1h11" />
    </svg>
  );
}

export function IconTrash({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <path d="M4 7h16" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function IconFilePdf({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M15 2v5h5" />
    </svg>
  );
}

export function IconFileText({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M15 2v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

export function IconImage({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function IconQuestion({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...commonProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.3 1-1.3 1.9v.3" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </svg>
  );
}
