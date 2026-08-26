import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { SessionUser } from '@opentournament/shared-types';
import { formatMessage, getDictionary, type Locale } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';
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
  gameAdapterKey: string | null;
}

const TOURNAMENT_PRIORITY: Record<string, number> = {
  in_progress: 0,
  checkin_open: 1,
  open: 2,
  draft: 3,
  finalized: 4,
  cancelled: 5,
};

function formatTournamentFormat(format: string, locale: Locale): string {
  const presentation = getDictionary(locale).presentation;
  return format === 'double_elimination'
    ? presentation.doubleElimination
    : presentation.singleElimination;
}

function sortTournamentsByPriority(tournaments: TournamentView[]): TournamentView[] {
  return [...tournaments].sort(
    (first, second) =>
      (TOURNAMENT_PRIORITY[first.status] ?? 99) - (TOURNAMENT_PRIORITY[second.status] ?? 99),
  );
}

export default async function DashboardPage() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const copy = dictionary.dashboard;
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
  const priorityStatus = priorityTournament
    ? getTournamentStatus(priorityTournament.status, locale)
    : null;
  const otherTournaments = priorityTournament
    ? tournaments.filter((tournament) => tournament.id !== priorityTournament.id)
    : [];

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{copy.controlCenter}</p>
          <h1>{formatMessage(copy.greeting, { name: user.displayName })}</h1>
          <p className={styles.intro}>{copy.intro}</p>
        </div>
        <div className={styles.headerActions}>
          <Link className="button" href="/tournaments/new">
            {copy.createTournament}
          </Link>
          <Link className="button button-secondary" href="/teams/new">
            {copy.createParticipant}
          </Link>
        </div>
      </header>

      <dl className={styles.metrics} aria-label={copy.activitySummary}>
        <div>
          <dt>{copy.tournaments}</dt>
          <dd>{tournaments.length}</dd>
        </div>
        <div>
          <dt>{copy.participants}</dt>
          <dd>{teams.length}</dd>
        </div>
        <div>
          <dt>{copy.organizations}</dt>
          <dd>{user.organizations.length}</dd>
        </div>
      </dl>

      <div className={styles.dashboardLayout}>
        <section className={styles.panel} aria-labelledby="priority-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{copy.priorityOperation}</p>
              <h2 id="priority-title">{copy.nextMove}</h2>
            </div>
            <Link className={styles.sectionLink} href="/tournaments/new">
              {copy.newTournament}
            </Link>
          </div>

          {!priorityTournament ? (
            <div className={styles.emptyState}>
              <h3>{copy.workspaceReady}</h3>
              <p className={styles.emptyCopy}>{copy.firstTournamentDescription}</p>
              <Link className="button" href="/tournaments/new">
                {copy.createFirstTournament}
              </Link>
            </div>
          ) : (
            <article className={styles.featureCard}>
              <div className={styles.featureHeader}>
                <div>
                  <p className={styles.eyebrow}>
                    {priorityTournament.status === 'in_progress'
                      ? copy.activeCompetition
                      : copy.needsAttention}
                  </p>
                  <h2>{priorityTournament.name}</h2>
                  <p className={styles.meta}>
                    {formatGameAdapter(priorityTournament.gameAdapterKey, locale)} ·{' '}
                    {formatTournamentFormat(priorityTournament.format, locale)}
                  </p>
                </div>
                <div className={styles.statusLine}>
                  {priorityTournament.slug === 'copa-nexo-demo' && (
                    <span className="badge badge-demo">{copy.demoIncluded}</span>
                  )}
                  {priorityStatus && (
                    <span className={priorityStatus.className}>{priorityStatus.label}</span>
                  )}
                </div>
              </div>
              <div className={styles.cardActions}>
                <Link className="button" href={`/tournaments/${priorityTournament.id}`}>
                  {copy.manageTournament}
                </Link>
                <Link className="button button-secondary" href={`/t/${priorityTournament.slug}`}>
                  {copy.viewPublicPage}
                </Link>
              </div>
            </article>
          )}

          {otherTournaments.length > 0 && (
            <>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>{copy.portfolio}</p>
                  <h3>{copy.otherTournaments}</h3>
                </div>
              </div>
              <ul className={styles.tournamentList}>
                {otherTournaments.map((tournament) => {
                  const status = getTournamentStatus(tournament.status, locale);
                  return (
                    <li key={tournament.id}>
                      <article className={styles.tournamentCard}>
                        <div className={styles.featureHeader}>
                          <div>
                            <h3>{tournament.name}</h3>
                            <p className={styles.meta}>
                              {formatGameAdapter(tournament.gameAdapterKey, locale)} ·{' '}
                              {formatTournamentFormat(tournament.format, locale)}
                            </p>
                          </div>
                          <div className={styles.statusLine}>
                            {tournament.slug === 'copa-nexo-demo' && (
                              <span className="badge badge-demo">{copy.demoIncluded}</span>
                            )}
                            <span className={status.className}>{status.label}</span>
                          </div>
                        </div>
                        <div className={styles.cardActions}>
                          <Link className="button" href={`/tournaments/${tournament.id}`}>
                            {copy.manage}
                          </Link>
                          <Link className="button button-secondary" href={`/t/${tournament.slug}`}>
                            {copy.publicPage}
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
              <p className={styles.eyebrow}>{copy.participants}</p>
              <h2 id="teams-title">{copy.myParticipants}</h2>
            </div>
            <Link className={styles.sectionLink} href="/teams/new">
              {copy.new}
            </Link>
          </div>
          {teams.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyCopy}>{copy.noParticipants}</p>
              <Link className="button button-secondary" href="/teams/new">
                {copy.createParticipant}
              </Link>
            </div>
          ) : (
            <ul className={styles.teamList}>
              {teams.map((team) => {
                const isPlayer = team.gameAdapterKey === 'smash_ultimate';
                return (
                  <li key={team.id}>
                    <span>
                      <strong>{team.name}</strong>
                      <small className={styles.teamMeta}>
                        {isPlayer ? copy.player : copy.team} ·{' '}
                        {formatGameAdapter(team.gameAdapterKey ?? 'generic', locale)} ·{' '}
                        {team.tag ? formatMessage(copy.tag, { tag: team.tag }) : copy.noTag}
                      </small>
                    </span>
                    <span className="badge">{team.tag?.slice(0, 3) ?? 'OT'}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <div className={styles.supportGrid}>
        {user.organizations.length > 0 ? (
          <section className={styles.panel} aria-labelledby="organizations-title">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{copy.community}</p>
                <h2 id="organizations-title">{copy.myOrganizations}</h2>
              </div>
            </div>
            <ul className={styles.organizationList}>
              {user.organizations.map((organization) => (
                <li key={organization.id}>
                  <span>
                    <Link href={`/organizations/${organization.slug}`}>{organization.name}</Link>
                    <small className={styles.organizationMeta}>/{organization.slug}</small>
                  </span>
                  <span className="badge">{formatOrganizationRole(organization.role, locale)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className={styles.panel} aria-labelledby="organization-empty-title">
            <p className={styles.eyebrow}>{copy.configurationRequired}</p>
            <h2 id="organization-empty-title">{copy.createOrganization}</h2>
            <p className={styles.emptyCopy}>{copy.organizationDescription}</p>
            <Link className="button" href="/wizard">
              {copy.createOrganizationAction}
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
