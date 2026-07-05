import type { ReactNode } from 'react';
import { VersionBadge } from './VersionBadge';
import type { VersionInfo } from '../version';

export interface ResultPageLayoutProps {
  title: string;
  description?: string;
  version: VersionInfo;
  children: ReactNode;
  actions?: ReactNode;
}

export function ResultPageLayout({
  title,
  description,
  version,
  children,
  actions,
}: ResultPageLayoutProps) {
  return (
    <div className="rt-card">
      <header>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {actions && <div className="rt-toolbar">{actions}</div>}
      </header>
      <div>{children}</div>
      <footer className="rt-toolbar">
        <VersionBadge version={version.version} build={version.build} />
      </footer>
    </div>
  );
}
