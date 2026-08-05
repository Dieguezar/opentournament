'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';

export function TournamentActions({
  tournamentId,
  status,
}: {
  tournamentId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string, label: string) {
    setBusy(true);
    setError(null);
    try {
      await apiClient(path, { method: 'POST' });
      router.refresh();
    } catch (err) {
      setError(`${label}: ${err instanceof ApiClientError ? err.message : 'error'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <p>
      {status === 'draft' && (
        <button type="button" disabled={busy} onClick={() => run(`/tournaments/${tournamentId}/publish`, 'Publicar')}>
          Publicar torneo
        </button>
      )}{' '}
      {(status === 'open' || status === 'in_progress') && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(`/tournaments/${tournamentId}/bracket/generate`, 'Generar bracket')}
        >
          Generar bracket
        </button>
      )}
      {error && <span className="error" role="alert"> {error}</span>}
    </p>
  );
}
