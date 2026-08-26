import { describe, expect, it } from 'vitest';
import { generateSessionToken, hashSessionToken } from './session.js';
import { csrfTokensMatch, generateCsrfToken } from './csrf.js';

describe('session tokens', () => {
  it('generates unique tokens and hashes them consistently', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(hashSessionToken(a)).toBe(hashSessionToken(a));
    expect(hashSessionToken(a)).not.toBe(hashSessionToken(b));
  });
});

describe('csrf', () => {
  it('accepts matching tokens and rejects different tokens', () => {
    const token = generateCsrfToken();
    expect(csrfTokensMatch(token, token)).toBe(true);
    expect(csrfTokensMatch(token, 'otro')).toBe(false);
    expect(csrfTokensMatch(undefined, token)).toBe(false);
  });
});
