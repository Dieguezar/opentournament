'use client';

import type { ReactNode } from 'react';
import { isOverlayView, overlayViews, type OverlayViewName } from '../lib/overlay-view';
import { OverlayLive, type OverlaySnapshot } from './overlay-live';

export { isOverlayView, overlayViews };
export type { OverlayViewName };

const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function label(value: unknown): string {
  const participant = record(value);
  return typeof participant?.label === 'string' && participant.label.trim()
    ? participant.label
    : 'TBD';
}

function score(value: unknown): string {
  return typeof value === 'number' ? String(value) : '—';
}

function mediaPath(snapshot: OverlaySnapshot): string | null {
  const appearance = record(record(snapshot.tournament)?.appearance);
  const mediaId = appearance?.logoMediaId;
  return typeof mediaId === 'string' && mediaIdPattern.test(mediaId)
    ? `/api/v1/media/${mediaId}`
    : null;
}

export function OverlayCanvasShell({
  children,
  view,
}: {
  children?: ReactNode;
  view: OverlayViewName;
}) {
  return (
    <main
      aria-label={`OBS ${view}`}
      data-overlay-view={view}
      style={{
        backgroundColor: 'transparent',
        height: 1080,
        left: 0,
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        width: 1920,
      }}
    >
      {children}
    </main>
  );
}

function OverlayContent({ snapshot, view }: { snapshot: OverlaySnapshot; view: OverlayViewName }) {
  const tournament = record(snapshot.tournament);
  const title = typeof tournament?.name === 'string' ? tournament.name : 'Tournament';
  const logo = mediaPath(snapshot);
  const match = record(view === 'scoreboard' ? snapshot.scoreboard : snapshot.upNext);
  const champion = label(snapshot.champion);

  return (
    <section aria-live="polite">
      {logo && <img alt="" src={logo} />}
      <h1>{title}</h1>
      {view === 'champion' ? (
        <p>Champion: {champion}</p>
      ) : (
        <p>
          {label(match?.home)} {view === 'scoreboard' && score(match?.homeScore)} —{' '}
          {view === 'scoreboard' && score(match?.awayScore)} {label(match?.away)}
        </p>
      )}
    </section>
  );
}

export function OverlayCanvas({
  snapshot,
  view,
}: {
  snapshot: OverlaySnapshot;
  view: OverlayViewName;
}) {
  return (
    <OverlayCanvasShell view={view}>
      <OverlayContent snapshot={snapshot} view={view} />
    </OverlayCanvasShell>
  );
}

export function PublicObsOverlay({ slug, view }: { slug: string; view: OverlayViewName }) {
  return (
    <OverlayCanvasShell view={view}>
      <OverlayLive slug={slug} view={view}>
        {(snapshot) => <OverlayContent snapshot={snapshot} view={view} />}
      </OverlayLive>
    </OverlayCanvasShell>
  );
}
