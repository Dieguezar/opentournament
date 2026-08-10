import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@opentournament/shared-types';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface TournamentView {
  id: string;
  name: string;
  slug: string;
  status: string;
  format: string;
  gameAdapterKey: string;
}

interface TeamView {
  id: string;
  name: string;
  tag: string | null;
  organizationId: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'badge' },
  open: { label: 'Inscripciones abiertas', className: 'badge badge-success' },
  checkin_open: { label: 'Check-in abierto', className: 'badge badge-warn' },
  in_progress: { label: 'En curso', className: 'badge badge-warn' },
  finalized: { label: 'Finalizado', className: 'badge badge-success' },
  cancelled: { label: 'Cancelado', className: 'badge badge-danger' },
};

export default async function DashboardPage() {
  const me = await serverFetch<{ user: SessionUser }>('/auth/me');
  if (me.status === 401) redirect('/login');
  const user = me.data.user;
  if (!user) redirect('/login');

  const [tournamentsRes, teamsRes] = await Promise.all([
    serverFetch<{ tournaments: TournamentView[] }>('/tournaments/mine'),
    serverFetch<{ teams: TeamView[] }>('/teams/mine'),
  ]);
  const tournaments = tournamentsRes.data?.tournaments ?? [];
  const teams = teamsRes.data?.teams ?? [];

  return (
    <main className="container">
      <h1>Hola, {user.displayName}</h1>
      <div className="actions">
        <Link className="button" href="/tournaments/new">
          Crear torneo
        </Link>
        <Link className="button button-secondary" href="/teams/new">
          Crear equipo
        </Link>
        {user.organizations.length === 0 && (
          <Link className="button button-secondary" href="/wizard">
            Crear organización
          </Link>
        )}
      </div>

      <div className="card">
        <h2>Mis torneos</h2>
        {tournaments.length === 0 ? (
          <p className="muted">
            Todavía no tienes torneos.{' '}
            <Link href="/tournaments/new">Crea tu primer torneo →</Link>
          </p>
        ) : (
          <div className="grid">
            {tournaments.map((tournament) => {
              const status = STATUS_LABELS[tournament.status] ?? STATUS_LABELS.draft!;
              return (
                <div className="card" key={tournament.id}>
                  <h3 style={{ marginTop: 0 }}>{tournament.name}</h3>
                  <p className="muted">
                    {tournament.gameAdapterKey} ·{' '}
                    {tournament.format === 'double_elimination'
                      ? 'Doble eliminación'
                      : 'Eliminación sencilla'}
                  </p>
                  <p>
                    <span className={status.className}>{status.label}</span>
                  </p>
                  <p>
                    <Link href={`/tournaments/${tournament.id}`}>Administrar</Link> ·{' '}
                    <Link href={`/t/${tournament.slug}`}>Página pública</Link>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Mis equipos</h2>
        {teams.length === 0 ? (
          <p className="muted">
            No tienes equipos.{' '}
            <Link href="/teams/new">Crea tu primer equipo →</Link>
          </p>
        ) : (
          <ul>
            {teams.map((team) => (
              <li key={team.id}>
                {team.name} <span className="muted">{team.tag ? `[${team.tag}]` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {user.organizations.length > 0 && (
        <div className="card">
          <h2>Mis organizaciones</h2>
          <ul>
            {user.organizations.map((org) => (
              <li key={org.id}>
                <Link href={`/organizations/${org.slug}`}>{org.name}</Link>{' '}
                <span className="muted">({org.role})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
