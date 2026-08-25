'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { GameAdapterKey, TournamentSettings } from '@opentournament/shared-types';
import { apiClient, ApiClientError } from '@/lib/api';
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
}

interface GenericReportFormProps {
  match: MatchView;
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
  bestOf: number;
  allowedStages: readonly string[];
  stockLimit: number;
  isBusy: boolean;
  message?: string;
  error?: string;
  onReport: (payload: SmashReportPayload) => Promise<void>;
  onDispute: () => Promise<void>;
}

function GenericReportForm({
  match,
  isBusy,
  message,
  error,
  onReport,
  onDispute,
}: GenericReportFormProps) {
  const [winnerTeamId, setWinnerTeamId] = useState(match.homeTeamId ?? match.awayTeamId ?? '');
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
          Ganador
          <select value={winnerTeamId} onChange={(event) => setWinnerTeamId(event.target.value)}>
            {match.homeTeam && <option value={match.homeTeamId!}>{match.homeTeam}</option>}
            {match.awayTeam && <option value={match.awayTeamId!}>{match.awayTeam}</option>}
          </select>
        </label>
        <label>
          Puntos de {match.homeTeam ?? 'local'}
          <input
            inputMode="numeric"
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
          />
        </label>
        <label>
          Puntos de {match.awayTeam ?? 'visitante'}
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

function SmashReportForm({
  match,
  bestOf,
  allowedStages,
  stockLimit,
  isBusy,
  message,
  error,
  onReport,
  onDispute,
}: SmashReportFormProps) {
  const [preset, setPreset] = useState<SmashScorePreset | null>(null);
  const [games, setGames] = useState<SmashGameDraft[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const scorePresets = getSmashScorePresets(bestOf, match.homeTeamId, match.awayTeamId);
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
      setValidationErrors({ score: 'Elegí el marcador final del set.' });
      focusInvalidField(`smash-score-${match.id}`);
      return;
    }

    const validation = validateSmashReport({
      preset,
      games,
      allowedStages,
      stockLimit,
      fieldIdPrefix,
    });
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
        <legend>1. ¿Cómo terminó el set? · BO{bestOf}</legend>
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
                  Gana{' '}
                  {scorePreset.winnerTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam}
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
          <legend>2. Completá cada game</legend>
          <p className={styles.help}>
            El marcador crea la cantidad exacta de games. Podés corregir el ganador de cada uno;
            comprobaremos que siga coincidiendo con el resultado final.
          </p>
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

                  <label htmlFor={`${prefix}-stage`}>Escenario</label>
                  <select
                    id={`${prefix}-stage`}
                    value={game.stage}
                    aria-invalid={Boolean(validationErrors[`${prefix}-stage`])}
                    aria-describedby={
                      validationErrors[`${prefix}-stage`] ? `${prefix}-stage-error` : undefined
                    }
                    onChange={(event) => updateGame(game.number, { stage: event.target.value })}
                  >
                    <option value="">Elegí un escenario</option>
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
                        placeholder="Personaje"
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
                        placeholder="Personaje"
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
                      Ganador
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
                      Stocks restantes
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
  return (
    <div className={styles.actions}>
      <button type="submit" disabled={isBusy}>
        {isBusy ? 'Enviando…' : 'Reportar resultado'}
      </button>
      <button
        type="button"
        className="button button-secondary"
        disabled={isBusy}
        onClick={() => void onDispute()}
      >
        Abrir disputa
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
}: ReportPanelProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      apiClient<{ teams: TeamView[] }>('/teams/mine'),
      apiClient<{ matches: MatchView[] }>(`/tournaments/${tournamentId}/matches`),
    ])
      .then(([teamsResponse, matchesResponse]) => {
        setTeams(teamsResponse.teams);
        setMatches(matchesResponse.matches);
        setLoadError(null);
      })
      .catch((loadRequestError: unknown) => {
        if (loadRequestError instanceof ApiClientError && loadRequestError.status === 401) return;
        setLoadError('No pudimos cargar tus partidas. Intentá actualizar la página.');
      });
  }, [tournamentId]);

  const myTeamIds = new Set(teams.map((team) => team.id));
  const reportableMatches = matches.filter(
    (match) =>
      (match.status === 'scheduled' || match.status === 'in_progress') &&
      ((match.homeTeamId && myTeamIds.has(match.homeTeamId)) ||
        (match.awayTeamId && myTeamIds.has(match.awayTeamId))),
  );
  const smashRules = settings?.gameRules?.game === 'smash_ultimate' ? settings.gameRules : null;
  const allowedStages = smashRules ? [...smashRules.starters, ...smashRules.counterpicks] : [];
  const stockLimit = smashRules?.stocks ?? 3;

  async function report(matchId: string, payload: unknown) {
    setBusyMatchId(matchId);
    setErrors((current) => ({ ...current, [matchId]: '' }));
    setMessages((current) => ({ ...current, [matchId]: '' }));
    try {
      await apiClient(`/matches/${matchId}/results`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMessages((current) => ({
        ...current,
        [matchId]: 'Reporte enviado. Esperando la confirmación del rival…',
      }));
      router.refresh();
    } catch (reportError) {
      setErrors((current) => ({
        ...current,
        [matchId]:
          reportError instanceof ApiClientError ? reportError.message : 'Error al reportar',
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
          reason: 'captain_request',
          message: 'Solicito revisión del resultado de la partida.',
        }),
      });
      setMessages((current) => ({
        ...current,
        [matchId]: 'Disputa abierta. El staff la revisará.',
      }));
      router.refresh();
    } catch (disputeError) {
      setErrors((current) => ({
        ...current,
        [matchId]:
          disputeError instanceof ApiClientError
            ? disputeError.message
            : 'Error al abrir la disputa',
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
  if (reportableMatches.length === 0) return null;

  return (
    <section className={`card ${styles.panel}`} aria-labelledby="report-panel-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Competencia</p>
          <h2 id="report-panel-title">
            Mis {gameAdapterKey === 'smash_ultimate' ? 'sets' : 'partidas'}
          </h2>
        </div>
        <span>{reportableMatches.length} por reportar</span>
      </div>
      <ul className={styles.matchList}>
        {reportableMatches.map((match) => {
          const isCompleteMatch =
            match.homeTeam !== null &&
            match.awayTeam !== null &&
            match.homeTeamId !== null &&
            match.awayTeamId !== null;
          return (
            <li className={styles.matchItem} key={match.id}>
              <div className={styles.matchTitle}>
                <span>
                  {gameAdapterKey === 'smash_ultimate'
                    ? 'Set listo para reportar'
                    : 'Partida lista para reportar'}
                </span>
                <h3>
                  {match.homeTeam} <small>vs.</small> {match.awayTeam}
                </h3>
              </div>
              {gameAdapterKey === 'smash_ultimate' && isCompleteMatch ? (
                <SmashReportForm
                  match={match as CompleteMatchView}
                  bestOf={seriesBestOf}
                  allowedStages={allowedStages}
                  stockLimit={stockLimit}
                  isBusy={busyMatchId === match.id}
                  message={messages[match.id]}
                  error={errors[match.id]}
                  onReport={(payload) => report(match.id, payload)}
                  onDispute={() => openDispute(match.id)}
                />
              ) : (
                <GenericReportForm
                  match={match}
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
