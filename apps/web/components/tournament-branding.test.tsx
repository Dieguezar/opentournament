import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TournamentBranding } from './tournament-branding';

describe('TournamentBranding', () => {
  it('renders validated colors and same-origin media for a branded tournament', () => {
    const markup = renderToStaticMarkup(
      <TournamentBranding
        appearance={{
          logoMediaId: 'logo-media-id',
          bannerMediaId: 'banner-media-id',
          primaryColor: '#1D4ED8',
          accentColor: '#F59E0B',
        }}
        tournamentName="Open Major"
      >
        <h1>Open Major</h1>
      </TournamentBranding>,
    );

    expect(markup).toContain('--tournament-primary:#1D4ED8');
    expect(markup).toContain('--tournament-accent:#F59E0B');
    expect(markup).toContain('/api/v1/media/logo-media-id');
    expect(markup).toContain('/api/v1/media/banner-media-id');
    expect(markup).toContain('alt="Open Major logo"');
    expect(markup).toContain('alt="Open Major banner"');
    expect(markup).not.toContain('https://');
  });

  it('uses the unbranded presentation when appearance and media are unavailable', () => {
    const markup = renderToStaticMarkup(
      <TournamentBranding appearance={null} tournamentName="Open Major">
        <h1>Open Major</h1>
      </TournamentBranding>,
    );

    expect(markup).toContain('Open Major');
    expect(markup).not.toContain('/api/v1/media/');
    expect(markup).not.toContain('--tournament-primary');
    expect(markup).not.toContain('--tournament-accent');
  });

  it('does not apply malformed colors from an otherwise branded response', () => {
    const markup = renderToStaticMarkup(
      <TournamentBranding
        appearance={{
          logoMediaId: null,
          bannerMediaId: null,
          primaryColor: 'url(https://unsafe.example)',
          accentColor: '#FFF',
        }}
        tournamentName="Open Major"
      >
        <h1>Open Major</h1>
      </TournamentBranding>,
    );

    expect(markup).not.toContain('--tournament-primary');
    expect(markup).not.toContain('--tournament-accent');
    expect(markup).not.toContain('unsafe.example');
  });
});
