import { randomBytes, createHash } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { Db } from '@opentournament/database';
import { sessions } from '@opentournament/database';

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createSession(
  db: Db,
  userId: string,
  ttlHours: number,
  options: { participantAccessPassId?: string; expiresAtLimit?: Date } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const ttlExpiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const expiresAt =
    options.expiresAtLimit && options.expiresAtLimit < ttlExpiresAt
      ? options.expiresAtLimit
      : ttlExpiresAt;
  await db.insert(sessions).values({
    userId,
    participantAccessPassId: options.participantAccessPassId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function findSessionByToken(
  db: Db,
  token: string,
): Promise<{
  userId: string;
  participantAccessPassId: string | null;
  expiresAt: Date;
} | null> {
  const tokenHash = hashSessionToken(token);
  const [row] = await db
    .select({
      userId: sessions.userId,
      participantAccessPassId: sessions.participantAccessPassId,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
}
