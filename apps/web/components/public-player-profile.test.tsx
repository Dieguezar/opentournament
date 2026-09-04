import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublicParticipantName, PublicPlayerProfile } from './public-player-profile';

describe('public player profile presenters', () => {
  it('renders only the published optional profile fields and same-origin avatar media', () => {
    const markup = renderToStaticMarkup(
      <PublicPlayerProfile
        profile={{
          slug: 'nox-player',
          gamertag: 'Nox',
          realName: 'Nox Morales',
          biography: 'Tournament regular',
          avatar: {
            id: '11111111-1111-4111-8111-111111111111',
            kind: 'avatar',
            url: '/api/v1/media/11111111-1111-4111-8111-111111111111',
            width: 96,
            height: 96,
          },
        }}
      />,
    );

    expect(markup).toContain('Nox');
    expect(markup).toContain('Nox Morales');
    expect(markup).toContain('Tournament regular');
    expect(markup).toContain('/api/v1/media/11111111-1111-4111-8111-111111111111');
    expect(markup).not.toContain('https://');
  });

  it('omits absent optional fields and ignores a non-proxy avatar URL', () => {
    const markup = renderToStaticMarkup(
      <PublicPlayerProfile
        profile={{
          slug: 'private-fields',
          gamertag: 'PrivateTag',
          avatar: {
            id: 'opaque-id',
            kind: 'avatar',
            url: 'https://storage.example/private.png',
            width: 48,
            height: 48,
          },
        }}
      />,
    );

    expect(markup).toContain('PrivateTag');
    expect(markup).not.toContain('storage.example');
    expect(markup).not.toContain('<img');
  });

  it('links only a participant carrying a valid published profile slug', () => {
    const linked = renderToStaticMarkup(
      <PublicParticipantName label="Linked Smash Label" profile={{ slug: 'nox-player' }} />,
    );
    const unlinked = renderToStaticMarkup(<PublicParticipantName label="Unlinked Smash Label" />);
    const invalid = renderToStaticMarkup(
      <PublicParticipantName label="Private Label" profile={{ slug: 'https://unsafe.example' }} />,
    );

    expect(linked).toContain('href="/players/nox-player"');
    expect(unlinked).toContain('Unlinked Smash Label');
    expect(unlinked).not.toContain('href=');
    expect(invalid).toContain('Private Label');
    expect(invalid).not.toContain('href=');
  });
});
