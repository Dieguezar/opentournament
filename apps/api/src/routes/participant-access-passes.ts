import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { generateSessionToken, hashSessionToken } from '@opentournament/auth';
import {
  auditLogs,
  participantAccessPasses,
  teams,
  tournamentParticipants,
  tournamentRegistrations,
  users,
} from '@opentournament/database';
import { createParticipantAccessPassSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { getTournament, isTournamentAdmin } from '../services/permissions.js';

export async function registerParticipantAccessPassRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tournaments/:id/access-passes', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }

    const rows = await db
      .select({
        id: participantAccessPasses.id,
        teamId: participantAccessPasses.teamId,
        teamName: teams.name,
        expiresAt: participantAccessPasses.expiresAt,
        revokedAt: participantAccessPasses.revokedAt,
        lastUsedAt: participantAccessPasses.lastUsedAt,
        createdAt: participantAccessPasses.createdAt,
      })
      .from(participantAccessPasses)
      .innerJoin(teams, eq(teams.id, participantAccessPasses.teamId))
      .where(eq(participantAccessPasses.tournamentId, id))
      .orderBy(desc(participantAccessPasses.createdAt));

    return reply.send({ accessPasses: rows });
  });

  app.post('/tournaments/:id/access-passes', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'The tournament does not exist' },
      });
    }
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }

    const body = createParticipantAccessPassSchema.parse(request.body);
    const [[team], [registration], [participant]] = await Promise.all([
      db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(and(eq(teams.id, body.teamId), isNull(teams.deletedAt)))
        .limit(1),
      db
        .select({ id: tournamentRegistrations.id })
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, id),
            eq(tournamentRegistrations.teamId, body.teamId),
            eq(tournamentRegistrations.status, 'approved'),
          ),
        )
        .limit(1),
      db
        .select({ id: tournamentParticipants.id })
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, id),
            eq(tournamentParticipants.teamId, body.teamId),
            eq(tournamentParticipants.status, 'active'),
          ),
        )
        .limit(1),
    ]);
    if (!team || (!registration && !participant)) {
      return reply.status(409).send({
        error: {
          code: 'TEAM_NOT_ELIGIBLE',
          message: 'The pass can only be assigned to an approved participant',
        },
      });
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000);
    const accessPass = await db.transaction(async (transaction) => {
      const now = new Date();
      await transaction
        .update(participantAccessPasses)
        .set({ revokedAt: now })
        .where(
          and(
            eq(participantAccessPasses.tournamentId, id),
            eq(participantAccessPasses.teamId, body.teamId),
            isNull(participantAccessPasses.revokedAt),
            gt(participantAccessPasses.expiresAt, now),
          ),
        );

      const [actor] = await transaction
        .insert(users)
        .values({ displayName: `${team.name} · participante` })
        .returning({ id: users.id });
      if (!actor) throw new Error('The participant identity could not be created');

      const [created] = await transaction
        .insert(participantAccessPasses)
        .values({
          tournamentId: id,
          teamId: body.teamId,
          actorUserId: actor.id,
          tokenHash: hashSessionToken(token),
          expiresAt,
          createdBy: request.user!.id,
        })
        .returning({
          id: participantAccessPasses.id,
          teamId: participantAccessPasses.teamId,
          expiresAt: participantAccessPasses.expiresAt,
          createdAt: participantAccessPasses.createdAt,
        });
      if (!created) throw new Error('The participant pass could not be created');

      await transaction.insert(auditLogs).values({
        organizationId: tournament.organizationId,
        actorId: request.user!.id,
        action: 'participant_access_pass.created',
        resourceType: 'participant_access_pass',
        resourceId: created.id,
        after: { tournamentId: id, teamId: body.teamId, expiresAt },
      });
      return created;
    });

    return reply.status(201).send({
      accessPass,
      token,
      path: `/access#token=${token}`,
    });
  });

  app.delete('/tournaments/:id/access-passes/:passId', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id, passId } = request.params as { id: string; passId: string };
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'The tournament does not exist' },
      });
    }
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }

    const [revoked] = await db
      .update(participantAccessPasses)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(participantAccessPasses.id, passId),
          eq(participantAccessPasses.tournamentId, id),
          isNull(participantAccessPasses.revokedAt),
        ),
      )
      .returning({ id: participantAccessPasses.id, teamId: participantAccessPasses.teamId });
    if (!revoked) {
      return reply.status(404).send({
        error: {
          code: 'PASS_NOT_FOUND',
          message: 'The participant pass does not exist or was revoked',
        },
      });
    }

    await db.insert(auditLogs).values({
      organizationId: tournament.organizationId,
      actorId: request.user!.id,
      action: 'participant_access_pass.revoked',
      resourceType: 'participant_access_pass',
      resourceId: revoked.id,
      after: { tournamentId: id, teamId: revoked.teamId },
    });
    return reply.status(204).send();
  });
}
