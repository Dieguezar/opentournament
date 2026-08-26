import { describe, expect, it } from 'vitest';
import {
  buildSmashReportPayload,
  createSmashGames,
  getSmashScorePresets,
  updateSmashGameWinner,
  validateSmashReport,
} from './smash-report';

const HOME_ID = '00000000-0000-4000-8000-000000000101';
const AWAY_ID = '00000000-0000-4000-8000-000000000102';
const STAGES = ['Battlefield', 'Final Destination'];

describe('Smash Ultimate score presets', () => {
  it('only offers decisive outcomes for BO3 and BO5', () => {
    expect(getSmashScorePresets(3, HOME_ID, AWAY_ID)).toMatchObject([
      { homeScore: 2, awayScore: 0, winnerTeamId: HOME_ID },
      { homeScore: 2, awayScore: 1, winnerTeamId: HOME_ID },
      { homeScore: 0, awayScore: 2, winnerTeamId: AWAY_ID },
      { homeScore: 1, awayScore: 2, winnerTeamId: AWAY_ID },
    ]);

    expect(getSmashScorePresets(5, HOME_ID, AWAY_ID)).toHaveLength(6);
    expect(getSmashScorePresets(1, HOME_ID, AWAY_ID)).toEqual([]);
  });

  it('generates exactly the games required by the score with a consistent winner', () => {
    const preset = getSmashScorePresets(3, HOME_ID, AWAY_ID)[1]!;
    const games = createSmashGames(preset);

    expect(games).toHaveLength(3);
    expect(games.map((game) => game.number)).toEqual([1, 2, 3]);
    expect(games.filter((game) => game.winnerTeamId === HOME_ID)).toHaveLength(2);
    expect(games.filter((game) => game.winnerTeamId === AWAY_ID)).toHaveLength(1);
  });

  it('sets the loser to zero stocks when a game winner changes', () => {
    const preset = getSmashScorePresets(3, HOME_ID, AWAY_ID)[0]!;
    const game = {
      ...createSmashGames(preset)[0]!,
      homeStocks: 2,
      awayStocks: 0,
    };

    expect(updateSmashGameWinner(game, AWAY_ID, HOME_ID)).toMatchObject({
      winnerTeamId: AWAY_ID,
      homeStocks: 0,
      awayStocks: 1,
    });
  });
});

describe('guided Smash Ultimate report validation', () => {
  function getCompleteReport() {
    const preset = getSmashScorePresets(3, HOME_ID, AWAY_ID)[1]!;
    const games = createSmashGames(preset).map((game, index) => ({
      ...game,
      stage: STAGES[index % STAGES.length]!,
      homeCharacter: 'Mario',
      awayCharacter: 'Link',
    }));

    return { preset, games };
  }

  it('identifies and localizes the first missing field', () => {
    const { preset, games } = getCompleteReport();
    games[0] = { ...games[0]!, stage: '' };

    const result = validateSmashReport({ preset, games, allowedStages: STAGES, stockLimit: 3 });

    expect(result.firstInvalidFieldId).toBe('smash-game-1-stage');
    expect(result.errors['smash-game-1-stage']).toBe('Elegí el escenario del game 1.');

    const englishResult = validateSmashReport(
      { preset, games, allowedStages: STAGES, stockLimit: 3 },
      'en',
    );
    expect(englishResult.errors['smash-game-1-stage']).toBe('Choose the stage for game 1.');
  });

  it('rejects stages outside the ruleset and empty characters', () => {
    const { preset, games } = getCompleteReport();
    games[0] = { ...games[0]!, stage: 'Corneria', awayCharacter: '   ' };

    const result = validateSmashReport({ preset, games, allowedStages: STAGES, stockLimit: 3 });

    expect(result.errors['smash-game-1-stage']).toBe('Ese escenario no pertenece al ruleset.');
    expect(result.errors['smash-game-1-away-character']).toBe(
      'Elegí el personaje del jugador visitante.',
    );
  });

  it('rejects invalid stocks and an outcome that no longer matches the preset', () => {
    const { preset, games } = getCompleteReport();
    games[0] = { ...games[0]!, winnerTeamId: AWAY_ID, homeStocks: 0, awayStocks: 4 };

    const result = validateSmashReport({ preset, games, allowedStages: STAGES, stockLimit: 3 });

    expect(result.errors['smash-game-1-stocks']).toBe(
      'Los stocks del ganador deben estar entre 1 y 3.',
    );
    expect(result.errors.score).toBe(
      'Los ganadores por game no coinciden con el marcador elegido.',
    );
  });

  it('rejects stocks assigned to the loser even when the win total matches', () => {
    const { preset, games } = getCompleteReport();
    games[0] = { ...games[0]!, homeStocks: 0, awayStocks: 1 };

    const result = validateSmashReport({ preset, games, allowedStages: STAGES, stockLimit: 3 });

    expect(result.errors['smash-game-1-stocks']).toBe(
      'Los stocks restantes deben pertenecer al ganador del game.',
    );
  });

  it('builds the API contract when the report is valid', () => {
    const { preset, games } = getCompleteReport();

    expect(
      buildSmashReportPayload({ preset, games, allowedStages: STAGES, stockLimit: 3 }),
    ).toEqual({
      winnerTeamId: HOME_ID,
      homeScore: 2,
      awayScore: 1,
      games,
    });
  });
});
