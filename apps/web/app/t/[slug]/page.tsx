import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache, type CSSProperties } from 'react';
import type {
  GameAdapterKey,
  TournamentSettings,
  TournamentStatus,
} from '@opentournament/shared-types';
import { LiveTournament } from '@/components/live-tournament';
import { RegisterPanel } from '@/components/register-panel';
import { ReportPanel } from '@/components/report-panel';
import { RulesetSummary } from '@/components/ruleset-summary';
import { formatMessage, getDictionary, type Dictionary, type Locale } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n-server';
import {
  formatBracketType,
  formatGameAdapter,
  formatMatchStatus,
  formatRegistrationStatus,
  getPublicRegistrationMessage,
  getTournamentStatus,
} from '@/lib/presentation';
import { serverFetch } from '@/lib/server-api';
import styles from '../../workspace-pages.module.css';

export const dynamic = 'force-dynamic';

interface BracketMatchView {
  id: string;
  status: string;
  home: { participantId: string; teamId: string; name: string } | null;
  away: { participantId: string; teamId: string; name: string } | null;
  result: {
    winnerId?: string;
    homeScore?: number;
    awayScore?: number;
    games?: Array<{
      number: number;
      stage: string;
      homeCharacter: string;
      awayCharacter: string;
    }>;
    lolGames?: Array<{
      number: number;
      winnerTeamId: string;
      blueTeamId: string;
      durationMinutes: number;
      riotMatchId?: string;
    }>;
  } | null;
}

interface BracketRoundView {
  number: number;
  name: string;
  matches: BracketMatchView[];
}

interface BracketView {
  type: string;
  rounds: BracketRoundView[];
}

interface TeamEntryView {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  registrationStatus: string;
  checkedIn: boolean | null;
}

interface PublicTournamentResponse {
  tournament: {
    id: string;
    name: string;
    description: string | null;
    rules: string | null;
    status: TournamentStatus;
    format: string;
    gameAdapterKey: GameAdapterKey;
    startsAt: string | null;
    capacity: number;
    seriesConfig: { bo?: number } | null;
    settings: TournamentSettings | null;
  };
  organization: { name: string } | null;
}

const getPublicTournament = cache((slug: string) =>
  serverFetch<PublicTournamentResponse>(`/tournaments/by-slug/${slug}`),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const copy = getDictionary(locale).publicTournament;
  const tournamentRes = await getPublicTournament(slug);
  const tournament = tournamentRes.data?.tournament;

  if (!tournament) return { title: copy.unavailableMetadata };
  return {
    title: tournament.name,
    description:
      tournament.description ?? formatMessage(copy.followMetadata, { name: tournament.name }),
  };
}

function teamLabel(team: { name: string } | null, copy: Dictionary['publicTournament']): string {
  return team?.name ?? copy.toBeDecided;
}

function formatCharacterSummary(
  games: NonNullable<BracketMatchView['result']>['games'],
  side: 'home' | 'away',
): string | null {
  const characters = [...new Set(games?.map((game) => game[`${side}Character`]).filter(Boolean))];

  return characters.length > 0 ? characters.join(' · ') : null;
}

