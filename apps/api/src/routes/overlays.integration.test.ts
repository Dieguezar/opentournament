import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.TEST_DATABASE_URL);
const INTEGRATION_TEST_TIMEOUT_MS = 30_000;
const SSE_READ_TIMEOUT_MS = 5_000;

async function readSseUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  expected: string,
): Promise<string> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Timed out waiting for SSE fragment: ${expected}`)),
      SSE_READ_TIMEOUT_MS,
    );
  });
  const decoder = new TextDecoder();
  let received = '';
  while (!received.includes(expected)) {
    const next = await Promise.race([reader.read(), timeout]);
    if (next.done) throw new Error(`SSE closed before receiving: ${expected}`);
    received += decoder.decode(next.value, { stream: true });
  }
  return received;
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
        brackets,
        matches,
        organizations,
        rounds,
        runMigrations,
        stages,
        teams,
        tournamentParticipants,
        tournaments,
        users,
      } = await import('@opentournament/database');
      const { db } = await import('../db.js');
      const { initServer } = await import('../app.js');
      const { emitTournamentEvent } = await import('../services/realtime.js');

      await runMigrations(process.env.TEST_DATABASE_URL!);
      const suffix = `${Date.now()}-${crypto.randomUUID()}`;
      const [owner] = await db
        .insert(users)
        .values({ displayName: 'Overlay owner', email: `overlay-${suffix}@example.com` })
        .returning();
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
          status: 'in_progress',
          publishedAt: new Date(),
        })
        .returning();
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
      const [stage] = await db
        .insert(stages)
        .values({ tournamentId: tournament!.id, format: 'single_elimination', position: 1 })
        .returning();
      const [bracket] = await db
        .insert(brackets)
        .values({ stageId: stage!.id, type: 'winners' })
        .returning();
      const [round] = await db
        .insert(rounds)
        .values({ bracketId: bracket!.id, number: 1, name: 'Final' })
        .returning();
      const [match] = await db
        .insert(matches)
        .values({
          tournamentId: tournament!.id,
          roundId: round!.id,
          engineId: `overlay-${suffix}`,
          position: 1,
          status: 'in_progress',
          homeParticipantId: homeParticipant!.id,
          awayParticipantId: awayParticipant!.id,
        })
        .returning();

      const app = await initServer(false);
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
              status: 'in_progress',
              scheduledAt: null,
              stagePosition: 1,
              bracketType: 'winners',
              roundNumber: 1,
              position: 1,
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
          `${address}/api/v1/events/public?tournament=${encodeURIComponent(tournament!.slug)}`,
          { signal: controller.signal },
        );
        expect(stream.status).toBe(200);
        expect(stream.headers.get('content-type')).toContain('text/event-stream');
        expect(stream.headers.get('cache-control')).toContain('no-cache');
        const reader = stream.body!.getReader();
        await readSseUntil(reader, 'retry: 3000');

        await db
          .update(matches)
          .set({ result: { homeScore: 2, awayScore: 1 } })
          .where(eq(matches.id, match!.id));
        emitTournamentEvent(tournament!.id, 'result.corrected', { matchId: match!.id });
        const invalidation = await readSseUntil(reader, 'event: overlay.invalidated');
        expect(invalidation).toContain('data: {}');
        expect(invalidation).not.toContain(match!.id);

        const correctedSnapshot = await fetch(snapshotUrl);
        expect(await correctedSnapshot.json()).toMatchObject({
          overlay: { scoreboard: { homeScore: 2, awayScore: 1 } },
        });

        await db
          .update(tournaments)
          .set({ visibility: 'private' })
          .where(eq(tournaments.id, tournament!.id));
        expect((await fetch(snapshotUrl)).status).toBe(404);
        expect(
          (
            await fetch(
              `${address}/api/v1/events/public?tournament=${encodeURIComponent(tournament!.slug)}`,
            )
          ).status,
        ).toBe(404);
        await db
          .update(tournaments)
          .set({ visibility: 'unlisted', publishedAt: null })
          .where(eq(tournaments.id, tournament!.id));
        expect((await fetch(snapshotUrl)).status).toBe(404);
      } finally {
        controller.abort();
        await app.close();
      }
    },
  );
});
