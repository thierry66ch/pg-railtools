import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: [
    '@railtools/commun',
    '@railtools/module-demo',
    '@railtools/module-arc',
    '@railtools/module-empriselaterale',
    '@railtools/module-raccvert',
  ],
};

export default withNextIntl(nextConfig);
