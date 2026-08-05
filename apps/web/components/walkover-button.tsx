'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';

export function WalkoverButton({
  matchId,
  homeTeamId,
  awayTeamId,
  homeName,
  awayName,
}: {
  matchId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeName: string | null;
  awayName: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function walkover(winnerTeamId: string) {
    setError(null);
    try {
      await apiClient(`/matches/${matchId}/walkover`, {
        method: 'POST',
        body: JSON.stringify({ winnerTeamId }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'error');
    }
  }

  if (!homeTeamId || !awayTeamId) return null;
  return (
    <span>
      {' '}
      <button type="button" className="button button-secondary" onClick={() => walkover(homeTeamId!)}>
        WO: {homeName}
      </button>{' '}
      <button type="button" className="button button-secondary" onClick={() => walkover(awayTeamId!)}>
        WO: {awayName}
      </button>
      {error && <span className="error" role="alert"> {error}</span>}
    </span>
  );
}
