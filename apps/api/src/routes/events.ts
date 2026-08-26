import type { FastifyInstance } from 'fastify';
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
    sseReply(reply, [`tournament:${tournament}`]);
  });

  app.get('/events', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const tournamentIds = request.user!.organizations.map((o) => o.id);
    sseReply(reply, [`user:${request.user!.id}`, ...tournamentIds.map((orgId) => `org:${orgId}`)]);
  });
}
