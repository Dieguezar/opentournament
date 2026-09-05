import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ApiClientError } from '../lib/api';
import { getDictionary } from '../lib/i18n';
import { AvatarManagementControls } from './public-profile-settings';
import avatarStyles from './public-player-profile.module.css';
import {
  clearOwnerAvatar,
  deleteOwnerProfile,
  loadOwnerProfile,
  loadProfileEditor,
  saveOwnerProfile,
  type OwnerProfileClient,
  type PublicProfileForm,
  uploadOwnerAvatar,
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
  avatar: null,
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
  it('opens an unpublished creation form only when the owner profile is missing', async () => {
    const missing = clientFor([new ApiClientError(404, 'NOT_FOUND', 'Missing', 'Missing')]);
    await expect(loadProfileEditor(missing.client)).resolves.toMatchObject({
      isNew: true,
      slug: '',
      gamertag: '',
      avatar: null,
      isPublished: false,
      showAvatar: false,
      showRealName: false,
      showBiography: false,
    });
    for (const status of [401, 500]) {
      const failed = clientFor([new ApiClientError(status, 'UNKNOWN', 'Failed', 'Failed')]);
      await expect(loadProfileEditor(failed.client)).rejects.toMatchObject({ status });
    }
  });

  it('sends the chosen slug on creation and reloads saved settings', async () => {
    const saved = clientFor([undefined, { profile: { ...profile, isPublished: false } }]);
    await expect(
      saveOwnerProfile(saved.client, {
        ...profile,
        isNew: true,
        isPublished: false,
      }),
    ).resolves.toMatchObject({ slug: profile.slug, isPublished: false });
    expect(JSON.parse(saved.calls[0]!.slice('PUT /profile/public '.length))).toMatchObject({
      slug: profile.slug,
      isPublished: false,
    });
    expect(saved.calls[0]).not.toContain('isNew');
  });

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

it('uploads and clears avatar media through multipart endpoints before reloading authoritative profile state', async () => {
  const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
  const { client, calls } = clientFor([
    undefined,
    { profile: { ...profile, avatar: { id: 'media-id', url: '/api/v1/media/media-id' } } },
    undefined,
    { profile: { ...profile, avatar: null } },
  ]);

  await expect(uploadOwnerAvatar(client, file)).resolves.toMatchObject({
    avatar: { id: 'media-id' },
  });
  await expect(clearOwnerAvatar(client)).resolves.toMatchObject({ avatar: null });
  expect(calls).toEqual([
    'POST /profile/public/avatar [object FormData]',
    'GET /profile/public',
    'DELETE /profile/public/avatar',
    'GET /profile/public',
  ]);
});

it('does not project an avatar change or success result when upload or clear fails', async () => {
  const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
  const uploadFailure = clientFor([
    new ApiClientError(422, 'INVALID_IMAGE', 'Invalid image', 'Invalid image'),
  ]);
  const clearFailure = clientFor([
    new ApiClientError(503, 'UNAVAILABLE', 'Try again', 'Try again'),
  ]);

  await expect(uploadOwnerAvatar(uploadFailure.client, file)).rejects.toMatchObject({
    status: 422,
  });
  await expect(clearOwnerAvatar(clearFailure.client)).rejects.toMatchObject({ status: 503 });

  expect(uploadFailure.calls).toEqual(['POST /profile/public/avatar [object FormData]']);
  expect(clearFailure.calls).toEqual(['DELETE /profile/public/avatar']);
});

it('renders an announced disabled upload state and only a same-origin avatar preview', () => {
  const markup = renderToStaticMarkup(
    <AvatarManagementControls
      avatar={{ id: 'media-id', url: 'https://storage.example/object-key' }}
      busy="upload"
      copy={getDictionary('en').publicProfileSettings}
      onClear={() => undefined}
      onUpload={() => undefined}
    />,
  );

  expect(markup).toContain('role="status"');
  expect(markup).toContain('aria-live="polite"');
  expect(markup).toContain('Uploading avatar…');
  expect(markup).toContain('disabled=""');
  expect(markup).toContain('src="/api/v1/media/media-id"');
  expect(markup).toContain(`class="${avatarStyles.avatar}"`);
  expect(markup).toContain('width="80"');
  expect(markup).toContain('height="80"');
  expect(markup).not.toContain('storage.example');
  expect(markup).not.toContain('object-key');
});
