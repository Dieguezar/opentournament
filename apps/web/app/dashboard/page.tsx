import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@opentournament/shared-types';
import { serverFetch } from '@/lib/server-api';
import {
  formatGameAdapter,
  formatOrganizationRole,
  getTournamentStatus,
} from '@/lib/presentation';

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
      <header className="page-heading">
        <div>
          <p className="eyebrow">Centro de control</p>
          <h1>Hola, {user.displayName}</h1>
          <p className="muted">Administrá torneos, equipos y operaciones desde un solo lugar.</p>
        </div>
        <div className="summary-strip" aria-label="Resumen de actividad">
          <span><strong>{tournaments.length}</strong> torneos</span>
          <span><strong>{teams.length}</strong> equipos</span>
          <span><strong>{user.organizations.length}</strong> organizaciones</span>
        </div>
      </header>
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
        <div className="section-heading">
          <div>
            <p className="eyebrow">Competencia</p>
            <h2>Mis torneos</h2>
          </div>
          <Link href="/tournaments/new">Nuevo torneo</Link>
        </div>
        {tournaments.length === 0 ? (
          <p className="muted">
            Todavía no tienes torneos.{' '}
            <Link href="/tournaments/new">Crea tu primer torneo →</Link>
          </p>
        ) : (
          <div className="grid">
            {tournaments.map((tournament) => {
              const status = getTournamentStatus(tournament.status);
              const isDemo = tournament.slug === 'copa-nexo-demo';
              return (
                <article className="tournament-card" key={tournament.id}>
                  <div className="section-heading compact">
                    <h3>{tournament.name}</h3>
                    {isDemo && <span className="badge badge-demo">Demo incluida</span>}
                  </div>
                  <p className="muted">
                    {formatGameAdapter(tournament.gameAdapterKey)} ·{' '}
                    {tournament.format === 'double_elimination'
                      ? 'Doble eliminación'
                      : 'Eliminación sencilla'}
                  </p>
                  <p>
                    <span className={status.className}>{status.label}</span>
                  </p>
                  <div className="actions compact-actions">
                    <Link className="button" href={`/tournaments/${tournament.id}`}>
                      Administrar
                    </Link>
                    <Link className="button button-secondary" href={`/t/${tournament.slug}`}>
                      Ver página pública
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Participantes</p>
            <h2>Mis equipos</h2>
          </div>
          <Link href="/teams/new">Nuevo equipo</Link>
        </div>
        {teams.length === 0 ? (
          <p className="muted">
            No tienes equipos.{' '}
            <Link href="/teams/new">Crea tu primer equipo →</Link>
          </p>
        ) : (
          <ul className="team-list">
            {teams.map((team) => (
              <li className="team-item" key={team.id}>
                <span className="team-monogram" aria-hidden="true">{team.tag?.slice(0, 3) ?? 'OT'}</span>
                <span>
                  <strong>{team.name}</strong>
                  <small>{team.tag ? `Etiqueta ${team.tag}` : 'Sin etiqueta'}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {user.organizations.length > 0 && (
        <div className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Comunidad</p>
                <h2>Mis organizaciones</h2>
              </div>
            </div>
          <ul className="organization-list">
            {user.organizations.map((org) => (
              <li key={org.id}>
                <Link href={`/organizations/${org.slug}`}>{org.name}</Link>{' '}
                <span className="badge">{formatOrganizationRole(org.role)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
