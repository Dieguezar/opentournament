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
      message: 'El detalle por partida sólo está disponible para League of Legends',
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
          message: 'Las partidas deben numerarse consecutivamente desde 1',
        }
      : {
          ok: false,
          code: 'INVALID_LOL_SERIES_LENGTH',
          message: 'La serie contiene más partidas que el BO configurado',
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
        message: `El equipo azul de la partida ${game.number} no participa en la serie`,
      };
    }
    if (!teamIds.has(game.winnerTeamId)) {
      return {
        ok: false,
        code: 'INVALID_LOL_GAME_WINNER',
        message: `El ganador de la partida ${game.number} no participa en la serie`,
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
        message: 'La serie contiene partidas posteriores a una victoria definitiva',
      };
    }
  }

  if (homeWins !== requiredWins && awayWins !== requiredWins) {
    return {
      ok: false,
      code: 'INVALID_LOL_SERIES_LENGTH',
      message: 'El reporte no completa la serie configurada',
    };
  }
  if (homeWins !== report.homeScore || awayWins !== report.awayScore) {
    return {
      ok: false,
      code: 'INVALID_LOL_SERIES_SCORE',
      message: 'El marcador global no coincide con las partidas reportadas',
    };
  }

  const winnerTeamId = homeWins === requiredWins ? context.homeTeamId : context.awayTeamId;
  if (report.draw || report.winnerTeamId !== winnerTeamId) {
    return {
      ok: false,
      code: 'INVALID_LOL_SERIES_WINNER',
      message: 'El ganador global no coincide con las partidas reportadas',
    };
  }

  return { ok: true, games: report.lolGames };
}
