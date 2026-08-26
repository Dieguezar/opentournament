'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';

export function DisputeMessageForm({ disputeId }: { disputeId: string }) {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.disputes;
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiClient(`/disputes/${disputeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setBody('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError && locale === 'es' ? err.message : copy.actionError);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor={`message-${disputeId}`}>{copy.message}</label>
      <textarea
        id={`message-${disputeId}`}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit">{copy.send}</button>
    </form>
  );
}
