import { notFound } from 'next/navigation';

import { PublicObsOverlay } from '../../../../../components/public-obs-overlay';
import { isOverlayView } from '../../../../../lib/overlay-view';

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
