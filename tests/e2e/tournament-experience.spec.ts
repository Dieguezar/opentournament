import { expect, request as createRequest, test, type APIRequestContext } from '@playwright/test';
import sharp from 'sharp';

interface ApiUser {
  api: APIRequestContext;
  csrfToken: string;
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

function mutationHeaders(user: ApiUser) {
  return { 'x-csrf-token': user.csrfToken };
}

async function register(displayName: string): Promise<ApiUser> {
  const api = await createRequest.newContext({ baseURL });
  const csrf = await api.get('/api/v1/auth/csrf');
  expect(csrf.ok()).toBe(true);
  const { token: csrfToken } = (await csrf.json()) as { token: string };
  const response = await api.post('/api/v1/auth/register', {
    data: {
      displayName,
      email: `${crypto.randomUUID()}@example.test`,
      password: 'password-123',
    },
    headers: { 'x-csrf-token': csrfToken },
  });
  expect(response.status()).toBe(201);
  return { api, csrfToken };
}

async function upload(user: ApiUser, path: string, png: Buffer) {
  return user.api.post(path, {
    headers: mutationHeaders(user),
    multipart: { file: { name: 'brand.png', mimeType: 'image/png', buffer: png } },
  });
}

test('publishes branded public media, then revokes a public profile safely', async ({ page }) => {
  const owner = await register('Brand owner');
  const outsider = await register('Denied user');
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10);
  const png = await sharp({
    create: { width: 2, height: 2, channels: 4, background: { r: 18, g: 52, b: 86, alpha: 1 } },
  })
    .png()
    .toBuffer();

  try {
    const organizationResponse = await owner.api.post('/api/v1/organizations', {
      data: { name: `Brand ${suffix}`, slug: `brand-${suffix}` },
      headers: mutationHeaders(owner),
    });
    expect(organizationResponse.status()).toBe(201);
    const organizationId = ((await organizationResponse.json()) as { organization: { id: string } })
      .organization.id;

    const tournamentResponse = await owner.api.post('/api/v1/tournaments', {
      data: {
        organizationId,
        gameAdapterKey: 'generic',
        name: `Brand ${suffix}`,
        slug: `brand-${suffix}`,
      },
      headers: mutationHeaders(owner),
    });
    expect(tournamentResponse.status()).toBe(201);
    const tournament = (await tournamentResponse.json()) as {
      tournament: { id: string; slug: string };
    };

    expect(
      (
        await owner.api.patch(`/api/v1/tournaments/${tournament.tournament.id}/appearance`, {
          data: { primaryColor: '#123456', accentColor: '#abcdef' },
          headers: mutationHeaders(owner),
        })
      ).status(),
    ).toBe(200);
    const logoResponse = await upload(
      owner,
      `/api/v1/tournaments/${tournament.tournament.id}/appearance/logo`,
      png,
    );
    expect(logoResponse.status()).toBe(201);
    const logoId = ((await logoResponse.json()) as { media: { id: string } }).media.id;
    expect(
      (await owner.api.get(`/api/v1/tournaments/by-slug/${tournament.tournament.slug}`)).status(),
    ).toBe(404);
    expect((await owner.api.get(`/api/v1/media/${logoId}`)).status()).toBe(404);
    expect((await page.goto(`/t/${tournament.tournament.slug}`))?.status()).toBe(404);
    await expect(page.locator('body')).toContainText(/could not be found/u);
    expect(
      (
        await owner.api.post(`/api/v1/tournaments/${tournament.tournament.id}/publish`, {
          headers: mutationHeaders(owner),
        })
      ).status(),
    ).toBe(200);

    expect(
      (
        await outsider.api.post(
          `/api/v1/tournaments/${tournament.tournament.id}/appearance/banner`,
          {
            headers: mutationHeaders(outsider),
            multipart: { file: { name: 'denied.png', mimeType: 'image/png', buffer: png } },
          },
        )
      ).status(),
    ).toBe(403);

    const mediaResponse = await owner.api.get(`/api/v1/media/${logoId}`);
    expect(mediaResponse.status()).toBe(200);
    expect(mediaResponse.headers()).toMatchObject({
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'image/png',
      'x-content-type-options': 'nosniff',
    });
    expect(mediaResponse.headers().etag).toMatch(/^"[0-9a-f]{64}"$/u);
    const mediaBytes = await mediaResponse.body();
    expect(mediaResponse.headers()['content-length']).toBe(String(mediaBytes.byteLength));
    expect(mediaBytes).toEqual(await sharp(png).rotate().png().toBuffer());

    await page.goto(`/t/${tournament.tournament.slug}`);
    await expect(page.getByRole('heading', { name: `Brand ${suffix}` })).toBeVisible();
    await expect(page.getByAltText(`Brand ${suffix} logo`)).toHaveAttribute(
      'src',
      `/api/v1/media/${logoId}`,
    );
    await expect(page.locator('section').first()).toHaveAttribute(
      'style',
      /--tournament-primary:\s*#123456/u,
    );

    const profileSlug = `player-${suffix}`;
    expect(
      (
        await owner.api.put('/api/v1/profile/public', {
          data: {
            slug: profileSlug,
            gamertag: `Player ${suffix}`,
            isPublished: true,
            showAvatar: true,
            showRealName: false,
            showBiography: false,
          },
          headers: mutationHeaders(owner),
        })
      ).status(),
    ).toBe(200);
    const avatarResponse = await upload(owner, '/api/v1/profile/public/avatar', png);
    expect(avatarResponse.status()).toBe(201);
    const avatarId = ((await avatarResponse.json()) as { media: { id: string } }).media.id;

    await page.goto(`/players/${profileSlug}`);
    await expect(page.getByRole('heading', { name: `Player ${suffix}` })).toBeVisible();
    await expect(
      page.getByRole('img', { name: new RegExp(`Avatar (?:of|de) Player ${suffix}`, 'u') }),
    ).toHaveAttribute('src', `/api/v1/media/${avatarId}`);

    expect(
      (
        await owner.api.put('/api/v1/profile/public', {
          data: {
            slug: profileSlug,
            gamertag: `Player ${suffix}`,
            isPublished: false,
            showAvatar: true,
            showRealName: false,
            showBiography: false,
          },
          headers: mutationHeaders(owner),
        })
      ).status(),
    ).toBe(200);
    expect((await owner.api.get(`/api/v1/players/${profileSlug}`)).status()).toBe(404);
    expect((await owner.api.get(`/api/v1/media/${avatarId}`)).status()).toBe(404);
    expect((await page.goto(`/players/${profileSlug}`))?.status()).toBe(404);
    await expect(page.locator('body')).toContainText(/could not be found/u);
  } finally {
    await owner.api.dispose();
    await outsider.api.dispose();
  }
});