function BracketSection({
  brackets,
  tournamentId,
  isSmash,
  isLeagueOfLegends,
  locale,
  copy,
}: {
  brackets: BracketView[];
  tournamentId: string;
  isSmash: boolean;
  isLeagueOfLegends: boolean;
  locale: Locale;
  copy: Dictionary['publicTournament'];
}) {
  const matchLabel = isSmash ? copy.sets : isLeagueOfLegends ? copy.seriesPlural : copy.matches;
  return (
    <section className={styles.bracketPanel} aria-labelledby="bracket-title">
      <div className={styles.bracketHeader}>
        <div>
          <p className={styles.eyebrow}>{copy.competition}</p>
          <h2 id="bracket-title">
            {formatMessage(copy.bracketAndMatches, { matches: matchLabel })}
          </h2>
        </div>
        <span className={styles.liveRegion}>
          <LiveTournament tournamentId={tournamentId} />
        </span>
      </div>

      {brackets.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>{copy.bracketNotPublished}</h3>
          <p className={styles.emptyCopy}>{copy.bracketWillAppear}</p>
        </div>
      ) : (
        <div
          className={styles.bracketViewport}
          role="region"
          tabIndex={0}
          aria-label={copy.scrollableBracket}
        >
          {brackets.map((bracket) => {
            const maxMatches = Math.max(1, ...bracket.rounds.map((round) => round.matches.length));

            return (
              <section className={styles.bracketGroup} key={bracket.type}>
                <h3>{formatBracketType(bracket.type, locale)}</h3>
                <ol
                  className={styles.bracketRounds}
                  style={
                    {
                      '--bracket-max-matches': maxMatches,
                      '--bracket-track-row': isSmash || isLeagueOfLegends ? '9rem' : '7rem',
                    } as CSSProperties
                  }
                >
                  {bracket.rounds.map((round, roundIndex) => {
                    const nextRound = bracket.rounds[roundIndex + 1];
                    const joinsPairs =
                      nextRound !== undefined &&
                      round.matches.length === nextRound.matches.length * 2;

                    return (
                      <li
                        className={`${styles.roundColumn} ${joinsPairs ? styles.roundPairs : ''}`}
                        key={round.number}
                      >
                        <p className={styles.bracketRoundMeta}>{round.name}</p>
                        <ol
                          className={styles.roundMatches}
                          style={
                            {
                              '--round-match-count': Math.max(1, round.matches.length),
                            } as CSSProperties
                          }
                        >
                          {round.matches.map((match, matchIndex) => {
                            const isHomeWinner =
                              match.result?.winnerId !== undefined &&
                              match.home?.participantId === match.result.winnerId;
                            const isAwayWinner =
                              match.result?.winnerId !== undefined &&
                              match.away?.participantId === match.result.winnerId;
                            const games = match.result?.games;
                            const leagueGames = match.result?.lolGames;
                            const homeCharacters = formatCharacterSummary(games, 'home');
                            const awayCharacters = formatCharacterSummary(games, 'away');
                            const totalLeagueMinutes = leagueGames?.reduce(
                              (total, game) => total + game.durationMinutes,
                              0,
                            );

                            return (
                              <li
                                className={styles.matchSlot}
                                key={match.id}
                                style={{ '--match-index': matchIndex } as CSSProperties}
                              >
                                <article className={styles.matchCard}>
                                  <div
                                    className={`${styles.matchTeam} ${isHomeWinner ? styles.matchWinner : ''}`}
                                  >
                                    <span className={styles.matchCompetitor}>
                                      <span>{teamLabel(match.home, copy)}</span>
                                      {isSmash && homeCharacters && (
                                        <small data-testid="smash-character">
                                          {homeCharacters}
                                        </small>
                                      )}
                                      {isLeagueOfLegends && leagueGames?.length && match.home && (
                                        <small data-testid="lol-blue-side">
                                          {copy.blueSideIn}{' '}
                                          {leagueGames
                                            .filter(
                                              (game) => game.blueTeamId === match.home?.teamId,
                                            )
                                            .map((game) => `G${game.number}`)
                                            .join(' · ') || copy.none}
                                        </small>
                                      )}
                                    </span>
                                    <span className={styles.matchScore}>
                                      {match.result?.homeScore ?? '—'}
                                    </span>
                                  </div>
                                  <div
                                    className={`${styles.matchTeam} ${isAwayWinner ? styles.matchWinner : ''}`}
                                  >
                                    <span className={styles.matchCompetitor}>
                                      <span>{teamLabel(match.away, copy)}</span>
                                      {isSmash && awayCharacters && (
                                        <small data-testid="smash-character">
                                          {awayCharacters}
                                        </small>
                                      )}
                                      {isLeagueOfLegends && leagueGames?.length && match.away && (
                                        <small data-testid="lol-blue-side">
                                          {copy.blueSideIn}{' '}
                                          {leagueGames
                                            .filter(
                                              (game) => game.blueTeamId === match.away?.teamId,
                                            )
                                            .map((game) => `G${game.number}`)
                                            .join(' · ') || copy.none}
                                        </small>
                                      )}
                                    </span>
                                    <span className={styles.matchScore}>
                                      {match.result?.awayScore ?? '—'}
                                    </span>
                                  </div>
                                  <footer className={styles.matchFooter}>
                                    <span>
                                      {isSmash && games?.length
                                        ? formatMessage(copy.gamesPlayed, { count: games.length })
                                        : isSmash
                                          ? copy.set
                                          : isLeagueOfLegends && leagueGames?.length
                                            ? formatMessage(copy.leagueGamesPlayed, {
                                                count: leagueGames.length,
                                                minutes: totalLeagueMinutes ?? 0,
                                              })
                                            : isLeagueOfLegends
                                              ? copy.series
                                              : copy.match}
                                    </span>
                                    <span>{formatMatchStatus(match.status, locale)}</span>
                                  </footer>
                                </article>
                                {nextRound && (
                                  <span
                                    aria-hidden="true"
                                    className={styles.matchConnector}
                                    data-testid="bracket-connector"
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function JourneySection({
  tournamentStatus,
  isTournamentRunning,
  isSmash,
  copy,
}: {
  tournamentStatus: TournamentStatus;
  isTournamentRunning: boolean;
  isSmash: boolean;
  copy: Dictionary['publicTournament'];
}) {
  return (
    <section className={styles.journeyPanel} aria-labelledby="journey-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>{copy.journey}</p>
          <h2 id="journey-title">
            {isTournamentRunning ? copy.followCompetition : copy.howToParticipate}
          </h2>
        </div>
      </div>
      <ol className={styles.journeyList}>
        <li>
          <strong>{formatMessage(copy.step, { number: 1 })}</strong>
          {isSmash ? copy.createPlayerProfile : copy.createTeam}
        </li>
        <li className={tournamentStatus === 'open' ? styles.currentJourney : undefined}>
          <strong>{formatMessage(copy.step, { number: 2 })}</strong>
          {copy.register}
        </li>
        <li className={tournamentStatus === 'checkin_open' ? styles.currentJourney : undefined}>
          <strong>{formatMessage(copy.step, { number: 3 })}</strong>
          {copy.completeCheckIn}
        </li>
        <li className={isTournamentRunning ? styles.currentJourney : undefined}>
          <strong>{formatMessage(copy.step, { number: 4 })}</strong>
          {copy.followBracket}
        </li>
      </ol>
    </section>
  );
}

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const copy = dictionary.publicTournament;
  const tournamentRes = await getPublicTournament(slug);
  if (tournamentRes.status === 503) {
    return (
      <main className={`container narrow ${styles.formPage}`}>
        <div className={`${styles.notice} service-state`} role="status">
          <p className={styles.eyebrow}>{copy.serviceUnavailable}</p>
          <h1>{copy.unableToLoad}</h1>
          <p>{copy.apiUnavailable}</p>
        </div>
      </main>
    );
  }
  if (tournamentRes.status === 404) notFound();
  const tournament = tournamentRes.data?.tournament;
  if (!tournament) notFound();

  const [teamsRes, bracketRes] = await Promise.all([
    serverFetch<{ teams: TeamEntryView[] }>(`/tournaments/${tournament.id}/teams`),
    serverFetch<{ brackets: BracketView[] }>(`/tournaments/${tournament.id}/bracket`),
  ]);
  const teams = teamsRes.data?.teams ?? [];
  const brackets = bracketRes.data?.brackets ?? [];
  const status = getTournamentStatus(tournament.status, locale);
  const isSmash = tournament.gameAdapterKey === 'smash_ultimate';
  const isLeagueOfLegends = tournament.gameAdapterKey === 'lol';
  const seriesBestOf = tournament.seriesConfig?.bo ?? 1;
  const isRegistrationActive = tournament.status === 'open' || tournament.status === 'checkin_open';
  const isTournamentRunning =
    tournament.status === 'in_progress' || tournament.status === 'finalized';
  const publicRegistrationMessage = getPublicRegistrationMessage(
    tournament.status,
    isSmash,
    locale,
  );
  const roundCount = brackets.reduce((total, bracket) => total + bracket.rounds.length, 0);
  const matchCount = brackets.reduce(
    (total, bracket) =>
      total + bracket.rounds.reduce((roundTotal, round) => roundTotal + round.matches.length, 0),
    0,
  );

  return (
    <main className={`container ${styles.page}`} data-game={tournament.gameAdapterKey}>
      <header className={`${styles.pageHeader} ${styles.tournamentHeader}`}>
        <div>
          <p className={styles.eyebrow}>
            {tournamentRes.data?.organization?.name ?? copy.independentTournament}
          </p>
          <h1>{tournament.name}</h1>
          {tournament.description && <p className={styles.intro}>{tournament.description}</p>}
        </div>
        <div className={styles.tournamentHeaderMeta}>
          <span className={status.className}>{status.label}</span>
          <span>{formatGameAdapter(tournament.gameAdapterKey, locale)}</span>
          <span>
            {tournament.format === 'double_elimination'
              ? dictionary.presentation.doubleElimination
              : dictionary.presentation.singleElimination}
          </span>
          <span>{formatMessage(copy.capacity, { capacity: tournament.capacity })}</span>
          {tournament.startsAt && (
            <span>
              {formatMessage(copy.startsAt, {
                date: new Date(tournament.startsAt).toLocaleString(locale),
              })}
            </span>
          )}
        </div>
      </header>

      <RulesetSummary
        gameAdapterKey={tournament.gameAdapterKey}
        format={tournament.format}
        seriesBestOf={seriesBestOf}
        settings={tournament.settings}
        locale={locale}
      />

      <dl className={styles.metrics} aria-label={copy.summary}>
        <div>
          <dt>{isSmash ? copy.registeredPlayers : copy.registeredTeams}</dt>
          <dd>{teams.length}</dd>
        </div>
        <div>
          <dt>{copy.publishedRounds}</dt>
          <dd>{roundCount}</dd>
        </div>
        <div>
          <dt>{isSmash ? copy.sets : isLeagueOfLegends ? copy.seriesPlural : copy.matches}</dt>
          <dd>{matchCount}</dd>
        </div>
      </dl>

      {isTournamentRunning && (
        <BracketSection
          brackets={brackets}
          tournamentId={tournament.id}
          isSmash={isSmash}
          isLeagueOfLegends={isLeagueOfLegends}
          locale={locale}
          copy={copy}
        />
      )}

      <JourneySection
        tournamentStatus={tournament.status}
        isTournamentRunning={isTournamentRunning}
        isSmash={isSmash}
        copy={copy}
      />

      {isRegistrationActive ? (
        <RegisterPanel
          tournamentId={tournament.id}
          gameAdapterKey={tournament.gameAdapterKey}
          tournamentStatus={tournament.status}
        />
      ) : (
        <div className={styles.panel}>
          <p className={styles.meta}>{publicRegistrationMessage}</p>
        </div>
      )}

      {!isTournamentRunning && (
        <BracketSection
          brackets={brackets}
          tournamentId={tournament.id}
          isSmash={isSmash}
          isLeagueOfLegends={isLeagueOfLegends}
          locale={locale}
          copy={copy}
        />
      )}

      <ReportPanel
        tournamentId={tournament.id}
        gameAdapterKey={tournament.gameAdapterKey}
        seriesBestOf={seriesBestOf}
        settings={tournament.settings}
      />

      <div className={styles.publicSupportGrid}>
        <section className={styles.panel} aria-labelledby="teams-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{copy.participants}</p>
              <h2 id="teams-title">
                {formatMessage(isSmash ? copy.playersRegistered : copy.teamsRegistered, {
                  count: teams.length,
                })}
              </h2>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className={styles.emptyCopy}>
              {isSmash ? copy.noPlayersRegistered : copy.noTeamsRegistered}
            </p>
          ) : (
            <ul className={styles.teamList}>
              {teams.map((team) => (
                <li key={team.teamId}>
                  <span>
                    <strong>{team.teamName}</strong>
                    <small className={styles.teamMeta}>
                      {team.teamTag ? formatMessage(copy.tag, { tag: team.teamTag }) : copy.noTag}
                    </small>
                  </span>
                  {team.registrationStatus === 'approved' ? (
                    <span className={`badge ${team.checkedIn ? 'badge-success' : 'badge-warn'}`}>
                      {team.checkedIn ? copy.checkedIn : copy.notCheckedIn}
                    </span>
                  ) : (
                    <span className="badge">
                      {formatRegistrationStatus(team.registrationStatus, locale)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {tournament.rules && (
          <section className={styles.panel} aria-labelledby="rules-title">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>{copy.information}</p>
                <h2 id="rules-title">{copy.rules}</h2>
              </div>
            </div>
            <p className={styles.rules}>{tournament.rules}</p>
          </section>
        )}
      </div>
    </main>
  );
}
