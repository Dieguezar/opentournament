import type { SessionUser } from '@opentournament/shared-types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
    sessionToken?: string;
  }
}
