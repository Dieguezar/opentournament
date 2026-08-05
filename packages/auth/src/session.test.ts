import { describe, expect, it } from 'vitest';
import { generateSessionToken, hashSessionToken } from './session.js';
import { csrfTokensMatch, generateCsrfToken } from './csrf.js';

describe('session tokens', () => {
  it('genera tokens únicos y los hashea de forma estable', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(hashSessionToken(a)).toBe(hashSessionToken(a));
    expect(hashSessionToken(a)).not.toBe(hashSessionToken(b));
  });
});

describe('csrf', () => {
  it('valida tokens coincidentes y rechaza distintos', () => {
    const token = generateCsrfToken();
    expect(csrfTokensMatch(token, token)).toBe(true);
    expect(csrfTokensMatch(token, 'otro')).toBe(false);
    expect(csrfTokensMatch(undefined, token)).toBe(false);
  });
});
