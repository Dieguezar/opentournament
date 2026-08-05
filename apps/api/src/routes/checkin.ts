import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  checkIns,
  teams,
  tournamentParticipants,
  tournamentRegistrations,
} from '@opentournament/database';
import { checkInSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { getTournament, isTeamCaptain, isTournamentAdmin } from '../services/permissions.js';

export async function registerCheckInRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tournaments/:id/check-in', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = checkInSchema.parse(request.body);
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (!['open', 'checkin_open', 'in_progress'].includes(tournament.status)) {
      return reply.status(409).send({
        error: { code: 'INVALID_STATUS', message: 'El check-in no está disponible' },
      });
    }
    const closesAt = tournament.checkinConfig?.closesAt
      ? new Date(tournament.checkinConfig.closesAt)
      : null;
    if (closesAt && closesAt < new Date()) {
      return reply.status(409).send({
        error: { code: 'CHECKIN_CLOSED', message: 'El check-in ya cerró' },
      });
    }
    if (!(await isTeamCaptain(db, body.teamId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Solo el capitán hace check-in' },
      });
    }

    const [registration] = await db
      .select({ id: tournamentRegistrations.id })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, id),
          eq(tournamentRegistrations.teamId, body.teamId),
          eq(tournamentRegistrations.status, 'approved'),
        ),
      )
      .limit(1);
    if (!registration) {
      return reply.status(409).send({
        error: { code: 'NOT_REGISTERED', message: 'El equipo no está aprobado en este torneo' },
      });
    }

    await db
      .update(tournamentParticipants)
      .set({ checkedIn: true })
      .where(
        and(
          eq(tournamentParticipants.tournamentId, id),
          eq(tournamentParticipants.teamId, body.teamId),
        ),
      );
    await db
      .insert(checkIns)
      .values({
        tournamentId: id,
        teamId: body.teamId,
        userId: request.user!.id,
      })
      .onConflictDoNothing();
    await db.insert(auditLogs).values({
      organizationId: tournament.organizationId,
      actorId: request.user!.id,
      action: 'checkin.completed',
      resourceType: 'team',
      resourceId: body.teamId,
    });
    return reply.send({ ok: true });
  });

  app.get('/tournaments/:id/check-in/status', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Se requiere rol de admin del torneo' },
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
