import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, teams, tournamentParticipants } from '@opentournament/database';
import { checkInSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isTeamCaptain, isTournamentAdmin } from '../services/permissions.js';
import { performCheckIn } from '../services/checkin.js';
import { emitTournamentEvent } from '../services/realtime.js';

export async function registerCheckInRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tournaments/:id/check-in', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = checkInSchema.parse(request.body);
    if (!(await isTeamCaptain(db, body.teamId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only the team captain can check in' },
      });
    }
    const result = await performCheckIn(db, id, body.teamId, request.user!.id);
    if (!result.ok) {
      return reply.status(result.code === 'NOT_FOUND' ? 404 : 409).send({
        error: { code: result.code, message: result.message },
      });
    }
    await db.insert(auditLogs).values({
      actorId: request.user!.id,
      action: 'checkin.completed',
      resourceType: 'team',
      resourceId: body.teamId,
    });
    emitTournamentEvent(id, 'checkin.updated', { teamId: body.teamId });
    return reply.send({ ok: true });
  });

  app.get('/tournaments/:id/check-in/status', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }
    const rows = await db
      .select({
        teamId: tournamentParticipants.teamId,
        teamName: teams.name,
        checkedIn: tournamentParticipants.checkedIn,
        status: tournamentParticipants.status,
        seed: tournamentParticipants.seed,
      })
      .from(tournamentParticipants)
      .innerJoin(teams, eq(teams.id, tournamentParticipants.teamId))
      .where(eq(tournamentParticipants.tournamentId, id));
    return reply.send({ participants: rows });
  });
}
