import { and, eq, inArray, isNull } from 'drizzle-orm';
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
import { seedsSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { getTournament, isTournamentAdmin } from '../services/permissions.js';
import { generateTournamentBracket } from '../services/tournaments.js';
import { emitTournamentEvent } from '../services/realtime.js';

export async function registerBracketRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tournaments/:id/bracket/generate', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }
    const outcome = await db.transaction(async (transaction) => {
      const [lockedTournament] = await transaction
        .select()
        .from(tournaments)
        .where(and(eq(tournaments.id, id), isNull(tournaments.deletedAt)))
        .limit(1)
        .for('update');
      if (!lockedTournament) return { kind: 'not_found' as const };
      if (lockedTournament.status !== 'open') return { kind: 'invalid_status' as const };

      const stage = await generateTournamentBracket(transaction, lockedTournament);
      await transaction.insert(auditLogs).values({
        organizationId: lockedTournament.organizationId,
        actorId: request.user!.id,
        action: 'bracket.generated',
        resourceType: 'tournament',
        resourceId: id,
      });
      return { kind: 'generated' as const, stage };
    });
    if (outcome.kind === 'not_found') {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    if (outcome.kind === 'invalid_status') {
      return reply.status(409).send({
        error: { code: 'INVALID_STATUS', message: 'The tournament must be open' },
      });
    }
    emitTournamentEvent(id, 'bracket.updated', { stageId: outcome.stage.id });
    return reply.send({ stageId: outcome.stage.id });
  });

  app.get('/tournaments/:id/bracket', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [stage] = await db.select().from(stages).where(eq(stages.tournamentId, id)).limit(1);
    if (!stage) {
      return reply.send({ stage: null, brackets: [] });
    }

    const bracketRows = await db.select().from(brackets).where(eq(brackets.stageId, stage.id));
    const bracketIds = bracketRows.map((b) => b.id);
    const roundRows = bracketIds.length
      ? await db.select().from(rounds).where(inArray(rounds.bracketId, bracketIds))
      : [];
    const roundIds = roundRows.map((r) => r.id);
    const matchRows = roundIds.length
      ? await db.select().from(matches).where(inArray(matches.roundId, roundIds))
      : [];

    const participantIds = new Set<string>();
    for (const m of matchRows) {
      if (m.homeParticipantId) participantIds.add(m.homeParticipantId);
      if (m.awayParticipantId) participantIds.add(m.awayParticipantId);
    }
    const participants = participantIds.size
      ? await db
          .select({
            id: tournamentParticipants.id,
            teamId: tournamentParticipants.teamId,
            teamName: teams.name,
            teamTag: teams.tag,
            checkedIn: tournamentParticipants.checkedIn,
          })
          .from(tournamentParticipants)
          .innerJoin(teams, eq(teams.id, tournamentParticipants.teamId))
          .where(inArray(tournamentParticipants.id, [...participantIds]))
      : [];
    const teamByParticipant = new Map(participants.map((p) => [p.id, p]));

    const roundsByBracket = new Map<string, typeof roundRows>();
    for (const r of roundRows) {
      const list = roundsByBracket.get(r.bracketId) ?? [];
      list.push(r);
      roundsByBracket.set(r.bracketId, list);
    }
    const matchesByRound = new Map<string, typeof matchRows>();
    for (const m of matchRows) {
      const list = matchesByRound.get(m.roundId) ?? [];
      list.push(m);
      matchesByRound.set(m.roundId, list);
    }

    const teamView = (participantId: string | null) => {
      if (!participantId) return null;
      const p = teamByParticipant.get(participantId);
      return p ? { participantId: p.id, teamId: p.teamId, name: p.teamName, tag: p.teamTag } : null;
    };

    const result = bracketRows.map((b) => ({
      id: b.id,
      type: b.type,
      rounds: (roundsByBracket.get(b.id) ?? [])
        .sort((a, z) => a.number - z.number)
        .map((r) => ({
          id: r.id,
          number: r.number,
          name: r.name,
          matches: (matchesByRound.get(r.id) ?? [])
            .sort((a, z) => a.position - z.position)
            .map((m) => ({
              id: m.id,
              engineId: m.engineId,
              position: m.position,
              status: m.status,
              home: teamView(m.homeParticipantId),
              away: teamView(m.awayParticipantId),
              result: m.result,
              scheduledAt: m.scheduledAt,
              lobbyUrl: m.lobbyUrl,
            })),
        })),
    }));

    return reply.send({ stage, brackets: result });
  });

  app.post('/tournaments/:id/seeds', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }
    const body = seedsSchema.parse(request.body);
    for (const entry of body.seeds) {
      await db
        .update(tournamentParticipants)
        .set({ seed: entry.seed })
        .where(
          and(
            eq(tournamentParticipants.tournamentId, id),
            eq(tournamentParticipants.teamId, entry.teamId),
          ),
        );
    }
    await db.insert(auditLogs).values({
      organizationId: tournament.organizationId,
      actorId: request.user!.id,
      action: 'bracket.seeds_updated',
      resourceType: 'tournament',
      resourceId: id,
    });
    return reply.send({ ok: true });
  });
}
