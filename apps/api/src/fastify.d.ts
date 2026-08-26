import type { SessionUser } from '@opentournament/shared-types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
    participantAccess?: {
      id: string;
      tournamentId: string;
      tournamentSlug: string;
      tournamentName: string;
      teamId: string;
      teamName: string;
      teamTag: string | null;
    };
    sessionToken?: string;
    rawBody?: string;
  }
}
