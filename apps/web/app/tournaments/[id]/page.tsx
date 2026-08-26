import {
  buildBracketWorkspacePresentation,
  type BracketMatchNode,
} from '@opentournament/bracket-ui';
import type { GameAdapterKey, MatchStatus, TournamentSettings } from '@opentournament/shared-types';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BracketWorkspace, type BracketWorkspaceMatch } from '@/components/bracket-workspace';
import styles from '@/components/bracket-workspace.module.css';
import { RegistrationActions, type RegistrationView } from '@/components/registration-actions';
import { RulesetSummary } from '@/components/ruleset-summary';
import { TournamentActions } from '@/components/tournament-actions';
import { ParticipantAccessManager } from '@/components/participant-access-manager';
import { ReportPanel } from '@/components/report-panel';
import { formatMessage, getDictionary, type Dictionary, type Locale } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';
import {
  formatGameAdapter,
  formatParticipantStatus,
  formatRegistrationStatus,
  getTournamentStatus,
} from '@/lib/presentation';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface TournamentView {
  id: string;
  name: string;
  slug: string;
  status: string;
  format: string;
  capacity: number;
  gameAdapterKey: GameAdapterKey;
  startsAt: string | null;
  seriesConfig: { bo?: number } | null;
  settings: TournamentSettings | null;
}

interface MatchResultView {
  winnerId?: string;
  homeScore?: number;
  awayScore?: number;
}

interface MatchView {
  id: string;
  position: number;
  status: MatchStatus;
  scheduledAt: string | null;
  roundNumber: number;
  roundName: string;
  bracketType: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  result: MatchResultView | null;
}

interface BracketParticipantView {
  participantId: string;
  teamId: string;
  name: string;
  tag: string | null;
}

interface BracketMatchView {
  id: string;
  position: number;
  status: MatchStatus;
  home: BracketParticipantView | null;
  away: BracketParticipantView | null;
  result: MatchResultView | null;
  scheduledAt: string | null;
}

interface BracketView {
  type: string;
  rounds: Array<{
    number: number;
    name: string;
    matches: BracketMatchView[];
  }>;
}

interface CheckInView {
  teamName: string;
  checkedIn: boolean;
  status: string;
}

interface DisputeView {
  id: string;
  status: string;
}

function fallbackWinnerId(match: MatchView): string | null {
  const winnerId = match.result?.winnerId;
  if (!winnerId) return null;
  if (winnerId === match.homeTeamId || winnerId === match.awayTeamId) return winnerId;
  return null;
}

function toWorkspaceMatches(
  matches: readonly MatchView[],
  brackets: readonly BracketView[],
): BracketWorkspaceMatch[] {
  const detailsByMatchId = new Map(matches.map((match) => [match.id, match]));
  const bracketMatches = brackets.flatMap((bracket) =>
    bracket.rounds.flatMap((round) =>
      round.matches.map((match): BracketWorkspaceMatch => {
        const details = detailsByMatchId.get(match.id);
        return {
          id: match.id,
          round: round.number,
          position: match.position,
          home: match.home
            ? {
                id: match.home.participantId,
                name: match.home.name,
                tag: match.home.tag,
              }
            : null,
          away: match.away
            ? {
                id: match.away.participantId,
                name: match.away.name,
                tag: match.away.tag,
              }
            : null,
          homeScore: match.result?.homeScore,
          awayScore: match.result?.awayScore,
          winnerId: match.result?.winnerId,
          status: match.status,
          bracketType: bracket.type,
          roundName: round.name,
          scheduledAt: match.scheduledAt ?? details?.scheduledAt ?? null,
          homeTeamId: match.home?.teamId ?? details?.homeTeamId ?? null,
          awayTeamId: match.away?.teamId ?? details?.awayTeamId ?? null,
        };
      }),
    ),
  );

  if (bracketMatches.length > 0) return bracketMatches;

  return matches.map((match): BracketWorkspaceMatch => ({
    id: match.id,
    round: match.roundNumber,
    position: match.position,
    home:
      match.homeTeam && match.homeTeamId ? { id: match.homeTeamId, name: match.homeTeam } : null,
    away:
      match.awayTeam && match.awayTeamId ? { id: match.awayTeamId, name: match.awayTeam } : null,
    homeScore: match.result?.homeScore,
    awayScore: match.result?.awayScore,
    winnerId: fallbackWinnerId(match),
    status: match.status,
    bracketType: match.bracketType,
    roundName: match.roundName,
    scheduledAt: match.scheduledAt,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  }));
}

