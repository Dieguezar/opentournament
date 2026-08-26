import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import './showcase.css';
import { PwaRegister } from '@/components/pwa-register';
import { Header } from '@/components/header';
import { ThemeScript } from '@/components/theme-script';

export const metadata: Metadata = {
  title: {
    default: 'OpenTournament',
    template: '%s | OpenTournament',
  },
  description: 'Plataforma open source para crear, administrar y publicar torneos de esports.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <Header />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <PwaRegister />
      </body>
    </html>
  );
}
