import { describe, expect, it } from 'vitest';
import { resolveTournamentCreationRequest } from './tournament-creation.js';

const baseRequest = {
  organizationId: '00000000-0000-4000-8000-000000000001',
  slug: 'smash-local',
  name: 'Smash Local',
};

describe('resolveTournamentCreationRequest', () => {
  it('aplica la plantilla competitiva de Smash del lado del servidor', () => {
    const tournament = resolveTournamentCreationRequest({
      ...baseRequest,
      gameAdapterKey: 'smash_ultimate',
    });

    expect(tournament).toMatchObject({
      gameAdapterKey: 'smash_ultimate',
      format: 'double_elimination',
      capacity: 32,
      seriesConfig: { bo: 3, drawsAllowed: false },
      settings: {
        grandFinalReset: true,
        templateKey: 'smash_ultimate.standard_v1',
        templateVersion: 1,
        gameRules: {
          game: 'smash_ultimate',
          stocks: 3,
          timeLimitMinutes: 7,
        },
      },
    });
  });

  it('deep-mergea overrides editables sin perder defaults anidados', () => {
    const tournament = resolveTournamentCreationRequest({
      ...baseRequest,
      gameAdapterKey: 'smash_ultimate',
      format: 'single_elimination',
      capacity: 64,
      seriesConfig: { bo: 5 },
      checkinConfig: { closesAt: '2026-09-01T18:00:00.000Z' },
      settings: {
        presencial: true,
        gameRules: { stocks: 2, stageBans: 2 },
      },
    });

    expect(tournament.format).toBe('single_elimination');
    expect(tournament.capacity).toBe(64);
    expect(tournament.seriesConfig).toEqual({ bo: 5, drawsAllowed: false });
    expect(tournament.checkinConfig).toEqual({
      closesAt: '2026-09-01T18:00:00.000Z',
      delayToleranceMinutes: 10,
    });
    expect(tournament.settings).toMatchObject({
      presencial: true,
      grandFinalReset: true,
      gameRules: {
        game: 'smash_ultimate',
        stocks: 2,
        stageBans: 2,
        timeLimitMinutes: 7,
      },
    });
  });

  it('preserva la identidad invariante de la plantilla y del juego', () => {
    const tournament = resolveTournamentCreationRequest({
      ...baseRequest,
      gameAdapterKey: 'smash_ultimate',
      settings: {
        templateKey: 'plantilla.falsa',
        templateVersion: 99,
        gameRules: { game: 'generic', stocks: 1 },
      },
    });

    expect(tournament.settings.templateKey).toBe('smash_ultimate.standard_v1');
    expect(tournament.settings.templateVersion).toBe(1);
    expect(tournament.settings.gameRules).toMatchObject({
      game: 'smash_ultimate',
      stocks: 1,
    });
  });

  it('no convierte overrides anidados inválidos en defaults válidos', () => {
    expect(() =>
      resolveTournamentCreationRequest({
        ...baseRequest,
        gameAdapterKey: 'smash_ultimate',
        seriesConfig: null,
      }),
    ).toThrow();

    expect(() =>
      resolveTournamentCreationRequest({
        ...baseRequest,
        gameAdapterKey: 'smash_ultimate',
        settings: { gameRules: null },
      }),
    ).toThrow();
  });

  it('conserva los defaults históricos para torneos genéricos', () => {
    const tournament = resolveTournamentCreationRequest(baseRequest);

    expect(tournament).toMatchObject({
      gameAdapterKey: 'generic',
      format: 'single_elimination',
      capacity: 16,
      seriesConfig: { bo: 3, drawsAllowed: false },
      settings: { grandFinalReset: false, presencial: false },
    });
  });

  it.each(['generic', 'valorant', 'cs2', 'lol'] as const)(
    'rechaza la identidad de una plantilla en el adaptador sin plantilla %s',
    (gameAdapterKey) => {
      expect(() =>
        resolveTournamentCreationRequest({
          ...baseRequest,
          gameAdapterKey,
          settings: {
            templateKey: 'smash_ultimate.standard_v1',
            templateVersion: 1,
          },
        }),
      ).toThrow();
    },
  );
});
