import { and, desc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  disputeMessages,
  disputes,
  matches,
  rulings,
  teams,
  tournamentParticipants,
  tournaments,
  users,
} from '@opentournament/database';
import {
  assignRefereeSchema,
  createDisputeSchema,
  disputeMessageSchema,
  resolveDisputeSchema,
} from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isTeamCaptain, isTournamentAdmin } from '../services/permissions.js';
import {
  applyMatchWinner,
  DomainError,
  loadMatchContext,
  lockMatchStage,
} from '../services/tournaments.js';
import { notify } from '../services/notifications.js';
import { tournamentAdminIds } from '../services/checkin.js';
import { emitTournamentEvent } from '../services/realtime.js';
import { sendDiscordWebhook } from '../services/discord.js';

async function canAccessDispute(
  disputeId: string,
  userId: string,
  participantAccess?: { tournamentId: string; teamId: string },
): Promise<boolean> {
  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
  if (!dispute) return false;
  const ctx = await loadMatchContext(db, dispute.matchId);
  if (!ctx) return false;
  if (await isTournamentAdmin(db, ctx.tournament.id, userId)) return true;
  if (dispute.assigneeId === userId) return true;
  if (
    participantAccess?.tournamentId === ctx.tournament.id &&
    [ctx.home?.teamId, ctx.away?.teamId].includes(participantAccess.teamId)
  ) {
    return true;
  }
  for (const participant of [ctx.home, ctx.away]) {
    if (participant && (await isTeamCaptain(db, participant.teamId, userId))) return true;
  }
  return false;
}

