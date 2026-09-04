import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { tournaments } from '@opentournament/database';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { sseReply } from '../services/realtime.js';

export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  app.get('/events/public', async (request, reply) => {
    const { tournament } = request.query as { tournament?: string };
    if (!tournament) {
      return reply.status(400).send({
        error: { code: 'MISSING_TOURNAMENT', message: 'The tournament parameter is required' },
      });
    }
    const [publicTournament] = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(
        and(
          eq(tournaments.slug, tournament),
          eq(tournaments.visibility, 'public'),
          isNotNull(tournaments.publishedAt),
          isNull(tournaments.deletedAt),
        ),
      )
      .limit(1);
    if (!publicTournament) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'The resource does not exist' },
      });
    }
    sseReply(reply, [`tournament:${publicTournament.id}`], { publicInvalidations: true });
  });

  app.get('/events', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const tournamentIds = request.user!.organizations.map((o) => o.id);
    sseReply(reply, [`user:${request.user!.id}`, ...tournamentIds.map((orgId) => `org:${orgId}`)]);
  });
}
