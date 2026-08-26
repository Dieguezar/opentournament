import { describe, expect, it } from 'vitest';
import type { ReportResultInput, SmashGameResultInput } from '@opentournament/validation';
import { validateGameReport } from './smash-game-report.js';

const homeTeamId = '11111111-1111-4111-8111-111111111111';
const awayTeamId = '22222222-2222-4222-8222-222222222222';

const context = {
  gameAdapterKey: 'smash_ultimate',
  bestOf: 3,
  stockLimit: 3,
  stagePool: ['Battlefield', 'Smashville', 'Hollow Bastion'],
  homeTeamId,
  awayTeamId,
};

const games: SmashGameResultInput[] = [
  {
    number: 1,
    stage: 'battlefield',
    homeCharacter: 'Mario',
    awayCharacter: 'Link',
    winnerTeamId: homeTeamId,
    homeStocks: 1,
    awayStocks: 0,
  },
  {
    number: 2,
    stage: 'Smashville',
    homeCharacter: 'Mario',
    awayCharacter: 'Link',
    winnerTeamId: awayTeamId,
    homeStocks: 0,
    awayStocks: 2,
  },
  {
    number: 3,
    stage: 'Hollow Bastion',
    homeCharacter: 'Luigi',
    awayCharacter: 'Young Link',
    winnerTeamId: homeTeamId,
    homeStocks: 2,
    awayStocks: 0,
  },
];

function report(overrides: Partial<ReportResultInput> = {}): ReportResultInput {
  return {
    winnerTeamId: homeTeamId,
    draw: false,
    homeScore: 2,
    awayScore: 1,
    games,
    ...overrides,
  };
}

describe('contextual Smash Ultimate game validation', () => {
  it('accepts a consistent BO3 and canonicalizes the stage name', () => {
    const result = validateGameReport(context, report());

    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.games?.[0]?.stage).toBe('Battlefield');
  });

  it('keeps reports without details compatible during the UI transition', () => {
    expect(validateGameReport(context, report({ games: undefined }))).toEqual({
      ok: true,
      games: undefined,
    });
  });

  it('rejects Smash-specific details for other adapters', () => {
    expect(validateGameReport({ ...context, gameAdapterKey: 'valorant' }, report())).toMatchObject({
      ok: false,
      code: 'GAME_DETAILS_NOT_ALLOWED',
    });
  });

  it('rejects non-sequential games and sets longer than the configured best-of', () => {
    expect(
      validateGameReport(
        context,
        report({ games: games.map((game, index) => ({ ...game, number: index + 2 })) }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_GAME_SEQUENCE' });

    expect(
      validateGameReport(context, report({ games: [...games, { ...games[0]!, number: 4 }] })),
    ).toMatchObject({ ok: false, code: 'INVALID_SET_LENGTH' });
  });

  it('rejects stages outside the ruleset and winners outside the match', () => {
    expect(
      validateGameReport(
        context,
        report({ games: [{ ...games[0]!, stage: 'Corneria' }, ...games.slice(1)] }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_GAME_STAGE' });

    expect(
      validateGameReport(
        context,
        report({
          games: [
            {
              ...games[0]!,
              winnerTeamId: '33333333-3333-4333-8333-333333333333',
            },
            ...games.slice(1),
          ],
        }),
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_GAME_WINNER' });
  });

  it('rejects stocks incompatible with the winner or tournament limit', () => {
    for (const invalidGame of [
      { ...games[0]!, homeStocks: 0 },
      { ...games[0]!, awayStocks: 1 },
      { ...games[0]!, homeStocks: 4 },
    ]) {
      expect(
        validateGameReport(context, report({ games: [invalidGame, ...games.slice(1)] })),
      ).toMatchObject({ ok: false, code: 'INVALID_GAME_STOCKS' });
    }
  });

  it('rejects a score, winner, or set ending inconsistent with the games', () => {
    expect(validateGameReport(context, report({ homeScore: 1 }))).toMatchObject({
      ok: false,
      code: 'INVALID_SET_SCORE',
    });
    expect(validateGameReport(context, report({ winnerTeamId: awayTeamId }))).toMatchObject({
      ok: false,
      code: 'INVALID_SET_WINNER',
    });
    expect(
      validateGameReport(context, report({ homeScore: 1, awayScore: 0, games: [games[0]!] })),
    ).toMatchObject({ ok: false, code: 'INVALID_SET_LENGTH' });
  });
});