export async function registerDisputeRoutes(app: FastifyInstance): Promise<void> {
  app.post('/disputes', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = createDisputeSchema.parse(request.body);
    const ctx = await loadMatchContext(db, body.matchId);
    if (!ctx) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }

    let isCaptain = false;
    for (const participant of [ctx.home, ctx.away]) {
      if (participant && (await isTeamCaptain(db, participant.teamId, request.user!.id))) {
        isCaptain = true;
      }
    }
    const hasParticipantAccess =
      request.participantAccess?.tournamentId === ctx.tournament.id &&
      [ctx.home?.teamId, ctx.away?.teamId].includes(request.participantAccess.teamId);
    if (!isCaptain && !hasParticipantAccess && body.reason !== 'system') {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only match participants can open disputes',
        },
      });
    }
    if (
      body.reason === 'system' &&
      !(await isTournamentAdmin(db, ctx.tournament.id, request.user!.id))
    ) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only tournament staff can open system disputes' },
      });
    }

    const outcome = await db.transaction(async (transaction) => {
      const lockedContext = await lockMatchStage(transaction, body.matchId);
      const [existing] = await transaction
        .select({ id: disputes.id })
        .from(disputes)
        .where(and(eq(disputes.matchId, body.matchId), eq(disputes.status, 'open')))
        .limit(1);
      if (existing) {
        throw new DomainError(409, 'DISPUTE_OPEN', 'Ya existe una disputa abierta');
      }

      const [dispute] = await transaction
        .insert(disputes)
        .values({
          matchId: body.matchId,
          openedBy: request.user!.id,
          reason: body.reason,
        })
        .returning();
      if (!dispute) {
        throw new DomainError(500, 'DISPUTE_FAILED', 'The dispute could not be opened');
      }
      if (body.message) {
        await transaction.insert(disputeMessages).values({
          disputeId: dispute.id,
          authorId: request.user!.id,
          body: body.message,
        });
      }
      await transaction
        .update(matches)
        .set({ status: 'disputed' })
        .where(eq(matches.id, body.matchId));
      await transaction.insert(auditLogs).values({
        organizationId: lockedContext.tournament.organizationId,
        actorId: request.user!.id,
        action: 'dispute.opened',
        resourceType: 'dispute',
        resourceId: dispute.id,
        after: { reason: body.reason },
      });
      return { dispute, context: lockedContext };
    });

    emitTournamentEvent(outcome.context.tournament.id, 'dispute.opened', {
      matchId: body.matchId,
    });
    await notify(
      db,
      await tournamentAdminIds(db, outcome.context.tournament.id),
      'dispute.opened',
      { matchId: body.matchId, tournamentId: outcome.context.tournament.id },
    );
    void sendDiscordWebhook(`⚠️ Nueva disputa abierta en **${outcome.context.tournament.name}**.`);
    return reply.status(201).send({ dispute: outcome.dispute });
  });

  app.get('/tournaments/:id/disputes', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }
    const homeParticipants = alias(tournamentParticipants, 'home_participants');
    const awayParticipants = alias(tournamentParticipants, 'away_participants');
    const homeTeams = alias(teams, 'home_teams');
    const awayTeams = alias(teams, 'away_teams');
    const rows = await db
      .select({
        id: disputes.id,
        status: disputes.status,
        reason: disputes.reason,
        openedAt: disputes.openedAt,
        matchId: disputes.matchId,
        assigneeName: users.displayName,
        homeTeam: homeTeams.name,
        awayTeam: awayTeams.name,
      })
      .from(disputes)
      .innerJoin(matches, eq(matches.id, disputes.matchId))
      .leftJoin(homeParticipants, eq(homeParticipants.id, matches.homeParticipantId))
      .leftJoin(awayParticipants, eq(awayParticipants.id, matches.awayParticipantId))
      .leftJoin(homeTeams, eq(homeTeams.id, homeParticipants.teamId))
      .leftJoin(awayTeams, eq(awayTeams.id, awayParticipants.teamId))
      .leftJoin(users, eq(users.id, disputes.assigneeId))
      .where(eq(matches.tournamentId, id))
      .orderBy(desc(disputes.openedAt));
    return reply.send({ disputes: rows });
  });

  app.get('/disputes/:disputeId', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { disputeId } = request.params as { disputeId: string };
    if (!(await canAccessDispute(disputeId, request.user!.id, request.participantAccess))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Sin acceso a esta disputa' },
      });
    }
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    if (!dispute) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    const messages = await db
      .select({
        id: disputeMessages.id,
        body: disputeMessages.body,
        authorName: users.displayName,
        createdAt: disputeMessages.createdAt,
      })
      .from(disputeMessages)
      .innerJoin(users, eq(users.id, disputeMessages.authorId))
      .where(eq(disputeMessages.disputeId, disputeId))
      .orderBy(disputeMessages.createdAt);
    const [ruling] = await db
      .select()
      .from(rulings)
      .where(eq(rulings.disputeId, disputeId))
      .limit(1);
    const ctx = await loadMatchContext(db, dispute.matchId);
    const teamIds = [ctx?.home?.teamId, ctx?.away?.teamId].filter((id): id is string =>
      Boolean(id),
    );
    const teamRows = teamIds.length
      ? await db.select().from(teams).where(inArray(teams.id, teamIds))
      : [];
    const teamById = new Map(teamRows.map((t) => [t.id, t]));
    return reply.send({
      dispute,
      messages,
      ruling: ruling ?? null,
      match: ctx
        ? {
            id: ctx.match.id,
            engineId: ctx.match.engineId,
            homeTeamId: ctx.home?.teamId ?? null,
            awayTeamId: ctx.away?.teamId ?? null,
            homeTeamName: ctx.home?.teamId ? (teamById.get(ctx.home.teamId)?.name ?? null) : null,
            awayTeamName: ctx.away?.teamId ? (teamById.get(ctx.away.teamId)?.name ?? null) : null,
          }
        : null,
    });
  });

  app.post('/disputes/:disputeId/messages', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { disputeId } = request.params as { disputeId: string };
    if (!(await canAccessDispute(disputeId, request.user!.id, request.participantAccess))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Sin acceso a esta disputa' },
      });
    }
    const body = disputeMessageSchema.parse(request.body);
    const [message] = await db
      .insert(disputeMessages)
      .values({ disputeId, authorId: request.user!.id, body: body.body })
      .returning();
    return reply.status(201).send({ message });
  });

  app.patch('/disputes/:disputeId/assignee', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { disputeId } = request.params as { disputeId: string };
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    if (!dispute) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    const ctx = await loadMatchContext(db, dispute.matchId);
    if (!ctx || !(await isTournamentAdmin(db, ctx.tournament.id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only tournament admins can assign referees' },
      });
    }
    const body = assignRefereeSchema.parse(request.body);
    await db
      .update(disputes)
      .set({ assigneeId: body.assigneeId, status: 'in_review' })
      .where(eq(disputes.id, disputeId));
    await db.insert(auditLogs).values({
      organizationId: ctx.tournament.organizationId,
      actorId: request.user!.id,
      action: 'dispute.assigned',
      resourceType: 'dispute',
      resourceId: disputeId,
      after: { assigneeId: body.assigneeId },
    });
    await notify(db, [body.assigneeId], 'dispute.assigned', { disputeId });
    return reply.send({ ok: true });
  });

  app.post('/disputes/:disputeId/resolve', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { disputeId } = request.params as { disputeId: string };
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    if (!dispute) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    const ctx = await loadMatchContext(db, dispute.matchId);
    if (!ctx) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    const isAdmin = await isTournamentAdmin(db, ctx.tournament.id, request.user!.id);
    if (!isAdmin && dispute.assigneeId !== request.user!.id) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the assigned referee or an admin can resolve this dispute',
        },
      });
    }
    if (dispute.status === 'resolved') {
      return reply.status(409).send({
        error: { code: 'ALREADY_RESOLVED', message: 'The dispute has already been resolved' },
      });
    }

    const body = resolveDisputeSchema.parse(request.body);
    let winnerId: string | null = null;
    if (!body.draw) {
      const winner = [ctx.home, ctx.away].find((p) => p && p.teamId === body.winnerTeamId);
      if (!winner) {
        return reply.status(409).send({
          error: {
            code: 'INVALID_WINNER',
            message: 'The winner does not participate in the match',
          },
        });
      }
      winnerId = winner.id;
    }

    const outcome = await db.transaction(async (transaction) => {
      const lockedContext = await lockMatchStage(transaction, dispute.matchId);
      const [currentDispute] = await transaction
        .select()
        .from(disputes)
        .where(eq(disputes.id, disputeId))
        .limit(1);
      if (!currentDispute) {
        throw new DomainError(404, 'NOT_FOUND', 'The dispute does not exist');
      }
      if (currentDispute.status === 'resolved') {
        throw new DomainError(409, 'ALREADY_RESOLVED', 'The dispute has already been resolved');
      }

      const { champion } = winnerId
        ? await applyMatchWinner(
            transaction,
            lockedContext.stage,
            lockedContext.match.engineId,
            winnerId,
          )
        : { champion: null };
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

      await transaction.insert(rulings).values({
        disputeId,
        resolvedBy: request.user!.id,
        decision: {
          winnerId: winnerId ?? undefined,
          homeScore: body.homeScore,
          awayScore: body.awayScore,
          draw: body.draw || undefined,
        },
        rationale: body.rationale,
        consideredEvidence: [],
      });
      await transaction
        .update(disputes)
        .set({ status: 'resolved', resolvedAt: new Date() })
        .where(eq(disputes.id, disputeId));
      await transaction.insert(auditLogs).values({
        organizationId: lockedContext.tournament.organizationId,
        actorId: request.user!.id,
        action: 'dispute.resolved',
        resourceType: 'dispute',
        resourceId: disputeId,
        after: { winnerId },
      });
      return { champion, context: lockedContext };
    });

    if (outcome.champion) {
      emitTournamentEvent(outcome.context.tournament.id, 'tournament.updated', {
        status: 'finalized',
      });
    }
    emitTournamentEvent(ctx.tournament.id, 'dispute.resolved', {
      disputeId,
      winnerId,
    });
    const teamIds = [ctx.home?.teamId, ctx.away?.teamId].filter((id): id is string => Boolean(id));
    const captainRows = teamIds.length
      ? await db
          .select({ captainId: teams.captainId })
          .from(teams)
          .where(inArray(teams.id, teamIds))
      : [];
    await notify(
      db,
      captainRows.map((r) => r.captainId),
      'dispute.resolved',
      { disputeId, tournamentId: ctx.tournament.id },
    );
    return reply.send({ ok: true, champion: outcome.champion });
  });
}
