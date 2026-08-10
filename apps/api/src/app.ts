import Fastify from 'fastify';
import { db } from './db.js';
import { registerCorePlugins } from './plugins/core.js';
import { registerAuthPlugins } from './plugins/auth.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerOrganizationRoutes } from './routes/organizations.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerTeamRoutes } from './routes/teams.js';
import { registerTournamentRoutes } from './routes/tournaments.js';
import { registerRegistrationRoutes } from './routes/registrations.js';
import { registerCheckInRoutes } from './routes/checkin.js';
import { registerBracketRoutes } from './routes/bracket.js';
import { registerMatchRoutes } from './routes/matches.js';
import { registerResultRoutes } from './routes/results.js';
import { registerEvidenceRoutes } from './routes/evidence.js';
import { registerDisputeRoutes } from './routes/disputes.js';
import { registerDiscordRoutes } from './routes/discord.js';
import { registerEventRoutes } from './routes/events.js';

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
  await app.register(
    async (api) => {
      await registerAuthRoutes(api);
      await registerOrganizationRoutes(api);
      await registerTeamRoutes(api);
      await registerTournamentRoutes(api);
      await registerRegistrationRoutes(api);
      await registerCheckInRoutes(api);
      await registerBracketRoutes(api);
      await registerMatchRoutes(api);
      await registerResultRoutes(api);
      await registerEvidenceRoutes(api);
      await registerDisputeRoutes(api);
      await registerDiscordRoutes(api);
      await registerEventRoutes(api);
    },
    { prefix: '/api/v1' },
  );
  return app;
}
