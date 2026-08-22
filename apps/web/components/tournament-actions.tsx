'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';
import { canGenerateBracket } from '@/lib/presentation';

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

  async function cancel() {
    if (!window.confirm('¿Seguro que quieres cancelar este torneo?')) return;
    await run(`/tournaments/${tournamentId}/cancel`, 'Cancelar');
  }

  return (
    <div className="actions">
      {status === 'draft' && (
        <button type="button" disabled={busy} onClick={() => run(`/tournaments/${tournamentId}/publish`, 'Publicar')}>
          Publicar torneo
        </button>
      )}
      {canGenerateBracket(status) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(`/tournaments/${tournamentId}/bracket/generate`, 'Generar bracket')}
        >
          Generar bracket
        </button>
      )}
      {!['draft', 'finalized', 'cancelled'].includes(status) && (
        <button type="button" className="button button-secondary" disabled={busy} onClick={cancel}>
          Cancelar torneo
        </button>
      )}
      {error && <span className="error" role="alert"> {error}</span>}
    </div>
  );
}
