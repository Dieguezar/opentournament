import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  brackets,
  matches,
  rounds,
  stages,
  teams,
  tournamentParticipants,
} from '@opentournament/database';
import { updateMatchSchema, walkoverSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isTournamentAdmin } from '../services/permissions.js';
import {
  applyWalkoverAtomically,
} from '../services/tournaments.js';
import { emitTournamentEvent } from '../services/realtime.js';

async function findMatchWithStage(matchId: string) {
  const [row] = await db
    .select({
      match: matches,
      stageId: stages.id,
      tournamentId: stages.tournamentId,
    })
    .from(matches)
    .innerJoin(rounds, eq(rounds.id, matches.roundId))
    .innerJoin(brackets, eq(brackets.id, rounds.bracketId))
    .innerJoin(stages, eq(stages.id, brackets.stageId))
    .where(eq(matches.id, matchId))
    .limit(1);
  return row ?? null;
}

export async function registerMatchRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tournaments/:id/matches', async (request, reply) => {
    const { id } = request.params as { id: string };
    const homeTeams = alias(teams, 'home_teams');
    const awayTeams = alias(teams, 'away_teams');
    const homeParticipants = alias(tournamentParticipants, 'home_participants');
    const awayParticipants = alias(tournamentParticipants, 'away_participants');
    const rows = await db
      .select({
        id: matches.id,
        engineId: matches.engineId,
        position: matches.position,
        status: matches.status,
        scheduledAt: matches.scheduledAt,
        lobbyUrl: matches.lobbyUrl,
        maps: matches.maps,
        result: matches.result,
        bracketType: brackets.type,
        roundNumber: rounds.number,
        roundName: rounds.name,
        homeTeam: homeTeams.name,
        awayTeam: awayTeams.name,
        homeTeamId: homeParticipants.teamId,
        awayTeamId: awayParticipants.teamId,
      })
      .from(matches)
      .innerJoin(rounds, eq(rounds.id, matches.roundId))
      .innerJoin(brackets, eq(brackets.id, rounds.bracketId))
      .innerJoin(stages, eq(stages.id, brackets.stageId))
      .leftJoin(homeParticipants, eq(homeParticipants.id, matches.homeParticipantId))
      .leftJoin(awayParticipants, eq(awayParticipants.id, matches.awayParticipantId))
      .leftJoin(homeTeams, eq(homeTeams.id, homeParticipants.teamId))
      .leftJoin(awayTeams, eq(awayTeams.id, awayParticipants.teamId))
      .where(eq(stages.tournamentId, id))
      .orderBy(rounds.number, matches.position);
    return reply.send({ matches: rows });
  });

  app.patch('/matches/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const row = await findMatchWithStage(id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (!(await isTournamentAdmin(db, row.tournamentId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Se requiere rol de admin del torneo' },
      });
    }
    const body = updateMatchSchema.parse(request.body);
    await db
      .update(matches)
      .set({
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        lobbyUrl: body.lobbyUrl,
        maps: body.maps ? { maps: body.maps } : undefined,
      })
      .where(eq(matches.id, id));
    await db.insert(auditLogs).values({
      organizationId: row.tournamentId,
      actorId: request.user!.id,
      action: 'match.updated',
      resourceType: 'match',
      resourceId: id,
    });
    emitTournamentEvent(row.tournamentId, 'match.updated', { matchId: id });
    return reply.send({ ok: true });
  });

  app.post('/matches/:id/walkover', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const row = await findMatchWithStage(id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (!(await isTournamentAdmin(db, row.tournamentId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Se requiere rol de admin del torneo' },
      });
    }
    const body = walkoverSchema.parse(request.body);
    const { champion, tournamentId } = await applyWalkoverAtomically(
      db,
      id,
      body.winnerTeamId,
      request.user!.id,
    );
    if (champion) {
      emitTournamentEvent(tournamentId, 'tournament.updated', { status: 'finalized' });
    }
    emitTournamentEvent(row.tournamentId, 'match.updated', { matchId: id, status: 'walkover' });
    return reply.send({ ok: true, champion });
  });
}
