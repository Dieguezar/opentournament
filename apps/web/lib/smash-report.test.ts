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

describe('presets de marcador de Smash Ultimate', () => {
  it('ofrece únicamente resultados definitivos para BO3 y BO5', () => {
    expect(getSmashScorePresets(3, HOME_ID, AWAY_ID)).toMatchObject([
      { homeScore: 2, awayScore: 0, winnerTeamId: HOME_ID },
      { homeScore: 2, awayScore: 1, winnerTeamId: HOME_ID },
      { homeScore: 0, awayScore: 2, winnerTeamId: AWAY_ID },
      { homeScore: 1, awayScore: 2, winnerTeamId: AWAY_ID },
    ]);

    expect(getSmashScorePresets(5, HOME_ID, AWAY_ID)).toHaveLength(6);
    expect(getSmashScorePresets(1, HOME_ID, AWAY_ID)).toEqual([]);
  });

  it('genera exactamente los games del marcador elegido con un ganador global coherente', () => {
    const preset = getSmashScorePresets(3, HOME_ID, AWAY_ID)[1]!;
    const games = createSmashGames(preset);

    expect(games).toHaveLength(3);
    expect(games.map((game) => game.number)).toEqual([1, 2, 3]);
    expect(games.filter((game) => game.winnerTeamId === HOME_ID)).toHaveLength(2);
    expect(games.filter((game) => game.winnerTeamId === AWAY_ID)).toHaveLength(1);
  });

  it('pone al perdedor en cero stocks cuando cambia el ganador de un game', () => {
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

describe('validación del reporte guiado de Smash Ultimate', () => {
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

  it('señala y localiza el primer campo faltante', () => {
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

  it('rechaza escenarios ajenos al ruleset y personajes vacíos', () => {
    const { preset, games } = getCompleteReport();
    games[0] = { ...games[0]!, stage: 'Corneria', awayCharacter: '   ' };

    const result = validateSmashReport({ preset, games, allowedStages: STAGES, stockLimit: 3 });

    expect(result.errors['smash-game-1-stage']).toBe('Ese escenario no pertenece al ruleset.');
    expect(result.errors['smash-game-1-away-character']).toBe(
      'Elegí el personaje del jugador visitante.',
    );
  });

  it('rechaza stocks inválidos y un resultado que ya no coincide con el preset', () => {
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

  it('rechaza stocks asignados al perdedor aunque el total de victorias coincida', () => {
    const { preset, games } = getCompleteReport();
    games[0] = { ...games[0]!, homeStocks: 0, awayStocks: 1 };

    const result = validateSmashReport({ preset, games, allowedStages: STAGES, stockLimit: 3 });

    expect(result.errors['smash-game-1-stocks']).toBe(
      'Los stocks restantes deben pertenecer al ganador del game.',
    );
  });

  it('construye el contrato aceptado por el API cuando el reporte es válido', () => {
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
