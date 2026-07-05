import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { PortailHeader } from '../components/PortailHeader';
import { PortailFooter } from '../components/PortailFooter';
import './globals.css';

export const metadata: Metadata = {
  title: 'RailTools — Portail de calcul géométrique',
  description:
    'Portail fédérant des modules de calcul géométrique pour la planification de tracés de voie en modélisme ferroviaire.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PortailHeader />
          <main className="rt-main">{children}</main>
          <PortailFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
