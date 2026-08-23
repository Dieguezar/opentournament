import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@opentournament/shared-types';
import { serverFetch } from '@/lib/server-api';
import { formatGameAdapter, formatOrganizationRole, getTournamentStatus } from '@/lib/presentation';
import styles from '../workspace-pages.module.css';

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

const TOURNAMENT_PRIORITY: Record<string, number> = {
  in_progress: 0,
  checkin_open: 1,
  open: 2,
  draft: 3,
  finalized: 4,
  cancelled: 5,
};

function formatTournamentFormat(format: string): string {
  return format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla';
}

function sortTournamentsByPriority(tournaments: TournamentView[]): TournamentView[] {
  return [...tournaments].sort(
    (first, second) =>
      (TOURNAMENT_PRIORITY[first.status] ?? 99) - (TOURNAMENT_PRIORITY[second.status] ?? 99),
  );
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
  const tournaments = sortTournamentsByPriority(tournamentsRes.data?.tournaments ?? []);
  const teams = teamsRes.data?.teams ?? [];
  const priorityTournament = tournaments[0];
  const priorityStatus = priorityTournament ? getTournamentStatus(priorityTournament.status) : null;
  const otherTournaments = priorityTournament
    ? tournaments.filter((tournament) => tournament.id !== priorityTournament.id)
    : [];

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Centro de control</p>
          <h1>Hola, {user.displayName}</h1>
          <p className={styles.intro}>
            Administrá la competencia, los equipos y las decisiones pendientes desde un mismo
            espacio.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link className="button" href="/tournaments/new">
            Crear torneo
          </Link>
          <Link className="button button-secondary" href="/teams/new">
            Crear equipo
          </Link>
        </div>
      </header>

      <dl className={styles.metrics} aria-label="Resumen de actividad">
        <div>
          <dt>Torneos</dt>
          <dd>{tournaments.length}</dd>
        </div>
        <div>
          <dt>Equipos</dt>
          <dd>{teams.length}</dd>
        </div>
        <div>
          <dt>Organizaciones</dt>
          <dd>{user.organizations.length}</dd>
        </div>
      </dl>

      <div className={styles.dashboardLayout}>
        <section className={styles.panel} aria-labelledby="priority-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Operación prioritaria</p>
              <h2 id="priority-title">Tu próximo movimiento</h2>
            </div>
            <Link className={styles.sectionLink} href="/tournaments/new">
              Nuevo torneo
            </Link>
          </div>

          {!priorityTournament ? (
            <div className={styles.emptyState}>
              <h3>Tu espacio está listo</h3>
              <p className={styles.emptyCopy}>
                Creá el primer torneo para abrir inscripciones y empezar a recibir equipos.
              </p>
              <Link className="button" href="/tournaments/new">
                Crear primer torneo
              </Link>
            </div>
          ) : (
            <article className={styles.featureCard}>
              <div className={styles.featureHeader}>
                <div>
                  <p className={styles.eyebrow}>
                    {priorityTournament.status === 'in_progress'
                      ? 'Competencia activa'
                      : 'Requiere seguimiento'}
                  </p>
                  <h2>{priorityTournament.name}</h2>
                  <p className={styles.meta}>
                    {formatGameAdapter(priorityTournament.gameAdapterKey)} ·{' '}
                    {formatTournamentFormat(priorityTournament.format)}
                  </p>
                </div>
                <div className={styles.statusLine}>
                  {priorityTournament.slug === 'copa-nexo-demo' && (
                    <span className="badge badge-demo">Demo incluida</span>
                  )}
                  {priorityStatus && (
                    <span className={priorityStatus.className}>{priorityStatus.label}</span>
                  )}
                </div>
              </div>
              <div className={styles.cardActions}>
                <Link className="button" href={`/tournaments/${priorityTournament.id}`}>
                  Administrar torneo
                </Link>
                <Link className="button button-secondary" href={`/t/${priorityTournament.slug}`}>
                  Ver página pública
                </Link>
              </div>
            </article>
          )}

          {otherTournaments.length > 0 && (
            <>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>Portafolio</p>
                  <h3>Otros torneos</h3>
                </div>
              </div>
              <ul className={styles.tournamentList}>
                {otherTournaments.map((tournament) => {
                  const status = getTournamentStatus(tournament.status);
                  return (
                    <li key={tournament.id}>
                      <article className={styles.tournamentCard}>
                        <div className={styles.featureHeader}>
                          <div>
                            <h3>{tournament.name}</h3>
                            <p className={styles.meta}>
                              {formatGameAdapter(tournament.gameAdapterKey)} ·{' '}
                              {formatTournamentFormat(tournament.format)}
                            </p>
                          </div>
                          <div className={styles.statusLine}>
                            {tournament.slug === 'copa-nexo-demo' && (
                              <span className="badge badge-demo">Demo incluida</span>
                            )}
                            <span className={status.className}>{status.label}</span>
                          </div>
                        </div>
                        <div className={styles.cardActions}>
                          <Link className="button" href={`/tournaments/${tournament.id}`}>
                            Administrar
                          </Link>
                          <Link className="button button-secondary" href={`/t/${tournament.slug}`}>
                            Página pública
                          </Link>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <aside className={styles.panel} aria-labelledby="teams-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Participantes</p>
              <h2 id="teams-title">Mis equipos</h2>
            </div>
            <Link className={styles.sectionLink} href="/teams/new">
              Nuevo
            </Link>
          </div>
          {teams.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyCopy}>
                Todavía no tenés equipos disponibles para inscribir.
              </p>
              <Link className="button button-secondary" href="/teams/new">
                Crear equipo
              </Link>
            </div>
          ) : (
            <ul className={styles.teamList}>
              {teams.map((team) => (
                <li key={team.id}>
                  <span>
                    <strong>{team.name}</strong>
                    <small className={styles.teamMeta}>
                      {team.tag ? `Etiqueta ${team.tag}` : 'Sin etiqueta'}
                    </small>
                  </span>
                  <span className="badge">{team.tag?.slice(0, 3) ?? 'OT'}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <div className={styles.supportGrid}>
        {user.organizations.length > 0 ? (
          <section className={styles.panel} aria-labelledby="organizations-title">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Comunidad</p>
                <h2 id="organizations-title">Mis organizaciones</h2>
              </div>
            </div>
            <ul className={styles.organizationList}>
              {user.organizations.map((organization) => (
                <li key={organization.id}>
                  <span>
                    <Link href={`/organizations/${organization.slug}`}>{organization.name}</Link>
                    <small className={styles.organizationMeta}>/{organization.slug}</small>
                  </span>
                  <span className="badge">{formatOrganizationRole(organization.role)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className={styles.panel} aria-labelledby="organization-empty-title">
            <p className={styles.eyebrow}>Configuración requerida</p>
            <h2 id="organization-empty-title">Creá una organización</h2>
            <p className={styles.emptyCopy}>
              Los torneos y equipos necesitan una organización responsable antes de publicarse.
            </p>
            <Link className="button" href="/wizard">
              Crear organización
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
