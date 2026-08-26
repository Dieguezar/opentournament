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

describe('guided League of Legends reporting', () => {
  it('offers decisive outcomes for BO1, BO3, and BO5', () => {
    expect(getLeagueScorePresets(1, homeTeamId, awayTeamId).map((preset) => preset.label)).toEqual([
      '1–0',
      '0–1',
    ]);
    expect(getLeagueScorePresets(3, homeTeamId, awayTeamId)).toHaveLength(4);
    expect(getLeagueScorePresets(5, homeTeamId, awayTeamId)).toHaveLength(6);
  });

  it('creates exactly the required games and alternates blue side', () => {
    const preset = getLeagueScorePresets(3, homeTeamId, awayTeamId)[1]!;
    const games = createLeagueGames(preset);

    expect(games).toHaveLength(preset.homeScore + preset.awayScore);
    expect(games.map((game) => game.blueTeamId)).toEqual([homeTeamId, awayTeamId, homeTeamId]);
  });

  it('updates the winner without losing operational information', () => {
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

  it('localizes invalid duration and Riot Match ID errors', () => {
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

    const englishValidation = validateLeagueReport(
      { preset, games, fieldIdPrefix: 'lol-match' },
      'en',
    );
    expect(englishValidation.errors['lol-match-game-1-duration']).toBe(
      'Duration must be between 5 and 180 minutes.',
    );
  });

  it('builds the API contract when the report is complete', () => {
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
