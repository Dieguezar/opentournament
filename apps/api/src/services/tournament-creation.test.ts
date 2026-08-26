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

  it('aplica la plantilla competitiva de League of Legends del lado del servidor', () => {
    const tournament = resolveTournamentCreationRequest({
      ...baseRequest,
      slug: 'liga-nexo',
      name: 'Liga Nexo',
      gameAdapterKey: 'lol',
    });

    expect(tournament).toMatchObject({
      gameAdapterKey: 'lol',
      format: 'single_elimination',
      capacity: 16,
      seriesConfig: { bo: 3, drawsAllowed: false },
      settings: {
        grandFinalReset: false,
        templateKey: 'lol.standard_v1',
        templateVersion: 1,
        gameRules: {
          game: 'lol',
          map: 'summoners_rift',
          region: 'lan',
          draftMode: 'tournament_draft',
          fearlessDraft: false,
          patchPolicy: 'live',
          patchVersion: null,
          sideSelection: 'higher_seed_game_1_then_loser',
          pauseBudgetMinutes: 10,
          spectatorDelayMinutes: 3,
        },
      },
    });
  });

  it('preserva invariantes y acepta overrides editables de la plantilla de LoL', () => {
    const tournament = resolveTournamentCreationRequest({
      ...baseRequest,
      gameAdapterKey: 'lol',
      settings: {
        templateKey: 'falsa',
        templateVersion: 99,
        gameRules: {
          game: 'smash_ultimate',
          region: 'las',
          fearlessDraft: true,
          patchPolicy: 'fixed',
          patchVersion: '26.16',
        },
      },
    });

    expect(tournament.settings.templateKey).toBe('lol.standard_v1');
    expect(tournament.settings.templateVersion).toBe(1);
    expect(tournament.settings.gameRules).toMatchObject({
      game: 'lol',
      map: 'summoners_rift',
      region: 'las',
      fearlessDraft: true,
      patchPolicy: 'fixed',
      patchVersion: '26.16',
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

  it.each(['generic', 'valorant', 'cs2'] as const)(
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
