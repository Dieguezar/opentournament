import { and, eq, inArray, ne } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  disputes,
  jobs,
  matches,
  resultSubmissions,
  teams,
  tournamentParticipants,
  tournaments,
} from '@opentournament/database';
import {
  reportResultSchema,
  type LeagueGameResultInput,
  type SmashGameResultInput,
} from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isTeamCaptain, isTournamentAdmin } from '../services/permissions.js';
import {
  applyMatchWinner,
  DomainError,
  loadMatchContext,
  lockMatchStage,
  type MatchContext,
} from '../services/tournaments.js';
import { notify } from '../services/notifications.js';
import { tournamentAdminIds } from '../services/checkin.js';
import { emitTournamentEvent } from '../services/realtime.js';
import { sendDiscordWebhook } from '../services/discord.js';
import { validateGameReport } from '../services/smash-game-report.js';
import { validateLeagueGameReport } from '../services/lol-game-report.js';
import { authorizeResultReport } from '../services/result-reporting-policy.js';

interface SubmissionResult {
  winnerId?: string;
  homeScore?: number;
  awayScore?: number;
  draw?: boolean;
  games?: SmashGameResultInput[];
  lolGames?: LeagueGameResultInput[];
}

function submissionsMatch(
  a: { result: SubmissionResult },
  b: { result: SubmissionResult },
): boolean {
  return (
    (a.result.winnerId ?? null) === (b.result.winnerId ?? null) &&
    (a.result.homeScore ?? null) === (b.result.homeScore ?? null) &&
    (a.result.awayScore ?? null) === (b.result.awayScore ?? null) &&
    Boolean(a.result.draw) === Boolean(b.result.draw) &&
    JSON.stringify(a.result.games ?? null) === JSON.stringify(b.result.games ?? null) &&
    JSON.stringify(a.result.lolGames ?? null) === JSON.stringify(b.result.lolGames ?? null)
  );
}

