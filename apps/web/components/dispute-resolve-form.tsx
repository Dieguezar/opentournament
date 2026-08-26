'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';

export function DisputeResolveForm({
  disputeId,
  homeTeamId,
  awayTeamId,
  homeName,
  awayName,
}: {
  disputeId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeName: string | null;
  awayName: string | null;
}) {
  const { dictionary } = useI18n();
  const copy = dictionary.disputes;
  const router = useRouter();
  const [winnerTeamId, setWinnerTeamId] = useState('');
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiClient(`/disputes/${disputeId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ winnerTeamId: winnerTeamId || null, rationale }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : copy.actionError);
    }
  }

  if (!homeTeamId || !awayTeamId) {
    return <p className="muted">{copy.resolutionUnavailable}</p>;
  }

  return (
    <form onSubmit={onSubmit}>
      <h3>{copy.resolveDispute}</h3>
      <label htmlFor="winner">{copy.winner}</label>
      <select id="winner" value={winnerTeamId} onChange={(e) => setWinnerTeamId(e.target.value)}>
        <option value="">{copy.noWinner}</option>
        <option value={homeTeamId}>{homeName}</option>
        <option value={awayTeamId}>{awayName}</option>
      </select>
      <label htmlFor="rationale">{copy.rationale}</label>
      <textarea
        id="rationale"
        rows={4}
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        required
        minLength={10}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit">{copy.registerResolution}</button>
    </form>
  );
}
