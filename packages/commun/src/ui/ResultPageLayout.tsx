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
    <div className="rt-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rt-spacing-lg)' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rt-spacing-xs)' }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {description && (
          <p style={{ margin: 0, color: 'var(--rt-color-text-muted)' }}>{description}</p>
        )}
        {actions && <div className="rt-toolbar">{actions}</div>}
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rt-spacing-lg)' }}>
        {children}
      </div>
      <footer
        className="rt-toolbar"
        style={{ paddingTop: 'var(--rt-spacing-md)', borderTop: '1px solid var(--rt-color-border)' }}
      >
        <VersionBadge version={version.version} build={version.build} subtle />
      </footer>
    </div>
  );
}
