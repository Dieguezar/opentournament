import { and, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  type DbExecutor,
  teamMembers,
  teams,
  tournamentParticipants,
  tournamentRegistrations,
  tournaments,
  users,
} from '@opentournament/database';
import {
  registerTeamSchema,
  registrationDecisionSchema,
} from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isTournamentAdmin } from '../services/permissions.js';
import {
  countRosterRoles,
  getRegistrationCompatibilityIssue,
} from '../services/team-game-compatibility.js';
import {
  canDecideRegistration,
  isRegistrationClosed,
} from '../services/registration-policy.js';

async function countApproved(database: DbExecutor, tournamentId: string): Promise<number> {
  const rows = await database
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

async function nextWaitlistPosition(
  database: DbExecutor,
  tournamentId: string,
): Promise<number> {
  const rows = await database
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
  database: DbExecutor,
  tournamentId: string,
  registrationId: string,
  teamId: string,
  seed: number | null,
) {
  await database
    .insert(tournamentParticipants)
    .values({
      tournamentId,
      registrationId,
      teamId,
      seed,
      checkedIn: false,
      status: 'active',
    })
    .onConflictDoUpdate({
      target: [tournamentParticipants.tournamentId, tournamentParticipants.teamId],
      set: {
        registrationId,
        checkedIn: false,
        status: 'active',
      },
    });
}

async function deactivateParticipant(
  database: DbExecutor,
  tournamentId: string,
  teamId: string,
) {
  await database
    .update(tournamentParticipants)
    .set({ checkedIn: false, status: 'inactive' })
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.teamId, teamId),
      ),
    );
}

