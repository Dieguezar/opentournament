import type { LeagueGameResultInput, ReportResultInput } from '@opentournament/validation';

interface LeagueGameReportContext {
  gameAdapterKey: string;
  bestOf: number;
  homeTeamId: string;
  awayTeamId: string;
}

interface ValidLeagueGameReport {
  ok: true;
  games: LeagueGameResultInput[] | undefined;
}

interface InvalidLeagueGameReport {
  ok: false;
  code:
    | 'LOL_GAME_DETAILS_NOT_ALLOWED'
    | 'INVALID_LOL_GAME_SEQUENCE'
    | 'INVALID_LOL_GAME_SIDE'
    | 'INVALID_LOL_GAME_WINNER'
    | 'INVALID_LOL_SERIES_LENGTH'
    | 'INVALID_LOL_SERIES_SCORE'
    | 'INVALID_LOL_SERIES_WINNER'
    | 'DUPLICATE_RIOT_MATCH_ID';
  message: string;
}

export type LeagueGameReportValidation = ValidLeagueGameReport | InvalidLeagueGameReport;

export function validateLeagueGameReport(
  context: LeagueGameReportContext,
  report: ReportResultInput,
): LeagueGameReportValidation {
  if (!report.lolGames) return { ok: true, games: undefined };
  if (context.gameAdapterKey !== 'lol') {
    return {
      ok: false,
      code: 'LOL_GAME_DETAILS_NOT_ALLOWED',
      message: 'Per-game details are only available for League of Legends',
    };
  }

  if (
    report.lolGames.length > context.bestOf ||
    report.lolGames.some((game, index) => game.number !== index + 1)
  ) {
    const hasInvalidSequence = report.lolGames.some((game, index) => game.number !== index + 1);
    return hasInvalidSequence
      ? {
          ok: false,
          code: 'INVALID_LOL_GAME_SEQUENCE',
          message: 'Games must be numbered consecutively from 1',
        }
      : {
          ok: false,
          code: 'INVALID_LOL_SERIES_LENGTH',
          message: 'The series contains more games than the configured best-of allows',
        };
  }

  const teamIds = new Set([context.homeTeamId, context.awayTeamId]);
  const riotMatchIds = report.lolGames
    .map((game) => game.riotMatchId)
    .filter((matchId): matchId is string => Boolean(matchId));
  if (new Set(riotMatchIds).size !== riotMatchIds.length) {
    return {
      ok: false,
      code: 'DUPLICATE_RIOT_MATCH_ID',
      message: 'Cada Riot Match ID debe identificar una partida distinta',
    };
  }

  let homeWins = 0;
  let awayWins = 0;
  const requiredWins = Math.floor(context.bestOf / 2) + 1;

  for (const [index, game] of report.lolGames.entries()) {
    if (!teamIds.has(game.blueTeamId)) {
      return {
        ok: false,
        code: 'INVALID_LOL_GAME_SIDE',
        message: `The blue-side team in game ${game.number} does not participate in the series`,
      };
    }
    if (!teamIds.has(game.winnerTeamId)) {
      return {
        ok: false,
        code: 'INVALID_LOL_GAME_WINNER',
        message: `The winner of game ${game.number} does not participate in the series`,
      };
    }

    if (game.winnerTeamId === context.homeTeamId) homeWins += 1;
    else awayWins += 1;

    if (
      index < report.lolGames.length - 1 &&
      (homeWins === requiredWins || awayWins === requiredWins)
    ) {
      return {
        ok: false,
        code: 'INVALID_LOL_SERIES_LENGTH',
        message: 'The series contains games after a decisive victory',
      };
    }
  }

  if (homeWins !== requiredWins && awayWins !== requiredWins) {
    return {
      ok: false,
      code: 'INVALID_LOL_SERIES_LENGTH',
      message: 'The report does not complete the configured series',
    };
  }
  if (homeWins !== report.homeScore || awayWins !== report.awayScore) {
    return {
      ok: false,
      code: 'INVALID_LOL_SERIES_SCORE',
      message: 'The overall score does not match the reported games',
    };
  }

  const winnerTeamId = homeWins === requiredWins ? context.homeTeamId : context.awayTeamId;
  if (report.draw || report.winnerTeamId !== winnerTeamId) {
    return {
      ok: false,
      code: 'INVALID_LOL_SERIES_WINNER',
      message: 'The overall winner does not match the reported games',
    };
  }

  return { ok: true, games: report.lolGames };
}
