import { randomUUID } from 'node:crypto';
import { and, asc, eq, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { jobs, resultSubmissions, type Db, type JobRow } from '@opentournament/database';
import { closeCheckIn } from './services/tournaments.js';

const JOB_LEASE_MS = 30_000;
const JOB_HEARTBEAT_MS = 10_000;
const MAX_JOB_ATTEMPTS = 5;

type ClaimedJob = JobRow & { lockToken: string };
type JobHandler = (database: Db, payload: Record<string, unknown>) => Promise<void>;

const handlers: Record<string, JobHandler> = {
  'tournament.checkin_close': async (database, payload) => {
    const tournamentId = payload.tournamentId;
    if (typeof tournamentId !== 'string') {
      throw new Error('tournamentId ausente en el job');
    }
    await closeCheckIn(database, tournamentId);
  },
  'match.result_escalate': async (database, payload) => {
    const matchId = payload.matchId;
    if (typeof matchId !== 'string') {
      throw new Error('matchId ausente en el job');
    }
    await database
      .update(resultSubmissions)
      .set({ status: 'escalated' })
      .where(and(eq(resultSubmissions.matchId, matchId), eq(resultSubmissions.status, 'pending')));
  },
};

export async function claimDueJobs(
  database: Db,
  now = new Date(),
  limit = 10,
): Promise<ClaimedJob[]> {
  const lockedUntil = new Date(now.getTime() + JOB_LEASE_MS);
  const lockToken = randomUUID();

  return database.transaction(async (transaction) => {
    await transaction
      .update(jobs)
      .set({
        status: 'failed',
        lockedUntil: null,
        lockToken: null,
        lastError: 'El job agotó sus intentos después de vencer su lease',
      })
      .where(
        and(
          eq(jobs.status, 'running'),
          or(isNull(jobs.lockedUntil), lte(jobs.lockedUntil, now)),
          gte(jobs.attempts, MAX_JOB_ATTEMPTS),
        ),
      );

    const dueJobs = await transaction
      .select()
      .from(jobs)
      .where(
        and(
          lte(jobs.runAt, now),
          lt(jobs.attempts, MAX_JOB_ATTEMPTS),
          inArray(jobs.status, ['pending', 'running']),
          or(isNull(jobs.lockedUntil), lte(jobs.lockedUntil, now)),
        ),
      )
      .orderBy(asc(jobs.runAt), asc(jobs.id))
      .limit(limit)
      .for('update', { skipLocked: true });

    if (dueJobs.length === 0) return [];

    await transaction
      .update(jobs)
      .set({
        status: 'running',
        attempts: sql`${jobs.attempts} + 1`,
        lockedUntil,
        lockToken,
      })
      .where(inArray(jobs.id, dueJobs.map((job) => job.id)));

    return dueJobs.map((job) => ({
      ...job,
      status: 'running',
      attempts: job.attempts + 1,
      lockedUntil,
      lockToken,
    }));
  });
}

async function extendJobLease(database: Db, job: ClaimedJob): Promise<void> {
  await database
    .update(jobs)
    .set({ lockedUntil: new Date(Date.now() + JOB_LEASE_MS) })
    .where(and(eq(jobs.id, job.id), eq(jobs.lockToken, job.lockToken)));
}

async function runClaimedJob(database: Db, job: ClaimedJob): Promise<void> {
  const heartbeat = setInterval(() => {
    void extendJobLease(database, job).catch((error) => {
      console.error(`No se pudo extender el lease del job ${job.id}:`, error);
    });
  }, JOB_HEARTBEAT_MS);

  try {
    const handler = handlers[job.kind];
    if (!handler) throw new Error(`No hay handler para el job ${job.kind}`);

    await handler(database, job.payload);
    await database
      .update(jobs)
      .set({ status: 'done', lockedUntil: null, lockToken: null, lastError: null })
      .where(and(eq(jobs.id, job.id), eq(jobs.lockToken, job.lockToken)));
  } catch (error) {
    await database
      .update(jobs)
      .set({
        status: job.attempts >= MAX_JOB_ATTEMPTS ? 'failed' : 'pending',
        lastError: error instanceof Error ? error.message : String(error),
        lockedUntil: null,
        lockToken: null,
      })
      .where(and(eq(jobs.id, job.id), eq(jobs.lockToken, job.lockToken)));
  } finally {
    clearInterval(heartbeat);
  }
}

export async function runSchedulerTick(database: Db, now = new Date()): Promise<void> {
  const dueJobs = await claimDueJobs(database, now);
  await Promise.all(dueJobs.map((job) => runClaimedJob(database, job)));
}

export function startScheduler(db: Db, intervalMs = 5000) {
  let running = true;
  let tickInProgress = false;
  let timer: NodeJS.Timeout | null = null;

  async function tick() {
    if (!running || tickInProgress) return;
    tickInProgress = true;
    try {
      await runSchedulerTick(db);
    } finally {
      tickInProgress = false;
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
