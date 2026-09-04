import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.TEST_DATABASE_URL);
const INTEGRATION_TEST_TIMEOUT_MS = 30_000;
const SSE_READ_TIMEOUT_MS = 5_000;

async function readSseUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  expected: string,
  timeoutMs = SSE_READ_TIMEOUT_MS,
): Promise<string> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for SSE fragment: ${expected}`)),
      timeoutMs,
    );
  });
  try {
    const decoder = new TextDecoder();
    let received = '';
    while (!received.includes(expected)) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next.done) throw new Error(`SSE closed before receiving: ${expected}`);
      received += decoder.decode(next.value, { stream: true });
    }
    return received;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function waitFor(assertion: () => boolean): Promise<void> {
  const deadline = Date.now() + SSE_READ_TIMEOUT_MS;
  while (!assertion()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for SSE cleanup');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe.skipIf(!hasDb)('public overlay routes (requires PostgreSQL)', () => {
  afterAll(async () => {
    if (!hasDb) return;
    const { pool } = await import('../db.js');
    await pool.end();
  });

  it(
    'serves only public snapshots and converges a no-cache SSE invalidation after a result correction',
    { timeout: INTEGRATION_TEST_TIMEOUT_MS },
    async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      const {
        matches,
        organizations,
        runMigrations,
        teams,
        tournamentParticipants,
        tournamentStaff,
        tournaments,
        users,
      } = await import('@opentournament/database');
      const { db } = await import('../db.js');
      const { initServer } = await import('../app.js');
      const { activeRealtimeHeartbeats, activeRealtimeSubscriptions } =
        await import('../services/realtime.js');
      const { createSession } = await import('@opentournament/auth');

      await runMigrations(process.env.TEST_DATABASE_URL!);
      const suffix = `${Date.now()}-${crypto.randomUUID()}`;
      const [owner] = await db
        .insert(users)
        .values({ displayName: 'Overlay owner', email: `overlay-${suffix}@example.com` })
        .returning();
      const { token: sessionToken } = await createSession(db, owner!.id, 24);
      const authHeaders = {
        'x-csrf-token': 'overlay-csrf-token',
        cookie: `session=${sessionToken}; csrf=overlay-csrf-token`,
      };
      const [organization] = await db
        .insert(organizations)
        .values({ name: 'Overlay organization', slug: `overlay-org-${suffix}` })
        .returning();
      const [tournament] = await db
        .insert(tournaments)
        .values({
          organizationId: organization!.id,
          slug: `overlay-${suffix}`,
          name: 'Overlay Cup',
          visibility: 'public',
          status: 'open',
          settings: { reportingMode: 'staff_only' },
          publishedAt: new Date(),
        })
        .returning();
      await db.insert(tournamentStaff).values({
        tournamentId: tournament!.id,
        userId: owner!.id,
        role: 'admin',
      });
      const [homeTeam] = await db
        .insert(teams)
        .values({
          organizationId: organization!.id,
          captainId: owner!.id,
          name: 'Home team',
        })
        .returning();
      const [awayTeam] = await db
        .insert(teams)
        .values({
          organizationId: organization!.id,
          captainId: owner!.id,
          name: 'Away team',
        })
        .returning();
      const [homeParticipant] = await db
        .insert(tournamentParticipants)
        .values({ tournamentId: tournament!.id, teamId: homeTeam!.id })
        .returning();
      const [awayParticipant] = await db
        .insert(tournamentParticipants)
        .values({ tournamentId: tournament!.id, teamId: awayTeam!.id })
        .returning();
      const app = await initServer(false);
      const bracket = await app.inject({
        method: 'POST',
        url: `/api/v1/tournaments/${tournament!.id}/bracket/generate`,
        headers: authHeaders,
      });
      expect(bracket.statusCode).toBe(200);
      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentId, tournament!.id))
        .limit(1);
      expect(match).toBeDefined();

      const address = await app.listen({ host: '127.0.0.1', port: 0 });
      const controller = new AbortController();
      try {
        const snapshotUrl = `${address}/api/v1/tournaments/by-slug/${tournament!.slug}/overlay`;
        const initialSnapshot = await fetch(snapshotUrl);
        expect(initialSnapshot.status).toBe(200);
        expect(initialSnapshot.headers.get('cache-control')).toContain('no-cache');
        await expect(initialSnapshot.json()).resolves.toEqual({
          overlay: {
            tournament: {
              id: tournament!.id,
              slug: tournament!.slug,
              name: 'Overlay Cup',
              appearance: null,
            },
            scoreboard: {
              id: match!.id,
              status: 'scheduled',
              scheduledAt: null,
              stagePosition: 0,
              bracketType: 'winners',
              roundNumber: 1,
              position: 0,
              home: { id: homeParticipant!.id, label: 'Home team' },
              away: { id: awayParticipant!.id, label: 'Away team' },
              homeScore: null,
              awayScore: null,
            },
            upNext: null,
            champion: null,
          },
        });

        const stream = await fetch(
          `${address}/api/v1/events/public?tournament=${encodeURIComponent(tournament!.id)}`,
          { signal: controller.signal },
        );
        expect(stream.status).toBe(200);
        expect(stream.headers.get('content-type')).toContain('text/event-stream');
        expect(stream.headers.get('cache-control')).toContain('no-store');
        const reader = stream.body!.getReader();
        const bootstrap = await readSseUntil(reader, 'retry: 3000');
        expect(bootstrap).toContain(': bootstrap');

        const result = await app.inject({
          method: 'POST',
          url: `/api/v1/matches/${match!.id}/results`,
          payload: { winnerTeamId: homeTeam!.id, homeScore: 2, awayScore: 1 },
          headers: authHeaders,
        });
        expect(result.statusCode).toBe(200);
        const invalidation = await readSseUntil(reader, 'event: overlay.invalidated');
        expect(invalidation).toContain('event: result.confirmed');
        expect(invalidation).toContain('event: overlay.invalidated\ndata: {}\n\n');
        expect(await readSseUntil(reader, ': heartbeat', 20_000)).toContain(': heartbeat');

        const correctedSnapshot = await fetch(snapshotUrl);
        expect(await correctedSnapshot.json()).toMatchObject({
          overlay: { champion: { id: homeParticipant!.id, label: 'Home team' } },
        });

        await db
          .update(tournaments)
          .set({ visibility: 'private' })
          .where(eq(tournaments.id, tournament!.id));
        const privateSnapshot = await fetch(snapshotUrl);
        expect(privateSnapshot.status).toBe(404);
        expect(privateSnapshot.headers.get('cache-control')).toContain('no-store');
        const privateEvents = await fetch(
          `${address}/api/v1/events/public?tournament=${encodeURIComponent(tournament!.slug)}`,
        );
        expect(privateEvents.status).toBe(404);
        expect(privateEvents.headers.get('cache-control')).toContain('no-store');
        await db
          .update(tournaments)
          .set({ visibility: 'unlisted', publishedAt: null })
          .where(eq(tournaments.id, tournament!.id));
        const unlistedSnapshot = await fetch(snapshotUrl);
        expect(unlistedSnapshot.status).toBe(404);
        expect(unlistedSnapshot.headers.get('cache-control')).toContain('no-store');
        const unlistedEvents = await fetch(
          `${address}/api/v1/events/public?tournament=${encodeURIComponent(tournament!.slug)}`,
        );
        expect(unlistedEvents.status).toBe(404);
        expect(unlistedEvents.headers.get('cache-control')).toContain('no-store');

        await reader.cancel();
        controller.abort();
        await waitFor(
          () =>
            activeRealtimeSubscriptions(`tournament:${tournament!.id}`) === 0 &&
            activeRealtimeHeartbeats() === 0,
        );
      } finally {
        controller.abort();
        await app.close();
      }
    },
  );
});
