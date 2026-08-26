import { and, eq, isNull, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, teamMembers, teams, users } from '@opentournament/database';
import {
  addTeamMemberSchema,
  assignTeamGameAdapterSchema,
  createTeamSchema,
} from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { isOrgMember, isTeamCaptain } from '../services/permissions.js';
import {
  countRosterRoles,
  getMemberCapacityIssue,
  getRosterCompatibilityIssue,
} from '../services/team-game-compatibility.js';

export async function registerTeamRoutes(app: FastifyInstance): Promise<void> {
  app.post('/teams', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = createTeamSchema.parse(request.body);
    if (!(await isOrgMember(db, body.organizationId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'You are not a member of this organization' },
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
        gameAdapterKey: body.gameAdapterKey ?? 'generic',
      })
      .returning();
    if (!team) {
      return reply.status(500).send({
        error: { code: 'TEAM_CREATE_FAILED', message: 'The team could not be created' },
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
    if (request.participantAccess) {
      const rows = await db
        .select({
          id: teams.id,
          organizationId: teams.organizationId,
          name: teams.name,
          tag: teams.tag,
          captainId: teams.captainId,
          gameAdapterKey: teams.gameAdapterKey,
        })
        .from(teams)
        .where(and(eq(teams.id, request.participantAccess.teamId), isNull(teams.deletedAt)));
      return reply.send({ teams: rows });
    }
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
        error: { code: 'FORBIDDEN', message: 'Only the team captain can manage the roster' },
      });
    }
    const body = addTeamMemberSchema.parse(request.body);
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (!user) {
      return reply.status(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'No account exists with that email address' },
      });
    }

    const outcome = await db.transaction(async (transaction) => {
      const [team] = await transaction
        .select({ gameAdapterKey: teams.gameAdapterKey })
        .from(teams)
        .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
        .limit(1)
        .for('update');
      if (!team) return { kind: 'not_found' as const };

      const [existingMember] = await transaction
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
        .limit(1);
      if (existingMember) return { kind: 'unchanged' as const };

      const roster = await transaction
        .select({ role: teamMembers.role })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));
      const capacityIssue = getMemberCapacityIssue(team.gameAdapterKey, {
        ...countRosterRoles(roster),
        requestedRole: body.role,
      });
      if (capacityIssue) return { kind: 'incompatible' as const, issue: capacityIssue };

      await transaction.insert(teamMembers).values({ teamId, userId: user.id, role: body.role });
      return { kind: 'created' as const };
    });

    if (outcome.kind === 'not_found') {
      return reply.status(404).send({
        error: { code: 'TEAM_NOT_FOUND', message: 'The team does not exist' },
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
    return reply.status(201).send({ ok: true });
  });

  app.patch('/teams/:teamId/game-adapter', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { teamId } = request.params as { teamId: string };
    const body = assignTeamGameAdapterSchema.parse(request.body);

    const outcome = await db.transaction(async (transaction) => {
      const [team] = await transaction
        .select()
        .from(teams)
        .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
        .limit(1)
        .for('update');
      if (!team) return { kind: 'not_found' as const };
      if (team.captainId !== request.user!.id) return { kind: 'forbidden' as const };
      if (
        team.gameAdapterKey &&
        team.gameAdapterKey !== 'generic' &&
        team.gameAdapterKey !== body.gameAdapterKey
      ) {
        return { kind: 'locked' as const, currentGameAdapterKey: team.gameAdapterKey };
      }
      if (team.gameAdapterKey === body.gameAdapterKey) {
        return { kind: 'updated' as const, team };
      }

      const roster = await transaction
        .select({ role: teamMembers.role })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));
      const compatibilityIssue = getRosterCompatibilityIssue(
        body.gameAdapterKey,
        countRosterRoles(roster),
      );
      if (compatibilityIssue) {
        return { kind: 'incompatible' as const, issue: compatibilityIssue };
      }

      const [updatedTeam] = await transaction
        .update(teams)
        .set({ gameAdapterKey: body.gameAdapterKey, updatedAt: new Date() })
        .where(eq(teams.id, teamId))
        .returning();
      if (!updatedTeam) return { kind: 'not_found' as const };

      await transaction.insert(auditLogs).values({
        organizationId: team.organizationId,
        actorId: request.user!.id,
        action: 'team.game_adapter_assigned',
        resourceType: 'team',
        resourceId: team.id,
      });
      return { kind: 'updated' as const, team: updatedTeam };
    });

    if (outcome.kind === 'not_found') {
      return reply.status(404).send({
        error: { code: 'TEAM_NOT_FOUND', message: 'The team does not exist' },
      });
    }
    if (outcome.kind === 'forbidden') {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only the team captain can configure the game' },
      });
    }
    if (outcome.kind === 'locked') {
      return reply.status(409).send({
        error: {
          code: 'TEAM_GAME_LOCKED',
          message: 'The team is already configured for another game',
          details: { currentGameAdapterKey: outcome.currentGameAdapterKey },
        },
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
    return reply.send({ team: outcome.team });
  });
}
