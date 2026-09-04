import { and, eq, isNotNull, isNull, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { tournaments } from '@opentournament/database';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { sseReply } from '../services/realtime.js';

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  app.get('/events/public', async (request, reply) => {
    const { tournament } = request.query as { tournament?: string };
    if (!tournament) {
      return reply.status(400).send({
        error: { code: 'MISSING_TOURNAMENT', message: 'The tournament parameter is required' },
      });
    }
    const identifier = uuidPattern.test(tournament)
      ? or(eq(tournaments.slug, tournament), eq(tournaments.id, tournament))
      : eq(tournaments.slug, tournament);
    const [publicTournament] = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(
        and(
          identifier,
          eq(tournaments.visibility, 'public'),
          isNotNull(tournaments.publishedAt),
          isNull(tournaments.deletedAt),
        ),
      )
      .limit(1);
    if (!publicTournament) {
      return reply
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .status(404)
        .send({
          error: { code: 'NOT_FOUND', message: 'The resource does not exist' },
        });
    }
    sseReply(reply, [`tournament:${publicTournament.id}`], { publicOverlayInvalidations: true });
  });

  app.get('/events', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const tournamentIds = request.user!.organizations.map((o) => o.id);
    sseReply(reply, [`user:${request.user!.id}`, ...tournamentIds.map((orgId) => `org:${orgId}`)]);
  });
}
