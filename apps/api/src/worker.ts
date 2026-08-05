import { and, eq, lt, or, sql } from 'drizzle-orm';
import { jobs, type Db } from '@opentournament/database';
import { db } from './db.js';
import { closeCheckIn } from './services/tournaments.js';

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Record<string, JobHandler> = {
  'tournament.checkin_close': async (payload) => {
    const tournamentId = payload.tournamentId;
    if (typeof tournamentId !== 'string') {
      throw new Error('tournamentId ausente en el job');
    }
    await closeCheckIn(db, tournamentId);
  },
};

export function startScheduler(db: Db, intervalMs = 5000) {
  let running = true;
  let timer: NodeJS.Timeout | null = null;

  async function tick() {
    if (!running) return;
    const now = new Date();
    const due = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'pending'),
          lt(jobs.runAt, now),
          or(sql`${jobs.lockedUntil} IS NULL`, lt(jobs.lockedUntil, now)),
        ),
      )
      .limit(10);

    for (const job of due) {
      await db
        .update(jobs)
        .set({ status: 'running', lockedUntil: new Date(Date.now() + 30_000) })
        .where(eq(jobs.id, job.id));
      try {
        const handler = handlers[job.kind];
        if (!handler) {
          throw new Error(`No hay handler para el job ${job.kind}`);
        }
        await handler(job.payload);
        await db.update(jobs).set({ status: 'done' }).where(eq(jobs.id, job.id));
      } catch (error) {
        const attempts = job.attempts + 1;
        await db
          .update(jobs)
          .set({
            status: attempts >= 5 ? 'failed' : 'pending',
            attempts,
            lastError: error instanceof Error ? error.message : String(error),
            lockedUntil: null,
          })
          .where(eq(jobs.id, job.id));
      }
    }
  }

  timer = setInterval(() => {
    void tick().catch((error) => {
      console.error('Error en el scheduler:', error);
    });
  }, intervalMs);

  return {
    stop() {
      running = false;
      if (timer) clearInterval(timer);
    },
  };
}
