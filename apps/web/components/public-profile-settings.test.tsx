import { describe, expect, it } from 'vitest';

import {
  buildProfilePayload,
  canDeleteProfile,
  getMutationState,
  getProfileLoadState,
  projectOwnerProfile,
} from './public-profile-settings';

const profile = {
  slug: 'nox-player',
  gamertag: 'Nox',
  realName: 'Nox Morales',
  biography: 'Tournament regular',
  isPublished: true,
  showAvatar: true,
  showRealName: false,
  showBiography: true,
};

describe('public profile settings contracts', () => {
  it('projects private owner settings into editable state without exposing a public response', () => {
    expect(projectOwnerProfile({ ...profile, realName: null, biography: null })).toMatchObject({
      ...profile,
      realName: '',
      biography: '',
    });
  });

  it('keeps independent visibility choices while preparing correction and hide requests', () => {
    expect(
      buildProfilePayload({ ...projectOwnerProfile(profile), gamertag: 'Nox 2', realName: '' }),
    ).toMatchObject({
      gamertag: 'Nox 2',
      realName: null,
      isPublished: true,
      showAvatar: true,
      showRealName: false,
      showBiography: true,
    });
    expect(buildProfilePayload(projectOwnerProfile(profile), false)).toMatchObject({
      isPublished: false,
      showAvatar: true,
      showRealName: false,
      showBiography: true,
    });
  });

  it('requires explicit delete confirmation and never reports success for unauthorized or failed work', () => {
    expect(canDeleteProfile(false)).toBe(false);
    expect(canDeleteProfile(true)).toBe(true);
    expect(getMutationState(false, false)).toBe('idle');
    expect(getMutationState(true, false)).toBe('error');
    expect(getMutationState(false, true)).toBe('success');
    expect(getProfileLoadState(401)).toBe('anonymous');
    expect(getProfileLoadState(500)).toBe('error');
  });
});
