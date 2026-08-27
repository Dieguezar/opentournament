export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

interface VerificationMessage {
  subject: string;
  text: string;
}

export function buildEmailVerificationMessage(
  locale: string,
  verificationLink: string,
): VerificationMessage {
  if (locale === 'en') {
    return {
      subject: 'Verify your email in OpenTournament',
      text: `Your verification link (valid for 24 hours): ${verificationLink}`,
    };
  }

  return {
    subject: 'Verificá tu correo en OpenTournament',
    text: `Tu enlace de verificación (válido durante 24 horas): ${verificationLink}`,
  };
}
