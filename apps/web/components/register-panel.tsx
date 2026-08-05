'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';

interface TeamView {
  id: string;
  name: string;
}

export function RegisterPanel({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [teamId, setTeamId] = useState('');
  const [registered, setRegistered] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient<{ teams: TeamView[] }>('/teams/mine')
      .then((data) => {
        setTeams(data.teams);
        setTeamId(data.teams[0]?.id ?? '');
      })
      .catch(() => undefined);
  }, []);

  async function register() {
    if (!teamId) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/tournaments/${tournamentId}/registrations`, {
        method: 'POST',
        body: JSON.stringify({ teamId }),
      });
      setRegistered(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'error');
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    if (!teamId) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/tournaments/${tournamentId}/check-in`, {
        method: 'POST',
        body: JSON.stringify({ teamId }),
      });
      setCheckedIn(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Participar</h2>
      {teams.length === 0 ? (
        <p className="muted">
          Crea un equipo primero:{' '}
          <a href="/teams/new">Crear equipo</a>
        </p>
      ) : (
        <>
          <label htmlFor="team">Equipo</label>
          <select id="team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {!registered && (
            <button type="button" disabled={busy} onClick={register}>
              Inscribir equipo
            </button>
          )}
          {registered && !checkedIn && (
            <button type="button" disabled={busy} onClick={checkIn}>
              Check-in del equipo
            </button>
          )}
          {checkedIn && <p>✓ Check-in confirmado</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}
