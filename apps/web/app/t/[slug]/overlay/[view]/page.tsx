import { notFound } from 'next/navigation';

import { isOverlayView, PublicObsOverlay } from '@/components/public-obs-overlay';

export const dynamic = 'force-dynamic';

export default async function PublicObsOverlayPage({
  params,
}: {
  params: Promise<{ slug: string; view: string }>;
}) {
  const { slug, view } = await params;
  if (!isOverlayView(view)) notFound();

  return <PublicObsOverlay slug={slug} view={view} />;
}
