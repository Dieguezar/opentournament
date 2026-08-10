'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';

export function DisputeMessageForm({ disputeId }: { disputeId: string }) {
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
      setError(err instanceof ApiClientError ? err.message : 'Error');
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor={`message-${disputeId}`}>Mensaje</label>
      <textarea
        id={`message-${disputeId}`}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit">Enviar</button>
    </form>
  );
}