test('public OBS overlay converges after invalidation, reconnect, and reload', async ({ page }) => {
  const owner = await register('Overlay owner');
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10);
  const image = async (red: number) =>
    sharp({
      create: { width: 2, height: 2, channels: 4, background: { r: red, g: 52, b: 86, alpha: 1 } },
    })
      .png()
      .toBuffer();

  try {
    const organizationResponse = await owner.api.post('/api/v1/organizations', {
      data: { name: `Overlay ${suffix}`, slug: `overlay-${suffix}` },
      headers: mutationHeaders(owner),
    });
    expect(organizationResponse.status()).toBe(201);
    const organizationId = ((await organizationResponse.json()) as { organization: { id: string } })
      .organization.id;
    const tournamentResponse = await owner.api.post('/api/v1/tournaments', {
      data: {
        organizationId,
        gameAdapterKey: 'generic',
        name: `Overlay ${suffix}`,
        slug: `overlay-${suffix}`,
      },
      headers: mutationHeaders(owner),
    });
    expect(tournamentResponse.status()).toBe(201);
    const tournament = (await tournamentResponse.json()) as {
      tournament: { id: string; slug: string };
    };
    const initial = await upload(
      owner,
      `/api/v1/tournaments/${tournament.tournament.id}/appearance/logo`,
      await image(18),
    );
    expect(initial.status()).toBe(201);
    const initialId = ((await initial.json()) as { media: { id: string } }).media.id;
    expect(
      (
        await owner.api.post(`/api/v1/tournaments/${tournament.tournament.id}/publish`, {
          headers: mutationHeaders(owner),
        })
      ).status(),
    ).toBe(200);

    for (const view of ['scoreboard', 'up-next', 'champion']) {
      await page.goto(`/t/${tournament.tournament.slug}/overlay/${view}`);
      await expect(page.locator(`[data-overlay-view="${view}"]`)).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(async (slug) => {
            const response = await fetch(`/api/v1/tournaments/by-slug/${slug}/overlay`);
            return response.status;
          }, tournament.tournament.slug),
        )
        .toBe(200);
      await expect(page.getByRole('heading', { name: `Overlay ${suffix}` })).toBeVisible({
        timeout: 15_000,
      });
    }
    await page.goto(`/t/${tournament.tournament.slug}/overlay/scoreboard`);
    const canvas = page.locator('[data-overlay-view="scoreboard"]');
    await expect(canvas).toHaveCSS('width', '1920px');
    await expect(canvas).toHaveCSS('height', '1080px');
    await expect(canvas).toHaveCSS('overflow', 'hidden');
    await expect(canvas.getByRole('img', { name: 'Tournament logo' })).toHaveAttribute(
      'src',
      `/api/v1/media/${initialId}`,
    );
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    await page.reload();
    await expect(canvas.getByRole('img', { name: 'Tournament logo' })).toHaveAttribute(
      'src',
      `/api/v1/media/${initialId}`,
    );
    const second = await upload(
      owner,
      `/api/v1/tournaments/${tournament.tournament.id}/appearance/logo`,
      await image(52),
    );
    expect(second.status()).toBe(201);
    const secondId = ((await second.json()) as { media: { id: string } }).media.id;
    const third = await upload(
      owner,
      `/api/v1/tournaments/${tournament.tournament.id}/appearance/logo`,
      await image(86),
    );
    expect(third.status()).toBe(201);
    const thirdId = ((await third.json()) as { media: { id: string } }).media.id;
    await expect(canvas.getByRole('img', { name: 'Tournament logo' })).toHaveAttribute(
      'src',
      `/api/v1/media/${thirdId}`,
      {
        timeout: 15_000,
      },
    );
    expect(secondId).not.toBe(thirdId);

    await page.context().setOffline(true);
    const afterDisconnect = await upload(
      owner,
      `/api/v1/tournaments/${tournament.tournament.id}/appearance/logo`,
      await image(120),
    );
    expect(afterDisconnect.status()).toBe(201);
    const reconnectId = ((await afterDisconnect.json()) as { media: { id: string } }).media.id;
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(canvas.getByRole('img', { name: 'Tournament logo' })).toHaveAttribute(
      'src',
      `/api/v1/media/${reconnectId}`,
      {
        timeout: 15_000,
      },
    );
  } finally {
    await owner.api.dispose();
  }
});
