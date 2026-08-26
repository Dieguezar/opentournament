import type { ReportResultInput, SmashGameResultInput } from '@opentournament/validation';

interface GameReportContext {
  gameAdapterKey: string;
  bestOf: number;
  stockLimit: number;
  stagePool: readonly string[];
  homeTeamId: string;
  awayTeamId: string;
}

interface ValidGameReport {
  ok: true;
  games: SmashGameResultInput[] | undefined;
}

interface InvalidGameReport {
  ok: false;
  code:
    | 'GAME_DETAILS_NOT_ALLOWED'
    | 'INVALID_GAME_SEQUENCE'
    | 'INVALID_GAME_STAGE'
    | 'INVALID_GAME_WINNER'
    | 'INVALID_GAME_STOCKS'
    | 'INVALID_SET_LENGTH'
    | 'INVALID_SET_SCORE'
    | 'INVALID_SET_WINNER';
  message: string;
}

export type GameReportValidation = ValidGameReport | InvalidGameReport;

function normalizeStageName(stageName: string): string {
  return stageName.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

export function validateGameReport(
  context: GameReportContext,
  report: ReportResultInput,
): GameReportValidation {
  if (!report.games) return { ok: true, games: undefined };
  if (context.gameAdapterKey !== 'smash_ultimate') {
    return {
      ok: false,
      code: 'GAME_DETAILS_NOT_ALLOWED',
      message: 'Per-game details are only available for Smash Ultimate',
    };
  }

  if (
    report.games.length > context.bestOf ||
    report.games.some((game, index) => game.number !== index + 1)
  ) {
    const hasInvalidSequence = report.games.some((game, index) => game.number !== index + 1);
    return hasInvalidSequence
      ? {
          ok: false,
          code: 'INVALID_GAME_SEQUENCE',
          message: 'Games must be numbered consecutively from 1',
        }
      : {
          ok: false,
          code: 'INVALID_SET_LENGTH',
          message: 'The set contains more games than the configured best-of allows',
        };
  }

  const stagesByNormalizedName = new Map(
    context.stagePool.map((stageName) => [normalizeStageName(stageName), stageName]),
  );
  const normalizedGames: SmashGameResultInput[] = [];
  let homeWins = 0;
  let awayWins = 0;
  const requiredWins = Math.floor(context.bestOf / 2) + 1;

  for (const [index, game] of report.games.entries()) {
    const canonicalStage = stagesByNormalizedName.get(normalizeStageName(game.stage));
    if (!canonicalStage) {
      return {
        ok: false,
        code: 'INVALID_GAME_STAGE',
        message: `The stage in game ${game.number} is not part of the ruleset`,
      };
    }
    if (game.winnerTeamId !== context.homeTeamId && game.winnerTeamId !== context.awayTeamId) {
      return {
        ok: false,
        code: 'INVALID_GAME_WINNER',
        message: `The winner of game ${game.number} does not participate in the match`,
      };
    }

    const isHomeWinner = game.winnerTeamId === context.homeTeamId;
    const winnerStocks = isHomeWinner ? game.homeStocks : game.awayStocks;
    const loserStocks = isHomeWinner ? game.awayStocks : game.homeStocks;
    if (
      winnerStocks < 1 ||
      winnerStocks > context.stockLimit ||
      loserStocks !== 0 ||
      game.homeStocks > context.stockLimit ||
      game.awayStocks > context.stockLimit
    ) {
      return {
        ok: false,
        code: 'INVALID_GAME_STOCKS',
        message: `The stocks in game ${game.number} do not match its winner`,
      };
    }

    if (isHomeWinner) homeWins += 1;
    else awayWins += 1;
    if (
      index < report.games.length - 1 &&
      (homeWins === requiredWins || awayWins === requiredWins)
    ) {
      return {
        ok: false,
        code: 'INVALID_SET_LENGTH',
        message: 'The set contains games after a decisive victory',
      };
    }
    normalizedGames.push({ ...game, stage: canonicalStage });
  }

  if (homeWins !== report.homeScore || awayWins !== report.awayScore) {
    return {
      ok: false,
      code: 'INVALID_SET_SCORE',
      message: 'The overall score does not match the reported games',
    };
  }
  if (homeWins !== requiredWins && awayWins !== requiredWins) {
    return {
      ok: false,
      code: 'INVALID_SET_LENGTH',
      message: 'The report does not complete the configured set',
    };
  }

  const setWinnerTeamId = homeWins === requiredWins ? context.homeTeamId : context.awayTeamId;
  if (report.draw || report.winnerTeamId !== setWinnerTeamId) {
    return {
      ok: false,
      code: 'INVALID_SET_WINNER',
      message: 'The overall winner does not match the reported games',
    };
  }

  return { ok: true, games: normalizedGames };
}
