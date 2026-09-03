import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { auditLogs, publicPlayerProfiles } from '@opentournament/database';
import { publicProfileSettingsSchema } from '@opentournament/validation';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';

function publicProfile(profile: typeof publicPlayerProfiles.$inferSelect) {
  return {
    slug: profile.slug,
    gamertag: profile.gamertag,
    ...(profile.showRealName && profile.realName ? { realName: profile.realName } : {}),
    ...(profile.showBiography && profile.biography ? { biography: profile.biography } : {}),
  };
}

export async function registerProfileRoutes(app: FastifyInstance): Promise<void> {
  app.put('/profile/public', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = publicProfileSettingsSchema.parse(request.body);
    const [existing] = await db
      .select()
      .from(publicPlayerProfiles)
      .where(eq(publicPlayerProfiles.userId, request.user!.id))
      .limit(1);

    if (!existing && !body.slug) {
      return reply.status(400).send({
        error: { code: 'PROFILE_SLUG_REQUIRED', message: 'A public profile slug is required' },
      });
    }
    if (existing && body.slug && body.slug !== existing.slug) {
      return reply.status(409).send({
        error: { code: 'PROFILE_SLUG_IMMUTABLE', message: 'The public profile slug cannot change' },
      });
    }

    const submitted = request.body as Record<string, unknown>;
    const values = {
      slug: existing?.slug ?? body.slug!,
      gamertag: body.gamertag,
      realName: body.realName === undefined ? (existing?.realName ?? null) : body.realName,
      biography: body.biography === undefined ? (existing?.biography ?? null) : body.biography,
      isPublished:
        existing && typeof submitted.isPublished !== 'boolean'
          ? existing.isPublished
          : body.isPublished,
      showAvatar:
        existing && typeof submitted.showAvatar !== 'boolean'
          ? existing.showAvatar
          : body.showAvatar,
      showRealName:
        existing && typeof submitted.showRealName !== 'boolean'
          ? existing.showRealName
          : body.showRealName,
      showBiography:
        existing && typeof submitted.showBiography !== 'boolean'
          ? existing.showBiography
          : body.showBiography,
      updatedAt: new Date(),
    };
    const [profile] = existing
      ? await db
          .update(publicPlayerProfiles)
          .set(values)
          .where(eq(publicPlayerProfiles.userId, request.user!.id))
          .returning()
      : await db
          .insert(publicPlayerProfiles)
          .values({ userId: request.user!.id, ...values })
          .returning();

    await db.insert(auditLogs).values({
      actorId: request.user!.id,
      action: existing ? 'profile.public.updated' : 'profile.public.created',
      resourceType: 'public_player_profile',
      resourceId: profile!.id,
    });
    return reply.send({ profile: publicProfile(profile!) });
  });

  app.delete('/profile/public', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const [profile] = await db
      .update(publicPlayerProfiles)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(publicPlayerProfiles.userId, request.user!.id))
      .returning({ id: publicPlayerProfiles.id });
    if (!profile) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'The resource does not exist' },
      });
    }
    await db.insert(auditLogs).values({
      actorId: request.user!.id,
      action: 'profile.public.revoked',
      resourceType: 'public_player_profile',
      resourceId: profile.id,
    });
    return reply.status(204).send();
  });

  app.get('/players/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const [profile] = await db
      .select()
      .from(publicPlayerProfiles)
      .where(and(eq(publicPlayerProfiles.slug, slug), eq(publicPlayerProfiles.isPublished, true)))
      .limit(1);
    if (!profile) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'The resource does not exist' },
      });
    }
    return reply.send({ player: publicProfile(profile) });
  });
}
