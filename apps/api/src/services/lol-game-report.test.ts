import { describe, expect, it } from 'vitest';
import type { ReportResultInput } from '@opentournament/validation';
import { validateLeagueGameReport } from './lol-game-report.js';

const homeTeamId = '11111111-1111-4111-8111-111111111111';
const awayTeamId = '22222222-2222-4222-8222-222222222222';

function report(overrides: Partial<ReportResultInput> = {}): ReportResultInput {
  return {
    winnerTeamId: homeTeamId,
    homeScore: 2,
    awayScore: 0,
    draw: false,
    lolGames: [
      {
        number: 1,
        winnerTeamId: homeTeamId,
        blueTeamId: homeTeamId,
        durationMinutes: 28,
        riotMatchId: 'LA1_1001',
      },
      {
        number: 2,
        winnerTeamId: homeTeamId,
        blueTeamId: awayTeamId,
        durationMinutes: 34,
        riotMatchId: 'LA1_1002',
      },
    ],
    ...overrides,
  };
}

const context = { gameAdapterKey: 'lol', bestOf: 3, homeTeamId, awayTeamId };

describe('validación contextual de partidas de League of Legends', () => {
  it('acepta un BO3 coherente y conserva los detalles normalizados', () => {
    expect(validateLeagueGameReport(context, report())).toEqual({
      ok: true,
      games: report().lolGames,
    });
  });

  it('mantiene compatibles los reportes sin detalle', () => {
    expect(validateLeagueGameReport(context, report({ lolGames: undefined }))).toEqual({
      ok: true,
      games: undefined,
    });
  });

  it('rechaza detalles de LoL en otros adaptadores', () => {
    expect(
      validateLeagueGameReport({ ...context, gameAdapterKey: 'valorant' }, report()),
    ).toMatchObject({
      ok: false,
      code: 'LOL_GAME_DETAILS_NOT_ALLOWED',
    });
  });

  it('rechaza secuencia, participantes y Riot Match IDs repetidos', () => {
    expect(
      validateLeagueGameReport(
        context,
        report({ lolGames: report().lolGames?.map((game) => ({ ...game, number: 2 })) }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_LOL_GAME_SEQUENCE' });
    expect(
      validateLeagueGameReport(
        context,
        report({ lolGames: [{ ...report().lolGames![0]!, blueTeamId: crypto.randomUUID() }] }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_LOL_GAME_SIDE' });
    expect(
      validateLeagueGameReport(
        context,
        report({
          lolGames: report().lolGames?.map((game) => ({ ...game, riotMatchId: 'LA1_1001' })),
        }),
      ),
    ).toMatchObject({ ok: false, code: 'DUPLICATE_RIOT_MATCH_ID' });
  });

  it('rechaza marcador, ganador o longitud incompatibles con la serie', () => {
    expect(validateLeagueGameReport(context, report({ homeScore: 1 }))).toMatchObject({
      ok: false,
      code: 'INVALID_LOL_SERIES_SCORE',
    });
    expect(validateLeagueGameReport(context, report({ winnerTeamId: awayTeamId }))).toMatchObject({
      ok: false,
      code: 'INVALID_LOL_SERIES_WINNER',
    });
    expect(
      validateLeagueGameReport(context, report({ lolGames: [report().lolGames![0]!] })),
    ).toMatchObject({ ok: false, code: 'INVALID_LOL_SERIES_LENGTH' });
  });
});
