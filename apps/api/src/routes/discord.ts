import type { FastifyInstance } from 'fastify';
import { env } from '../config.js';
import { db } from '../db.js';
import { handleInteraction, verifyDiscordRequest } from '../services/discord.js';

export async function registerDiscordRoutes(app: FastifyInstance): Promise<void> {
  app.post('/discord/interactions', async (request, reply) => {
    if (!env.DISCORD_PUBLIC_KEY) {
      return reply.status(503).send({
        error: { code: 'DISCORD_NOT_CONFIGURED', message: 'Discord bot no configurado' },
      });
    }
    const signature = request.headers['x-signature-ed25519'];
    const timestamp = request.headers['x-signature-timestamp'];
    if (
      typeof signature !== 'string' ||
      typeof timestamp !== 'string' ||
      !verifyDiscordRequest(env.DISCORD_PUBLIC_KEY, signature, timestamp, request.rawBody ?? '')
    ) {
      return reply.status(401).send({
        error: { code: 'INVALID_SIGNATURE', message: 'The request signature is invalid' },
      });
    }
    return reply.send(await handleInteraction(db, request.body as Record<string, unknown>));
  });
}
