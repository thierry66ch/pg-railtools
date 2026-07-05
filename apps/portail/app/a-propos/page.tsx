import { readFileSync } from 'node:fs';
import path from 'node:path';
import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('portail.about');
  const changelogPath = path.join(process.cwd(), '..', '..', 'CHANGELOG.md');
  const changelog = readFileSync(changelogPath, 'utf8');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <h2>{t('changelogTitle')}</h2>
      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{changelog}</pre>
    </div>
  );
}