export async function registerRegistrationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tournaments/:id/registrations', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = registerTeamSchema.parse(request.body);
    const outcome = await db.transaction(async (transaction) => {
      const [tournament] = await transaction
        .select()
        .from(tournaments)
        .where(and(eq(tournaments.id, id), isNull(tournaments.deletedAt)))
        .limit(1)
        .for('update');
      if (!tournament) return { kind: 'not_found' as const };
      if (tournament.status !== 'open') return { kind: 'closed' as const };
      if (isRegistrationClosed(tournament.registrationConfig?.closesAt)) {
        return { kind: 'registration_closed' as const };
      }

      const [team] = await transaction
        .select()
        .from(teams)
        .where(and(eq(teams.id, body.teamId), isNull(teams.deletedAt)))
        .limit(1)
        .for('update');
      if (!team) return { kind: 'team_not_found' as const };
      if (team.captainId !== request.user!.id) return { kind: 'forbidden' as const };

      const roster = await transaction
        .select({ role: teamMembers.role })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, body.teamId));
      const compatibilityIssue = getRegistrationCompatibilityIssue({
        tournamentAdapterKey: tournament.gameAdapterKey,
        teamAdapterKey: team.gameAdapterKey,
        ...countRosterRoles(roster),
      });
      if (compatibilityIssue) {
        return { kind: 'incompatible' as const, issue: compatibilityIssue };
      }

      const [existing] = await transaction
        .select({ id: tournamentRegistrations.id })
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, id),
            eq(tournamentRegistrations.teamId, body.teamId),
          ),
        )
        .limit(1);
      if (existing) return { kind: 'duplicate' as const };

      const approved = await countApproved(transaction, id);
      const manual = tournament.registrationConfig?.manualApproval === true;
      const status: 'pending' | 'approved' | 'waitlisted' = manual
        ? 'pending'
        : approved < tournament.capacity
          ? 'approved'
          : 'waitlisted';
      const waitlistPosition =
        status === 'waitlisted' ? await nextWaitlistPosition(transaction, id) : null;
      const [registration] = await transaction
        .insert(tournamentRegistrations)
        .values({ tournamentId: id, teamId: body.teamId, status, waitlistPosition })
        .returning();
      if (!registration) return { kind: 'failed' as const };
      if (status === 'approved') {
        await addParticipant(transaction, id, registration.id, body.teamId, null);
      }
      await transaction.insert(auditLogs).values({
        organizationId: tournament.organizationId,
        actorId: request.user!.id,
        action: 'registration.created',
        resourceType: 'registration',
        resourceId: registration.id,
      });
      return { kind: 'created' as const, registration };
    });

    if (outcome.kind === 'not_found') {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (outcome.kind === 'closed') {
      return reply.status(409).send({
        error: { code: 'INVALID_STATUS', message: 'Las inscripciones están cerradas' },
      });
    }
    if (outcome.kind === 'registration_closed') {
      return reply.status(409).send({
        error: {
          code: 'REGISTRATION_CLOSED',
          message: 'La fecha límite de inscripción ya pasó',
        },
      });
    }
    if (outcome.kind === 'team_not_found') {
      return reply.status(404).send({
        error: { code: 'TEAM_NOT_FOUND', message: 'El equipo no existe' },
      });
    }
    if (outcome.kind === 'forbidden') {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Solo el capitán inscribe al equipo' },
      });
    }
    if (outcome.kind === 'incompatible') {
      return reply.status(outcome.issue.statusCode).send({
        error: {
          code: outcome.issue.code,
          message: outcome.issue.message,
          details: outcome.issue.details,
        },
      });
    }
    if (outcome.kind === 'duplicate') {
      return reply.status(409).send({
        error: { code: 'ALREADY_REGISTERED', message: 'El equipo ya está inscrito' },
      });
    }
    if (outcome.kind === 'failed') {
      return reply.status(500).send({
        error: { code: 'REGISTRATION_FAILED', message: 'No se pudo inscribir' },
      });
    }
    return reply.status(201).send({ registration: outcome.registration });
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
    const outcome = await db.transaction(async (transaction) => {
      const [tournament] = await transaction
        .select()
        .from(tournaments)
        .where(and(eq(tournaments.id, id), isNull(tournaments.deletedAt)))
        .limit(1)
        .for('update');
      if (!tournament) return { kind: 'not_found' as const };
      if (!canDecideRegistration(tournament.status)) {
        return { kind: 'invalid_status' as const };
      }

      const [registration] = await transaction
        .select()
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.id, regId),
            eq(tournamentRegistrations.tournamentId, id),
          ),
        )
        .limit(1);
      if (!registration) return { kind: 'not_found' as const };

      if (body.status === 'approved' && registration.status === 'approved') {
        return { kind: 'unchanged' as const };
      }

      if (body.status === 'rejected') {
        await transaction
          .update(tournamentRegistrations)
          .set({
            status: 'rejected',
            approvedBy: request.user!.id,
            waitlistPosition: null,
            updatedAt: new Date(),
          })
          .where(eq(tournamentRegistrations.id, regId));
        await deactivateParticipant(transaction, id, registration.teamId);
      } else {
        const approved = await countApproved(transaction, id);
        const status: 'approved' | 'waitlisted' =
          approved < tournament.capacity ? 'approved' : 'waitlisted';
        const waitlistPosition =
          status === 'waitlisted'
            ? (registration.status === 'waitlisted' && registration.waitlistPosition) ||
              (await nextWaitlistPosition(transaction, id))
            : null;
        await transaction
          .update(tournamentRegistrations)
          .set({
            status,
            approvedBy: request.user!.id,
            waitlistPosition,
            updatedAt: new Date(),
          })
          .where(eq(tournamentRegistrations.id, regId));
        if (status === 'approved') {
          await addParticipant(transaction, id, registration.id, registration.teamId, null);
        }
      }
      await transaction.insert(auditLogs).values({
        organizationId: tournament.organizationId,
        actorId: request.user!.id,
        action: `registration.${body.status}`,
        resourceType: 'registration',
        resourceId: regId,
      });
      return { kind: 'updated' as const };
    });

    if (outcome.kind === 'not_found') {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Inscripción no encontrada' },
      });
    }
    if (outcome.kind === 'invalid_status') {
      return reply.status(409).send({
        error: {
          code: 'INVALID_STATUS',
          message: 'Las inscripciones ya no se pueden aprobar ni rechazar',
        },
      });
    }
    return reply.send({ ok: true });
  });
}
