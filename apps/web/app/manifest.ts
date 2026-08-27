import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OpenTournament',
    short_name: 'OpenTournament',
    description: 'Plataforma open source para torneos de esports.',
    start_url: '/',
    display: 'standalone',
    background_color: '#111318',
    theme_color: '#111318',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
