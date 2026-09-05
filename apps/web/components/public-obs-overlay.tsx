'use client';

import type { ReactNode } from 'react';
import { isOverlayView, overlayViews, type OverlayViewName } from '../lib/overlay-view';
import { OverlayLive, type OverlaySnapshot } from './overlay-live';
import styles from './public-obs-overlay.module.css';

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
      className={styles.canvas}
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

function matchContext(match: Record<string, unknown> | null): string {
  if (!match) return 'Waiting for a match';
  const bracket = { winners: 'WINNERS', losers: 'LOSERS', final: 'FINAL' }[
    String(match.bracketType)
  ];
  const round = typeof match.roundNumber === 'number' ? `ROUND ${match.roundNumber}` : '';
  return [bracket, round].filter(Boolean).join(' · ') || 'MATCH';
}

function MatchNames({ match }: { match: Record<string, unknown> }) {
  return (
    <>
      <span>{label(match.home)}</span>
      <b className={styles.versus}>VS</b>
      <span>{label(match.away)}</span>
    </>
  );
}

function OverlayContent({ snapshot, view }: { snapshot: OverlaySnapshot; view: OverlayViewName }) {
  const tournament = record(snapshot.tournament);
  const title = typeof tournament?.name === 'string' ? tournament.name : 'Tournament';
  const logo = mediaPath(snapshot);
  const match = record(view === 'scoreboard' ? snapshot.scoreboard : snapshot.upNext);
  const champion = record(snapshot.champion);
  const next = record(snapshot.upNext);
  const status =
    match?.status === 'in_progress'
      ? 'LIVE'
      : match?.status === 'finalized'
        ? 'RESULT'
        : match
          ? 'SCHEDULED'
          : '';

  return (
    <section className={styles.broadcast} aria-live="polite">
      <div className={styles.brand}>
        <img src="/brand/opentournament-symbol-on-dark.png" width={80} height={40} alt="" />
        <span>OpenTournament</span>
      </div>
      {view === 'scoreboard' ? (
        <>
          <div className={styles.scoreboard}>
            <div className={styles.player} title={label(match?.home)}>
              <span>{match ? label(match.home) : '—'}</span>
            </div>
            <strong className={styles.score}>{score(match?.homeScore)}</strong>
            <div className={styles.tournament}>
              <div className={styles.tournamentTitle}>
                {logo && <img alt="Tournament logo" src={logo} />}
                <h1 title={title}>{title}</h1>
              </div>
              <p>{matchContext(match)}</p>
              {status && <span className={styles.status}>{status}</span>}
            </div>
            <strong className={styles.score}>{score(match?.awayScore)}</strong>
            <div className={styles.player} title={label(match?.away)}>
              <span>{match ? label(match.away) : '—'}</span>
            </div>
          </div>
          <aside className={styles.next} aria-label="Next match">
            <strong>UP NEXT</strong>
            {next ? <MatchNames match={next} /> : <span>Next match not scheduled</span>}
          </aside>
        </>
      ) : (
        <div className={styles.feature}>
          <div className={styles.featureTournament}>
            {logo && <img alt="Tournament logo" src={logo} />}
            <h1>{title}</h1>
          </div>
          <p className={styles.kicker}>{view === 'champion' ? 'TOURNAMENT CHAMPION' : 'UP NEXT'}</p>
          {view === 'champion' ? (
            <p className={styles.winner}>
              {champion ? `Champion: ${label(champion)}` : 'Champion not decided'}
            </p>
          ) : next ? (
            <>
              <div className={styles.matchup}>
                <MatchNames match={next} />
              </div>
              <p className={styles.round}>{matchContext(next)}</p>
            </>
          ) : (
            <p className={styles.empty}>Next match not scheduled</p>
          )}
        </div>
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
