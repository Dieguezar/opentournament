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
  const [winners, setWinners] = useState<Record<string, string>>({});
  const [homeScores, setHomeScores] = useState<Record<string, string>>({});
  const [awayScores, setAwayScores] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
  const reportable = matches.filter(
    (m) =>
      (m.status === 'scheduled' || m.status === 'in_progress') &&
      ((m.homeTeamId && myTeamIds.has(m.homeTeamId)) ||
        (m.awayTeamId && myTeamIds.has(m.awayTeamId))),
  );

  async function report(match: MatchView) {
    setBusy(match.id);
    setError(null);
    try {
      await apiClient(`/matches/${match.id}/results`, {
        method: 'POST',
        body: JSON.stringify({
          winnerTeamId: winners[match.id] || null,
          homeScore: homeScores[match.id] ? Number(homeScores[match.id]) : undefined,
          awayScore: awayScores[match.id] ? Number(awayScores[match.id]) : undefined,
        }),
      });
      setMessages((prev) => ({
        ...prev,
        [match.id]: 'Reporte enviado. Esperando la confirmación del rival…',
      }));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al reportar');
    } finally {
      setBusy(null);
    }
  }

  async function openDispute(match: MatchView) {
    setBusy(match.id);
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
      setMessages((prev) => ({ ...prev, [match.id]: 'Disputa abierta. El staff la revisará.' }));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al abrir la disputa');
    } finally {
      setBusy(null);
    }
  }

  if (reportable.length === 0) return null;

  return (
    <div className="card">
      <h2>Mis partidas</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {reportable.map((match) => {
          const isHome = match.homeTeamId !== null && myTeamIds.has(match.homeTeamId);
          const defaultWinner = isHome ? match.homeTeamId! : match.awayTeamId!;
          return (
            <li key={match.id} style={{ marginBottom: '1rem' }}>
              <strong>
                {match.homeTeam} vs {match.awayTeam}
              </strong>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <select
                  aria-label="Ganador"
                  value={winners[match.id] ?? defaultWinner}
                  onChange={(e) =>
                    setWinners((prev) => ({ ...prev, [match.id]: e.target.value }))
                  }
                >
                  {match.homeTeam && (
                    <option value={match.homeTeamId!}>{match.homeTeam}</option>
                  )}
                  {match.awayTeam && (
                    <option value={match.awayTeamId!}>{match.awayTeam}</option>
                  )}
                </select>
                <input
                  aria-label="Puntos del equipo local"
                  placeholder="Pts local"
                  inputMode="numeric"
                  style={{ width: 90 }}
                  value={homeScores[match.id] ?? ''}
                  onChange={(e) =>
                    setHomeScores((prev) => ({ ...prev, [match.id]: e.target.value }))
                  }
                />
                <input
                  aria-label="Puntos del equipo visitante"
                  placeholder="Pts visitante"
                  inputMode="numeric"
                  style={{ width: 100 }}
                  value={awayScores[match.id] ?? ''}
                  onChange={(e) =>
                    setAwayScores((prev) => ({ ...prev, [match.id]: e.target.value }))
                  }
                />
                <button type="button" disabled={busy === match.id} onClick={() => report(match)}>
                  {busy === match.id ? '…' : 'Reportar resultado'}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy === match.id}
                  onClick={() => openDispute(match)}
                >
                  Abrir disputa
                </button>
              </div>
              {messages[match.id] && <p className="muted">{messages[match.id]}</p>}
            </li>
          );
        })}
      </ul>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
