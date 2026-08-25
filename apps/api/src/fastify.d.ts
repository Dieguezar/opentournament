import type { SessionUser } from '@opentournament/shared-types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
    participantAccess?: {
      id: string;
      tournamentId: string;
      teamId: string;
    };
    sessionToken?: string;
    rawBody?: string;
  }
}
