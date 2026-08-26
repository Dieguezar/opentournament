import {
  expect,
  request as createPlaywrightRequest,
  test,
  type APIRequestContext,
} from '@playwright/test';

interface ApiUser {
  api: APIRequestContext;
  csrfToken: string;
  email: string;
}

const PASSWORD = 'password-123';

async function registerApiUser(displayName: string): Promise<ApiUser> {
  const api = await createPlaywrightRequest.newContext({ baseURL: 'http://localhost:3000' });
  const csrfResponse = await api.get('/api/v1/auth/csrf');
  expect(csrfResponse.ok()).toBe(true);
  const { token: csrfToken } = (await csrfResponse.json()) as { token: string };
  const email = `smash-e2e-${crypto.randomUUID()}@example.com`;
  const registerResponse = await api.post('/api/v1/auth/register', {
    data: { displayName, email, password: PASSWORD },
    headers: { 'x-csrf-token': csrfToken },
  });
  expect(registerResponse.status()).toBe(201);
  return { api, csrfToken, email };
}

function mutationHeaders(user: ApiUser) {
  return { 'x-csrf-token': user.csrfToken };
}

test('captain completes and submits a guided Smash Ultimate set', async ({ page }) => {
  const owner = await registerApiUser('Smash A');
  const rival = await registerApiUser('Smash B');
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);

  try {
    const organizationResponse = await owner.api.post('/api/v1/organizations', {
      data: { name: 'Smash E2E', slug: `smash-e2e-${suffix}` },
      headers: mutationHeaders(owner),
    });
    expect(organizationResponse.status()).toBe(201);
    const { organization } = (await organizationResponse.json()) as {
      organization: { id: string };
    };

    const inviteResponse = await owner.api.post(
      `/api/v1/organizations/${organization.id}/members`,
      {
        data: { email: rival.email, role: 'member' },
        headers: mutationHeaders(owner),
      },
    );
    expect(inviteResponse.status()).toBe(201);

    const ownerTeamResponse = await owner.api.post('/api/v1/teams', {
      data: {
        organizationId: organization.id,
        name: 'Smash A',
        tag: 'SMA',
        gameAdapterKey: 'smash_ultimate',
      },
      headers: mutationHeaders(owner),
    });
    const rivalTeamResponse = await rival.api.post('/api/v1/teams', {
      data: {
        organizationId: organization.id,
        name: 'Smash B',
        tag: 'SMB',
        gameAdapterKey: 'smash_ultimate',
      },
      headers: mutationHeaders(rival),
    });
    expect(ownerTeamResponse.status()).toBe(201);
    expect(rivalTeamResponse.status()).toBe(201);
    const ownerTeam = ((await ownerTeamResponse.json()) as { team: { id: string } }).team;
    const rivalTeam = ((await rivalTeamResponse.json()) as { team: { id: string } }).team;

    const tournamentResponse = await owner.api.post('/api/v1/tournaments', {
      data: {
        organizationId: organization.id,
        gameAdapterKey: 'smash_ultimate',
        slug: `smash-guided-${suffix}`,
        name: 'Smash Guided E2E',
      },
      headers: mutationHeaders(owner),
    });
    expect(tournamentResponse.status()).toBe(201);
    const { tournament } = (await tournamentResponse.json()) as {
      tournament: { id: string; slug: string };
    };

    expect(
      (
        await owner.api.post(`/api/v1/tournaments/${tournament.id}/publish`, {
          headers: mutationHeaders(owner),
        })
      ).status(),
    ).toBe(200);

    for (const [user, teamId] of [
      [owner, ownerTeam.id],
      [rival, rivalTeam.id],
    ] as const) {
      expect(
        (
          await user.api.post(`/api/v1/tournaments/${tournament.id}/registrations`, {
            data: { teamId },
            headers: mutationHeaders(user),
          })
        ).status(),
      ).toBe(201);
      expect(
        (
          await user.api.post(`/api/v1/tournaments/${tournament.id}/check-in`, {
            data: { teamId },
            headers: mutationHeaders(user),
          })
        ).status(),
      ).toBe(200);
    }

    expect(
      (
        await owner.api.post(`/api/v1/tournaments/${tournament.id}/bracket/generate`, {
          headers: mutationHeaders(owner),
        })
      ).status(),
    ).toBe(200);

    const ownerStorage = await owner.api.storageState();
    await page.context().addCookies(ownerStorage.cookies);

    let submittedPayload: {
      winnerTeamId: string;
      homeScore: number;
      awayScore: number;
      games: Array<{ stage: string; homeCharacter: string; awayCharacter: string }>;
    } | null = null;
    await page.route('**/api/v1/matches/*/results', async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { confirmed: false } });
    });

    await page.goto(`/t/${tournament.slug}`);
    await expect(page.getByRole('heading', { name: 'Mis sets' })).toBeVisible();

    const ownerWinningPreset = page.getByRole('button', { name: /Gana Smash A/ }).last();
    await ownerWinningPreset.click();
    await expect(page.getByText(/^Game [1-3]$/)).toHaveCount(3);

    await page.getByRole('button', { name: 'Reportar resultado' }).click();
    await expect(page.getByText('Elegí el escenario del game 1.')).toBeVisible();
    await expect(page.getByLabel('Escenario').first()).toBeFocused();

    const stageFields = page.getByLabel('Escenario');
    const ownerCharacterFields = page.getByRole('combobox', { name: 'Smash A', exact: true });
    const rivalCharacterFields = page.getByRole('combobox', { name: 'Smash B', exact: true });
    for (let index = 0; index < 3; index += 1) {
      await stageFields.nth(index).selectOption('Battlefield');
      await ownerCharacterFields.nth(index).fill('Mario');
      await rivalCharacterFields.nth(index).fill('Link');
    }

    await page.getByRole('button', { name: 'Reportar resultado' }).click();
    await expect(
      page.getByText('Reporte enviado. Esperando la confirmación del rival…'),
    ).toBeVisible();

    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload!.homeScore + submittedPayload!.awayScore).toBe(3);
    expect(submittedPayload!.winnerTeamId).toBe(ownerTeam.id);
    expect(submittedPayload!.games).toHaveLength(3);
    expect(submittedPayload!.games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: 'Battlefield',
          homeCharacter: expect.any(String),
          awayCharacter: expect.any(String),
        }),
      ]),
    );
  } finally {
    await Promise.all([owner.api.dispose(), rival.api.dispose()]);
  }
});
