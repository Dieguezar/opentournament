'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { GameAdapterKey, TournamentSettings } from '@opentournament/shared-types';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';
import { formatMessage } from '@/lib/i18n';
import { getReportOutcomeMessage, getReportPanelState } from '@/lib/participant-experience';
import {
  buildLeagueReportPayload,
  createLeagueGames,
  getLeagueScorePresets,
  updateLeagueGameWinner,
  validateLeagueReport,
  type LeagueGameDraft,
  type LeagueReportPayload,
  type LeagueScorePreset,
} from '@/lib/lol-report';
import {
  buildSmashReportPayload,
  createSmashGames,
  getSmashScorePresets,
  SMASH_ULTIMATE_CHARACTERS,
  updateSmashGameWinner,
  validateSmashReport,
  type SmashGameDraft,
  type SmashReportPayload,
  type SmashScorePreset,
} from '@/lib/smash-report';
import styles from './report-panel.module.css';

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

interface ReportPanelProps {
  tournamentId: string;
  gameAdapterKey: GameAdapterKey;
  seriesBestOf: number;
  settings: TournamentSettings | null;
  staffMode?: boolean;
}

interface GenericReportFormProps {
  match: MatchView;
  allowedWinnerTeamId?: string;
  isBusy: boolean;
  message?: string;
  error?: string;
  onReport: (payload: unknown) => Promise<void>;
  onDispute: () => Promise<void>;
}

interface CompleteMatchView extends MatchView {
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
}

interface SmashReportFormProps {
  match: CompleteMatchView;
  allowedWinnerTeamId?: string;
  bestOf: number;
  allowedStages: readonly string[];
  stockLimit: number;
  isBusy: boolean;
  message?: string;
  error?: string;
  onReport: (payload: SmashReportPayload) => Promise<void>;
  onDispute: () => Promise<void>;
}

interface LeagueReportFormProps {
  match: CompleteMatchView;
  allowedWinnerTeamId?: string;
  bestOf: number;
  isBusy: boolean;
  message?: string;
  error?: string;
  onReport: (payload: LeagueReportPayload) => Promise<void>;
  onDispute: () => Promise<void>;
}

function GenericReportForm({
  match,
  allowedWinnerTeamId,
  isBusy,
  message,
  error,
  onReport,
  onDispute,
}: GenericReportFormProps) {
  const { dictionary } = useI18n();
  const copy = dictionary.reportPanel;
  const [winnerTeamId, setWinnerTeamId] = useState(
    allowedWinnerTeamId ?? match.homeTeamId ?? match.awayTeamId ?? '',
  );
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  return (
    <form
      className={styles.genericForm}
      onSubmit={(event) => {
        event.preventDefault();
        void onReport({
          winnerTeamId: winnerTeamId || null,
          homeScore: homeScore ? Number(homeScore) : undefined,
          awayScore: awayScore ? Number(awayScore) : undefined,
        });
      }}
    >
      <div className={styles.genericFields}>
        <label>
          {copy.winner}
          <select value={winnerTeamId} onChange={(event) => setWinnerTeamId(event.target.value)}>
            {match.homeTeam &&
              (!allowedWinnerTeamId || allowedWinnerTeamId === match.homeTeamId) && (
                <option value={match.homeTeamId!}>{match.homeTeam}</option>
              )}
            {match.awayTeam &&
              (!allowedWinnerTeamId || allowedWinnerTeamId === match.awayTeamId) && (
                <option value={match.awayTeamId!}>{match.awayTeam}</option>
              )}
          </select>
        </label>
        <label>
          {formatMessage(copy.pointsFor, { team: match.homeTeam ?? copy.home })}
          <input
            inputMode="numeric"
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
          />
        </label>
        <label>
          {formatMessage(copy.pointsFor, { team: match.awayTeam ?? copy.away })}
          <input
            inputMode="numeric"
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
          />
        </label>
      </div>
      <ReportActions isBusy={isBusy} onDispute={onDispute} />
      <ReportFeedback message={message} error={error} />
    </form>
  );
}

