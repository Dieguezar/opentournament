import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import PublicObsOverlayLayout from '../app/t/[slug]/overlay/layout';
import PublicObsOverlayPage from '../app/t/[slug]/overlay/[view]/page';
import { OverlayCanvas, isOverlayView, PublicObsOverlay } from './public-obs-overlay';

const snapshot = {
  tournament: {
    name: 'Spring Major',
    appearance: { logoMediaId: '11111111-1111-4111-8111-111111111111' },
  },
  scoreboard: {
    home: { label: 'Alpha' },
    away: { label: 'Bravo' },
    homeScore: 2,
    awayScore: 1,
  },
  upNext: { home: { label: 'Charlie' }, away: { label: 'Delta' } },
  champion: { label: 'Alpha' },
};

describe('public OBS overlay canvas', () => {
  it('uses official branding and includes the next match alongside the scoreboard', () => {
    const markup = renderToStaticMarkup(
      <OverlayCanvas
        snapshot={{
          ...snapshot,
          scoreboard: {
            ...snapshot.scoreboard,
            bracketType: 'winners',
            roundNumber: 2,
            status: 'scheduled',
          },
        }}
        view="scoreboard"
      />,
    );
    expect(markup).toContain('/brand/opentournament-symbol-on-dark.png');
    expect(markup).toContain('OpenTournament');
    expect(markup).toContain('UP NEXT');
    expect(markup).toContain('Charlie');
    expect(markup).toContain('WINNERS · ROUND 2');
    expect(markup).not.toContain('BO5');
    expect(markup).not.toContain('LIVE');
  });

  it('shows honest empty states instead of a fictitious champion or match', () => {
    const empty = { ...snapshot, scoreboard: null, upNext: null, champion: null };
    expect(renderToStaticMarkup(<OverlayCanvas snapshot={empty} view="scoreboard" />)).toContain(
      'Waiting for a match',
    );
    expect(renderToStaticMarkup(<OverlayCanvas snapshot={empty} view="up-next" />)).toContain(
      'Next match not scheduled',
    );
    const champion = renderToStaticMarkup(<OverlayCanvas snapshot={empty} view="champion" />);
    expect(champion).toContain('Champion not decided');
    expect(champion).not.toContain('Champion: TBD');
  });
  it('accepts only the three deterministic public views', () => {
    expect(['scoreboard', 'up-next', 'champion'].every(isOverlayView)).toBe(true);
    expect(isOverlayView('private-admin')).toBe(false);
  });

  it('renders scoreboard state in a transparent 1920x1080 no-scroll canvas', () => {
    const markup = renderToStaticMarkup(<OverlayCanvas snapshot={snapshot} view="scoreboard" />);
    expect(markup).toContain('width:1920px');
    expect(markup).toContain('height:1080px');
    expect(markup).toContain('overflow:hidden');
    expect(markup).toContain('background-color:transparent');
    expect(markup).toContain('Alpha');
    expect(markup).toContain('Bravo');
    expect(markup).toContain('src="/api/v1/media/11111111-1111-4111-8111-111111111111"');
  });

  it('renders the named up-next and champion state without private fallbacks', () => {
    expect(renderToStaticMarkup(<OverlayCanvas snapshot={snapshot} view="up-next" />)).toContain(
      'Charlie',
    );
    expect(renderToStaticMarkup(<OverlayCanvas snapshot={snapshot} view="champion" />)).toContain(
      'Champion: Alpha',
    );
    expect(
      renderToStaticMarkup(
        <OverlayCanvas
          snapshot={{ ...snapshot, tournament: { ...snapshot.tournament, appearance: null } }}
          view="champion"
        />,
      ),
    ).not.toContain('/api/v1/media/');
  });

  it('removes the application chrome and document overflow for OBS routes', () => {
    const markup = renderToStaticMarkup(<PublicObsOverlayLayout>overlay</PublicObsOverlayLayout>);
    expect(markup).toContain('body:has([data-obs-route])');
    expect(markup).toContain('overflow:hidden');
    expect(markup).toContain('>header,body:has([data-obs-route])>.skip-link{display:none}');
    expect(markup).toContain('body:has([data-obs-route]) nextjs-portal{display:none}');
  });

  it('server-renders the actual route canvas before live hydration', async () => {
    const page = await PublicObsOverlayPage({
      params: Promise.resolve({ slug: 'spring-major', view: 'scoreboard' }),
    });
    const markup = renderToStaticMarkup(<PublicObsOverlayLayout>{page}</PublicObsOverlayLayout>);
    expect(markup).toContain('data-overlay-view="scoreboard"');
    expect(markup).toContain('width:1920px');
    expect(markup).toContain('background-color:transparent');
    expect(markup).not.toContain('Spring Major');
  });

  it('keeps invalid view handling at the route boundary', async () => {
    await expect(
      PublicObsOverlayPage({ params: Promise.resolve({ slug: 'spring-major', view: 'private' }) }),
    ).rejects.toThrow();
    expect(
      renderToStaticMarkup(<PublicObsOverlay slug="spring-major" view="champion" />),
    ).toContain('data-overlay-view="champion"');
  });
});
