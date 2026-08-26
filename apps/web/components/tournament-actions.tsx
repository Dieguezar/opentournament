'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';
import { canGenerateBracket } from '@/lib/presentation';

export function TournamentActions({
  tournamentId,
  status,
}: {
  tournamentId: string;
  status: string;
}) {
  const { dictionary } = useI18n();
  const copy = dictionary.adminActions;
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
      const message = err instanceof ApiClientError ? err.message : copy.actionError;
      setError(`${label}: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm(copy.cancelConfirmation)) return;
    await run(`/tournaments/${tournamentId}/cancel`, copy.cancel);
  }

  return (
    <div className="actions">
      {status === 'draft' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(`/tournaments/${tournamentId}/publish`, copy.publish)}
        >
          {copy.publishTournament}
        </button>
      )}
      {canGenerateBracket(status) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(`/tournaments/${tournamentId}/bracket/generate`, copy.generateBracket)}
        >
          {copy.generateBracket}
        </button>
      )}
      {!['draft', 'finalized', 'cancelled'].includes(status) && (
        <button type="button" className="button button-secondary" disabled={busy} onClick={cancel}>
          {copy.cancelTournament}
        </button>
      )}
      {error && (
        <span className="error" role="alert">
          {' '}
          {error}
        </span>
      )}
    </div>
  );
}
