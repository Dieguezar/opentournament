import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.TEST_DATABASE_URL);
const INTEGRATION_TEST_TIMEOUT_MS = 30_000;
process.env.ALLOW_UNVERIFIED_EMAILS ??= 'true';

describe.skipIf(!hasDb)('API integration (requires PostgreSQL)', () => {
  afterAll(async () => {
    const { pool } = await import('./db.js');
    await pool.end();
  });

  it(
    'registration → me → create organization → logout',
    { timeout: INTEGRATION_TEST_TIMEOUT_MS },
    async () => {
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
          headers: {
            'x-csrf-token': csrfBody.token,
            cookie: `${csrfCookie.name}=${csrfCookie.value}`,
          },
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
        expect(meRes.json<{ user: { email: string }; participantAccess: null }>()).toMatchObject({
          user: { email },
          participantAccess: null,
        });

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
    },
  );

  it(
    'complete flow: tournament → registration → check-in → bracket → bilateral report',
    { timeout: INTEGRATION_TEST_TIMEOUT_MS },
    async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      const {
        runMigrations,
        stages,
        teams,
        tournamentParticipants,
        tournamentRegistrations,
        tournaments,
      } = await import('@opentournament/database');
      const { db, pool } = await import('./db.js');
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

      async function waitForBlockedRequests(blockerPid: number, expectedCount: number) {
        const timeoutAt = Date.now() + 5_000;
        while (Date.now() < timeoutAt) {
          const result = await pool.query<{ pid: number; blockingPids: number[] }>(
            `select pid, pg_blocking_pids(pid) as "blockingPids"
             from pg_stat_activity
            where cardinality(pg_blocking_pids(pid)) > 0`,
          );
          const blockedByTournament = new Set([blockerPid]);
          let discoveredBlockedRequest = true;
          while (discoveredBlockedRequest) {
            discoveredBlockedRequest = false;
            for (const row of result.rows) {
              if (
                !blockedByTournament.has(row.pid) &&
                row.blockingPids.some((blockingPid) => blockedByTournament.has(blockingPid))
              ) {
                blockedByTournament.add(row.pid);
                discoveredBlockedRequest = true;
              }
            }
          }
          if (blockedByTournament.size - 1 >= expectedCount) return;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error(`No se bloquearon ${expectedCount} requests sobre el torneo`);
      }

      async function lockTournament(tournamentId: string) {
        const client = await pool.connect();
        await client.query('begin');
        const pidResult = await client.query<{ pid: number }>('select pg_backend_pid() as pid');
        await client.query('select id from tournaments where id = $1 for update', [tournamentId]);
        return {
          blockerPid: pidResult.rows[0]!.pid,
          release: async () => {
            await client.query('commit');
            client.release();
          },
        };
      }

      try {
        const userA = await registerUser('Captain A');
        const userB = await registerUser('Captain B');
        const userC = await registerUser('Captain C');
        const userD = await registerUser('Captain D');

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
        const teamAView = teamARes.json<{ team: { id: string; gameAdapterKey: string } }>().team;
        const teamA = teamAView.id;
        expect(teamAView.gameAdapterKey).toBe('generic');

        // User B joins the organization and creates a team.
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

        const inviteSmashCaptainRes = await app.inject({
          method: 'POST',
          url: `/api/v1/organizations/${orgId}/members`,
          payload: { email: userC.email, role: 'member' },
          headers: headersFor(userA),
        });
        expect(inviteSmashCaptainRes.statusCode).toBe(201);

        const inviteConcurrentCaptainRes = await app.inject({
          method: 'POST',
          url: `/api/v1/organizations/${orgId}/members`,
          payload: { email: userD.email, role: 'member' },
          headers: headersFor(userA),
        });
        expect(inviteConcurrentCaptainRes.statusCode).toBe(201);

        const teamDRes = await app.inject({
          method: 'POST',
          url: '/api/v1/teams',
          payload: { organizationId: orgId, name: 'Equipo D', tag: 'TD' },
          headers: headersFor(userD),
        });
        expect(teamDRes.statusCode).toBe(201);
        const teamD = teamDRes.json<{ team: { id: string } }>().team.id;

        const smashTeamRes = await app.inject({
          method: 'POST',
          url: '/api/v1/teams',
          payload: {
            organizationId: orgId,
            name: 'Smash Player',
            tag: 'SP',
            gameAdapterKey: 'smash_ultimate',
          },
          headers: headersFor(userC),
        });
        expect(smashTeamRes.statusCode).toBe(201);
        const smashTeam = smashTeamRes.json<{ team: { id: string } }>().team.id;

        const smashRosterOverflowRes = await app.inject({
          method: 'POST',
          url: `/api/v1/teams/${smashTeam}/members`,
          payload: { email: userB.email },
          headers: headersFor(userC),
        });
        expect(smashRosterOverflowRes.statusCode).toBe(409);
        expect(smashRosterOverflowRes.json<{ error: { code: string } }>().error.code).toBe(
          'TEAM_ROSTER_LIMIT',
        );

        const smashTournamentRes = await app.inject({
          method: 'POST',
          url: '/api/v1/tournaments',
          payload: {
            organizationId: orgId,
            gameAdapterKey: 'smash_ultimate',
            slug: `smash-${t}`,
            name: 'Smash Local',
          },
          headers: headersFor(userA),
        });
        expect(smashTournamentRes.statusCode).toBe(201);
        const smashTournament = smashTournamentRes.json<{
          tournament: {
            id: string;
            format: string;
            capacity: number;
            seriesConfig: { bo: number; drawsAllowed: boolean };
            settings: {
              grandFinalReset: boolean;
              templateKey: string;
              gameRules: { game: string; stocks: number; timeLimitMinutes: number };
            };
          };
        }>().tournament;
        expect(smashTournament).toMatchObject({
          format: 'double_elimination',
          capacity: 32,
          seriesConfig: { bo: 3, drawsAllowed: false },
          settings: {
            grandFinalReset: true,
            templateKey: 'smash_ultimate.standard_v1',
            gameRules: { game: 'smash_ultimate', stocks: 3, timeLimitMinutes: 7 },
          },
        });

        const publishSmashRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${smashTournament.id}/publish`,
          headers: headersFor(userA),
        });
        expect(publishSmashRes.statusCode).toBe(200);

        const mismatchedSmashRegistrationRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${smashTournament.id}/registrations`,
          payload: { teamId: teamA },
          headers: headersFor(userA),
        });
        expect(mismatchedSmashRegistrationRes.statusCode).toBe(409);
        expect(mismatchedSmashRegistrationRes.json<{ error: { code: string } }>().error.code).toBe(
          'TEAM_GAME_MISMATCH',
        );

        await db.update(teams).set({ gameAdapterKey: null }).where(eq(teams.id, teamA));
        const forbiddenLegacyAssignmentRes = await app.inject({
          method: 'PATCH',
          url: `/api/v1/teams/${teamA}/game-adapter`,
          payload: { gameAdapterKey: 'smash_ultimate' },
          headers: headersFor(userB),
        });
        expect(forbiddenLegacyAssignmentRes.statusCode).toBe(403);

        const invalidRosterAssignmentRes = await app.inject({
          method: 'PATCH',
          url: `/api/v1/teams/${teamB}/game-adapter`,
          payload: { gameAdapterKey: 'valorant' },
          headers: headersFor(userB),
        });
        expect(invalidRosterAssignmentRes.statusCode).toBe(409);
        expect(invalidRosterAssignmentRes.json<{ error: { code: string } }>().error.code).toBe(
          'TEAM_ROSTER_SIZE_INVALID',
        );

        const legacyAssignmentRes = await app.inject({
          method: 'PATCH',
          url: `/api/v1/teams/${teamA}/game-adapter`,
          payload: { gameAdapterKey: 'smash_ultimate' },
          headers: headersFor(userA),
        });
        expect(legacyAssignmentRes.statusCode).toBe(200);
        expect(
          legacyAssignmentRes.json<{ team: { gameAdapterKey: string } }>().team.gameAdapterKey,
        ).toBe('smash_ultimate');

        const smashRegistrationRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${smashTournament.id}/registrations`,
          payload: { teamId: smashTeam },
          headers: headersFor(userC),
        });
        expect(smashRegistrationRes.statusCode).toBe(201);

        const secondSmashRegistrationRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${smashTournament.id}/registrations`,
          payload: { teamId: teamA },
          headers: headersFor(userA),
        });
        expect(secondSmashRegistrationRes.statusCode).toBe(201);

        for (const [teamId, session] of [
          [teamA, userA],
          [smashTeam, userC],
        ] as const) {
          const checkInRes = await app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${smashTournament.id}/check-in`,
            payload: { teamId },
            headers: headersFor(session),
          });
          expect(checkInRes.statusCode).toBe(200);
        }

        const smashBracketRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${smashTournament.id}/bracket/generate`,
          headers: headersFor(userA),
        });
        expect(smashBracketRes.statusCode).toBe(200);

        const smashBracketViewRes = await app.inject({
          method: 'GET',
          url: `/api/v1/tournaments/${smashTournament.id}/bracket`,
        });
        const smashMatch = smashBracketViewRes
          .json<{
            brackets: Array<{
              rounds: Array<{
                matches: Array<{
                  id: string;
                  home: { teamId: string } | null;
                  away: { teamId: string } | null;
                }>;
              }>;
            }>;
          }>()
          .brackets.flatMap((bracket) => bracket.rounds)
          .flatMap((round) => round.matches)
          .find((match) => match.home && match.away)!;
        const smashGames = [
          {
            number: 1,
            stage: 'Battlefield',
            homeCharacter: 'Mario',
            awayCharacter: 'Link',
            winnerTeamId: smashMatch.home!.teamId,
            homeStocks: 2,
            awayStocks: 0,
          },
          {
            number: 2,
            stage: 'Smashville',
            homeCharacter: 'Mario',
            awayCharacter: 'Young Link',
            winnerTeamId: smashMatch.away!.teamId,
            homeStocks: 0,
            awayStocks: 1,
          },
          {
            number: 3,
            stage: 'Hollow Bastion',
            homeCharacter: 'Luigi',
            awayCharacter: 'Young Link',
            winnerTeamId: smashMatch.home!.teamId,
            homeStocks: 1,
            awayStocks: 0,
          },
        ];
        const smashResultPayload = {
          winnerTeamId: smashMatch.home!.teamId,
          homeScore: 2,
          awayScore: 1,
          games: smashGames,
        };

        const invalidSmashGameRes = await app.inject({
          method: 'POST',
          url: `/api/v1/matches/${smashMatch.id}/results`,
          payload: {
            ...smashResultPayload,
            games: [{ ...smashGames[0], stage: 'Corneria' }, ...smashGames.slice(1)],
          },
          headers: headersFor(userA),
        });
        expect(invalidSmashGameRes.statusCode).toBe(409);
        expect(invalidSmashGameRes.json<{ error: { code: string } }>().error.code).toBe(
          'INVALID_GAME_STAGE',
        );

        for (const session of [userA, userC]) {
          const smashResultRes = await app.inject({
            method: 'POST',
            url: `/api/v1/matches/${smashMatch.id}/results`,
            payload: smashResultPayload,
            headers: headersFor(session),
          });
          expect(smashResultRes.statusCode).toBe(session === userA ? 201 : 200);
        }

        const confirmedSmashBracketRes = await app.inject({
          method: 'GET',
          url: `/api/v1/tournaments/${smashTournament.id}/bracket`,
        });
        const confirmedSmashMatch = confirmedSmashBracketRes
          .json<{
            brackets: Array<{
              rounds: Array<{
                matches: Array<{
                  id: string;
                  result: { games?: Array<{ stage: string }> } | null;
                }>;
              }>;
            }>;
          }>()
          .brackets.flatMap((bracket) => bracket.rounds)
          .flatMap((round) => round.matches)
          .find((match) => match.id === smashMatch.id)!;
        expect(confirmedSmashMatch.result?.games).toHaveLength(3);
        expect(confirmedSmashMatch.result?.games?.[0]?.stage).toBe('Battlefield');

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

        const concurrentTournamentRes = await app.inject({
          method: 'POST',
          url: '/api/v1/tournaments',
          payload: {
            organizationId: orgId,
            gameAdapterKey: 'generic',
            slug: `concurrent-reg-${t}`,
            name: 'Registro concurrente',
            capacity: 2,
          },
          headers: headersFor(userA),
        });
        const concurrentTournamentId = concurrentTournamentRes.json<{
          tournament: { id: string };
        }>().tournament.id;
        await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${concurrentTournamentId}/publish`,
          headers: headersFor(userA),
        });
        const concurrentRegistrations = await Promise.all([
          app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${concurrentTournamentId}/registrations`,
            payload: { teamId: teamA },
            headers: headersFor(userA),
          }),
          app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${concurrentTournamentId}/registrations`,
            payload: { teamId: teamB },
            headers: headersFor(userB),
          }),
          app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${concurrentTournamentId}/registrations`,
            payload: { teamId: smashTeam },
            headers: headersFor(userC),
          }),
          app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${concurrentTournamentId}/registrations`,
            payload: { teamId: teamD },
            headers: headersFor(userD),
          }),
        ]);
        expect(concurrentRegistrations.every((response) => response.statusCode === 201)).toBe(true);
        const concurrentAllocation = concurrentRegistrations.map(
          (response) =>
            response.json<{
              registration: { status: string; waitlistPosition: number | null };
            }>().registration,
        );
        expect(concurrentAllocation.filter((entry) => entry.status === 'approved')).toHaveLength(2);
        expect(
          concurrentAllocation
            .filter((entry) => entry.status === 'waitlisted')
            .map((entry) => entry.waitlistPosition)
            .sort(),
        ).toEqual([1, 2]);

        const closedRegistrationTournamentRes = await app.inject({
          method: 'POST',
          url: '/api/v1/tournaments',
          payload: {
            organizationId: orgId,
            gameAdapterKey: 'generic',
            slug: `closed-registration-${t}`,
            name: 'Registro cerrado por fecha',
            registrationConfig: {
              closesAt: new Date(Date.now() - 60_000).toISOString(),
            },
          },
          headers: headersFor(userA),
        });
        const closedRegistrationTournamentId = closedRegistrationTournamentRes.json<{
          tournament: { id: string };
        }>().tournament.id;
        await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${closedRegistrationTournamentId}/publish`,
          headers: headersFor(userA),
        });
        const closedRegistrationRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${closedRegistrationTournamentId}/registrations`,
          payload: { teamId: teamD },
          headers: headersFor(userD),
        });
        expect(closedRegistrationRes.statusCode).toBe(409);
        expect(closedRegistrationRes.json<{ error: { code: string } }>().error.code).toBe(
          'REGISTRATION_CLOSED',
        );

        const raceTeamRes = await app.inject({
          method: 'POST',
          url: '/api/v1/teams',
          payload: { organizationId: orgId, name: 'Equipo Race', tag: 'RCE' },
          headers: headersFor(userC),
        });
        expect(raceTeamRes.statusCode).toBe(201);
        const raceTeamId = raceTeamRes.json<{ team: { id: string } }>().team.id;

        const raceTournamentRes = await app.inject({
          method: 'POST',
          url: '/api/v1/tournaments',
          payload: {
            organizationId: orgId,
            gameAdapterKey: 'generic',
            slug: `registration-bracket-race-${t}`,
            name: 'Registro contra bracket',
            capacity: 8,
          },
          headers: headersFor(userA),
        });
        const raceTournamentId = raceTournamentRes.json<{
          tournament: { id: string };
        }>().tournament.id;
        await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${raceTournamentId}/publish`,
          headers: headersFor(userA),
        });
        for (const [teamId, session] of [
          [teamB, userB],
          [teamD, userD],
        ] as const) {
          const response = await app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${raceTournamentId}/registrations`,
            payload: { teamId },
            headers: headersFor(session),
          });
          expect(response.statusCode).toBe(201);
        }

        const registrationBracketLock = await lockTournament(raceTournamentId);
        const racingRegistration = app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${raceTournamentId}/registrations`,
          payload: { teamId: raceTeamId },
          headers: headersFor(userC),
        });
        let racingBracket: Promise<Awaited<typeof racingRegistration>>;
        try {
          await waitForBlockedRequests(registrationBracketLock.blockerPid, 1);
          racingBracket = app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${raceTournamentId}/bracket/generate`,
            headers: headersFor(userA),
          });
          await waitForBlockedRequests(registrationBracketLock.blockerPid, 2);
        } finally {
          await registrationBracketLock.release();
        }

        const [racingRegistrationRes, racingBracketRes] = await Promise.all([
          racingRegistration,
          racingBracket,
        ]);
        expect(racingRegistrationRes.statusCode).toBe(201);
        expect(racingBracketRes.statusCode).toBe(200);

        const [racingParticipant] = await db
          .select({ id: tournamentParticipants.id })
          .from(tournamentParticipants)
          .where(
            and(
              eq(tournamentParticipants.tournamentId, raceTournamentId),
              eq(tournamentParticipants.teamId, raceTeamId),
            ),
          );
        const [racingStage] = await db
          .select({ config: stages.config })
          .from(stages)
          .where(eq(stages.tournamentId, raceTournamentId));
        const racingEngine = racingStage!.config.engineBracket as {
          byes: string[];
          matches: Array<{ home: string | null; away: string | null }>;
        };
        const bracketParticipantIds = new Set([
          ...racingEngine.byes,
          ...racingEngine.matches.flatMap((match) => [match.home, match.away]),
        ]);
        expect(bracketParticipantIds.has(racingParticipant!.id)).toBe(true);

        const cancellationRaceTournamentRes = await app.inject({
          method: 'POST',
          url: '/api/v1/tournaments',
          payload: {
            organizationId: orgId,
            gameAdapterKey: 'generic',
            slug: `cancellation-race-${t}`,
            name: 'Cancelación concurrente',
            capacity: 8,
          },
          headers: headersFor(userA),
        });
        const cancellationRaceTournamentId = cancellationRaceTournamentRes.json<{
          tournament: { id: string };
        }>().tournament.id;
        await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${cancellationRaceTournamentId}/publish`,
          headers: headersFor(userA),
        });
        for (const [teamId, session] of [
          [teamB, userB],
          [teamD, userD],
        ] as const) {
          await app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${cancellationRaceTournamentId}/registrations`,
            payload: { teamId },
            headers: headersFor(session),
          });
        }

        const cancellationLock = await lockTournament(cancellationRaceTournamentId);
        const racingCancellation = app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${cancellationRaceTournamentId}/cancel`,
          headers: headersFor(userA),
        });
        let registrationAfterCancellation: Promise<Awaited<typeof racingCancellation>>;
        let bracketAfterCancellation: Promise<Awaited<typeof racingCancellation>>;
        try {
          await waitForBlockedRequests(cancellationLock.blockerPid, 1);
          registrationAfterCancellation = app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${cancellationRaceTournamentId}/registrations`,
            payload: { teamId: raceTeamId },
            headers: headersFor(userC),
          });
          await waitForBlockedRequests(cancellationLock.blockerPid, 2);
          bracketAfterCancellation = app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${cancellationRaceTournamentId}/bracket/generate`,
            headers: headersFor(userA),
          });
          await waitForBlockedRequests(cancellationLock.blockerPid, 3);
        } finally {
          await cancellationLock.release();
        }

        const [
          racingCancellationRes,
          registrationAfterCancellationRes,
          bracketAfterCancellationRes,
        ] = await Promise.all([
          racingCancellation,
          registrationAfterCancellation,
          bracketAfterCancellation,
        ]);
        expect(racingCancellationRes.statusCode).toBe(200);
        expect(registrationAfterCancellationRes.statusCode).toBe(409);
        expect(bracketAfterCancellationRes.statusCode).toBe(409);
        const [cancelledTournament] = await db
          .select({ status: tournaments.status })
          .from(tournaments)
          .where(eq(tournaments.id, cancellationRaceTournamentId));
        const cancelledTournamentStages = await db
          .select({ id: stages.id })
          .from(stages)
          .where(eq(stages.tournamentId, cancellationRaceTournamentId));
        expect(cancelledTournament?.status).toBe('cancelled');
        expect(cancelledTournamentStages).toHaveLength(0);

        const cancelledResultsTournamentRes = await app.inject({
          method: 'POST',
          url: '/api/v1/tournaments',
          payload: {
            organizationId: orgId,
            gameAdapterKey: 'generic',
            slug: `cancelled-results-${t}`,
            name: 'Resultados tras cancelar',
            format: 'single_elimination',
            capacity: 8,
          },
          headers: headersFor(userA),
        });
        const cancelledResultsTournamentId = cancelledResultsTournamentRes.json<{
          tournament: { id: string };
        }>().tournament.id;
        await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${cancelledResultsTournamentId}/publish`,
          headers: headersFor(userA),
        });
        for (const [teamId, session] of [
          [teamB, userB],
          [teamD, userD],
        ] as const) {
          const response = await app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${cancelledResultsTournamentId}/registrations`,
            payload: { teamId },
            headers: headersFor(session),
          });
          expect(response.statusCode).toBe(201);
        }
        const cancelledResultsBracketRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${cancelledResultsTournamentId}/bracket/generate`,
          headers: headersFor(userA),
        });
        expect(cancelledResultsBracketRes.statusCode).toBe(200);
        const cancelledResultsMatchesRes = await app.inject({
          method: 'GET',
          url: `/api/v1/tournaments/${cancelledResultsTournamentId}/matches`,
        });
        const cancelledResultsMatch = cancelledResultsMatchesRes
          .json<{
            matches: Array<{
              id: string;
              homeTeamId: string | null;
              awayTeamId: string | null;
            }>;
          }>()
          .matches.find((match) => match.homeTeamId && match.awayTeamId)!;
        const sessionByTeamId = new Map<string, Session>([
          [teamB, userB],
          [teamD, userD],
        ]);
        const firstResultBeforeCancellation = await app.inject({
          method: 'POST',
          url: `/api/v1/matches/${cancelledResultsMatch.id}/results`,
          payload: { winnerTeamId: cancelledResultsMatch.homeTeamId },
          headers: headersFor(sessionByTeamId.get(cancelledResultsMatch.homeTeamId!)!),
        });
        expect(firstResultBeforeCancellation.statusCode).toBe(201);

        const cancelledResultLock = await lockTournament(cancelledResultsTournamentId);
        const cancellationBeforeConfirmation = app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${cancelledResultsTournamentId}/cancel`,
          headers: headersFor(userA),
        });
        let confirmationDuringCancellation: Promise<Awaited<typeof cancellationBeforeConfirmation>>;
        let disputeDuringCancellation: Promise<Awaited<typeof cancellationBeforeConfirmation>>;
        try {
          await waitForBlockedRequests(cancelledResultLock.blockerPid, 1);
          confirmationDuringCancellation = app.inject({
            method: 'POST',
            url: `/api/v1/matches/${cancelledResultsMatch.id}/results`,
            payload: { winnerTeamId: cancelledResultsMatch.homeTeamId },
            headers: headersFor(sessionByTeamId.get(cancelledResultsMatch.awayTeamId!)!),
          });
          await waitForBlockedRequests(cancelledResultLock.blockerPid, 2);
          disputeDuringCancellation = app.inject({
            method: 'POST',
            url: '/api/v1/disputes',
            payload: {
              matchId: cancelledResultsMatch.id,
              reason: 'captain_request',
              message: 'Revisión antes de cancelar',
            },
            headers: headersFor(sessionByTeamId.get(cancelledResultsMatch.homeTeamId!)!),
          });
          await waitForBlockedRequests(cancelledResultLock.blockerPid, 3);
        } finally {
          await cancelledResultLock.release();
        }
        const [
          cancellationBeforeConfirmationRes,
          confirmationDuringCancellationRes,
          disputeDuringCancellationRes,
        ] = await Promise.all([
          cancellationBeforeConfirmation,
          confirmationDuringCancellation,
          disputeDuringCancellation,
        ]);
        expect(cancellationBeforeConfirmationRes.statusCode).toBe(200);
        expect(confirmationDuringCancellationRes.statusCode).toBe(409);
        expect(
          confirmationDuringCancellationRes.json<{ error: { code: string } }>().error.code,
        ).toBe('INVALID_TOURNAMENT_STATUS');
        expect(disputeDuringCancellationRes.statusCode).toBe(409);
        expect(disputeDuringCancellationRes.json<{ error: { code: string } }>().error.code).toBe(
          'INVALID_TOURNAMENT_STATUS',
        );

        const walkoverAfterCancellationRes = await app.inject({
          method: 'POST',
          url: `/api/v1/matches/${cancelledResultsMatch.id}/walkover`,
          payload: { winnerTeamId: cancelledResultsMatch.homeTeamId },
          headers: headersFor(userA),
        });
        expect(walkoverAfterCancellationRes.statusCode).toBe(409);
        expect(walkoverAfterCancellationRes.json<{ error: { code: string } }>().error.code).toBe(
          'INVALID_TOURNAMENT_STATUS',
        );

        const cancelledResultsTournamentView = await app.inject({
          method: 'GET',
          url: `/api/v1/tournaments/${cancelledResultsTournamentId}`,
        });
        expect(
          cancelledResultsTournamentView.json<{ tournament: { status: string } }>().tournament
            .status,
        ).toBe('cancelled');
        const cancelledResultsDisputes = await app.inject({
          method: 'GET',
          url: `/api/v1/tournaments/${cancelledResultsTournamentId}/disputes`,
          headers: headersFor(userA),
        });
        expect(cancelledResultsDisputes.json<{ disputes: unknown[] }>().disputes).toEqual([]);
        const cancelledResultsMatchesAfterRace = await app.inject({
          method: 'GET',
          url: `/api/v1/tournaments/${cancelledResultsTournamentId}/matches`,
        });
        expect(
          cancelledResultsMatchesAfterRace
            .json<{ matches: Array<{ id: string; status: string }> }>()
            .matches.find((match) => match.id === cancelledResultsMatch.id)?.status,
        ).toBe('scheduled');

        const duplicateTournamentRes = await app.inject({
          method: 'POST',
          url: '/api/v1/tournaments',
          payload: {
            organizationId: orgId,
            gameAdapterKey: 'generic',
            slug: `duplicate-reg-${t}`,
            name: 'Registro duplicado',
            capacity: 2,
          },
          headers: headersFor(userA),
        });
        const duplicateTournamentId = duplicateTournamentRes.json<{
          tournament: { id: string };
        }>().tournament.id;
        await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${duplicateTournamentId}/publish`,
          headers: headersFor(userA),
        });
        const duplicateAttempts = await Promise.all([
          app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${duplicateTournamentId}/registrations`,
            payload: { teamId: teamD },
            headers: headersFor(userD),
          }),
          app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${duplicateTournamentId}/registrations`,
            payload: { teamId: teamD },
            headers: headersFor(userD),
          }),
        ]);
        expect(duplicateAttempts.map((response) => response.statusCode).sort()).toEqual([201, 409]);

        const decisionTournamentRes = await app.inject({
          method: 'POST',
          url: '/api/v1/tournaments',
          payload: {
            organizationId: orgId,
            gameAdapterKey: 'generic',
            slug: `registration-decisions-${t}`,
            name: 'Decisiones de inscripción',
            capacity: 2,
            registrationConfig: { manualApproval: true },
          },
          headers: headersFor(userA),
        });
        expect(decisionTournamentRes.statusCode).toBe(201);
        const decisionTournamentId = decisionTournamentRes.json<{
          tournament: { id: string };
        }>().tournament.id;
        await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${decisionTournamentId}/publish`,
          headers: headersFor(userA),
        });

        const [pendingARes, pendingBRes] = await Promise.all([
          app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${decisionTournamentId}/registrations`,
            payload: { teamId: teamA },
            headers: headersFor(userA),
          }),
          app.inject({
            method: 'POST',
            url: `/api/v1/tournaments/${decisionTournamentId}/registrations`,
            payload: { teamId: teamB },
            headers: headersFor(userB),
          }),
        ]);
        const registrationAId = pendingARes.json<{ registration: { id: string } }>().registration
          .id;
        const registrationBId = pendingBRes.json<{ registration: { id: string } }>().registration
          .id;

        const decideRegistration = (registrationId: string, status: 'approved' | 'rejected') =>
          app.inject({
            method: 'PATCH',
            url: `/api/v1/tournaments/${decisionTournamentId}/registrations/${registrationId}`,
            payload: { status },
            headers: headersFor(userA),
          });
        const participantRows = () =>
          db
            .select({
              id: tournamentParticipants.id,
              teamId: tournamentParticipants.teamId,
              checkedIn: tournamentParticipants.checkedIn,
              status: tournamentParticipants.status,
            })
            .from(tournamentParticipants)
            .where(eq(tournamentParticipants.tournamentId, decisionTournamentId));

        expect((await decideRegistration(registrationAId, 'approved')).statusCode).toBe(200);
        const [initialParticipantA] = await participantRows();
        expect(initialParticipantA).toMatchObject({ teamId: teamA, status: 'active' });

        const decisionCheckInRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${decisionTournamentId}/check-in`,
          payload: { teamId: teamA },
          headers: headersFor(userA),
        });
        expect(decisionCheckInRes.statusCode).toBe(200);

        expect((await decideRegistration(registrationAId, 'approved')).statusCode).toBe(200);
        expect(await participantRows()).toEqual([
          expect.objectContaining({
            id: initialParticipantA!.id,
            teamId: teamA,
            checkedIn: true,
            status: 'active',
          }),
        ]);

        await db
          .update(tournamentParticipants)
          .set({ status: 'eliminated' })
          .where(eq(tournamentParticipants.id, initialParticipantA!.id));
        expect((await decideRegistration(registrationAId, 'approved')).statusCode).toBe(200);
        expect(await participantRows()).toEqual([
          expect.objectContaining({
            id: initialParticipantA!.id,
            teamId: teamA,
            checkedIn: true,
            status: 'eliminated',
          }),
        ]);

        expect((await decideRegistration(registrationAId, 'rejected')).statusCode).toBe(200);
        expect(await participantRows()).toEqual([
          expect.objectContaining({
            id: initialParticipantA!.id,
            teamId: teamA,
            status: 'inactive',
          }),
        ]);

        expect((await decideRegistration(registrationAId, 'approved')).statusCode).toBe(200);
        expect(await participantRows()).toEqual([
          expect.objectContaining({ id: initialParticipantA!.id, teamId: teamA, status: 'active' }),
        ]);

        expect((await decideRegistration(registrationAId, 'rejected')).statusCode).toBe(200);
        expect((await decideRegistration(registrationBId, 'approved')).statusCode).toBe(200);
        expect((await decideRegistration(registrationAId, 'approved')).statusCode).toBe(200);

        const decisionRegistrations = await db
          .select({
            teamId: tournamentRegistrations.teamId,
            status: tournamentRegistrations.status,
          })
          .from(tournamentRegistrations)
          .where(eq(tournamentRegistrations.tournamentId, decisionTournamentId));
        expect(decisionRegistrations).toEqual(
          expect.arrayContaining([
            { teamId: teamA, status: 'approved' },
            { teamId: teamB, status: 'approved' },
          ]),
        );
        expect(await participantRows()).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ teamId: teamA, status: 'active' }),
            expect.objectContaining({ teamId: teamB, status: 'active' }),
          ]),
        );

        await db
          .update(tournaments)
          .set({ status: 'checkin_open' })
          .where(eq(tournaments.id, decisionTournamentId));
        expect((await decideRegistration(registrationBId, 'rejected')).statusCode).toBe(200);
        expect((await decideRegistration(registrationBId, 'approved')).statusCode).toBe(200);

        for (const status of ['in_progress', 'finalized', 'cancelled'] as const) {
          await db
            .update(tournaments)
            .set({ status })
            .where(eq(tournaments.id, decisionTournamentId));
          const approveResponse = await decideRegistration(registrationBId, 'approved');
          const rejectResponse = await decideRegistration(registrationBId, 'rejected');
          expect(approveResponse.statusCode).toBe(409);
          expect(rejectResponse.statusCode).toBe(409);
          expect(approveResponse.json<{ error: { code: string } }>().error.code).toBe(
            'INVALID_STATUS',
          );
          expect(rejectResponse.json<{ error: { code: string } }>().error.code).toBe(
            'INVALID_STATUS',
          );
        }

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

        const checkInAfterBracketRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${tournament}/check-in`,
          payload: { teamId: teamA },
          headers: headersFor(userA),
        });
        expect(checkInAfterBracketRes.statusCode).toBe(409);
        expect(checkInAfterBracketRes.json<{ error: { code: string } }>().error.code).toBe(
          'INVALID_STATUS',
        );

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
          brackets: Array<{
            rounds: Array<{
              matches: Array<{
                id: string;
                home: { teamId: string } | null;
                away: { teamId: string } | null;
              }>;
            }>;
          }>;
        }>();
        const firstMatch = bracket.brackets[0]!.rounds[0]!.matches.find((m) => m.home && m.away)!;
        expect(firstMatch).toBeDefined();

        const report1 = await app.inject({
          method: 'POST',
          url: `/api/v1/matches/${firstMatch.id}/results`,
          payload: {
            winnerTeamId: firstMatch.home!.teamId,
            homeScore: 1,
            awayScore: 0,
            games: [
              {
                number: 1,
                stage: 'Battlefield',
                homeCharacter: 'Mario',
                awayCharacter: 'Link',
                winnerTeamId: firstMatch.home!.teamId,
                homeStocks: 1,
                awayStocks: 0,
              },
            ],
          },
          headers: headersFor(userA),
        });
        expect(report1.statusCode).toBe(409);
        expect(report1.json<{ error: { code: string } }>().error.code).toBe(
          'GAME_DETAILS_NOT_ALLOWED',
        );

        const validReport1 = await app.inject({
          method: 'POST',
          url: `/api/v1/matches/${firstMatch.id}/results`,
          payload: { winnerTeamId: firstMatch.home!.teamId },
          headers: headersFor(userA),
        });
        expect(validReport1.statusCode).toBe(201);

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
    },
  );

  it(
    'serializes advancement and rejects duplicate walkovers',
    { timeout: INTEGRATION_TEST_TIMEOUT_MS },
    async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      const {
        auditLogs,
        matches,
        organizations,
        runMigrations,
        stages,
        teams,
        tournamentParticipants,
        tournaments,
        users,
      } = await import('@opentournament/database');
      const { db } = await import('./db.js');
      const { applyWalkoverAtomically, advanceMatchWinnerAtomically, generateTournamentBracket } =
        await import('./services/tournaments.js');

      await runMigrations(process.env.TEST_DATABASE_URL!);
      const suffix = `${Date.now()}-${crypto.randomUUID()}`;
      const [organization] = await db
        .insert(organizations)
        .values({ name: 'Concurrent Org', slug: `concurrent-${suffix}` })
        .returning();
      const [tournament] = await db
        .insert(tournaments)
        .values({
          organizationId: organization!.id,
          name: 'Concurrent Tournament',
          slug: `concurrent-${suffix}`,
          format: 'single_elimination',
          status: 'open',
          capacity: 8,
        })
        .returning();

      const teamByParticipant = new Map<string, string>();
      let actorId = '';
      for (let index = 0; index < 4; index += 1) {
        const [user] = await db
          .insert(users)
          .values({ displayName: `Concurrent Captain ${index}` })
          .returning();
        if (index === 0) actorId = user!.id;
        const [team] = await db
          .insert(teams)
          .values({
            organizationId: organization!.id,
            captainId: user!.id,
            name: `Concurrent Team ${index}`,
          })
          .returning();
        const [participant] = await db
          .insert(tournamentParticipants)
          .values({
            tournamentId: tournament!.id,
            teamId: team!.id,
            seed: index + 1,
          })
          .returning();
        teamByParticipant.set(participant!.id, team!.id);
      }

      const stage = await generateTournamentBracket(db, tournament!);
      const initialEngine = (
        stage.config as {
          engineBracket: {
            matches: Array<{
              id: string;
              bracket: string;
              round: number;
              status: string;
              home?: string;
              away?: string;
            }>;
          };
        }
      ).engineBracket;
      const semifinals = initialEngine.matches.filter(
        (match) =>
          match.bracket === 'winners' &&
          match.round === 1 &&
          match.status === 'scheduled' &&
          match.home &&
          match.away,
      );
      expect(semifinals).toHaveLength(2);

      const firstSemifinal = semifinals[0]!;
      const [firstMatch] = await db
        .select({ id: matches.id })
        .from(matches)
        .where(
          and(eq(matches.tournamentId, tournament!.id), eq(matches.engineId, firstSemifinal.id)),
        );
      const winnerTeamId = teamByParticipant.get(firstSemifinal.home!);
      expect(winnerTeamId).toBeDefined();

      const walkoverAttempts = await Promise.allSettled([
        applyWalkoverAtomically(db, firstMatch!.id, winnerTeamId!, actorId),
        applyWalkoverAtomically(db, firstMatch!.id, winnerTeamId!, actorId),
      ]);
      expect(walkoverAttempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
      const rejectedWalkover = walkoverAttempts.find((attempt) => attempt.status === 'rejected');
      expect(rejectedWalkover).toMatchObject({
        reason: { statusCode: 409, code: 'INVALID_MATCH' },
      });

      const walkoverAudits = await db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(
          and(eq(auditLogs.action, 'match.walkover'), eq(auditLogs.resourceId, firstMatch!.id)),
        );
      expect(walkoverAudits).toHaveLength(1);

      const secondSemifinal = semifinals[1]!;
      await advanceMatchWinnerAtomically(db, stage.id, secondSemifinal.id, secondSemifinal.home!);

      const [persistedStage] = await db
        .select({ config: stages.config })
        .from(stages)
        .where(eq(stages.id, stage.id));
      const persistedEngine = persistedStage!.config as {
        engineBracket: { matches: Array<{ id: string; status: string }> };
      };
      for (const semifinal of semifinals) {
        expect(
          persistedEngine.engineBracket.matches.find((match) => match.id === semifinal.id)?.status,
        ).toBe('finalized');
      }
    },
  );

  it(
    'claims jobs exclusively and recovers expired leases',
    { timeout: INTEGRATION_TEST_TIMEOUT_MS },
    async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      const { jobs, runMigrations } = await import('@opentournament/database');
      const { db } = await import('./db.js');
      const { claimDueJobs } = await import('./worker.js');

      await runMigrations(process.env.TEST_DATABASE_URL!);
      const now = new Date();
      const [pendingJob] = await db
        .insert(jobs)
        .values({ kind: 'test.pending', runAt: new Date(now.getTime() - 1_000), payload: {} })
        .returning();
      expect(pendingJob).toBeDefined();

      const [firstClaim, secondClaim] = await Promise.all([
        claimDueJobs(db, now),
        claimDueJobs(db, now),
      ]);
      const claims = [...firstClaim, ...secondClaim].filter((job) => job.id === pendingJob!.id);
      expect(claims).toHaveLength(1);
      expect(claims[0]?.attempts).toBe(1);

      const [staleJob] = await db
        .insert(jobs)
        .values({
          kind: 'test.stale',
          runAt: new Date(now.getTime() - 60_000),
          payload: {},
          status: 'running',
          attempts: 1,
          lockedUntil: new Date(now.getTime() - 1_000),
          lockToken: 'stale-worker-token',
        })
        .returning();
      const recovered = await claimDueJobs(db, now);
      const recoveredJob = recovered.find((job) => job.id === staleJob!.id);
      expect(recoveredJob?.attempts).toBe(2);
      expect(recoveredJob?.lockToken).not.toBe('stale-worker-token');

      await db
        .update(jobs)
        .set({ status: 'done' })
        .where(and(eq(jobs.id, staleJob!.id), eq(jobs.lockToken, 'stale-worker-token')));
      const [recoveredState] = await db
        .select({ status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, staleJob!.id));
      expect(recoveredState?.status).toBe('running');

      const [exhaustedJob] = await db
        .insert(jobs)
        .values({
          kind: 'test.exhausted',
          runAt: new Date(now.getTime() - 60_000),
          payload: {},
          status: 'running',
          attempts: 5,
          lockedUntil: new Date(now.getTime() - 1_000),
        })
        .returning();
      const exhaustedClaims = await claimDueJobs(db, now);
      expect(exhaustedClaims.some((job) => job.id === exhaustedJob!.id)).toBe(false);
      const [exhaustedState] = await db
        .select({ status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, exhaustedJob!.id));
      expect(exhaustedState?.status).toBe('failed');
    },
  );

  it(
    'separates email verification from password recovery',
    { timeout: INTEGRATION_TEST_TIMEOUT_MS },
    async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      const { emailVerificationTokens, passwordResetTokens, runMigrations, users } =
        await import('@opentournament/database');
      const { generateResetToken, hashSessionToken } = await import('@opentournament/auth');
      const { env } = await import('./config.js');
      const { db } = await import('./db.js');
      const { initServer } = await import('./app.js');

      await runMigrations(process.env.TEST_DATABASE_URL!);
      env.ALLOW_UNVERIFIED_EMAILS = false;
      const app = await initServer(false);

      try {
        const csrfRes = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
        const csrfCookie = csrfRes.cookies.find((cookie) => cookie.name === 'csrf')!;
        const csrfToken = csrfRes.json<{ token: string }>().token;
        const email = `verify-${Date.now()}@example.com`;
        const headers = {
          'x-csrf-token': csrfToken,
          cookie: `csrf=${csrfCookie.value}`,
        };

        const registerRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: { displayName: 'Verify User', email, password: 'password-123' },
          headers,
        });
        expect(registerRes.statusCode).toBe(201);
        expect(registerRes.cookies.some((cookie) => cookie.name === 'session')).toBe(false);
        expect(
          registerRes.json<{ requiresEmailVerification: boolean }>().requiresEmailVerification,
        ).toBe(true);

        const loginBeforeVerification = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email, password: 'password-123' },
          headers,
        });
        expect(loginBeforeVerification.statusCode).toBe(403);

        const [user] = await db
          .select({ id: users.id, emailVerifiedAt: users.emailVerifiedAt })
          .from(users)
          .where(eq(users.email, email));
        expect(user?.emailVerifiedAt).toBeNull();
        const resetTokens = await db
          .select({ id: passwordResetTokens.id })
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, user!.id));
        expect(resetTokens).toHaveLength(0);

        const verificationToken = generateResetToken();
        await db.insert(emailVerificationTokens).values({
          userId: user!.id,
          tokenHash: hashSessionToken(verificationToken),
          expiresAt: new Date(Date.now() + 60_000),
        });
        const resetWithVerificationToken = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/reset-password',
          payload: { token: verificationToken, password: 'different-password-123' },
          headers,
        });
        expect(resetWithVerificationToken.statusCode).toBe(400);

        const verifyRes = await app.inject({
          method: 'GET',
          url: `/api/v1/auth/verify?token=${verificationToken}`,
        });
        expect(verifyRes.statusCode).toBe(302);
        const reusedVerification = await app.inject({
          method: 'GET',
          url: `/api/v1/auth/verify?token=${verificationToken}`,
        });
        expect(reusedVerification.statusCode).toBe(400);

        const loginAfterVerification = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email, password: 'password-123' },
          headers,
        });
        expect(loginAfterVerification.statusCode).toBe(200);
      } finally {
        env.ALLOW_UNVERIFIED_EMAILS = true;
        await app.close();
      }
    },
  );

  it(
    'creates a seeded and idempotent demo experience',
    { timeout: INTEGRATION_TEST_TIMEOUT_MS },
    async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      const {
        brackets,
        disputes,
        matches,
        rounds,
        runMigrations,
        seedDemoData,
        stages,
        teams,
        tournamentParticipants,
        tournamentRegistrations,
        tournaments,
      } = await import('@opentournament/database');
      const { db } = await import('./db.js');
      const { initServer } = await import('./app.js');

      await runMigrations(process.env.TEST_DATABASE_URL!);
      const firstSeed = await seedDemoData(db);
      const secondSeed = await seedDemoData(db);
      const expectedDemoTeamIds = [
        '00000000-0000-4000-8000-000000000201',
        '00000000-0000-4000-8000-000000000202',
        '00000000-0000-4000-8000-000000000203',
        '00000000-0000-4000-8000-000000000204',
      ] as const;

      expect(secondSeed).toEqual(firstSeed);

      const [demoTournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, firstSeed.tournamentId));
      expect(demoTournament).toMatchObject({
        slug: 'copa-nexo-demo',
        status: 'in_progress',
        gameAdapterKey: 'valorant',
      });

      const [leagueTournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, firstSeed.lolTournamentId));
      expect(leagueTournament).toMatchObject({
        slug: 'liga-nexo-lol',
        status: 'finalized',
        gameAdapterKey: 'lol',
        settings: {
          templateKey: 'lol.standard_v1',
          templateVersion: 1,
          gameRules: {
            game: 'lol',
            map: 'summoners_rift',
            region: 'lan',
            draftMode: 'tournament_draft',
            fearlessDraft: true,
          },
        },
      });

      const leagueMatches = await db
        .select({ status: matches.status, result: matches.result })
        .from(matches)
        .where(eq(matches.tournamentId, firstSeed.lolTournamentId));
      expect(leagueMatches).toHaveLength(7);
      expect(leagueMatches.every((match) => match.status === 'finalized')).toBe(true);
      expect(leagueMatches.every((match) => (match.result?.lolGames?.length ?? 0) >= 2)).toBe(true);

      const [smashTournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, firstSeed.smashTournamentId));
      expect(smashTournament).toMatchObject({
        slug: 'smash-random-showdown',
        status: 'finalized',
        gameAdapterKey: 'smash_ultimate',
      });

      const demoTeams = await db
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.organizationId, firstSeed.organizationId),
            inArray(teams.id, expectedDemoTeamIds),
          ),
        );
      const registrations = await db
        .select({ id: tournamentRegistrations.id })
        .from(tournamentRegistrations)
        .where(eq(tournamentRegistrations.tournamentId, firstSeed.tournamentId));
      const participants = await db
        .select({ id: tournamentParticipants.id })
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, firstSeed.tournamentId));
      const [stage] = await db
        .select({ id: stages.id })
        .from(stages)
        .where(eq(stages.tournamentId, firstSeed.tournamentId));
      const bracketRows = await db
        .select({ id: brackets.id })
        .from(brackets)
        .where(eq(brackets.stageId, stage!.id));
      const roundRows = await db
        .select({ id: rounds.id })
        .from(rounds)
        .where(eq(rounds.bracketId, bracketRows[0]!.id));
      const matchRows = await db
        .select({ id: matches.id, status: matches.status })
        .from(matches)
        .where(eq(matches.tournamentId, firstSeed.tournamentId));
      const disputeRows = await db
        .select({ id: disputes.id, status: disputes.status })
        .from(disputes)
        .innerJoin(matches, eq(matches.id, disputes.matchId))
        .where(eq(matches.tournamentId, firstSeed.tournamentId));

      expect(demoTeams.map((team) => team.id).sort()).toEqual([...expectedDemoTeamIds].sort());
      expect(registrations).toHaveLength(4);
      expect(participants).toHaveLength(4);
      expect(bracketRows).toHaveLength(1);
      expect(roundRows).toHaveLength(2);
      expect(matchRows.filter((match) => match.status === 'finalized')).toHaveLength(2);
      expect(matchRows.filter((match) => match.status === 'scheduled')).toHaveLength(1);
      expect(disputeRows).toEqual([{ id: firstSeed.disputeId, status: 'resolved' }]);

      const app = await initServer(false);
      try {
        const csrfRes = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
        const csrfCookie = csrfRes.cookies.find((cookie) => cookie.name === 'csrf')!;
        const csrfToken = csrfRes.json<{ token: string }>().token;
        const loginRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: 'admin@opentournament.local', password: 'demo-password-123' },
          headers: {
            'x-csrf-token': csrfToken,
            cookie: `csrf=${csrfCookie.value}`,
          },
        });
        expect(loginRes.statusCode).toBe(200);
        const sessionCookie = loginRes.cookies.find((cookie) => cookie.name === 'session')!;
        const authCookie = `session=${sessionCookie.value}; csrf=${csrfCookie.value}`;

        const mineRes = await app.inject({
          method: 'GET',
          url: '/api/v1/tournaments/mine',
          headers: { cookie: authCookie },
        });
        expect(
          mineRes
            .json<{ tournaments: Array<{ id: string }> }>()
            .tournaments.some((tournament) => tournament.id === firstSeed.tournamentId),
        ).toBe(true);

        const bracketRes = await app.inject({
          method: 'GET',
          url: `/api/v1/tournaments/${firstSeed.tournamentId}/bracket`,
        });
        const bracketPayload = bracketRes.json<{
          brackets: Array<{ rounds: Array<{ matches: unknown[] }> }>;
        }>();
        expect(
          bracketPayload.brackets.flatMap((bracket) =>
            bracket.rounds.flatMap((round) => round.matches),
          ),
        ).toHaveLength(3);

        const disputesRes = await app.inject({
          method: 'GET',
          url: `/api/v1/tournaments/${firstSeed.tournamentId}/disputes`,
          headers: { cookie: authCookie },
        });
        expect(disputesRes.statusCode).toBe(200);
        expect(disputesRes.json<{ disputes: Array<{ status: string }> }>().disputes).toEqual([
          expect.objectContaining({ status: 'resolved' }),
        ]);
      } finally {
        await app.close();
      }
    },
  );

  it(
    'creates, exchanges, and revokes an accountless participant pass',
    { timeout: INTEGRATION_TEST_TIMEOUT_MS },
    async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      const { runMigrations, seedDemoData } = await import('@opentournament/database');
      const { initServer } = await import('./app.js');

      await runMigrations(process.env.TEST_DATABASE_URL!);
      const demo = await seedDemoData((await import('./db.js')).db);
      const app = await initServer(false);

      try {
        const adminCsrfRes = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
        const adminCsrf = adminCsrfRes.json<{ token: string }>().token;
        const adminCsrfCookie = adminCsrfRes.cookies.find((cookie) => cookie.name === 'csrf')!;
        const loginRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            email: 'admin@opentournament.local',
            password: 'demo-password-123',
          },
          headers: {
            'x-csrf-token': adminCsrf,
            cookie: `csrf=${adminCsrfCookie.value}`,
          },
        });
        const adminSession = loginRes.cookies.find((cookie) => cookie.name === 'session')!;
        const adminCookies = `session=${adminSession.value}; csrf=${adminCsrfCookie.value}`;

        const createRes = await app.inject({
          method: 'POST',
          url: `/api/v1/tournaments/${demo.tournamentId}/access-passes`,
          payload: {
            teamId: '00000000-0000-4000-8000-000000000201',
            expiresInHours: 48,
          },
          headers: { 'x-csrf-token': adminCsrf, cookie: adminCookies },
        });
        expect(createRes.statusCode).toBe(201);
        const created = createRes.json<{
          accessPass: { id: string; teamId: string };
          token: string;
          path: string;
        }>();
        expect(created.accessPass.teamId).toBe('00000000-0000-4000-8000-000000000201');
        expect(created.path).toBe(`/access#token=${created.token}`);

        const participantCsrfRes = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
        const participantCsrf = participantCsrfRes.json<{ token: string }>().token;
        const participantCsrfCookie = participantCsrfRes.cookies.find(
          (cookie) => cookie.name === 'csrf',
        )!;
        const exchangeRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/participant-pass',
          payload: { token: created.token },
          headers: {
            'x-csrf-token': participantCsrf,
            cookie: `csrf=${participantCsrfCookie.value}`,
          },
        });
        expect(exchangeRes.statusCode).toBe(200);
        expect(exchangeRes.json()).toMatchObject({
          tournament: { id: demo.tournamentId, slug: 'copa-nexo-demo' },
          team: { id: '00000000-0000-4000-8000-000000000201' },
        });
        const participantSession = exchangeRes.cookies.find((cookie) => cookie.name === 'session')!;
        const participantCookies = `session=${participantSession.value}; csrf=${participantCsrfCookie.value}`;

        const participantMeRes = await app.inject({
          method: 'GET',
          url: '/api/v1/auth/me',
          headers: { cookie: participantCookies },
        });
        expect(participantMeRes.statusCode).toBe(200);
        expect(participantMeRes.json()).toMatchObject({
          participantAccess: {
            tournamentId: demo.tournamentId,
            tournamentSlug: 'copa-nexo-demo',
            teamId: '00000000-0000-4000-8000-000000000201',
            teamName: 'Aurora Gaming',
          },
        });

        const mineRes = await app.inject({
          method: 'GET',
          url: '/api/v1/teams/mine',
          headers: { cookie: participantCookies },
        });
        expect(mineRes.statusCode).toBe(200);
        expect(mineRes.json<{ teams: Array<{ id: string }> }>().teams).toEqual([
          expect.objectContaining({ id: '00000000-0000-4000-8000-000000000201' }),
        ]);

        const reportRes = await app.inject({
          method: 'POST',
          url: '/api/v1/matches/00000000-0000-4000-8000-000000000433/results',
          payload: { winnerTeamId: '00000000-0000-4000-8000-000000000201' },
          headers: {
            'x-csrf-token': participantCsrf,
            cookie: participantCookies,
          },
        });
        expect(reportRes.statusCode).toBe(201);
        expect(reportRes.json()).toMatchObject({ confirmed: false, waiting: true });

        const revokeRes = await app.inject({
          method: 'DELETE',
          url: `/api/v1/tournaments/${demo.tournamentId}/access-passes/${created.accessPass.id}`,
          headers: { 'x-csrf-token': adminCsrf, cookie: adminCookies },
        });
        expect(revokeRes.statusCode).toBe(204);

        const afterRevokeRes = await app.inject({
          method: 'GET',
          url: '/api/v1/teams/mine',
          headers: { cookie: participantCookies },
        });
        expect(afterRevokeRes.statusCode).toBe(401);

        const staffOverrideRes = await app.inject({
          method: 'POST',
          url: '/api/v1/matches/00000000-0000-4000-8000-000000000433/results',
          payload: {
            winnerTeamId: '00000000-0000-4000-8000-000000000201',
            staffOverride: true,
          },
          headers: { 'x-csrf-token': adminCsrf, cookie: adminCookies },
        });
        expect(staffOverrideRes.statusCode).toBe(200);
        expect(staffOverrideRes.json()).toMatchObject({ confirmed: true });
      } finally {
        await app.close();
      }
    },
  );
});
