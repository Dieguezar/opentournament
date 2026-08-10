'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';

interface TeamView {
  id: string;
  name: string;
}

interface MatchView {
  id: string;
  status: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

export function ReportPanel({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      apiClient<{ teams: TeamView[] }>('/teams/mine'),
      apiClient<{ matches: MatchView[] }>(`/tournaments/${tournamentId}/matches`),
    ])
      .then(([teamsRes, matchesRes]) => {
        setTeams(teamsRes.teams);
        setMatches(matchesRes.matches);
      })
      .catch(() => undefined);
  }, [tournamentId]);

  const myTeamIds = new Set(teams.map((t) => t.id));
  const myMatches = matches.filter(
    (m) =>
      (m.homeTeamId && myTeamIds.has(m.homeTeamId)) ||
      (m.awayTeamId && myTeamIds.has(m.awayTeamId)),
  );
  const reportable = myMatches.filter((m) => m.status === 'scheduled' || m.status === 'in_progress');

  async function report(match: MatchView) {
    setError(null);
    const isHome = match.homeTeamId !== null && myTeamIds.has(match.homeTeamId);
    const winnerTeamId = isHome ? match.homeTeamId! : match.awayTeamId!;
    try {
      await apiClient(`/matches/${match.id}/results`, {
        method: 'POST',
        body: JSON.stringify({ winnerTeamId }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al reportar');
    }
  }

  async function openDispute(match: MatchView) {
    setError(null);
    try {
      await apiClient('/disputes', {
        method: 'POST',
        body: JSON.stringify({
          matchId: match.id,
          reason: 'captain_request',
          message: 'Solicito revisión del resultado de la partida.',
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al abrir la disputa');
    }
  }

  if (reportable.length === 0) return null;

  return (
    <div className="card">
      <h2>Mis partidas</h2>
      <ul>
        {reportable.map((match) => (
          <li key={match.id}>
            {match.homeTeam} vs {match.awayTeam}{' '}
            <button type="button" onClick={() => report(match)}>
              Reportar resultado (gana mi equipo)
            </button>{' '}
            <button type="button" className="button button-secondary" onClick={() => openDispute(match)}>
              Abrir disputa
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
