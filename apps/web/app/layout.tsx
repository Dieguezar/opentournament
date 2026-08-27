import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/inter';
import './showcase.css';
import { PwaRegister } from '@/components/pwa-register';
import { Header } from '@/components/header';
import { I18nProvider } from '@/components/i18n-provider';
import { ThemeScript } from '@/components/theme-script';
import { getDictionary } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return {
    title: {
      default: 'OpenTournament',
      template: '%s | OpenTournament',
    },
    description: dictionary.home.tagline,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <I18nProvider dictionary={dictionary} locale={locale}>
          <a className="skip-link" href="#main-content">
            {dictionary.accessibility.skipToContent}
          </a>
          <Header locale={locale} />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <PwaRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
