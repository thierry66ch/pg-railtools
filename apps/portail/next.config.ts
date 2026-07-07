import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@railtools/commun', '@railtools/module-demo', '@railtools/module-arc'],
};

export default withNextIntl(nextConfig);
