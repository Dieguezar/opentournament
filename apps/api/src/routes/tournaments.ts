import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  auditLogs,
  jobs,
  organizations,
  tournamentStaff,
  tournaments,
} from '@opentournament/database';
import {
  createTournamentSchema,
  updateTournamentSchema,
} from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import {
  getTournament,
  isOrgMember,
  isTournamentAdmin,
} from '../services/permissions.js';
import { emitTournamentEvent } from '../services/realtime.js';
import { sendDiscordWebhook } from '../services/discord.js';

export async function registerTournamentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tournaments', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = createTournamentSchema.parse(request.body);
    if (!(await isOrgMember(db, body.organizationId, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'No perteneces a esta organización' },
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
        error: { code: 'SLUG_TAKEN', message: 'Ya existe un torneo con ese slug' },
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
        error: { code: 'TOURNAMENT_CREATE_FAILED', message: 'No se pudo crear el torneo' },
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
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (tournament.visibility === 'unlisted' && !request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Torneo no listado' },
      });
    }
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, tournament.organizationId))
      .limit(1);
    return reply.send({ tournament, organization: org ?? null });
  });

  app.patch('/tournaments/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Se requiere rol de admin del torneo' },
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
        startsAt: body.startsAt === undefined ? undefined : body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt === undefined ? undefined : body.endsAt ? new Date(body.endsAt) : null,
      })
      .where(eq(tournaments.id, id));
    await db.insert(auditLogs).values({
      actorId: request.user!.id,
      action: 'tournament.updated',
      resourceType: 'tournament',
      resourceId: id,
    });
    return reply.send({ ok: true });
  });

  app.post('/tournaments/:id/publish', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id } = request.params as { id: string };
    const tournament = await getTournament(db, id);
    if (!tournament) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Se requiere rol de admin del torneo' },
      });
    }
    if (tournament.status !== 'draft') {
      return reply.status(409).send({
        error: { code: 'INVALID_STATUS', message: 'El torneo ya fue publicado' },
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
    void sendDiscordWebhook(`📢 Torneo publicado: **${tournament.name}**`);
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
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No existe' } });
    }
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, tournament.organizationId))
      .limit(1);
    return reply.send({ tournament, organization: org ?? null });
  });
}
