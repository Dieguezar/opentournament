import { and, eq, ne } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  disputes,
  jobs,
  matches,
  resultSubmissions,
  tournamentParticipants,
  tournaments,
} from '@opentournament/database';
import { reportResultSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isTeamCaptain, isTournamentAdmin } from '../services/permissions.js';
import {
  applyMatchWinner,
  loadMatchContext,
  type MatchContext,
} from '../services/tournaments.js';

interface SubmissionResult {
  winnerId?: string;
  homeScore?: number;
  awayScore?: number;
  draw?: boolean;
}

function submissionsMatch(a: { result: SubmissionResult }, b: { result: SubmissionResult }): boolean {
  return (
    (a.result.winnerId ?? null) === (b.result.winnerId ?? null) &&
    (a.result.homeScore ?? null) === (b.result.homeScore ?? null) &&
    (a.result.awayScore ?? null) === (b.result.awayScore ?? null) &&
    Boolean(a.result.draw) === Boolean(b.result.draw)
  );
}

async function canAccessResults(
  ctx: MatchContext,
  userId: string,
): Promise<boolean> {
  if (await isTournamentAdmin(db, ctx.tournament.id, userId)) return true;
  for (const participant of [ctx.home, ctx.away]) {
    if (participant && (await isTeamCaptain(db, participant.teamId, userId))) return true;
  }
  return false;
}

export async function registerResultRoutes(app: FastifyInstance): Promise<void> {
  app.post('/matches/:matchId/results', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { matchId } = request.params as { matchId: string };
    const ctx = await loadMatchContext(db, matchId);
    if (!ctx) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }

    const captains = [];
    for (const p of [ctx.home, ctx.away]) {
      if (p && (await isTeamCaptain(db, p.teamId, request.user!.id))) captains.push(p);
    }
    if (captains.length === 0) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Solo los capitanes reportan resultados' },
      });
    }
    if (ctx.match.status !== 'scheduled' && ctx.match.status !== 'in_progress') {
      return reply.status(409).send({
        error: { code: 'INVALID_MATCH', message: 'La partida no acepta reportes' },
      });
    }

    const existingDispute = await db
      .select({ id: disputes.id })
      .from(disputes)
      .where(
        and(
          eq(disputes.matchId, matchId),
          ne(disputes.status, 'resolved'),
        ),
      )
      .limit(1);
    if (existingDispute.length > 0) {
      return reply.status(409).send({
        error: { code: 'DISPUTE_OPEN', message: 'La partida tiene una disputa abierta' },
      });
    }

    const body = reportResultSchema.parse(request.body);
    const drawsAllowed = ctx.tournament.seriesConfig?.drawsAllowed === true;
    if (body.draw && !drawsAllowed) {
      return reply.status(409).send({
        error: { code: 'DRAW_NOT_ALLOWED', message: 'Este torneo no admite empates' },
      });
    }

    let winnerId: string | null = null;
    if (!body.draw) {
      const winner = [ctx.home, ctx.away].find(
        (p) => p && p.teamId === body.winnerTeamId,
      );
      if (!winner) {
        return reply.status(409).send({
          error: { code: 'INVALID_WINNER', message: 'El ganador no participa en la partida' },
        });
      }
      winnerId = winner.id;
    }

    const reporter = captains[0]!;
    const [submission] = await db
      .insert(resultSubmissions)
      .values({
        matchId,
        teamId: reporter.teamId,
        reportedBy: request.user!.id,
        result: {
          winnerId: winnerId ?? undefined,
          homeScore: body.homeScore,
          awayScore: body.awayScore,
          draw: body.draw || undefined,
        },
        status: 'pending',
      })
      .returning();
    if (!submission) {
      return reply.status(500).send({
        error: { code: 'SUBMISSION_FAILED', message: 'No se pudo registrar el reporte' },
      });
    }

    const [counterpart] = await db
      .select()
      .from(resultSubmissions)
      .where(
        and(
          eq(resultSubmissions.matchId, matchId),
          ne(resultSubmissions.teamId, reporter.teamId),
        ),
      )
      .limit(1);

    if (!counterpart) {
      const confirmMinutes = ctx.tournament.timingConfig?.resultConfirmMinutes ?? 30;
      await db.insert(jobs).values({
        kind: 'match.result_escalate',
        runAt: new Date(Date.now() + confirmMinutes * 60_000),
        payload: { matchId },
      });
      return reply.status(201).send({ submission, confirmed: false, waiting: true });
    }

    if (submissionsMatch(submission, counterpart)) {
      await db
        .update(resultSubmissions)
        .set({ status: 'confirmed' })
        .where(
          and(
            eq(resultSubmissions.matchId, matchId),
            eq(resultSubmissions.status, 'pending'),
          ),
        );
      if (winnerId) {
        const { champion } = await applyMatchWinner(db, ctx.stage, ctx.match.engineId, winnerId);
        if (champion) {
          await db
            .update(tournaments)
            .set({ status: 'finalized' })
            .where(eq(tournaments.id, ctx.tournament.id));
          await db
            .update(tournamentParticipants)
            .set({ status: 'winner' })
            .where(eq(tournamentParticipants.id, champion));
        }
      }
      await db.insert(auditLogs).values({
        organizationId: ctx.tournament.organizationId,
        actorId: request.user!.id,
        action: 'result.confirmed',
        resourceType: 'match',
        resourceId: matchId,
        after: { winnerId },
      });
      return reply.send({ submission, confirmed: true });
    }

    // Reportes en conflicto → disputa automática.
    const [dispute] = await db
      .insert(disputes)
      .values({ matchId, openedBy: null, reason: 'result_conflict' })
      .returning();
    await db
      .update(resultSubmissions)
      .set({ status: 'conflicted' })
      .where(eq(resultSubmissions.matchId, matchId));
    await db
      .update(matches)
      .set({ status: 'disputed' })
      .where(eq(matches.id, matchId));
    await db.insert(auditLogs).values({
      organizationId: ctx.tournament.organizationId,
      actorId: request.user!.id,
      action: 'dispute.opened',
      resourceType: 'match',
      resourceId: matchId,
      after: { reason: 'result_conflict' },
    });
    return reply.status(201).send({
      submission,
      confirmed: false,
      conflict: true,
      disputeId: dispute?.id ?? null,
    });
  });

  app.get('/matches/:matchId/results', async (request, reply) => {
    const { matchId } = request.params as { matchId: string };
    const ctx = await loadMatchContext(db, matchId);
    if (!ctx) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (request.user && !(await canAccessResults(ctx, request.user.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Sin acceso a los reportes' },
      });
    }
    const rows = await db
      .select()
      .from(resultSubmissions)
      .where(eq(resultSubmissions.matchId, matchId));
    return reply.send({ submissions: rows });
  });
}
