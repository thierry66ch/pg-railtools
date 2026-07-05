import { formatVersion, type VersionInfo } from '../version';

export function VersionBadge({ version, build }: VersionInfo) {
  return <span className="rt-badge">{formatVersion({ version, build })}</span>;
}
