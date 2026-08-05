import { and, eq, isNull, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, teamMembers, teams, users } from '@opentournament/database';
import { createTeamSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isOrgMember, isTeamCaptain } from '../services/permissions.js';

export async function registerTeamRoutes(app: FastifyInstance): Promise<void> {
  app.post('/teams', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = createTeamSchema.parse(request.body);
    if (!(await isOrgMember(db, body.organizationId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'No perteneces a esta organización' },
      });
    }

    const [team] = await db
      .insert(teams)
      .values({
        organizationId: body.organizationId,
        name: body.name,
        tag: body.tag ?? null,
        captainId: request.user!.id,
        isPermanent: true,
        gameAdapterKey: body.gameAdapterKey ?? null,
      })
      .returning();
    if (!team) {
      return reply.status(500).send({
        error: { code: 'TEAM_CREATE_FAILED', message: 'No se pudo crear el equipo' },
      });
    }

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: request.user!.id,
      role: 'captain',
    });
    await db.insert(auditLogs).values({
      organizationId: body.organizationId,
      actorId: request.user!.id,
      action: 'team.created',
      resourceType: 'team',
      resourceId: team.id,
    });
    return reply.status(201).send({ team });
  });

  app.get('/teams/mine', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const rows = await db
      .selectDistinct({
        id: teams.id,
        organizationId: teams.organizationId,
        name: teams.name,
        tag: teams.tag,
        captainId: teams.captainId,
        gameAdapterKey: teams.gameAdapterKey,
      })
      .from(teams)
      .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          isNull(teams.deletedAt),
          or(eq(teamMembers.userId, request.user!.id), eq(teams.captainId, request.user!.id)),
        ),
      );
    return reply.send({ teams: rows });
  });

  app.post('/teams/:teamId/members', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { teamId } = request.params as { teamId: string };
    if (!(await isTeamCaptain(db, teamId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Solo el capitán gestiona el roster' },
      });
    }
    const body = request.body as { email?: string };
    if (!body.email) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'email es obligatorio' },
      });
    }
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (!user) {
      return reply.status(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'No existe una cuenta con ese correo' },
      });
    }
    await db
      .insert(teamMembers)
      .values({ teamId, userId: user.id, role: 'member' })
      .onConflictDoNothing();
    return reply.status(201).send({ ok: true });
  });
}
