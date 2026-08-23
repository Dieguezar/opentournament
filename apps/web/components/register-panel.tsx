'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';

interface TeamEntry {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  registrationStatus: string | null;
  waitlistPosition: number | null;
  checkedIn: boolean | null;
}

interface MyTeam {
  id: string;
  name: string;
}

export function RegisterPanel({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<TeamEntry[]>([]);
  const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyTeam, setBusyTeam] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      apiClient<{ teams: TeamEntry[] }>(`/tournaments/${tournamentId}/teams`, {
        signal: controller.signal,
      }),
      apiClient<{ teams: MyTeam[] }>('/teams/mine', { signal: controller.signal }),
    ])
      .then(([entriesRes, teamsRes]) => {
        setEntries(entriesRes.teams);
        setMyTeams(teamsRes.teams);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [tournamentId]);

  async function run(teamId: string, path: string) {
    setBusyTeam(teamId);
    setError(null);
    try {
      await apiClient(path, { method: 'POST', body: JSON.stringify({ teamId }) });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error');
    } finally {
      setBusyTeam(null);
    }
  }

  if (myTeams.length === 0) {
    return (
      <div className="card">
        <h2>Participar</h2>
        <p className="muted">
          Para inscribirte necesitás un equipo. <Link href="/teams/new">Creá tu equipo</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Participar</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {myTeams.map((team) => {
          const entry = entries.find((e) => e.teamId === team.id);
          const busy = busyTeam === team.id;
          let action: ReactNode = null;
          let status: ReactNode = null;

          if (!entry) {
            status = <span className="badge">Sin inscripción</span>;
            action = (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(team.id, `/tournaments/${tournamentId}/registrations`)}
              >
                {busy ? 'Procesando' : 'Inscribir equipo'}
              </button>
            );
          } else if (entry.registrationStatus === 'pending') {
            status = <span className="badge badge-warn">Pendiente de aprobación</span>;
          } else if (entry.registrationStatus === 'waitlisted') {
            status = (
              <span className="badge badge-warn">
                En espera #{entry.waitlistPosition ?? '?'}
              </span>
            );
          } else if (entry.registrationStatus === 'rejected') {
            status = <span className="badge badge-danger">Rechazada</span>;
          } else if (entry.registrationStatus === 'cancelled') {
            status = <span className="badge">Cancelada</span>;
            action = (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(team.id, `/tournaments/${tournamentId}/registrations`)}
              >
                {busy ? 'Procesando' : 'Inscribir de nuevo'}
              </button>
            );
          } else if (!entry.checkedIn) {
            status = <span className="badge badge-success">Inscrito</span>;
            action = (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(team.id, `/tournaments/${tournamentId}/check-in`)}
              >
                {busy ? 'Procesando' : 'Check-in del equipo'}
              </button>
            );
          } else {
            status = <span className="badge badge-success">Check-in confirmado</span>;
          }

          return (
            <li key={team.id} style={{ marginBottom: '0.75rem' }}>
              <strong>{team.name}</strong> {status}
              <div className="actions">{action}</div>
            </li>
          );
        })}
      </ul>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
