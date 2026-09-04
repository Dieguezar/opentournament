import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublicTournamentRegistrationList } from './public-tournament-registration-list';

describe('public tournament registration list', () => {
  it('preserves every registration and joins profile links only by the public team identity', () => {
    const markup = renderToStaticMarkup(
      <PublicTournamentRegistrationList
        listClassName="registration-list"
        locale="en"
        metaClassName="registration-meta"
        participants={[
          { teamId: 'linked-team', label: 'Duplicate label', profile: { slug: 'linked-player' } },
          { teamId: 'unlinked-team', label: 'Duplicate label' },
          { teamId: 'private-team', label: 'Duplicate label' },
          { teamId: 'revoked-team', label: 'Duplicate label' },
        ]}
        registrations={[
          {
            teamId: 'linked-team',
            teamName: 'Duplicate label',
            teamTag: 'LINK',
            registrationStatus: 'approved',
            checkedIn: true,
          },
          {
            teamId: 'unlinked-team',
            teamName: 'Duplicate label',
            teamTag: null,
            registrationStatus: 'pending',
            checkedIn: null,
          },
          {
            teamId: 'private-team',
            teamName: 'Duplicate label',
            teamTag: 'PRIV',
            registrationStatus: 'waitlisted',
            checkedIn: null,
          },
          {
            teamId: 'revoked-team',
            teamName: 'Duplicate label',
            teamTag: 'REVK',
            registrationStatus: 'approved',
            checkedIn: false,
          },
        ]}
        copy={{
          tag: 'Tag {tag}',
          noTag: 'No tag',
          checkedIn: 'Checked in',
          notCheckedIn: 'Not checked in',
        }}
      />,
    );

    expect(markup).toContain('href="/players/linked-player"');
    expect(markup.match(/href="\/players\//g)).toHaveLength(1);
    expect(markup.match(/Duplicate label/g)).toHaveLength(4);
    expect(markup).toContain('Tag LINK');
    expect(markup).toContain('Tag PRIV');
    expect(markup).toContain('Tag REVK');
    expect(markup).toContain('No tag');
    expect(markup).toContain('Pending');
    expect(markup).toContain('Waitlisted');
    expect(markup).toContain('Checked in');
    expect(markup).toContain('Not checked in');
    expect(markup.match(/<li/g)).toHaveLength(4);
  });
});
