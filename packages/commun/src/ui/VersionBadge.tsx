import { formatVersion, type VersionInfo } from '../version';

export interface VersionBadgeProps extends VersionInfo {
  /** Rendu discret (texte estompé, sans pastille) — pour un pied de page ou un coin de carte. */
  subtle?: boolean;
}

export function VersionBadge({ version, build, subtle }: VersionBadgeProps) {
  return (
    <span className={subtle ? 'rt-badge rt-badge--subtle' : 'rt-badge'}>
      {formatVersion({ version, build })}
    </span>
  );
}
