'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
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
      setError(err instanceof ApiClientError ? err.message : 'Error');
    }
  }

  if (!homeTeamId || !awayTeamId) {
    return <p className="muted">La resolución estará disponible cuando ambos participantes estén asignados.</p>;
  }

  return (
    <form onSubmit={onSubmit}>
      <h3>Resolver disputa</h3>
      <label htmlFor="winner">Ganador</label>
      <select id="winner" value={winnerTeamId} onChange={(e) => setWinnerTeamId(e.target.value)}>
        <option value="">— Sin ganador (empate) —</option>
        <option value={homeTeamId}>{homeName}</option>
        <option value={awayTeamId}>{awayName}</option>
      </select>
      <label htmlFor="rationale">Motivo (mínimo 10 caracteres)</label>
      <textarea
        id="rationale"
        rows={4}
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        required
        minLength={10}
      />
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit">Registrar resolución</button>
    </form>
  );
}
