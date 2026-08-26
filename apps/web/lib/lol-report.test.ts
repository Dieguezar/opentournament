import { describe, expect, it } from 'vitest';
import {
  buildLeagueReportPayload,
  createLeagueGames,
  getLeagueScorePresets,
  updateLeagueGameWinner,
  validateLeagueReport,
} from './lol-report';

const homeTeamId = '11111111-1111-4111-8111-111111111111';
const awayTeamId = '22222222-2222-4222-8222-222222222222';

describe('reporte guiado de League of Legends', () => {
  it('ofrece resultados definitivos para BO1, BO3 y BO5', () => {
    expect(getLeagueScorePresets(1, homeTeamId, awayTeamId).map((preset) => preset.label)).toEqual([
      '1–0',
      '0–1',
    ]);
    expect(getLeagueScorePresets(3, homeTeamId, awayTeamId)).toHaveLength(4);
    expect(getLeagueScorePresets(5, homeTeamId, awayTeamId)).toHaveLength(6);
  });

  it('crea exactamente las partidas requeridas y alterna el lado azul', () => {
    const preset = getLeagueScorePresets(3, homeTeamId, awayTeamId)[1]!;
    const games = createLeagueGames(preset);

    expect(games).toHaveLength(preset.homeScore + preset.awayScore);
    expect(games.map((game) => game.blueTeamId)).toEqual([homeTeamId, awayTeamId, homeTeamId]);
  });

  it('actualiza el ganador sin perder la información operativa', () => {
    const preset = getLeagueScorePresets(3, homeTeamId, awayTeamId)[0]!;
    const [game] = createLeagueGames(preset);
    const updated = updateLeagueGameWinner(
      { ...game!, durationMinutes: 42, riotMatchId: 'LA1_1001' },
      awayTeamId,
    );

    expect(updated).toMatchObject({
      winnerTeamId: awayTeamId,
      durationMinutes: 42,
      riotMatchId: 'LA1_1001',
    });
  });

  it('localiza duración y Riot Match ID inválidos', () => {
    const preset = getLeagueScorePresets(1, homeTeamId, awayTeamId)[0]!;
    const games = createLeagueGames(preset).map((game) => ({
      ...game,
      durationMinutes: 0,
      riotMatchId: 'id con espacios',
    }));
    const validation = validateLeagueReport({ preset, games, fieldIdPrefix: 'lol-match' });

    expect(validation.errors['lol-match-game-1-duration']).toBeDefined();
    expect(validation.errors['lol-match-game-1-riot-id']).toBeDefined();
    expect(validation.firstInvalidFieldId).toBe('lol-match-game-1-duration');
  });

  it('construye el contrato del API cuando el reporte está completo', () => {
    const preset = getLeagueScorePresets(3, homeTeamId, awayTeamId)[0]!;
    const games = createLeagueGames(preset).map((game, index) => ({
      ...game,
      durationMinutes: 25 + index,
      riotMatchId: `LA1_${1000 + index}`,
    }));

    expect(buildLeagueReportPayload({ preset, games })).toEqual({
      winnerTeamId: preset.winnerTeamId,
      homeScore: preset.homeScore,
      awayScore: preset.awayScore,
      lolGames: games,
    });
  });
});
