import cookie from '@fastify/cookie';
import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { csrfTokensMatch, findSessionByToken, generateCsrfToken } from '@opentournament/auth';
import {
  organizationMembers,
  organizations,
  users,
  type Db,
} from '@opentournament/database';
import type { SessionUser, OrgRole } from '@opentournament/shared-types';
import { env } from '../config.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function registerAuthPlugins(app: FastifyInstance, db: Db): Promise<void> {
  await app.register(cookie);

  app.addHook('onSend', async (request, reply) => {
    if (!request.cookies.csrf) {
      reply.setCookie('csrf', generateCsrfToken(), {
        httpOnly: false,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        path: '/',
      });
    }
  });

  app.addHook('preHandler', async (request, reply) => {
    const token = request.cookies.session;
    if (!token) return;
    const session = await findSessionByToken(db, token);
    if (!session) {
      reply.clearCookie('session', { path: '/' });
      return;
    }
    request.sessionToken = token;
    const user = await loadSessionUser(db, session.userId);
    if (user) request.user = user;
  });

  app.addHook('preHandler', async (request, reply) => {
    if (!MUTATING_METHODS.has(request.method)) return;
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
    .where(
      and(eq(organizationMembers.userId, userId), isNull(organizations.deletedAt)),
    );

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

export function setSessionCookies(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
): void {
  const secure = env.NODE_ENV === 'production';
  reply.setCookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    expires: expiresAt,
  });
}
