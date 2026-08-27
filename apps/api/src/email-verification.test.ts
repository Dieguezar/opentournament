import { describe, expect, it } from 'vitest';
import { EMAIL_VERIFICATION_TTL_MS, buildEmailVerificationMessage } from './email-verification.js';

describe('email verification messages', () => {
  it('keeps verification tokens valid for exactly 24 hours', () => {
    expect(EMAIL_VERIFICATION_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('builds Spanish verification mail without changing the private link', () => {
    const link = 'https://example.test/api/v1/auth/verify?token=private-token';

    expect(buildEmailVerificationMessage('es', link)).toEqual({
      subject: 'Verificá tu correo en OpenTournament',
      text: `Tu enlace de verificación (válido durante 24 horas): ${link}`,
    });
  });

  it('builds English verification mail without changing the private link', () => {
    const link = 'https://example.test/api/v1/auth/verify?token=private-token';

    expect(buildEmailVerificationMessage('en', link)).toEqual({
      subject: 'Verify your email in OpenTournament',
      text: `Your verification link (valid for 24 hours): ${link}`,
    });
  });
});
