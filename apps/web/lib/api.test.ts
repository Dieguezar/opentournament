import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from './api';

function response(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiClient request transport', () => {
  it('sends multipart requests with CSRF and same-origin credentials without an explicit content type', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ token: 'csrf-token' }))
      .mockResolvedValueOnce(response({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const body = new FormData();
    body.set('file', new Blob(['avatar'], { type: 'image/png' }), 'avatar.png');

    await apiClient('/profile/public/avatar', { body, method: 'POST' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/auth/csrf');
    const requestCall = fetchMock.mock.calls[1];
    if (!requestCall?.[1]) throw new Error('Expected the multipart request');
    const request = requestCall[1];
    const headers = new Headers(request.headers);
    expect(requestCall[0]).toBe('/api/v1/profile/public/avatar');
    expect(request.body).toBe(body);
    expect(request.credentials).toBe('same-origin');
    expect(headers.get('X-CSRF-Token')).toBe('csrf-token');
    expect(headers.get('Content-Type')).toBeNull();
  });

  it('retains JSON content type, CSRF, and same-origin credentials for JSON requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ token: 'csrf-token' }))
      .mockResolvedValueOnce(response({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient('/profile/public', {
      body: JSON.stringify({ gamertag: 'Nox' }),
      method: 'PUT',
    });

    const requestCall = fetchMock.mock.calls[1];
    if (!requestCall?.[1]) throw new Error('Expected the JSON request');
    const request = requestCall[1];
    const headers = new Headers(request.headers);
    expect(request.credentials).toBe('same-origin');
    expect(headers.get('X-CSRF-Token')).toBe('csrf-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
