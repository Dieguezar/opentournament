import { randomBytes, timingSafeEqual } from 'node:crypto';

export function generateCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export function csrfTokensMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
