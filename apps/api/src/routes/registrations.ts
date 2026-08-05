import { and, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  teams,
  tournamentParticipants,
  tournamentRegistrations,
  users,
} from '@opentournament/database';
import {
  registerTeamSchema,
  registrationDecisionSchema,
} from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import {
  getTournament,
  isTeamCaptain,
  isTournamentAdmin,
} from '../services/permissions.js';

async function countApproved(tournamentId: string): Promise<number> {
  const rows = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, 'approved'),
      ),
    );
  return rows.length;
}

async function nextWaitlistPosition(tournamentId: string): Promise<number> {
  const rows = await db
    .select({ position: tournamentRegistrations.waitlistPosition })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, 'waitlisted'),
      ),
    )
    .orderBy(desc(tournamentRegistrations.waitlistPosition))
    .limit(1);
  return (rows[0]?.position ?? 0) + 1;
}

async function addParticipant(
  tournamentId: string,
  registrationId: string,
  teamId: string,
  seed: number | null,
) {
  await db.insert(tournamentParticipants).values({
    tournamentId,
    registrationId,
    teamId,
    seed,
    checkedIn: false,
    status: 'active',
  });
}

export async function registerRegistrationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tournaments/:id/registrations', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = registerTeamSchema.parse(request.body);
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (tournament.status !== 'open') {
      return reply.status(409).send({
        error: { code: 'INVALID_STATUS', message: 'Las inscripciones están cerradas' },
      });
    }
    if (!(await isTeamCaptain(db, body.teamId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Solo el capitán inscribe al equipo' },
      });
    }

    const existing = await db
      .select({ id: tournamentRegistrations.id })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, id),
          eq(tournamentRegistrations.teamId, body.teamId),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({
        error: { code: 'ALREADY_REGISTERED', message: 'El equipo ya está inscrito' },
      });
    }

    const approved = await countApproved(id);
    const manual = tournament.registrationConfig?.manualApproval === true;
    const status: 'pending' | 'approved' | 'waitlisted' = manual
      ? 'pending'
      : approved < tournament.capacity
        ? 'approved'
        : 'waitlisted';
    let waitlistPosition: number | null = null;
    if (status === 'waitlisted') waitlistPosition = await nextWaitlistPosition(id);

    const [registration] = await db
      .insert(tournamentRegistrations)
      .values({
        tournamentId: id,
        teamId: body.teamId,
        status,
        waitlistPosition,
      })
      .returning();
    if (!registration) {
      return reply.status(500).send({
        error: { code: 'REGISTRATION_FAILED', message: 'No se pudo inscribir' },
      });
    }
    if (status === 'approved') {
      await addParticipant(id, registration.id, body.teamId, null);
    }
    await db.insert(auditLogs).values({
      organizationId: tournament.organizationId,
      actorId: request.user!.id,
      action: 'registration.created',
      resourceType: 'registration',
      resourceId: registration.id,
    });
    return reply.status(201).send({ registration });
  });

  app.get('/tournaments/:id/registrations', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Se requiere rol de admin del torneo' },
      });
    }
    const rows = await db
      .select({
        id: tournamentRegistrations.id,
        status: tournamentRegistrations.status,
        waitlistPosition: tournamentRegistrations.waitlistPosition,
        createdAt: tournamentRegistrations.createdAt,
        teamId: teams.id,
        teamName: teams.name,
        teamTag: teams.tag,
        captainId: teams.captainId,
        captainName: users.displayName,
      })
      .from(tournamentRegistrations)
      .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
      .leftJoin(users, eq(users.id, teams.captainId))
      .where(eq(tournamentRegistrations.tournamentId, id))
      .orderBy(tournamentRegistrations.createdAt);
    return reply.send({ registrations: rows });
  });

  app.patch('/tournaments/:id/registrations/:regId', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id, regId } = request.params as { id: string; regId: string };
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Se requiere rol de admin del torneo' },
      });
    }
    const body = registrationDecisionSchema.parse(request.body);
    const tournament = await getTournament(db, id);
    const [registration] = await db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, regId))
      .limit(1);
    if (!tournament || !registration || registration.tournamentId !== id) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Inscripción no encontrada' },
      });
    }

    if (body.status === 'rejected') {
      await db
        .update(tournamentRegistrations)
        .set({ status: 'rejected', approvedBy: request.user!.id })
        .where(eq(tournamentRegistrations.id, regId));
    } else {
      const approved = await countApproved(id);
      const status = approved < tournament.capacity ? 'approved' : 'waitlisted';
      await db
        .update(tournamentRegistrations)
        .set({
          status,
          approvedBy: request.user!.id,
          waitlistPosition: status === 'waitlisted' ? await nextWaitlistPosition(id) : null,
        })
        .where(eq(tournamentRegistrations.id, regId));
      if (status === 'approved') {
        await addParticipant(id, registration.id, registration.teamId, null);
      }
    }
    await db.insert(auditLogs).values({
      organizationId: tournament.organizationId,
      actorId: request.user!.id,
      action: `registration.${body.status}`,
      resourceType: 'registration',
      resourceId: regId,
    });
    return reply.send({ ok: true });
  });
}
