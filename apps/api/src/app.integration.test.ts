import { afterAll, describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)('integración de la API (requiere PostgreSQL)', () => {
  afterAll(async () => {
    const { pool } = await import('./db.js');
    await pool.end();
  });

  it('registro → me → crear organización → logout', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { runMigrations } = await import('@opentournament/database');
    const { initServer } = await import('./app.js');

    await runMigrations(process.env.TEST_DATABASE_URL!);
    const app = await initServer(false);

    try {
      const discordRes = await app.inject({
        method: 'POST',
        url: '/api/v1/discord/interactions',
        payload: {},
      });
      expect(discordRes.statusCode).not.toBe(403);

      const csrfRes = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
      const csrfCookie = csrfRes.cookies.find((c) => c.name === 'csrf')!;
      const csrfBody = csrfRes.json<{ token: string }>();

      const email = `test-${Date.now()}@example.com`;
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { displayName: 'Test User', email, password: 'password-123' },
        headers: { 'x-csrf-token': csrfBody.token, cookie: `${csrfCookie.name}=${csrfCookie.value}` },
      });
      expect(registerRes.statusCode).toBe(201);
      const sessionCookie = registerRes.cookies.find((c) => c.name === 'session')!;
      const cookieHeader = `session=${sessionCookie.value}; csrf=${csrfCookie.value}`;

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: cookieHeader },
      });
      expect(meRes.statusCode).toBe(200);
      expect(meRes.json<{ user: { email: string } }>().user.email).toBe(email);

      const orgRes = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        payload: { name: 'Equipo Test', slug: `test-${Date.now()}` },
        headers: { 'x-csrf-token': csrfBody.token, cookie: cookieHeader },
      });
      expect(orgRes.statusCode).toBe(201);

      const orgsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations',
        headers: { cookie: cookieHeader },
      });
      expect(orgsRes.json<{ organizations: unknown[] }>().organizations.length).toBe(1);

      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { 'x-csrf-token': csrfBody.token, cookie: cookieHeader },
      });
      expect(logoutRes.statusCode).toBe(204);

      const meAfter = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: cookieHeader },
      });
      expect(meAfter.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it('flujo completo: torneo → inscripción → check-in → bracket → reporte bilateral', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { runMigrations } = await import('@opentournament/database');
    const { initServer } = await import('./app.js');

    await runMigrations(process.env.TEST_DATABASE_URL!);
    const app = await initServer(false);

    interface Session {
      session: string;
      csrf: string;
      email: string;
    }

    async function registerUser(displayName: string): Promise<Session> {
      const csrfRes = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
      const csrfCookie = csrfRes.cookies.find((c) => c.name === 'csrf')!;
      const csrfBody = csrfRes.json<{ token: string }>();
      const email = `${displayName.toLowerCase().replace(/\s/g, '')}-${Date.now()}@example.com`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { displayName, email, password: 'password-123' },
        headers: { 'x-csrf-token': csrfBody.token, cookie: `csrf=${csrfCookie.value}` },
      });
      expect(res.statusCode).toBe(201);
      const sessionCookie = res.cookies.find((c) => c.name === 'session')!;
      return { session: sessionCookie.value, csrf: csrfCookie.value, email };
    }

    const headersFor = (session: Session) => ({
      'x-csrf-token': session.csrf,
      cookie: `session=${session.session}; csrf=${session.csrf}`,
    });

    try {
      const userA = await registerUser('Captain A');
      const userB = await registerUser('Captain B');
      const userC = await registerUser('Captain C');

      const orgRes = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        payload: { name: 'Org Test', slug: `org-${Date.now()}` },
        headers: headersFor(userA),
      });
      expect(orgRes.statusCode).toBe(201);

      const meA = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: headersFor(userA),
      });
      const orgId = meA.json<{ user: { organizations: Array<{ id: string }> } }>().user
        .organizations[0]!.id;

      const teamARes = await app.inject({
        method: 'POST',
        url: '/api/v1/teams',
        payload: { organizationId: orgId, name: 'Equipo A', tag: 'TA' },
        headers: headersFor(userA),
      });
      expect(teamARes.statusCode).toBe(201);
      const teamA = teamARes.json<{ team: { id: string } }>().team.id;

      // B se une a la organización y crea su equipo.
      const inviteRes = await app.inject({
        method: 'POST',
        url: `/api/v1/organizations/${orgId}/members`,
        payload: { email: userB.email, role: 'admin' },
        headers: headersFor(userA),
      });
      expect(inviteRes.statusCode).toBe(201);

      const ownerEscalationRes = await app.inject({
        method: 'POST',
        url: `/api/v1/organizations/${orgId}/members`,
        payload: { email: userC.email, role: 'owner' },
        headers: headersFor(userB),
      });
      expect(ownerEscalationRes.statusCode).toBe(403);

      const teamBRes = await app.inject({
        method: 'POST',
        url: '/api/v1/teams',
        payload: { organizationId: orgId, name: 'Equipo B', tag: 'TB' },
        headers: headersFor(userB),
      });
      expect(teamBRes.statusCode).toBe(201);
      const teamB = teamBRes.json<{ team: { id: string } }>().team.id;

      const t = Date.now();
      const tournamentRes = await app.inject({
        method: 'POST',
        url: '/api/v1/tournaments',
        payload: {
          organizationId: orgId,
          gameAdapterKey: 'generic',
          slug: `torneo-${t}`,
          name: 'Torneo Test',
          format: 'single_elimination',
          capacity: 8,
          seriesConfig: { bo: 1, drawsAllowed: false },
        },
        headers: headersFor(userA),
      });
      expect(tournamentRes.statusCode).toBe(201);
      const tournament = tournamentRes.json<{ tournament: { id: string } }>().tournament.id;

      const unlistedSlug = `privado-${t}`;
      const unlistedTournamentRes = await app.inject({
        method: 'POST',
        url: '/api/v1/tournaments',
        payload: {
          organizationId: orgId,
          gameAdapterKey: 'generic',
          slug: unlistedSlug,
          name: 'Torneo privado',
          format: 'single_elimination',
          visibility: 'unlisted',
          capacity: 8,
          seriesConfig: { bo: 1, drawsAllowed: false },
        },
        headers: headersFor(userA),
      });
      expect(unlistedTournamentRes.statusCode).toBe(201);

      const anonymousUnlistedRes = await app.inject({
        method: 'GET',
        url: `/api/v1/tournaments/by-slug/${unlistedSlug}`,
      });
      expect(anonymousUnlistedRes.statusCode).toBe(401);

      const publishRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tournaments/${tournament}/publish`,
        headers: headersFor(userA),
      });
      expect(publishRes.statusCode).toBe(200);

      const regARes = await app.inject({
        method: 'POST',
        url: `/api/v1/tournaments/${tournament}/registrations`,
        payload: { teamId: teamA },
        headers: headersFor(userA),
      });
      expect(regARes.statusCode).toBe(201);

      const regBRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tournaments/${tournament}/registrations`,
        payload: { teamId: teamB },
        headers: headersFor(userB),
      });
      expect(regBRes.statusCode).toBe(201);

      const checkARes = await app.inject({
        method: 'POST',
        url: `/api/v1/tournaments/${tournament}/check-in`,
        payload: { teamId: teamA },
        headers: headersFor(userA),
      });
      expect(checkARes.statusCode).toBe(200);
      const checkBRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tournaments/${tournament}/check-in`,
        payload: { teamId: teamB },
        headers: headersFor(userB),
      });
      expect(checkBRes.statusCode).toBe(200);

      const bracketRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tournaments/${tournament}/bracket/generate`,
        headers: headersFor(userA),
      });
      expect(bracketRes.statusCode).toBe(200);

      const duplicateBracketRes = await app.inject({
        method: 'POST',
        url: `/api/v1/tournaments/${tournament}/bracket/generate`,
        headers: headersFor(userA),
      });
      expect(duplicateBracketRes.statusCode).toBe(409);

      const bracketView = await app.inject({
        method: 'GET',
        url: `/api/v1/tournaments/${tournament}/bracket`,
      });
      const bracket = bracketView.json<{
        brackets: Array<{ rounds: Array<{ matches: Array<{ id: string; home: { teamId: string } | null; away: { teamId: string } | null }> }> }>;
      }>();
      const firstMatch = bracket.brackets[0]!.rounds[0]!.matches.find(
        (m) => m.home && m.away,
      )!;
      expect(firstMatch).toBeDefined();

      const report1 = await app.inject({
        method: 'POST',
        url: `/api/v1/matches/${firstMatch.id}/results`,
        payload: { winnerTeamId: firstMatch.home!.teamId },
        headers: headersFor(userA),
      });
      expect(report1.statusCode).toBe(201);

      const anonymousResults = await app.inject({
        method: 'GET',
        url: `/api/v1/matches/${firstMatch.id}/results`,
      });
      expect(anonymousResults.statusCode).toBe(401);

      const report2 = await app.inject({
        method: 'POST',
        url: `/api/v1/matches/${firstMatch.id}/results`,
        payload: { winnerTeamId: firstMatch.home!.teamId },
        headers: headersFor(userB),
      });
      expect(report2.statusCode).toBe(200);
      expect(report2.json<{ confirmed: boolean }>().confirmed).toBe(true);

      const matchList = await app.inject({
        method: 'GET',
        url: `/api/v1/tournaments/${tournament}/matches`,
      });
      const finalized = matchList
        .json<{ matches: Array<{ id: string; status: string }> }>()
        .matches.find((m) => m.id === firstMatch.id)!;
      expect(finalized.status).toBe('finalized');
    } finally {
      await app.close();
    }
  });
});
