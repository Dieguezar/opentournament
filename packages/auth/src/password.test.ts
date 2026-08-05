import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashea y verifica una contraseña correcta', async () => {
    const hash = await hashPassword('supersecreto');
    expect(hash).not.toContain('supersecreto');
    await expect(verifyPassword(hash, 'supersecreto')).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('supersecreto');
    await expect(verifyPassword(hash, 'otra')).resolves.toBe(false);
  });
});
