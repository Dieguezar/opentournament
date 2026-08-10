import { and, eq } from 'drizzle-orm';
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
  tournaments,
} from '@opentournament/database';
import { resolveMatchParticipants } from '@opentournament/tournament-engine';
import { updateMatchSchema, walkoverSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isTournamentAdmin } from '../services/permissions.js';
import {
  applyMatchWinner,
  loadEngineBracket,
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
    const [stage] = await db
      .select()
      .from(stages)
      .where(eq(stages.id, row.stageId))
      .limit(1);
    if (!stage) {
      return reply.status(409).send({
        error: { code: 'NO_BRACKET', message: 'El torneo no tiene bracket' },
      });
    }
    const engine = await loadEngineBracket(db, stage);
    const engineMatch = engine.matches.find((m) => m.id === row.match.engineId);
    if (!engineMatch || engineMatch.status === 'finalized') {
      return reply.status(409).send({
        error: { code: 'INVALID_MATCH', message: 'La partida no está disponible' },
      });
    }
    const resolved = resolveMatchParticipants(engine, engineMatch);
    if (!resolved.home || !resolved.away) {
      return reply.status(409).send({
        error: { code: 'MATCH_NOT_READY', message: 'Aún no se conocen ambos participantes' },
      });
    }

    const [winnerParticipant] = await db
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, row.tournamentId),
          eq(tournamentParticipants.teamId, body.winnerTeamId),
        ),
      )
      .limit(1);
    if (!winnerParticipant) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'El equipo no participa en el torneo' },
      });
    }
    if (winnerParticipant.id !== resolved.home && winnerParticipant.id !== resolved.away) {
      return reply.status(409).send({
        error: { code: 'INVALID_WINNER', message: 'El equipo no participa en esta partida' },
      });
    }

    const { champion } = await applyMatchWinner(db, stage, engineMatch.id, winnerParticipant.id);
    if (champion) {
      await db
        .update(tournaments)
        .set({ status: 'finalized' })
        .where(eq(tournaments.id, row.tournamentId));
      await db
        .update(tournamentParticipants)
        .set({ status: 'winner' })
        .where(eq(tournamentParticipants.id, champion));
      emitTournamentEvent(row.tournamentId, 'tournament.updated', { status: 'finalized' });
    }
    await db.insert(auditLogs).values({
      organizationId: row.tournamentId,
      actorId: request.user!.id,
      action: 'match.walkover',
      resourceType: 'match',
      resourceId: id,
      after: { winnerId: winnerParticipant.id },
    });
    emitTournamentEvent(row.tournamentId, 'match.updated', { matchId: id, status: 'walkover' });
    return reply.send({ ok: true, champion });
  });
}
