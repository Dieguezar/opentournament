'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';

interface ResendVerificationButtonProps {
  email: string;
}

interface ResendVerificationResponse {
  ok: true;
  verificationDelivery: 'smtp' | 'console';
}

export function ResendVerificationButton({ email }: ResendVerificationButtonProps) {
  const { dictionary } = useI18n();
  const copy = dictionary.secondaryFlows;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function resendVerification() {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await apiClient<ResendVerificationResponse>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccessMessage(
        result.verificationDelivery === 'console'
          ? copy.verificationResendConsoleSuccess
          : copy.verificationResendSmtpSuccess,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError ? error.message : copy.verificationResendError,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <button type="button" disabled={isSubmitting} onClick={resendVerification}>
        {isSubmitting ? copy.verificationResending : copy.verificationResend}
      </button>
      {successMessage && <p role="status">{successMessage}</p>}
      {errorMessage && (
        <p className="error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
