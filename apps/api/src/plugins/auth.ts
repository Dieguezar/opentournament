import cookie from '@fastify/cookie';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { csrfTokensMatch, findSessionByToken } from '@opentournament/auth';
import {
  organizationMembers,
  organizations,
  participantAccessPasses,
  teams,
  tournaments,
  users,
  type Db,
} from '@opentournament/database';
import type { SessionUser, OrgRole } from '@opentournament/shared-types';
import { env } from '../config.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PATHS = new Set(['/api/v1/discord/interactions']);

export async function registerAuthPlugins(app: FastifyInstance, db: Db): Promise<void> {
  await app.register(cookie);

  app.addHook('preHandler', async (request, reply) => {
    const token = request.cookies.session;
    if (!token) return;
    const session = await findSessionByToken(db, token);
    if (!session) {
      reply.clearCookie('session', { path: '/' });
      return;
    }
    if (session.participantAccessPassId) {
      const [participantAccess] = await db
        .select({
          id: participantAccessPasses.id,
          tournamentId: participantAccessPasses.tournamentId,
          tournamentSlug: tournaments.slug,
          tournamentName: tournaments.name,
          teamId: participantAccessPasses.teamId,
          teamName: teams.name,
          teamTag: teams.tag,
        })
        .from(participantAccessPasses)
        .innerJoin(tournaments, eq(tournaments.id, participantAccessPasses.tournamentId))
        .innerJoin(teams, eq(teams.id, participantAccessPasses.teamId))
        .where(
          and(
            eq(participantAccessPasses.id, session.participantAccessPassId),
            eq(participantAccessPasses.actorUserId, session.userId),
            isNull(participantAccessPasses.revokedAt),
            gt(participantAccessPasses.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!participantAccess) {
        reply.clearCookie('session', { path: '/' });
        return;
      }
      request.participantAccess = participantAccess;
    }
    request.sessionToken = token;
    const user = await loadSessionUser(db, session.userId);
    if (user) request.user = user;
  });

  app.addHook('preHandler', async (request, reply) => {
    if (!MUTATING_METHODS.has(request.method)) return;
    const requestPath = request.url.split('?', 1)[0];
    if (requestPath && CSRF_EXEMPT_PATHS.has(requestPath)) return;
    const cookieToken = request.cookies.csrf;
    const headerToken = request.headers['x-csrf-token'];
    if (typeof headerToken !== 'string' || !csrfTokensMatch(cookieToken, headerToken)) {
      return reply.status(403).send({
        error: { code: 'CSRF_INVALID', message: 'Token CSRF inválido o ausente' },
      });
    }
  });
}

export async function loadSessionUser(db: Db, userId: string): Promise<SessionUser | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!user) return null;

  const memberships = await db
    .select({
      organizationId: organizationMembers.organizationId,
      slug: organizations.slug,
      name: organizations.name,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), isNull(organizations.deletedAt)));

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    emailVerified: Boolean(user.emailVerifiedAt),
    organizations: memberships.map((m) => ({
      id: m.organizationId,
      slug: m.slug,
      name: m.name,
      role: m.role as OrgRole,
    })),
  };
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!request.user) {
    reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Se requiere iniciar sesión' },
    });
    return false;
  }
  return true;
}

export function setSessionCookies(reply: FastifyReply, token: string, expiresAt: Date): void {
  const secure = env.NODE_ENV === 'production';
  reply.setCookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    expires: expiresAt,
  });
}
