import Fastify from 'fastify';
import { db } from './db.js';
import { registerCorePlugins } from './plugins/core.js';
import { registerAuthPlugins } from './plugins/auth.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerOrganizationRoutes } from './routes/organizations.js';
import { registerHealthRoutes } from './routes/health.js';

export function buildServer(options: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
    trustProxy: true,
  });
  return app;
}

export async function initServer(logger = true) {
  const app = buildServer({ logger });
  await registerCorePlugins(app);
  await registerAuthPlugins(app, db);
  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerOrganizationRoutes(app);
  return app;
}
