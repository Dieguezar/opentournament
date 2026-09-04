import { describe, expect, it } from 'vitest';

import { ApiClientError } from '../lib/api';
import {
  deleteOwnerProfile,
  loadOwnerProfile,
  saveOwnerProfile,
  type OwnerProfileClient,
  type PublicProfileForm,
} from '../lib/public-profile-workflow';

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

function clientFor(responses: Array<unknown>): { client: OwnerProfileClient; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    client: async function <T>(path: string, init?: RequestInit) {
      calls.push(`${init?.method ?? 'GET'} ${path}${init?.body ? ` ${init.body}` : ''}`);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response as T;
    },
  };
}

describe('PublicProfileSettings workflow', () => {
  it('loads the owner GET projection into editable controls', async () => {
    const { client, calls } = clientFor([
      { profile: { ...profile, realName: null, biography: null } },
    ]);

    await expect(loadOwnerProfile(client)).resolves.toMatchObject({
      ...profile,
      realName: '',
      biography: '',
    });
    expect(calls).toEqual(['GET /profile/public']);
  });

  it('saves correction and hide payloads before reloading authoritative settings', async () => {
    const form: PublicProfileForm = { ...profile, realName: '', biography: '' };
    const { client, calls } = clientFor([
      undefined,
      { profile: { ...profile, gamertag: 'Nox 2' } },
    ]);

    await expect(saveOwnerProfile(client, { ...form, gamertag: 'Nox 2' })).resolves.toMatchObject({
      gamertag: 'Nox 2',
    });
    expect(calls).toEqual([expect.stringContaining('PUT /profile/public'), 'GET /profile/public']);
    expect(calls[0]).toContain('"showAvatar":true');
    expect(calls[0]).toContain('"showRealName":false');

    const hidden = clientFor([undefined, { profile: { ...profile, isPublished: false } }]);
    await saveOwnerProfile(hidden.client, form, true);
    expect(hidden.calls[0]).toContain('"isPublished":false');
    expect(hidden.calls[0]).toContain('"showBiography":true');
  });

  it('propagates unauthorized and validation failures without a success result', async () => {
    const unauthorized = clientFor([new ApiClientError(401, 'UNAUTHORIZED', 'Sign in', 'Sign in')]);
    await expect(loadOwnerProfile(unauthorized.client)).rejects.toMatchObject({ status: 401 });

    const invalid = clientFor([new ApiClientError(422, 'INVALID', 'Invalid', 'Invalid')]);
    await expect(saveOwnerProfile(invalid.client, profile)).rejects.toMatchObject({ status: 422 });
    expect(invalid.calls).toEqual([expect.stringContaining('PUT /profile/public')]);
  });

  it('requires explicit destructive confirmation before it can call DELETE', async () => {
    const unconfirmed = clientFor([]);
    await expect(deleteOwnerProfile(unconfirmed.client, false)).resolves.toEqual({
      state: 'not-confirmed',
    });
    expect(unconfirmed.calls).toEqual([]);
  });

  it('requires DELETE followed by owner GET 404 before deleting local private data', async () => {
    const confirmed = clientFor([
      undefined,
      new ApiClientError(404, 'NOT_FOUND', 'Not found', 'Not found'),
    ]);
    await expect(deleteOwnerProfile(confirmed.client, true)).resolves.toEqual({ state: 'deleted' });
    expect(confirmed.calls).toEqual(['DELETE /profile/public', 'GET /profile/public']);

    const stale = clientFor([undefined, { profile }]);
    await expect(deleteOwnerProfile(stale.client, true)).resolves.toEqual({ state: 'unconfirmed' });
    expect(stale.calls).toEqual(['DELETE /profile/public', 'GET /profile/public']);
  });

  it('returns a failure outcome for ambiguous DELETE and post-DELETE verification failures', async () => {
    const rejected = clientFor([
      new ApiClientError(503, 'UNAVAILABLE', 'Unavailable', 'Unavailable'),
    ]);
    await expect(deleteOwnerProfile(rejected.client, true)).resolves.toMatchObject({
      state: 'failed',
      error: { status: 503 },
    });
    expect(rejected.calls).toEqual(['DELETE /profile/public']);

    const verificationFailed = clientFor([
      undefined,
      new ApiClientError(500, 'UNKNOWN', 'Try again', 'Try again'),
    ]);
    await expect(deleteOwnerProfile(verificationFailed.client, true)).resolves.toMatchObject({
      state: 'failed',
      error: { status: 500 },
    });
    expect(verificationFailed.calls).toEqual(['DELETE /profile/public', 'GET /profile/public']);
  });
});
