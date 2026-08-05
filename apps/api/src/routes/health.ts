import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/healthz', async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return reply.send({ status: 'ok', checks: { database: 'ok' } });
    } catch {
      return reply.status(503).send({ status: 'degraded', checks: { database: 'error' } });
    }
  });

  app.get('/readyz', async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return reply.send({ status: 'ready' });
    } catch {
      return reply.status(503).send({ status: 'not_ready' });
    }
  });
}
