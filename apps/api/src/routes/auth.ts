import { randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  buildDiscordAuthorizationUrl,
  createSession,
  deleteSession,
  exchangeDiscordCode,
  fetchDiscordUser,
  generateCsrfToken,
  generateResetToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from '@opentournament/auth';
import {
  auditLogs,
  emailVerificationTokens,
  identities,
  participantAccessPasses,
  passwordResetTokens,
  sessions,
  teams,
  tournaments,
  users,
} from '@opentournament/database';
import {
  exchangeParticipantAccessPassSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@opentournament/validation';
import { env } from '../config.js';
import { db } from '../db.js';
import { sendMail } from '../mailer.js';
import { requireAuth, setSessionCookies } from '../plugins/auth.js';

async function createSessionForUser(reply: FastifyReply, userId: string) {
  const { token, expiresAt } = await createSession(db, userId, env.SESSION_TTL_HOURS);
  setSessionCookies(reply, token, expiresAt);
  return { sessionStarted: true };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/auth/register',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = registerSchema.parse(request.body);
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);
      if (existing.length > 0) {
        return reply.status(409).send({
          error: { code: 'EMAIL_TAKEN', message: 'Ya existe una cuenta con ese correo' },
        });
      }

      const verified = env.ALLOW_UNVERIFIED_EMAILS;
      const passwordHash = await hashPassword(body.password);
      const [user] = await db
        .insert(users)
        .values({
          email: body.email,
          passwordHash,
          displayName: body.displayName,
          emailVerifiedAt: verified ? new Date() : null,
        })
        .returning();
      if (!user) {
        return reply.status(500).send({
          error: { code: 'REGISTER_FAILED', message: 'The account could not be created' },
        });
      }

      if (!verified) {
        const resetToken = generateResetToken();
        await db.insert(emailVerificationTokens).values({
          userId: user.id,
          tokenHash: hashSessionToken(resetToken),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await sendMail({
          to: body.email,
          subject: 'Verifica tu correo en OpenTournament',
          text: `Your verification link (valid for 24 hours): ${env.API_URL}/api/v1/auth/verify?token=${resetToken}`,
        });
      }

      if (verified) await createSessionForUser(reply, user.id);
      await db.insert(auditLogs).values({
        actorId: user.id,
        action: 'auth.register',
        resourceType: 'user',
        resourceId: user.id,
      });
      return reply.status(201).send({
        user: { id: user.id, email: user.email },
        requiresEmailVerification: !verified,
      });
    },
  );

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, body.email), isNull(users.deletedAt)))
        .limit(1);

      if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, body.password))) {
        return reply.status(401).send({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'The email address or password is incorrect',
          },
        });
      }
      if (!user.emailVerifiedAt && !env.ALLOW_UNVERIFIED_EMAILS) {
        return reply.status(403).send({
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Debes verificar tu correo antes de ingresar',
          },
        });
      }

      await createSessionForUser(reply, user.id);
      await db.insert(auditLogs).values({
        actorId: user.id,
        action: 'auth.login',
        resourceType: 'user',
        resourceId: user.id,
      });
      return reply.send({ user: { id: user.id, email: user.email } });
    },
  );

  app.post('/auth/logout', async (request, reply) => {
    if (request.sessionToken) {
      await deleteSession(db, request.sessionToken);
    }
    reply.clearCookie('session', { path: '/' });
    return reply.status(204).send();
  });

  app.post(
    '/auth/participant-pass',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = exchangeParticipantAccessPassSchema.parse(request.body);
      const [accessPass] = await db
        .select({
          id: participantAccessPasses.id,
          tournamentId: participantAccessPasses.tournamentId,
          teamId: participantAccessPasses.teamId,
          actorUserId: participantAccessPasses.actorUserId,
          expiresAt: participantAccessPasses.expiresAt,
          tournamentSlug: tournaments.slug,
          tournamentName: tournaments.name,
          teamName: teams.name,
          teamTag: teams.tag,
        })
        .from(participantAccessPasses)
        .innerJoin(tournaments, eq(tournaments.id, participantAccessPasses.tournamentId))
        .innerJoin(teams, eq(teams.id, participantAccessPasses.teamId))
        .where(
          and(
            eq(participantAccessPasses.tokenHash, hashSessionToken(body.token)),
            isNull(participantAccessPasses.revokedAt),
            gt(participantAccessPasses.expiresAt, new Date()),
            isNull(tournaments.deletedAt),
            isNull(teams.deletedAt),
          ),
        )
        .limit(1);
      if (!accessPass) {
        return reply.status(401).send({
          error: {
            code: 'INVALID_PARTICIPANT_PASS',
            message: 'The participant pass is invalid or expired',
          },
        });
      }

      const { token, expiresAt } = await createSession(
        db,
        accessPass.actorUserId,
        env.SESSION_TTL_HOURS,
        {
          participantAccessPassId: accessPass.id,
          expiresAtLimit: accessPass.expiresAt,
        },
      );
      setSessionCookies(reply, token, expiresAt);
      await db
        .update(participantAccessPasses)
        .set({ lastUsedAt: new Date() })
        .where(eq(participantAccessPasses.id, accessPass.id));
      await db.insert(auditLogs).values({
        actorId: accessPass.actorUserId,
        action: 'participant_access_pass.exchanged',
        resourceType: 'participant_access_pass',
        resourceId: accessPass.id,
        after: { tournamentId: accessPass.tournamentId, teamId: accessPass.teamId },
      });

      return reply.send({
        tournament: {
          id: accessPass.tournamentId,
          slug: accessPass.tournamentSlug,
          name: accessPass.tournamentName,
        },
        team: {
          id: accessPass.teamId,
          name: accessPass.teamName,
          tag: accessPass.teamTag,
        },
      });
    },
  );

  app.get('/auth/me', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    return reply.send({ user: request.user, participantAccess: request.participantAccess ?? null });
  });

  app.get('/auth/csrf', async (request, reply) => {
    let token = request.cookies.csrf;
    if (!token) {
      token = generateCsrfToken();
      reply.setCookie('csrf', token, {
        httpOnly: false,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        path: '/',
      });
    }
    return reply.send({ token });
  });

  app.get('/auth/verify', async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_VERIFICATION_TOKEN',
          message: 'The verification link is invalid or expired',
        },
      });
    }

    const verifiedAt = new Date();
    const verifiedUserId = await db.transaction(async (transaction) => {
      const [verification] = await transaction
        .update(emailVerificationTokens)
        .set({ usedAt: verifiedAt })
        .where(
          and(
            eq(emailVerificationTokens.tokenHash, hashSessionToken(token)),
            isNull(emailVerificationTokens.usedAt),
            gt(emailVerificationTokens.expiresAt, verifiedAt),
          ),
        )
        .returning({ userId: emailVerificationTokens.userId });
      if (!verification) return null;

      await transaction
        .update(users)
        .set({ emailVerifiedAt: verifiedAt })
        .where(eq(users.id, verification.userId));
      await transaction
        .update(emailVerificationTokens)
        .set({ usedAt: verifiedAt })
        .where(
          and(
            eq(emailVerificationTokens.userId, verification.userId),
            isNull(emailVerificationTokens.usedAt),
          ),
        );
      await transaction.insert(auditLogs).values({
        actorId: verification.userId,
        action: 'auth.email_verified',
        resourceType: 'user',
        resourceId: verification.userId,
      });
      return verification.userId;
    });
    if (!verifiedUserId) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_VERIFICATION_TOKEN',
          message: 'The verification link is invalid or expired',
        },
      });
    }

    return reply.redirect(`${env.APP_URL}/login?verified=1`);
  });

  app.post('/auth/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.email, body.email), isNull(users.deletedAt)))
      .limit(1);

    if (user) {
      const resetToken = generateResetToken();
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashSessionToken(resetToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await sendMail({
        to: body.email,
        subject: 'Reset your OpenTournament password',
        text: `Your password reset link (valid for 1 hour): ${env.API_URL}/api/v1/auth/reset-password?token=${resetToken}`,
      });
    }
    // Keep the response generic so it does not reveal whether the email exists.
    return reply.send({ ok: true });
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);
    const tokenHash = hashSessionToken(body.token);
    const [reset] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)))
      .limit(1);

    if (!reset || reset.expiresAt < new Date()) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'The password reset link is invalid or expired',
        },
      });
    }

    const passwordHash = await hashPassword(body.password);
    await db.update(users).set({ passwordHash }).where(eq(users.id, reset.userId));
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, reset.id));
    await db.delete(sessions).where(eq(sessions.userId, reset.userId));
    await db.insert(auditLogs).values({
      actorId: reset.userId,
      action: 'auth.password_reset',
      resourceType: 'user',
      resourceId: reset.userId,
    });
    return reply.send({ ok: true });
  });

  app.get('/auth/discord', async (_request, reply) => {
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_REDIRECT_URI) {
      return reply.status(503).send({
        error: { code: 'DISCORD_NOT_CONFIGURED', message: 'Discord OAuth is not configured' },
      });
    }
    const state = randomBytes(16).toString('hex');
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    });
    return reply.redirect(
      buildDiscordAuthorizationUrl({
        clientId: env.DISCORD_CLIENT_ID,
        redirectUri: env.DISCORD_REDIRECT_URI,
        state,
      }),
    );
  });

  app.get('/auth/discord/callback', async (request, reply) => {
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_REDIRECT_URI) {
      return reply.status(503).send({
        error: { code: 'DISCORD_NOT_CONFIGURED', message: 'Discord OAuth is not configured' },
      });
    }
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code || !state || state !== request.cookies.oauth_state) {
      return reply.status(400).send({
        error: { code: 'DISCORD_OAUTH_STATE', message: 'The OAuth parameters are invalid' },
      });
    }

    const { accessToken } = await exchangeDiscordCode({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      code,
      redirectUri: env.DISCORD_REDIRECT_URI,
    });
    const discordUser = await fetchDiscordUser(accessToken);
    reply.clearCookie('oauth_state', { path: '/' });

    const [existingIdentity] = await db
      .select({ userId: identities.userId })
      .from(identities)
      .where(and(eq(identities.provider, 'discord'), eq(identities.providerSub, discordUser.id)))
      .limit(1);

    let userId: string;
    if (existingIdentity) {
      userId = existingIdentity.userId;
    } else {
      const verifiedEmail = discordUser.verified ? discordUser.email?.toLowerCase() : undefined;
      const [userByEmail] = verifiedEmail
        ? await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.email, verifiedEmail), isNull(users.deletedAt)))
            .limit(1)
        : [];

      if (userByEmail) {
        userId = userByEmail.id;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            email: verifiedEmail ?? null,
            displayName: discordUser.username,
            emailVerifiedAt: discordUser.verified ? new Date() : null,
          })
          .returning({ id: users.id });
        if (!created) {
          return reply.status(500).send({
            error: {
              code: 'DISCORD_LINK_FAILED',
              message: 'The user account could not be created',
            },
          });
        }
        userId = created.id;
      }
      await db.insert(identities).values({
        userId,
        provider: 'discord',
        providerSub: discordUser.id,
        providerEmail: verifiedEmail ?? null,
      });
    }

    const { token, expiresAt } = await createSession(db, userId, env.SESSION_TTL_HOURS);
    setSessionCookies(reply, token, expiresAt);
    await db.insert(auditLogs).values({
      actorId: userId,
      action: 'auth.discord_login',
      resourceType: 'user',
      resourceId: userId,
    });
    return reply.redirect(`${env.APP_URL}/dashboard`);
  });
}