function tournamentFormatLabel(format: string, locale: Locale): string {
  const presentation = getDictionary(locale).presentation;
  return format === 'double_elimination'
    ? presentation.doubleElimination
    : presentation.singleElimination;
}

function nextActionLabel(
  nextMatch: BracketMatchNode | null,
  workspaceMatches: readonly BracketWorkspaceMatch[],
  canManage: boolean,
  matchLabel: string,
  locale: Locale,
  copy: Dictionary['tournamentAdmin'],
): string {
  if (!nextMatch) return copy.viewBracket;
  const details = workspaceMatches.find((match) => match.id === nextMatch.id);
  if (!details) {
    return formatMessage(canManage ? copy.manageItem : copy.viewItem, { item: matchLabel });
  }
  return formatMessage(canManage ? copy.manageItem : copy.viewItem, {
    item: details.roundName.toLocaleLowerCase(locale),
  });
}

export default async function TournamentAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const copy = dictionary.tournamentAdmin;
  const { id } = await params;
  const tournamentRes = await serverFetch<{ tournament: TournamentView }>(`/tournaments/${id}`);
  if (tournamentRes.status === 401) redirect('/login');
  if (tournamentRes.status === 404) notFound();
  const tournament = tournamentRes.data.tournament;
  if (!tournament) notFound();

  const [regsRes, checkRes, matchesRes, bracketRes, disputesRes] = await Promise.all([
    serverFetch<{ registrations: RegistrationView[] }>(`/tournaments/${id}/registrations`),
    serverFetch<{ participants: CheckInView[] }>(`/tournaments/${id}/check-in/status`),
    serverFetch<{ matches: MatchView[] }>(`/tournaments/${id}/matches`),
    serverFetch<{ brackets: BracketView[] }>(`/tournaments/${id}/bracket`),
    serverFetch<{ disputes: DisputeView[] }>(`/tournaments/${id}/disputes`),
  ]);

  const isAdmin = regsRes.status === 200;
  const registrations = regsRes.data?.registrations ?? [];
  const participants = checkRes.data?.participants ?? [];
  const matches = matchesRes.data?.matches ?? [];
  const brackets = bracketRes.data?.brackets ?? [];
  const disputes = disputesRes.data?.disputes ?? [];
  const workspaceMatches = toWorkspaceMatches(matches, brackets);
  const presentation = buildBracketWorkspacePresentation(workspaceMatches);
  const tournamentStatus = getTournamentStatus(tournament.status, locale);
  const seriesBestOf = tournament.seriesConfig?.bo ?? 1;
  const isSmash = tournament.gameAdapterKey === 'smash_ultimate';
  const publicTeamCount = new Set(
    workspaceMatches.flatMap((match) =>
      [match.home?.id, match.away?.id].filter((teamId): teamId is string => Boolean(teamId)),
    ),
  ).size;
  const teamCount = isAdmin ? participants.length : publicTeamCount;

  return (
    <main className={styles.page} data-game={tournament.gameAdapterKey}>
      <nav className={styles.utilityLinks} aria-label={copy.tournamentNavigation}>
        <Link href="/dashboard">{copy.tournamentDashboard}</Link>
        <Link href={`/t/${tournament.slug}`}>{copy.publicPage}</Link>
        {isAdmin && <Link href={`/tournaments/${id}/disputas`}>{copy.disputes}</Link>}
      </nav>

      <header id="overview" className={styles.hero}>
        <div>
          <div className={styles.titleLine}>
            <h1>{tournament.name}</h1>
            <span className={tournamentStatus.className}>{tournamentStatus.label}</span>
          </div>
          <p className={styles.meta}>
            <span>{formatGameAdapter(tournament.gameAdapterKey, locale)}</span>
            <span>{tournamentFormatLabel(tournament.format, locale)}</span>
            <span>
              {formatMessage(copy.capacity, {
                capacity: tournament.capacity,
                participants: isSmash ? copy.players : copy.teams,
              })}
            </span>
            <span>BO{seriesBestOf}</span>
            {tournament.startsAt && (
              <span>
                {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                  new Date(tournament.startsAt),
                )}
              </span>
            )}
          </p>
        </div>

        <div className={styles.metrics} aria-label={copy.summary}>
          <div className={styles.metric}>
            <strong>{teamCount}</strong>
            <span>{isSmash ? copy.players : copy.teams}</span>
          </div>
          <div className={styles.metric}>
            <strong>
              {presentation.metrics.finalizedMatches} / {presentation.metrics.totalMatches}
            </strong>
            <span>{isSmash ? copy.finalizedSets : copy.finalizedMatches}</span>
          </div>
          {isAdmin && (
            <div className={styles.metric}>
              <strong>{disputes.filter((dispute) => dispute.status !== 'resolved').length}</strong>
              <span>{copy.openDisputes}</span>
            </div>
          )}
        </div>

        <a
          className={styles.primaryAction}
          href={presentation.metrics.totalMatches > 0 ? '#match-details' : '#bracket'}
        >
          {nextActionLabel(
            presentation.nextActionableMatch,
            workspaceMatches,
            isAdmin,
            isSmash
              ? dictionary.bracketWorkspace.set.toLocaleLowerCase(locale)
              : dictionary.bracketWorkspace.match.toLocaleLowerCase(locale),
            locale,
            copy,
          )}
        </a>
      </header>

      <nav className={styles.tabs} aria-label={copy.tournamentSections}>
        <a href="#overview">{copy.overview}</a>
        {isAdmin && <a href="#participants">{copy.participants}</a>}
        <a href="#bracket">{isSmash ? copy.setsAndBracket : copy.matchesAndBracket}</a>
        {isAdmin && <a href="#settings">{copy.settings}</a>}
      </nav>

      <RulesetSummary
        gameAdapterKey={tournament.gameAdapterKey}
        format={tournament.format}
        seriesBestOf={seriesBestOf}
        settings={tournament.settings}
        locale={locale}
      />

      <BracketWorkspace
        tournamentId={id}
        seriesBestOf={seriesBestOf}
        canManage={isAdmin}
        isSmash={isSmash}
        matches={workspaceMatches}
      />

      {isAdmin && (
        <ReportPanel
          tournamentId={id}
          gameAdapterKey={tournament.gameAdapterKey}
          seriesBestOf={seriesBestOf}
          settings={tournament.settings}
          staffMode
        />
      )}

      {isAdmin && (
        <section id="participants" className={styles.supportGrid} aria-label={copy.participants}>
          <div className={styles.supportPanel}>
            <h2>
              {formatMessage(isSmash ? copy.playerRegistrations : copy.teamRegistrations, {
                count: registrations.length,
              })}
            </h2>
            {registrations.length === 0 ? (
              <p>
                {copy.sharePublicPagePrefix}{' '}
                <Link href={`/t/${tournament.slug}`}>{copy.sharePublicPageLink}</Link>{' '}
                {copy.sharePublicPageSuffix}
              </p>
            ) : (
              <ul className={styles.supportList}>
                {registrations.map((registration) => (
                  <li key={registration.id}>
                    <strong>{registration.teamName}</strong>
                    <span className={styles.itemMeta}>
                      {registration.teamTag ?? copy.noTag} ·{' '}
                      {formatMessage(copy.captain, {
                        name: registration.captainName ?? copy.unassigned,
                      })}{' '}
                      · {formatRegistrationStatus(registration.status, locale)}
                      {registration.waitlistPosition
                        ? ` · ${formatMessage(copy.waitlist, { position: registration.waitlistPosition })}`
                        : ''}
                    </span>
                    <RegistrationActions tournamentId={id} registration={registration} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.supportPanel}>
            <h2>{formatMessage(copy.checkIn, { count: participants.length })}</h2>
            {participants.length === 0 ? (
              <p>{isSmash ? copy.noConfirmedPlayers : copy.noConfirmedParticipants}</p>
            ) : (
              <ul className={styles.supportList}>
                {participants.map((participant) => (
                  <li key={participant.teamName}>
                    <strong>{participant.teamName}</strong>
                    <span className={styles.itemMeta}>
                      {participant.checkedIn ? copy.checkedIn : copy.notCheckedIn} ·{' '}
                      {formatParticipantStatus(participant.status, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {isAdmin && (
        <section id="settings" className={`${styles.supportPanel} ${styles.settings}`}>
          <h2>{copy.settingsTitle}</h2>
          <p>{copy.settingsDescription}</p>
          <TournamentActions tournamentId={id} status={tournament.status} />
          <ParticipantAccessManager
            tournamentId={id}
            registrations={registrations}
            initialReportingMode={tournament.settings?.reportingMode ?? 'bilateral'}
          />
        </section>
      )}
    </main>
  );
}