function LeagueReportForm({
  match,
  allowedWinnerTeamId,
  bestOf,
  isBusy,
  message,
  error,
  onReport,
  onDispute,
}: LeagueReportFormProps) {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.reportPanel;
  const [preset, setPreset] = useState<LeagueScorePreset | null>(null);
  const [games, setGames] = useState<LeagueGameDraft[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const scorePresets = getLeagueScorePresets(bestOf, match.homeTeamId, match.awayTeamId).filter(
    (scorePreset) => !allowedWinnerTeamId || scorePreset.winnerTeamId === allowedWinnerTeamId,
  );
  const fieldIdPrefix = `lol-${match.id}`;

  function selectPreset(nextPreset: LeagueScorePreset) {
    setPreset(nextPreset);
    setGames(createLeagueGames(nextPreset));
    setValidationErrors({});
  }

  function updateGame(gameNumber: number, changes: Partial<LeagueGameDraft>) {
    setGames((currentGames) =>
      currentGames.map((game) => (game.number === gameNumber ? { ...game, ...changes } : game)),
    );
    setValidationErrors({});
  }

  function focusInvalidField(fieldId: string) {
    requestAnimationFrame(() => {
      const field = document.getElementById(fieldId);
      if (!(field instanceof HTMLElement)) return;
      field.focus({ preventScroll: true });
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  function submitLeagueReport() {
    if (!preset) {
      setValidationErrors({ score: copy.chooseLeagueScore });
      focusInvalidField(`lol-score-${match.id}`);
      return;
    }

    const validation = validateLeagueReport({ preset, games, fieldIdPrefix }, locale);
    setValidationErrors(validation.errors);
    if (validation.firstInvalidFieldId) {
      focusInvalidField(validation.firstInvalidFieldId);
      return;
    }

    void onReport(buildLeagueReportPayload({ preset, games }));
  }

  return (
    <form
      className={styles.smashForm}
      onSubmit={(event) => {
        event.preventDefault();
        submitLeagueReport();
      }}
    >
      <fieldset
        className={styles.scoreFieldset}
        id={`lol-score-${match.id}`}
        tabIndex={-1}
        aria-describedby={validationErrors.score ? `lol-score-${match.id}-error` : undefined}
      >
        <legend>{formatMessage(copy.leagueScoreLegend, { bestOf })}</legend>
        <div className={styles.scorePresets}>
          {scorePresets.map((scorePreset) => {
            const isSelected =
              preset?.homeScore === scorePreset.homeScore &&
              preset.awayScore === scorePreset.awayScore;
            return (
              <button
                key={`${scorePreset.homeScore}-${scorePreset.awayScore}`}
                type="button"
                className={isSelected ? styles.scorePresetActive : styles.scorePreset}
                aria-pressed={isSelected}
                onClick={() => selectPreset(scorePreset)}
              >
                <span>{scorePreset.label}</span>
                <small>
                  {formatMessage(copy.winnerPrefix, {
                    team:
                      scorePreset.winnerTeamId === match.homeTeamId
                        ? match.homeTeam
                        : match.awayTeam,
                  })}
                </small>
              </button>
            );
          })}
        </div>
        <FieldError id={`lol-score-${match.id}-error`} message={validationErrors.score} />
      </fieldset>

      {preset && (
        <fieldset className={styles.gamesFieldset} disabled={isBusy}>
          <legend>{copy.completeLeagueGames}</legend>
          <p className={styles.help}>{copy.leagueHelp}</p>
          <div className={styles.gameGrid}>
            {games.map((game) => {
              const prefix = `${fieldIdPrefix}-game-${game.number}`;
              return (
                <article className={styles.gameCard} key={game.number}>
                  <div className={styles.gameHeader}>
                    <span>Game {game.number}</span>
                    <strong>
                      {game.winnerTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam}
                    </strong>
                  </div>

                  <div className={styles.resultFields}>
                    <label>
                      {copy.winner}
                      <select
                        value={game.winnerTeamId}
                        onChange={(event) => {
                          setGames((currentGames) =>
                            currentGames.map((currentGame) =>
                              currentGame.number === game.number
                                ? updateLeagueGameWinner(currentGame, event.target.value)
                                : currentGame,
                            ),
                          );
                          setValidationErrors({});
                        }}
                      >
                        <option value={match.homeTeamId}>{match.homeTeam}</option>
                        <option value={match.awayTeamId}>{match.awayTeam}</option>
                      </select>
                    </label>
                    <label htmlFor={`${prefix}-blue-team`}>
                      {copy.blueSide}
                      <select
                        id={`${prefix}-blue-team`}
                        value={game.blueTeamId}
                        aria-invalid={Boolean(validationErrors[`${prefix}-blue-team`])}
                        aria-describedby={
                          validationErrors[`${prefix}-blue-team`]
                            ? `${prefix}-blue-team-error`
                            : undefined
                        }
                        onChange={(event) =>
                          updateGame(game.number, { blueTeamId: event.target.value })
                        }
                      >
                        <option value={match.homeTeamId}>{match.homeTeam}</option>
                        <option value={match.awayTeamId}>{match.awayTeam}</option>
                      </select>
                    </label>
                  </div>
                  <FieldError
                    id={`${prefix}-blue-team-error`}
                    message={validationErrors[`${prefix}-blue-team`]}
                  />

                  <div className={styles.resultFields}>
                    <label htmlFor={`${prefix}-duration`}>
                      {copy.duration}
                      <input
                        id={`${prefix}-duration`}
                        type="number"
                        min={5}
                        max={180}
                        value={game.durationMinutes}
                        aria-invalid={Boolean(validationErrors[`${prefix}-duration`])}
                        aria-describedby={
                          validationErrors[`${prefix}-duration`]
                            ? `${prefix}-duration-error`
                            : undefined
                        }
                        onChange={(event) =>
                          updateGame(game.number, { durationMinutes: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label htmlFor={`${prefix}-riot-id`}>
                      Riot Match ID <small>({copy.optional})</small>
                      <input
                        id={`${prefix}-riot-id`}
                        placeholder="LA1_123456789"
                        value={game.riotMatchId}
                        aria-invalid={Boolean(validationErrors[`${prefix}-riot-id`])}
                        aria-describedby={
                          validationErrors[`${prefix}-riot-id`]
                            ? `${prefix}-riot-id-error`
                            : undefined
                        }
                        onChange={(event) =>
                          updateGame(game.number, { riotMatchId: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <FieldError
                    id={`${prefix}-duration-error`}
                    message={validationErrors[`${prefix}-duration`]}
                  />
                  <FieldError
                    id={`${prefix}-riot-id-error`}
                    message={validationErrors[`${prefix}-riot-id`]}
                  />
                </article>
              );
            })}
          </div>
        </fieldset>
      )}

      <ReportActions isBusy={isBusy} onDispute={onDispute} />
      <ReportFeedback message={message} error={error} />
    </form>
  );
}

function SmashReportForm({
  match,
  allowedWinnerTeamId,
  bestOf,
  allowedStages,
  stockLimit,
  isBusy,
  message,
  error,
  onReport,
  onDispute,
}: SmashReportFormProps) {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.reportPanel;
  const [preset, setPreset] = useState<SmashScorePreset | null>(null);
  const [games, setGames] = useState<SmashGameDraft[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const scorePresets = getSmashScorePresets(bestOf, match.homeTeamId, match.awayTeamId).filter(
    (scorePreset) => !allowedWinnerTeamId || scorePreset.winnerTeamId === allowedWinnerTeamId,
  );
  const characterListId = `smash-characters-${match.id}`;
  const fieldIdPrefix = `smash-${match.id}`;

  function selectPreset(nextPreset: SmashScorePreset) {
    setPreset(nextPreset);
    setGames(createSmashGames(nextPreset));
    setValidationErrors({});
  }

  function updateGame(gameNumber: number, changes: Partial<SmashGameDraft>) {
    setGames((currentGames) =>
      currentGames.map((game) => (game.number === gameNumber ? { ...game, ...changes } : game)),
    );
    setValidationErrors({});
  }

  function focusInvalidField(fieldId: string) {
    requestAnimationFrame(() => {
      const field = document.getElementById(fieldId);
      if (!(field instanceof HTMLElement)) return;
      field.focus({ preventScroll: true });
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  function submitSmashReport() {
    if (!preset) {
      setValidationErrors({ score: copy.chooseSmashScore });
      focusInvalidField(`smash-score-${match.id}`);
      return;
    }

    const validation = validateSmashReport(
      {
        preset,
        games,
        allowedStages,
        stockLimit,
        fieldIdPrefix,
      },
      locale,
    );
    setValidationErrors(validation.errors);
    if (validation.firstInvalidFieldId) {
      focusInvalidField(validation.firstInvalidFieldId);
      return;
    }

    void onReport(buildSmashReportPayload({ preset, games, allowedStages, stockLimit }));
  }

  return (
    <form
      className={styles.smashForm}
      onSubmit={(event) => {
        event.preventDefault();
        submitSmashReport();
      }}
    >
      <fieldset
        className={styles.scoreFieldset}
        id={`smash-score-${match.id}`}
        tabIndex={-1}
        aria-describedby={validationErrors.score ? `smash-score-${match.id}-error` : undefined}
      >
        <legend>{formatMessage(copy.smashScoreLegend, { bestOf })}</legend>
        <div className={styles.scorePresets}>
          {scorePresets.map((scorePreset) => {
            const isSelected =
              preset?.homeScore === scorePreset.homeScore &&
              preset.awayScore === scorePreset.awayScore;
            return (
              <button
                key={`${scorePreset.homeScore}-${scorePreset.awayScore}`}
                type="button"
                className={isSelected ? styles.scorePresetActive : styles.scorePreset}
                aria-pressed={isSelected}
                onClick={() => selectPreset(scorePreset)}
              >
                <span>{scorePreset.label}</span>
                <small>
                  {formatMessage(copy.winnerPrefix, {
                    team:
                      scorePreset.winnerTeamId === match.homeTeamId
                        ? match.homeTeam
                        : match.awayTeam,
                  })}
                </small>
              </button>
            );
          })}
        </div>
        {validationErrors.score && (
          <p className={styles.fieldError} id={`smash-score-${match.id}-error`} role="alert">
            {validationErrors.score}
          </p>
        )}
      </fieldset>

      {preset && (
        <fieldset className={styles.gamesFieldset} disabled={isBusy}>
          <legend>{copy.completeSmashGames}</legend>
          <p className={styles.help}>{copy.smashHelp}</p>
          <div className={styles.gameGrid}>
            {games.map((game) => {
              const prefix = `${fieldIdPrefix}-game-${game.number}`;
              const isHomeWinner = game.winnerTeamId === match.homeTeamId;
              const winnerName = isHomeWinner ? match.homeTeam : match.awayTeam;
              const winnerStocks = isHomeWinner ? game.homeStocks : game.awayStocks;
              return (
                <article className={styles.gameCard} key={game.number}>
                  <div className={styles.gameHeader}>
                    <span>Game {game.number}</span>
                    <strong>{winnerName}</strong>
                  </div>

                  <label htmlFor={`${prefix}-stage`}>{copy.stage}</label>
                  <select
                    id={`${prefix}-stage`}
                    value={game.stage}
                    aria-invalid={Boolean(validationErrors[`${prefix}-stage`])}
                    aria-describedby={
                      validationErrors[`${prefix}-stage`] ? `${prefix}-stage-error` : undefined
                    }
                    onChange={(event) => updateGame(game.number, { stage: event.target.value })}
                  >
                    <option value="">{copy.chooseStage}</option>
                    {allowedStages.map((stage) => (
                      <option value={stage} key={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    id={`${prefix}-stage-error`}
                    message={validationErrors[`${prefix}-stage`]}
                  />

                  <div className={styles.characterFields}>
                    <div>
                      <label htmlFor={`${prefix}-home-character`}>{match.homeTeam}</label>
                      <input
                        id={`${prefix}-home-character`}
                        list={characterListId}
                        placeholder={copy.character}
                        value={game.homeCharacter}
                        aria-invalid={Boolean(validationErrors[`${prefix}-home-character`])}
                        aria-describedby={
                          validationErrors[`${prefix}-home-character`]
                            ? `${prefix}-home-character-error`
                            : undefined
                        }
                        onChange={(event) =>
                          updateGame(game.number, { homeCharacter: event.target.value })
                        }
                      />
                      <FieldError
                        id={`${prefix}-home-character-error`}
                        message={validationErrors[`${prefix}-home-character`]}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${prefix}-away-character`}>{match.awayTeam}</label>
                      <input
                        id={`${prefix}-away-character`}
                        list={characterListId}
                        placeholder={copy.character}
                        value={game.awayCharacter}
                        aria-invalid={Boolean(validationErrors[`${prefix}-away-character`])}
                        aria-describedby={
                          validationErrors[`${prefix}-away-character`]
                            ? `${prefix}-away-character-error`
                            : undefined
                        }
                        onChange={(event) =>
                          updateGame(game.number, { awayCharacter: event.target.value })
                        }
                      />
                      <FieldError
                        id={`${prefix}-away-character-error`}
                        message={validationErrors[`${prefix}-away-character`]}
                      />
                    </div>
                  </div>

                  <div className={styles.resultFields}>
                    <label>
                      {copy.winner}
                      <select
                        value={game.winnerTeamId}
                        onChange={(event) => {
                          setGames((currentGames) =>
                            currentGames.map((currentGame) =>
                              currentGame.number === game.number
                                ? updateSmashGameWinner(
                                    currentGame,
                                    event.target.value,
                                    match.homeTeamId,
                                  )
                                : currentGame,
                            ),
                          );
                          setValidationErrors({});
                        }}
                      >
                        <option value={match.homeTeamId}>{match.homeTeam}</option>
                        <option value={match.awayTeamId}>{match.awayTeam}</option>
                      </select>
                    </label>
                    <label htmlFor={`${prefix}-stocks`}>
                      {copy.remainingStocks}
                      <select
                        id={`${prefix}-stocks`}
                        value={winnerStocks}
                        aria-invalid={Boolean(validationErrors[`${prefix}-stocks`])}
                        aria-describedby={
                          validationErrors[`${prefix}-stocks`]
                            ? `${prefix}-stocks-error`
                            : undefined
                        }
                        onChange={(event) => {
                          const stocks = Number(event.target.value);
                          updateGame(
                            game.number,
                            isHomeWinner
                              ? { homeStocks: stocks, awayStocks: 0 }
                              : { homeStocks: 0, awayStocks: stocks },
                          );
                        }}
                      >
                        {Array.from({ length: stockLimit }, (_, index) => index + 1).map(
                          (stocks) => (
                            <option value={stocks} key={stocks}>
                              {stocks}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <FieldError
                    id={`${prefix}-stocks-error`}
                    message={validationErrors[`${prefix}-stocks`]}
                  />
                </article>
              );
            })}
          </div>
        </fieldset>
      )}

      <datalist id={characterListId}>
        {SMASH_ULTIMATE_CHARACTERS.map((character) => (
          <option value={character} key={character} />
        ))}
      </datalist>
      <ReportActions isBusy={isBusy} onDispute={onDispute} />
      <ReportFeedback message={message} error={error} />
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.fieldError} id={id} role="alert">
      {message}
    </p>
  );
}

function ReportActions({ isBusy, onDispute }: { isBusy: boolean; onDispute: () => Promise<void> }) {
  const { dictionary } = useI18n();
  const copy = dictionary.reportPanel;
  return (
    <div className={styles.actions}>
      <button type="submit" disabled={isBusy}>
        {isBusy ? copy.sending : copy.reportResult}
      </button>
      <button
        type="button"
        className="button button-secondary"
        disabled={isBusy}
        onClick={() => void onDispute()}
      >
        {copy.openDispute}
      </button>
    </div>
  );
}

function ReportFeedback({ message, error }: { message?: string; error?: string }) {
  return (
    <div className={styles.feedback} aria-live="polite">
      {message && <p className={styles.success}>{message}</p>}
      {error && (
        <p className={styles.requestError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReportPanel({
  tournamentId,
  gameAdapterKey,
  seriesBestOf,
  settings,
  staffMode = false,
}: ReportPanelProps) {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.reportPanel;
  const router = useRouter();
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'anonymous' | 'ready'>('loading');
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      staffMode
        ? Promise.resolve({ teams: [] as TeamView[] })
        : apiClient<{ teams: TeamView[] }>('/teams/mine'),
      apiClient<{ matches: MatchView[] }>(`/tournaments/${tournamentId}/matches`),
    ])
      .then(([teamsResponse, matchesResponse]) => {
        setTeams(teamsResponse.teams);
        setMatches(matchesResponse.matches);
        setLoadError(null);
        setLoadState('ready');
      })
      .catch((loadRequestError: unknown) => {
        if (loadRequestError instanceof ApiClientError && loadRequestError.status === 401) {
          setLoadState('anonymous');
          return;
        }
        setLoadError(copy.loadError);
      });
  }, [copy.loadError, staffMode, tournamentId]);

  const myTeamIds = new Set(teams.map((team) => team.id));
  const reportingMode = settings?.reportingMode ?? 'bilateral';
  const reportableMatches = matches.filter(
    (match) =>
      (match.status === 'scheduled' || match.status === 'in_progress') &&
      (staffMode ||
        (match.homeTeamId && myTeamIds.has(match.homeTeamId)) ||
        (match.awayTeamId && myTeamIds.has(match.awayTeamId))),
  );
  const smashRules = settings?.gameRules?.game === 'smash_ultimate' ? settings.gameRules : null;
  const allowedStages = smashRules ? [...smashRules.starters, ...smashRules.counterpicks] : [];
  const stockLimit = smashRules?.stocks ?? 3;
  const isLeagueOfLegends = gameAdapterKey === 'lol';

  async function report(matchId: string, payload: unknown) {
    setBusyMatchId(matchId);
    setErrors((current) => ({ ...current, [matchId]: '' }));
    setMessages((current) => ({ ...current, [matchId]: '' }));
    try {
      const outcome = await apiClient<{
        confirmed: boolean;
        waiting?: boolean;
        conflict?: boolean;
      }>(`/matches/${matchId}/results`, {
        method: 'POST',
        body: JSON.stringify({
          ...(payload as Record<string, unknown>),
          ...(staffMode ? { staffOverride: true } : {}),
        }),
      });
      setMessages((current) => ({
        ...current,
        [matchId]: getReportOutcomeMessage(outcome, { staffMode, reportingMode }, locale),
      }));
      router.refresh();
    } catch (reportError) {
      setErrors((current) => ({
        ...current,
        [matchId]: reportError instanceof ApiClientError ? reportError.message : copy.reportError,
      }));
    } finally {
      setBusyMatchId(null);
    }
  }

  async function openDispute(matchId: string) {
    setBusyMatchId(matchId);
    setErrors((current) => ({ ...current, [matchId]: '' }));
    try {
      await apiClient('/disputes', {
        method: 'POST',
        body: JSON.stringify({
          matchId,
          reason: staffMode ? 'system' : 'captain_request',
          message: staffMode ? copy.staffReviewMessage : copy.participantReviewMessage,
        }),
      });
      setMessages((current) => ({
        ...current,
        [matchId]: copy.disputeOpened,
      }));
      router.refresh();
    } catch (disputeError) {
      setErrors((current) => ({
        ...current,
        [matchId]:
          disputeError instanceof ApiClientError ? disputeError.message : copy.disputeError,
      }));
    } finally {
      setBusyMatchId(null);
    }
  }

  if (loadError)
    return (
      <p className={styles.loadError} role="alert">
        {loadError}
      </p>
    );
  const panelState = getReportPanelState(
    {
      loadState,
      staffMode,
      reportingMode,
      teamCount: teams.length,
      reportableMatchCount: reportableMatches.length,
    },
    locale,
  );
  if (panelState.kind === 'hidden') return null;

  if (panelState.kind === 'empty') {
    return (
      <section
        id="reportar"
        className={`card ${styles.panel}`}
        aria-labelledby="report-panel-title"
      >
        <div className={styles.emptyState}>
          <p className={styles.eyebrow}>{copy.allCaughtUp}</p>
          <h2 id="report-panel-title">{panelState.title}</h2>
          <p>{copy.emptyDescription}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="reportar" className={`card ${styles.panel}`} aria-labelledby="report-panel-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{staffMode ? copy.staffOperation : copy.competition}</p>
          <h2 id="report-panel-title">
            {formatMessage(staffMode ? copy.staffControl : copy.myMatches, {
              matches:
                gameAdapterKey === 'smash_ultimate'
                  ? copy.sets
                  : isLeagueOfLegends
                    ? copy.series
                    : copy.matches,
            })}
          </h2>
        </div>
        <span>{formatMessage(copy.pendingCount, { count: reportableMatches.length })}</span>
      </div>
      <ul className={styles.matchList}>
        {reportableMatches.map((match) => {
          const isCompleteMatch =
            match.homeTeam !== null &&
            match.awayTeam !== null &&
            match.homeTeamId !== null &&
            match.awayTeamId !== null;
          const allowedWinnerTeamId =
            !staffMode && reportingMode === 'winner_reports'
              ? [match.homeTeamId, match.awayTeamId].find((teamId): teamId is string =>
                  Boolean(teamId && myTeamIds.has(teamId)),
                )
              : undefined;
          return (
            <li className={styles.matchItem} key={match.id}>
              <div className={styles.matchTitle}>
                <span>
                  {gameAdapterKey === 'smash_ultimate'
                    ? copy.setReady
                    : isLeagueOfLegends
                      ? copy.seriesReady
                      : copy.matchReady}
                </span>
                <h3>
                  {match.homeTeam} <small>vs.</small> {match.awayTeam}
                </h3>
              </div>
              {gameAdapterKey === 'smash_ultimate' && isCompleteMatch ? (
                <SmashReportForm
                  match={match as CompleteMatchView}
                  allowedWinnerTeamId={allowedWinnerTeamId}
                  bestOf={seriesBestOf}
                  allowedStages={allowedStages}
                  stockLimit={stockLimit}
                  isBusy={busyMatchId === match.id}
                  message={messages[match.id]}
                  error={errors[match.id]}
                  onReport={(payload) => report(match.id, payload)}
                  onDispute={() => openDispute(match.id)}
                />
              ) : isLeagueOfLegends && isCompleteMatch ? (
                <LeagueReportForm
                  match={match as CompleteMatchView}
                  allowedWinnerTeamId={allowedWinnerTeamId}
                  bestOf={seriesBestOf}
                  isBusy={busyMatchId === match.id}
                  message={messages[match.id]}
                  error={errors[match.id]}
                  onReport={(payload) => report(match.id, payload)}
                  onDispute={() => openDispute(match.id)}
                />
              ) : (
                <GenericReportForm
                  match={match}
                  allowedWinnerTeamId={allowedWinnerTeamId}
                  isBusy={busyMatchId === match.id}
                  message={messages[match.id]}
                  error={errors[match.id]}
                  onReport={(payload) => report(match.id, payload)}
                  onDispute={() => openDispute(match.id)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
