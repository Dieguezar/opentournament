import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  jobs,
  organizations,
  publicMedia,
  publicPlayerProfiles,
  teams,
  tournamentStaff,
  tournamentParticipants,
  tournamentRegistrations,
  tournamentAppearances,
  tournaments,
} from '@opentournament/database';
import { tournamentAppearanceSchema, updateTournamentSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { getTournament, isOrgMember, isTournamentAdmin } from '../services/permissions.js';
import { emitTournamentEvent } from '../services/realtime.js';
import { publicProfile } from './profiles.js';
import { sendDiscordWebhook } from '../services/discord.js';
import { resolveTournamentCreationRequest } from '../services/tournament-creation.js';

export async function registerTournamentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tournaments', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = resolveTournamentCreationRequest(request.body);
    if (!(await isOrgMember(db, body.organizationId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'You are not a member of this organization' },
      });
    }
    const existing = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(
        and(
          eq(tournaments.organizationId, body.organizationId),
          eq(tournaments.slug, body.slug),
          isNull(tournaments.deletedAt),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({
        error: { code: 'SLUG_TAKEN', message: 'A tournament already uses that slug' },
      });
    }

    const [tournament] = await db
      .insert(tournaments)
      .values({
        organizationId: body.organizationId,
        gameAdapterKey: body.gameAdapterKey,
        slug: body.slug,
        name: body.name,
        description: body.description ?? null,
        rules: body.rules ?? null,
        format: body.format,
        visibility: body.visibility,
        capacity: body.capacity,
        seriesConfig: body.seriesConfig,
        registrationConfig: body.registrationConfig,
        checkinConfig: body.checkinConfig,
        timingConfig: { resultConfirmMinutes: 30, disputeWindowMinutes: 60 },
        settings: body.settings,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      })
      .returning();
    if (!tournament) {
      return reply.status(500).send({
        error: { code: 'TOURNAMENT_CREATE_FAILED', message: 'The tournament could not be created' },
      });
    }

    await db.insert(tournamentStaff).values({
      tournamentId: tournament.id,
      userId: request.user!.id,
      role: 'admin',
    });
    await db.insert(auditLogs).values({
      organizationId: body.organizationId,
      actorId: request.user!.id,
      action: 'tournament.created',
      resourceType: 'tournament',
      resourceId: tournament.id,
    });
    return reply.status(201).send({ tournament });
  });

  app.get('/tournaments/mine', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const orgIds = request.user!.organizations.map((o) => o.id);
    if (orgIds.length === 0) return reply.send({ tournaments: [] });
    const rows = await db
      .select()
      .from(tournaments)
      .where(and(inArray(tournaments.organizationId, orgIds), isNull(tournaments.deletedAt)));
    return reply.send({ tournaments: rows });
  });

  app.get('/tournaments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    if (tournament.visibility === 'unlisted' && !request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'The tournament is unlisted' },
      });
    }
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, tournament.organizationId))
      .limit(1);
    return reply.send({ tournament, organization: org ?? null });
  });

  app.get('/tournaments/:id/teams', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rows = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        teamTag: teams.tag,
        registrationStatus: tournamentRegistrations.status,
        waitlistPosition: tournamentRegistrations.waitlistPosition,
        checkedIn: tournamentParticipants.checkedIn,
      })
      .from(tournamentRegistrations)
      .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
      .leftJoin(
        tournamentParticipants,
        and(
          eq(tournamentParticipants.tournamentId, id),
          eq(tournamentParticipants.teamId, teams.id),
        ),
      )
      .where(eq(tournamentRegistrations.tournamentId, id));
    return reply.send({ teams: rows });
  });

  app.post('/tournaments/:id/cancel', async (request, reply) => {
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
      if (lockedTournament.status === 'finalized' || lockedTournament.status === 'cancelled') {
        return { kind: 'invalid_status' as const };
      }

      await transaction
        .update(tournaments)
        .set({ status: 'cancelled', cancelledAt: new Date() })
        .where(eq(tournaments.id, id));
      await transaction.insert(auditLogs).values({
        organizationId: lockedTournament.organizationId,
        actorId: request.user!.id,
        action: 'tournament.cancelled',
        resourceType: 'tournament',
        resourceId: id,
      });
      return { kind: 'cancelled' as const };
    });
    if (outcome.kind === 'not_found') {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    if (outcome.kind === 'invalid_status') {
      return reply.status(409).send({
        error: { code: 'INVALID_STATUS', message: 'The tournament cannot be cancelled' },
      });
    }
    emitTournamentEvent(id, 'tournament.updated', { status: 'cancelled' });
    return reply.send({ ok: true });
  });

  app.patch('/tournaments/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'The tournament does not exist' },
      });
    }
    const body = updateTournamentSchema.parse(request.body);
    await db
      .update(tournaments)
      .set({
        name: body.name,
        description: body.description === undefined ? undefined : body.description,
        rules: body.rules === undefined ? undefined : body.rules,
        visibility: body.visibility,
        startsAt:
          body.startsAt === undefined ? undefined : body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt === undefined ? undefined : body.endsAt ? new Date(body.endsAt) : null,
        settings:
          body.reportingMode === undefined
            ? undefined
            : { ...tournament.settings, reportingMode: body.reportingMode },
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id));
    await db.insert(auditLogs).values({
      organizationId: tournament.organizationId,
      actorId: request.user!.id,
      action: 'tournament.updated',
      resourceType: 'tournament',
      resourceId: id,
      after: body.reportingMode ? { reportingMode: body.reportingMode } : undefined,
    });
    return reply.send({ ok: true });
  });

  app.patch('/tournaments/:id/appearance', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'The resource does not exist' },
      });
    }
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' },
      });
    }
    const body = tournamentAppearanceSchema.parse(request.body);
    const [appearance] = await db
      .insert(tournamentAppearances)
      .values({ tournamentId: id, ...body })
      .onConflictDoUpdate({
        target: tournamentAppearances.tournamentId,
        set: { ...body, updatedAt: new Date() },
      })
      .returning();
    await db.insert(auditLogs).values({
      organizationId: tournament.organizationId,
      actorId: request.user!.id,
      action: 'tournament.appearance.updated',
      resourceType: 'tournament',
      resourceId: id,
      after: body,
    });
    emitTournamentEvent(id, 'tournament.updated', { appearance: true });
    return reply.send({ appearance });
  });
  app.post('/tournaments/:id/publish', async (request, reply) => {
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
    if (tournament.status !== 'draft') {
      return reply.status(409).send({
        error: { code: 'INVALID_STATUS', message: 'The tournament has already been published' },
      });
    }
    await db
      .update(tournaments)
      .set({ status: 'open', publishedAt: new Date() })
      .where(eq(tournaments.id, id));

    const closesAt = tournament.checkinConfig?.closesAt
      ? new Date(tournament.checkinConfig.closesAt)
      : tournament.startsAt
        ? new Date(tournament.startsAt.getTime() - 60 * 60 * 1000)
        : null;
    if (closesAt && closesAt > new Date()) {
      await db.insert(jobs).values({
        kind: 'tournament.checkin_close',
        runAt: closesAt,
        payload: { tournamentId: id },
      });
    }
    await db.insert(auditLogs).values({
      organizationId: tournament.organizationId,
      actorId: request.user!.id,
      action: 'tournament.published',
      resourceType: 'tournament',
      resourceId: id,
    });
    emitTournamentEvent(id, 'tournament.updated', { status: 'open' });
    void sendDiscordWebhook(`📢 Tournament published: **${tournament.name}**`);
    return reply.send({ ok: true });
  });

  app.get('/tournaments/by-slug/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(and(eq(tournaments.slug, slug), isNull(tournaments.deletedAt)))
      .limit(1);
    if (!tournament) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
    }
    if (tournament.visibility !== 'public' || !tournament.publishedAt) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'The resource does not exist' },
      });
    }
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, tournament.organizationId))
      .limit(1);
    const [appearance] = await db
      .select()
      .from(tournamentAppearances)
      .where(eq(tournamentAppearances.tournamentId, tournament.id))
      .limit(1);
    const participants = await db
      .select({
        teamId: teams.id,
        label: teams.name,
        profile: publicPlayerProfiles,
        avatar: publicMedia,
      })
      .from(tournamentParticipants)
      .innerJoin(teams, eq(teams.id, tournamentParticipants.teamId))
      .leftJoin(
        publicPlayerProfiles,
        and(
          eq(teams.gameAdapterKey, 'smash_ultimate'),
          eq(publicPlayerProfiles.userId, teams.captainId),
          eq(publicPlayerProfiles.isPublished, true),
        ),
      )
      .leftJoin(
        publicMedia,
        and(
          eq(publicMedia.id, publicPlayerProfiles.avatarMediaId),
          eq(publicMedia.state, 'active'),
        ),
      )
      .where(eq(tournamentParticipants.tournamentId, tournament.id));
    return reply.send({
      tournament,
      organization: org ?? null,
      participants: participants.map((participant) => ({
        teamId: participant.teamId,
        label: participant.label,
        ...(participant.profile
          ? { profile: publicProfile(participant.profile, participant.avatar) }
          : {}),
      })),
      appearance: appearance
        ? {
            logoMediaId: appearance.logoMediaId,
            bannerMediaId: appearance.bannerMediaId,
            primaryColor: appearance.primaryColor,
            secondaryColor: appearance.secondaryColor,
            accentColor: appearance.accentColor,
          }
        : null,
    });
  });
}
