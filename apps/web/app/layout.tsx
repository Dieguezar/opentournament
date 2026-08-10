import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'OpenTournament',
  description:
    'Plataforma open source para crear, administrar y publicar torneos de esports.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
