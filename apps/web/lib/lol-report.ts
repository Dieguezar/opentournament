import { DEFAULT_LOCALE, getDictionary, type Locale } from './i18n';

export interface LeagueScorePreset {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string;
  label: string;
}

export interface LeagueGameDraft {
  number: number;
  winnerTeamId: string;
  blueTeamId: string;
  durationMinutes: number;
  riotMatchId: string;
}

export interface LeagueReportDraft {
  preset: LeagueScorePreset;
  games: LeagueGameDraft[];
  fieldIdPrefix?: string;
}

export interface LeagueReportValidation {
  errors: Record<string, string>;
  firstInvalidFieldId: string | null;
  games: LeagueGameDraft[];
}

export interface LeagueReportPayload {
  winnerTeamId: string;
  homeScore: number;
  awayScore: number;
  lolGames: Array<Omit<LeagueGameDraft, 'riotMatchId'> & { riotMatchId?: string }>;
}

export function getLeagueScorePresets(
  bestOf: number,
  homeTeamId: string,
  awayTeamId: string,
): LeagueScorePreset[] {
  if (bestOf !== 1 && bestOf !== 3 && bestOf !== 5) return [];

  const winsRequired = Math.floor(bestOf / 2) + 1;
  const homeWins = Array.from({ length: winsRequired }, (_, awayScore) => ({
    homeTeamId,
    awayTeamId,
    homeScore: winsRequired,
    awayScore,
    winnerTeamId: homeTeamId,
    label: `${winsRequired}–${awayScore}`,
  }));
  const awayWins = Array.from({ length: winsRequired }, (_, homeScore) => ({
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore: winsRequired,
    winnerTeamId: awayTeamId,
    label: `${homeScore}–${winsRequired}`,
  }));

  return [...homeWins, ...awayWins];
}

function createWinnerSequence(preset: LeagueScorePreset): string[] {
  const winnerTeamId = preset.winnerTeamId;
  const loserTeamId = winnerTeamId === preset.homeTeamId ? preset.awayTeamId : preset.homeTeamId;
  const loserScore = Math.min(preset.homeScore, preset.awayScore);
  const winnerScore = Math.max(preset.homeScore, preset.awayScore);
  const sequence: string[] = [];

  for (let index = 0; index < loserScore; index += 1) sequence.push(winnerTeamId, loserTeamId);
  while (sequence.filter((teamId) => teamId === winnerTeamId).length < winnerScore) {
    sequence.push(winnerTeamId);
  }
  return sequence;
}

export function createLeagueGames(preset: LeagueScorePreset): LeagueGameDraft[] {
  return createWinnerSequence(preset).map((winnerTeamId, index) => ({
    number: index + 1,
    winnerTeamId,
    blueTeamId: index % 2 === 0 ? preset.homeTeamId : preset.awayTeamId,
    durationMinutes: 30,
    riotMatchId: '',
  }));
}

export function updateLeagueGameWinner(
  game: LeagueGameDraft,
  winnerTeamId: string,
): LeagueGameDraft {
  return { ...game, winnerTeamId };
}

export function validateLeagueReport(
  input: LeagueReportDraft,
  locale: Locale = DEFAULT_LOCALE,
): LeagueReportValidation {
  const copy = getDictionary(locale).reportPanel;
  const errors: Record<string, string> = {};
  const games = input.games.map((game) => ({ ...game, riotMatchId: game.riotMatchId.trim() }));
  const validTeamIds = new Set([input.preset.homeTeamId, input.preset.awayTeamId]);

  for (const game of games) {
    const prefix = `${input.fieldIdPrefix ?? 'lol'}-game-${game.number}`;
    if (
      !Number.isInteger(game.durationMinutes) ||
      game.durationMinutes < 5 ||
      game.durationMinutes > 180
    ) {
      errors[`${prefix}-duration`] = copy.leagueDurationError;
    }
    if (game.riotMatchId && !/^[A-Za-z0-9_-]+$/.test(game.riotMatchId)) {
      errors[`${prefix}-riot-id`] = copy.riotIdFormatError;
    }
    if (!validTeamIds.has(game.blueTeamId)) {
      errors[`${prefix}-blue-team`] = copy.blueSideError;
    }
  }

  const matchIds = games.map((game) => game.riotMatchId).filter(Boolean);
  if (new Set(matchIds).size !== matchIds.length) {
    const duplicate = games.find((game, index) =>
      game.riotMatchId
        ? games.findIndex((candidate) => candidate.riotMatchId === game.riotMatchId) !== index
        : false,
    );
    if (duplicate) {
      errors[`${input.fieldIdPrefix ?? 'lol'}-game-${duplicate.number}-riot-id`] =
        copy.duplicateRiotIdError;
    }
  }

  const homeWins = games.filter((game) => game.winnerTeamId === input.preset.homeTeamId).length;
  const awayWins = games.filter((game) => game.winnerTeamId === input.preset.awayTeamId).length;
  if (homeWins !== input.preset.homeScore || awayWins !== input.preset.awayScore) {
    errors.score = copy.leagueWinnersError;
  }

  return { errors, firstInvalidFieldId: Object.keys(errors)[0] ?? null, games };
}

export function buildLeagueReportPayload(input: LeagueReportDraft): LeagueReportPayload {
  const validation = validateLeagueReport(input);
  if (validation.firstInvalidFieldId) {
    throw new Error(getDictionary(DEFAULT_LOCALE).reportPanel.leagueIncompleteError);
  }

  return {
    winnerTeamId: input.preset.winnerTeamId,
    homeScore: input.preset.homeScore,
    awayScore: input.preset.awayScore,
    lolGames: validation.games.map(({ riotMatchId, ...game }) => ({
      ...game,
      ...(riotMatchId ? { riotMatchId } : {}),
    })),
  };
}
