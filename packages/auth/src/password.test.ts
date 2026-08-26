import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('supersecreto');
    expect(hash).not.toContain('supersecreto');
    await expect(verifyPassword(hash, 'supersecreto')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('supersecreto');
    await expect(verifyPassword(hash, 'otra')).resolves.toBe(false);
  });
});
