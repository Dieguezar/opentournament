import {
  expect,
  request as createPlaywrightRequest,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

interface ApiUser {
  api: APIRequestContext;
  csrfToken: string;
}

interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  status: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
}

interface TournamentFixture {
  id: string;
  slug: string;
  matches: Match[];
}

const PASSWORD = 'password-123';

async function registerOrganizer(): Promise<ApiUser> {
  const api = await createPlaywrightRequest.newContext({ baseURL: 'http://localhost:3000' });
  const csrfResponse = await api.get('/api/v1/auth/csrf');
  expect(csrfResponse.ok()).toBe(true);
  const { token: csrfToken } = (await csrfResponse.json()) as { token: string };
  const registerResponse = await api.post('/api/v1/auth/register', {
    data: {
      displayName: 'Organizador de participantes',
      email: `participant-e2e-${crypto.randomUUID()}@example.com`,
      password: PASSWORD,
    },
    headers: { 'x-csrf-token': csrfToken },
  });
  expect(registerResponse.status()).toBe(201);
  return { api, csrfToken };
}

function mutationHeaders(user: ApiUser) {
  return { 'x-csrf-token': user.csrfToken };
}

async function createTeam(
  owner: ApiUser,
  organizationId: string,
  name: string,
  tag: string,
): Promise<Team> {
  const response = await owner.api.post('/api/v1/teams', {
    data: { organizationId, name, tag, gameAdapterKey: 'generic' },
    headers: mutationHeaders(owner),
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { team: Team }).team;
}

async function createTournament(
  owner: ApiUser,
  organizationId: string,
  teams: Team[],
  label: string,
): Promise<TournamentFixture> {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10);
  const tournamentResponse = await owner.api.post('/api/v1/tournaments', {
    data: {
      organizationId,
      gameAdapterKey: 'generic',
      slug: `participant-${label}-${suffix}`,
      name: `Participant ${label} E2E`,
    },
    headers: mutationHeaders(owner),
  });
  expect(tournamentResponse.status()).toBe(201);
  const tournament = (
    (await tournamentResponse.json()) as {
      tournament: { id: string; slug: string };
    }
  ).tournament;

  expect(
    (
      await owner.api.post(`/api/v1/tournaments/${tournament.id}/publish`, {
        headers: mutationHeaders(owner),
      })
    ).status(),
  ).toBe(200);

  for (const team of teams) {
    expect(
      (
        await owner.api.post(`/api/v1/tournaments/${tournament.id}/registrations`, {
          data: { teamId: team.id },
          headers: mutationHeaders(owner),
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await owner.api.post(`/api/v1/tournaments/${tournament.id}/check-in`, {
          data: { teamId: team.id },
          headers: mutationHeaders(owner),
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

  const matchesResponse = await owner.api.get(`/api/v1/tournaments/${tournament.id}/matches`);
  expect(matchesResponse.ok()).toBe(true);
  const matches = ((await matchesResponse.json()) as { matches: Match[] }).matches.filter(
    (match) => match.homeTeamId && match.awayTeamId,
  );
  expect(matches.length).toBeGreaterThan(0);
  return { ...tournament, matches };
}

async function createPass(owner: ApiUser, tournamentId: string, teamId: string): Promise<string> {
  const response = await owner.api.post(`/api/v1/tournaments/${tournamentId}/access-passes`, {
    data: { teamId, expiresInHours: 24 },
    headers: mutationHeaders(owner),
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { token: string }).token;
}

async function openParticipant(
  browser: Browser,
  token: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/access#token=${token}`);
  await page.waitForURL(/\/t\/participant-/);
  return { context, page };
}

async function expectParticipantShell(page: Page, teamName: string) {
  await expect(page.getByText('Participante', { exact: true })).toBeVisible();
  await expect(page.getByText(teamName, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mi torneo' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Torneos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Nuevo torneo' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Nuevo participante' })).toHaveCount(0);
}

async function reportResult(
  page: Page,
  match: Match,
  winnerName: string,
  homeScore: number,
  awayScore: number,
) {
  await page.getByLabel('Ganador').selectOption({ label: winnerName });
  await page.getByLabel(`Puntos de ${match.homeTeam}`).fill(String(homeScore));
  await page.getByLabel(`Puntos de ${match.awayTeam}`).fill(String(awayScore));
  await page.getByRole('button', { name: 'Reportar resultado' }).click();
}

test('isolated passes → participant navigation → bilateral agreement and conflict', async ({
  browser,
}) => {
  const owner = await registerOrganizer();
  const contexts: BrowserContext[] = [];

  try {
    const organizationResponse = await owner.api.post('/api/v1/organizations', {
      data: {
        name: 'Participantes E2E',
        slug: `participants-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`,
      },
      headers: mutationHeaders(owner),
    });
    expect(organizationResponse.status()).toBe(201);
    const organizationId = (
      (await organizationResponse.json()) as {
        organization: { id: string };
      }
    ).organization.id;

    const teams = await Promise.all([
      createTeam(owner, organizationId, 'Aurora E2E', 'AUR'),
      createTeam(owner, organizationId, 'Pixel E2E', 'PIX'),
      createTeam(owner, organizationId, 'Titanes E2E', 'TIT'),
      createTeam(owner, organizationId, 'Quetzal E2E', 'QTZ'),
    ]);

    const visibilityTournament = await createTournament(owner, organizationId, teams, 'visibility');
    const visibilityMatch = visibilityTournament.matches[0]!;
    const visibilityHomeToken = await createPass(
      owner,
      visibilityTournament.id,
      visibilityMatch.homeTeamId,
    );

    const organizerContext = await browser.newContext({
      storageState: await owner.api.storageState(),
    });
    contexts.push(organizerContext);
    const warningPage = await organizerContext.newPage();
    await warningPage.goto(`/access#token=${visibilityHomeToken}`);
    await expect(
      warningPage.getByRole('heading', { name: '¿Reemplazar la sesión activa?' }),
    ).toBeVisible();
    await expect(
      warningPage.getByText(
        /reemplazará la sesión activa en este navegador y en todas sus pestañas/,
      ),
    ).toBeVisible();
    await warningPage.getByRole('button', { name: 'Continuar con el pase' }).click();
    await warningPage.waitForURL(/\/t\/participant-visibility-/);

    const visibilityAwayToken = await createPass(
      owner,
      visibilityTournament.id,
      visibilityMatch.awayTeamId,
    );
    const visibleHome = await openParticipant(browser, visibilityHomeToken);
    const visibleAway = await openParticipant(browser, visibilityAwayToken);
    contexts.push(visibleHome.context, visibleAway.context);
    await expectParticipantShell(visibleHome.page, visibilityMatch.homeTeam);
    await expectParticipantShell(visibleAway.page, visibilityMatch.awayTeam);
    await expect(visibleHome.page.locator('#reportar > ul > li')).toHaveCount(1);
    await expect(visibleAway.page.locator('#reportar > ul > li')).toHaveCount(1);

    const confirmationTournament = await createTournament(
      owner,
      organizationId,
      teams.slice(0, 2),
      'confirmation',
    );
    const confirmationMatch = confirmationTournament.matches[0]!;
    const [confirmationHomeToken, confirmationAwayToken] = await Promise.all([
      createPass(owner, confirmationTournament.id, confirmationMatch.homeTeamId),
      createPass(owner, confirmationTournament.id, confirmationMatch.awayTeamId),
    ]);
    const confirmationHome = await openParticipant(browser, confirmationHomeToken);
    const confirmationAway = await openParticipant(browser, confirmationAwayToken);
    contexts.push(confirmationHome.context, confirmationAway.context);

    await reportResult(confirmationHome.page, confirmationMatch, confirmationMatch.homeTeam, 13, 9);
    await expect(
      confirmationHome.page.getByText('Reporte enviado. Esperando la confirmación del rival…'),
    ).toBeVisible();

    await reportResult(confirmationAway.page, confirmationMatch, confirmationMatch.homeTeam, 13, 9);
    await expect(
      confirmationAway.page.getByText('Resultado confirmado y bracket actualizado.'),
    ).toBeVisible();
    await confirmationAway.page.reload();
    await expect(
      confirmationAway.page.getByRole('heading', { name: 'No tenés partidas pendientes' }),
    ).toBeVisible();

    const conflictTournament = await createTournament(
      owner,
      organizationId,
      teams.slice(2),
      'conflict',
    );
    const conflictMatch = conflictTournament.matches[0]!;
    const [conflictHomeToken, conflictAwayToken] = await Promise.all([
      createPass(owner, conflictTournament.id, conflictMatch.homeTeamId),
      createPass(owner, conflictTournament.id, conflictMatch.awayTeamId),
    ]);
    const conflictHome = await openParticipant(browser, conflictHomeToken);
    const conflictAway = await openParticipant(browser, conflictAwayToken);
    contexts.push(conflictHome.context, conflictAway.context);

    await reportResult(conflictHome.page, conflictMatch, conflictMatch.homeTeam, 2, 0);
    await reportResult(conflictAway.page, conflictMatch, conflictMatch.awayTeam, 0, 2);
    await expect(
      conflictAway.page.getByText(
        'Los reportes no coinciden. Se abrió una disputa para que la revise el staff.',
      ),
    ).toBeVisible();

    const disputesResponse = await owner.api.get(
      `/api/v1/tournaments/${conflictTournament.id}/disputes`,
    );
    expect(disputesResponse.ok()).toBe(true);
    expect(
      (await disputesResponse.json()) as { disputes: Array<{ reason: string }> },
    ).toMatchObject({ disputes: [expect.objectContaining({ reason: 'result_conflict' })] });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await owner.api.dispose();
  }
});
