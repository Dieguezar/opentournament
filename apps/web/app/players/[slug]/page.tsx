import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import {
  isPublicProfileSlug,
  PublicPlayerProfile,
  type PublicPlayerProfileData,
} from '@/components/public-player-profile';
import { getDictionary } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface PublicPlayerResponse {
  player: PublicPlayerProfileData;
}

const getPublicPlayer = cache((slug: string) =>
  serverFetch<PublicPlayerResponse>(`/players/${encodeURIComponent(slug)}`),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const copy = getDictionary(await getRequestLocale()).publicPlayer;
  if (!isPublicProfileSlug(slug)) return { title: copy.unavailableMetadata };
  const player = (await getPublicPlayer(slug)).data.player;
  return { title: player?.gamertag ?? copy.unavailableMetadata };
}

export default async function PublicPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const copy = getDictionary(await getRequestLocale()).publicPlayer;
  if (!isPublicProfileSlug(slug)) notFound();

  const playerRes = await getPublicPlayer(slug);
  if (playerRes.status === 503) {
    return (
      <main className="container narrow">
        <div className="service-state" role="status">
          <h1>{copy.unavailableTitle}</h1>
          <p>{copy.unavailableDescription}</p>
        </div>
      </main>
    );
  }
  if (playerRes.status === 404 || !playerRes.data.player) notFound();

  return (
    <main className="container narrow">
      <PublicPlayerProfile copy={copy} profile={playerRes.data.player} />
    </main>
  );
}