async function canAccessResults(
  ctx: MatchContext,
  userId: string,
  participantAccess?: { tournamentId: string; teamId: string },
): Promise<boolean> {
  if (await isTournamentAdmin(db, ctx.tournament.id, userId)) return true;
  if (participantAccess) {
    return (
      participantAccess.tournamentId === ctx.tournament.id &&
      [ctx.home?.teamId, ctx.away?.teamId].includes(participantAccess.teamId)
    );
  }
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

    if (!ctx.home || !ctx.away) {
      return reply.status(409).send({
        error: { code: 'INVALID_MATCH', message: 'La partida aún no tiene dos participantes' },
      });
    }

    const captains = [];
    for (const p of [ctx.home, ctx.away]) {
      if (p && (await isTeamCaptain(db, p.teamId, request.user!.id))) captains.push(p);
    }
    if (ctx.match.status !== 'scheduled' && ctx.match.status !== 'in_progress') {
      return reply.status(409).send({
        error: { code: 'INVALID_MATCH', message: 'La partida no acepta reportes' },
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
      const winner = [ctx.home, ctx.away].find((p) => p && p.teamId === body.winnerTeamId);
      if (!winner) {
        return reply.status(409).send({
          error: { code: 'INVALID_WINNER', message: 'El ganador no participa en la partida' },
        });
      }
      winnerId = winner.id;
    }

    const gameRules = ctx.tournament.settings?.gameRules;
    const smashGameValidation = validateGameReport(
      {
        gameAdapterKey: ctx.tournament.gameAdapterKey,
        bestOf: ctx.tournament.seriesConfig?.bo ?? 1,
        stockLimit: gameRules?.game === 'smash_ultimate' ? gameRules.stocks : 0,
        stagePool:
          gameRules?.game === 'smash_ultimate'
            ? [...gameRules.starters, ...gameRules.counterpicks]
            : [],
        homeTeamId: ctx.home?.teamId ?? '',
        awayTeamId: ctx.away?.teamId ?? '',
      },
      body,
    );
    if (!smashGameValidation.ok) {
      return reply.status(409).send({
        error: { code: smashGameValidation.code, message: smashGameValidation.message },
      });
    }
    const leagueGameValidation = validateLeagueGameReport(
      {
        gameAdapterKey: ctx.tournament.gameAdapterKey,
        bestOf: ctx.tournament.seriesConfig?.bo ?? 1,
        homeTeamId: ctx.home.teamId,
        awayTeamId: ctx.away.teamId,
      },
      body,
    );
    if (!leagueGameValidation.ok) {
      return reply.status(409).send({
        error: { code: leagueGameValidation.code, message: leagueGameValidation.message },
      });
    }

    const reportingMode = ctx.tournament.settings?.reportingMode ?? 'bilateral';
    const userIsTournamentAdmin = await isTournamentAdmin(db, ctx.tournament.id, request.user!.id);
    const authorization = authorizeResultReport({
      reportingMode,
      isTournamentAdmin:
        userIsTournamentAdmin &&
        (reportingMode === 'staff_only' ||
          body.staffOverride ||
          (captains.length === 0 && !request.participantAccess)),
      tournamentId: ctx.tournament.id,
      participantAccess: request.participantAccess ?? null,
      captainTeamIds: captains.map((captain) => captain.teamId),
      eligibleTeamIds: [ctx.home.teamId, ctx.away.teamId],
      winnerTeamId: body.draw ? null : (body.winnerTeamId ?? null),
    });
    if (!authorization.ok) {
      return reply.status(403).send({
        error: { code: authorization.code, message: authorization.message },
      });
    }

    const outcome = await db.transaction(async (transaction) => {
      const lockedContext = await lockMatchStage(transaction, matchId);
      if (
        lockedContext.match.status !== 'scheduled' &&
        lockedContext.match.status !== 'in_progress'
      ) {
        throw new DomainError(409, 'INVALID_MATCH', 'La partida no acepta reportes');
      }

      const [openDispute] = await transaction
        .select({ id: disputes.id })
        .from(disputes)
        .where(and(eq(disputes.matchId, matchId), ne(disputes.status, 'resolved')))
        .limit(1);
      if (openDispute) {
        throw new DomainError(409, 'DISPUTE_OPEN', 'La partida tiene una disputa abierta');
      }

      if (authorization.reporterTeamId) {
        const [existingSubmission] = await transaction
          .select({ id: resultSubmissions.id })
          .from(resultSubmissions)
          .where(
            and(
              eq(resultSubmissions.matchId, matchId),
              eq(resultSubmissions.teamId, authorization.reporterTeamId),
            ),
          )
          .limit(1);
        if (existingSubmission) {
          throw new DomainError(
            409,
            'RESULT_ALREADY_REPORTED',
            'El equipo ya reportó este resultado',
          );
        }
      }

      const [submission] = await transaction
        .insert(resultSubmissions)
        .values({
          matchId,
          teamId: authorization.reporterTeamId,
          reportedBy: request.user!.id,
          result: {
            winnerId: winnerId ?? undefined,
            homeScore: body.homeScore,
            awayScore: body.awayScore,
            draw: body.draw || undefined,
            games: smashGameValidation.games,
            lolGames: leagueGameValidation.games,
          },
          status: authorization.strategy === 'authoritative' ? 'confirmed' : 'pending',
        })
        .returning();
      if (!submission) {
        throw new DomainError(500, 'SUBMISSION_FAILED', 'No se pudo registrar el reporte');
      }

      const finalizeResult = async () => {
        let champion: string | null = null;
        if (winnerId) {
          ({ champion } = await applyMatchWinner(
            transaction,
            lockedContext.stage,
            lockedContext.match.engineId,
            winnerId,
          ));
          await transaction
            .update(matches)
            .set({
              result: {
                winnerId,
                homeScore: body.homeScore,
                awayScore: body.awayScore,
                games: smashGameValidation.games,
                lolGames: leagueGameValidation.games,
              },
            })
            .where(eq(matches.id, matchId));
          if (champion) {
            await transaction
              .update(tournaments)
              .set({ status: 'finalized' })
              .where(eq(tournaments.id, lockedContext.tournament.id));
            await transaction
              .update(tournamentParticipants)
              .set({ status: 'winner' })
              .where(eq(tournamentParticipants.id, champion));
          }
        }
        await transaction.insert(auditLogs).values({
          organizationId: lockedContext.tournament.organizationId,
          actorId: request.user!.id,
          action: 'result.confirmed',
          resourceType: 'match',
          resourceId: matchId,
          after: {
            winnerId,
            games: smashGameValidation.games,
            lolGames: leagueGameValidation.games,
            reportingMode: ctx.tournament.settings?.reportingMode ?? 'bilateral',
          },
        });
        return {
          kind: 'confirmed' as const,
          submission,
          champion,
          context: lockedContext,
        };
      };

      if (authorization.strategy === 'authoritative') {
        await transaction
          .update(resultSubmissions)
          .set({ status: 'overridden' })
          .where(
            and(eq(resultSubmissions.matchId, matchId), eq(resultSubmissions.status, 'pending')),
          );
        return finalizeResult();
      }

      const [counterpart] = await transaction
        .select()
        .from(resultSubmissions)
        .where(
          and(
            eq(resultSubmissions.matchId, matchId),
            ne(resultSubmissions.teamId, authorization.reporterTeamId!),
          ),
        )
        .limit(1);

      if (!counterpart) {
        const confirmMinutes = lockedContext.tournament.timingConfig?.resultConfirmMinutes ?? 30;
        await transaction.insert(jobs).values({
          kind: 'match.result_escalate',
          runAt: new Date(Date.now() + confirmMinutes * 60_000),
          payload: { matchId },
        });
        return { kind: 'waiting' as const, submission };
      }

      if (submissionsMatch(submission, counterpart)) {
        await transaction
          .update(resultSubmissions)
          .set({ status: 'confirmed' })
          .where(
            and(eq(resultSubmissions.matchId, matchId), eq(resultSubmissions.status, 'pending')),
          );
        return finalizeResult();
      }

      const [dispute] = await transaction
        .insert(disputes)
        .values({ matchId, openedBy: null, reason: 'result_conflict' })
        .returning();
      await transaction
        .update(resultSubmissions)
        .set({ status: 'conflicted' })
        .where(eq(resultSubmissions.matchId, matchId));
      await transaction.update(matches).set({ status: 'disputed' }).where(eq(matches.id, matchId));
      await transaction.insert(auditLogs).values({
        organizationId: lockedContext.tournament.organizationId,
        actorId: request.user!.id,
        action: 'dispute.opened',
        resourceType: 'match',
        resourceId: matchId,
        after: { reason: 'result_conflict' },
      });
      return { kind: 'conflict' as const, submission, dispute, context: lockedContext };
    });

    if (outcome.kind === 'waiting') {
      return reply
        .status(201)
        .send({ submission: outcome.submission, confirmed: false, waiting: true });
    }

    if (outcome.kind === 'confirmed') {
      if (outcome.champion) {
        emitTournamentEvent(outcome.context.tournament.id, 'tournament.updated', {
          status: 'finalized',
        });
      }
      emitTournamentEvent(outcome.context.tournament.id, 'result.confirmed', {
        matchId,
        winnerId,
      });
      const teamIds = [outcome.context.home?.teamId, outcome.context.away?.teamId].filter(
        (id): id is string => Boolean(id),
      );
      const captainRows = teamIds.length
        ? await db
            .select({ captainId: teams.captainId })
            .from(teams)
            .where(inArray(teams.id, teamIds))
        : [];
      await notify(
        db,
        captainRows.map((row) => row.captainId),
        'result.confirmed',
        { matchId, tournamentId: outcome.context.tournament.id, winnerTeamId: body.winnerTeamId },
      );
      void sendDiscordWebhook(
        `✅ Resultado confirmado en **${outcome.context.tournament.name}** (partida ${matchId.slice(0, 8)}).`,
      );
      return reply.send({ submission: outcome.submission, confirmed: true });
    }

    emitTournamentEvent(outcome.context.tournament.id, 'dispute.opened', { matchId });
    await notify(
      db,
      await tournamentAdminIds(db, outcome.context.tournament.id),
      'dispute.opened',
      { matchId, tournamentId: outcome.context.tournament.id },
    );
    return reply.status(201).send({
      submission: outcome.submission,
      confirmed: false,
      conflict: true,
      disputeId: outcome.dispute?.id ?? null,
    });
  });

  app.get('/matches/:matchId/results', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { matchId } = request.params as { matchId: string };
    const ctx = await loadMatchContext(db, matchId);
    if (!ctx) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (!(await canAccessResults(ctx, request.user!.id, request.participantAccess))) {
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
