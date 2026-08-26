import { describe, expect, it } from 'vitest';
import {
  addTeamMemberSchema,
  assignTeamGameAdapterSchema,
  createParticipantAccessPassSchema,
  createTeamSchema,
  createTournamentSchema,
  exchangeParticipantAccessPassSchema,
  reportResultSchema,
  tournamentSettingsSchema,
  updateTournamentSchema,
} from './index.js';

const organizationId = '550e8400-e29b-41d4-a716-446655440000';
const homeTeamId = '11111111-1111-4111-8111-111111111111';
const awayTeamId = '22222222-2222-4222-8222-222222222222';

const smashRules = {
  game: 'smash_ultimate' as const,
  stocks: 3,
  timeLimitMinutes: 7,
  itemsEnabled: false,
  finalSmashMeterEnabled: false,
  stageHazardsEnabled: false,
  launchRate: 1,
  starters: [
    'Battlefield',
    'Small Battlefield',
    'Pokémon Stadium 2',
    'Final Destination',
    'Town & City',
  ],
  counterpicks: ['Kalos Pokémon League', 'Smashville', 'Hollow Bastion'],
  stageBans: 3,
  stageClause: 'none' as const,
};

const lolRules = {
  game: 'lol' as const,
  map: 'summoners_rift' as const,
  region: 'lan' as const,
  draftMode: 'tournament_draft' as const,
  fearlessDraft: false,
  patchPolicy: 'live' as const,
  patchVersion: null,
  sideSelection: 'higher_seed_game_1_then_loser' as const,
  pauseBudgetMinutes: 10,
  spectatorDelayMinutes: 3,
};

function createTournament(overrides: Record<string, unknown> = {}) {
  return {
    organizationId,
    gameAdapterKey: 'smash_ultimate',
    slug: 'smash-local',
    name: 'Smash Local',
    format: 'double_elimination',
    capacity: 32,
    seriesConfig: { bo: 3, drawsAllowed: false },
    checkinConfig: { delayToleranceMinutes: 10 },
    settings: {
      grandFinalReset: true,
      presencial: true,
      templateKey: 'smash_ultimate.standard_v1',
      templateVersion: 1,
      gameRules: smashRules,
    },
    ...overrides,
  };
}

describe('validación de plantillas por juego', () => {
  it('acepta Smash Ultimate con reglas y metadatos de plantilla válidos', () => {
    const result = createTournamentSchema.safeParse(createTournament());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gameAdapterKey).toBe('smash_ultimate');
      expect(result.data.settings.gameRules).toEqual(smashRules);
    }
  });

  it('rechaza reglas que no correspondan al adaptador seleccionado', () => {
    const result = createTournamentSchema.safeParse(
      createTournament({ gameAdapterKey: 'generic' }),
    );

    expect(result.success).toBe(false);
  });

  it('rechaza empates en torneos de Smash Ultimate', () => {
    const result = createTournamentSchema.safeParse(
      createTournament({ seriesConfig: { bo: 3, drawsAllowed: true } }),
    );

    expect(result.success).toBe(false);
  });

  it('acepta una plantilla competitiva de League of Legends coherente', () => {
    const result = createTournamentSchema.safeParse(
      createTournament({
        gameAdapterKey: 'lol',
        slug: 'liga-nexo',
        name: 'Liga Nexo',
        format: 'single_elimination',
        capacity: 16,
        settings: {
          grandFinalReset: false,
          presencial: false,
          templateKey: 'lol.standard_v1',
          templateVersion: 1,
          gameRules: lolRules,
        },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.settings.gameRules).toEqual(lolRules);
  });

  it('exige versión cuando la política de parche de LoL es fija', () => {
    const baseSettings = {
      grandFinalReset: false,
      presencial: false,
      templateKey: 'lol.standard_v1',
      templateVersion: 1,
    };
    const invalid = createTournamentSchema.safeParse(
      createTournament({
        gameAdapterKey: 'lol',
        settings: {
          ...baseSettings,
          gameRules: { ...lolRules, patchPolicy: 'fixed', patchVersion: null },
        },
      }),
    );
    const valid = createTournamentSchema.safeParse(
      createTournament({
        gameAdapterKey: 'lol',
        settings: {
          ...baseSettings,
          gameRules: { ...lolRules, patchPolicy: 'fixed', patchVersion: '26.16' },
        },
      }),
    );

    expect(invalid.success).toBe(false);
    expect(valid.success).toBe(true);
  });

  it('rechaza reglas de LoL con mapa, región o pausas inválidas', () => {
    for (const gameRules of [
      { ...lolRules, map: 'howling_abyss' },
      { ...lolRules, region: 'desconocida' },
      { ...lolRules, pauseBudgetMinutes: 121 },
      { ...lolRules, spectatorDelayMinutes: -1 },
    ]) {
      expect(
        createTournamentSchema.safeParse(
          createTournament({
            gameAdapterKey: 'lol',
            settings: {
              grandFinalReset: false,
              presencial: false,
              templateKey: 'lol.standard_v1',
              templateVersion: 1,
              gameRules,
            },
          }),
        ).success,
      ).toBe(false);
    }
  });

  it.each([3, 5])('acepta BO%s en torneos de Smash Ultimate', (bestOf) => {
    const result = createTournamentSchema.safeParse(
      createTournament({ seriesConfig: { bo: bestOf, drawsAllowed: false } }),
    );

    expect(result.success).toBe(true);
  });

  it.each([1, 2, 4, 7, 9])(
    'rechaza BO%s porque la plantilla de Smash sólo admite BO3 o BO5',
    (bestOf) => {
      const result = createTournamentSchema.safeParse(
        createTournament({ seriesConfig: { bo: bestOf, drawsAllowed: false } }),
      );

      expect(result.success).toBe(false);
    },
  );

  it.each([
    ['starters vacíos', { ...smashRules, starters: [] }],
    ['counterpicks vacíos', { ...smashRules, counterpicks: [] }],
    ['starters duplicados', { ...smashRules, starters: ['Battlefield', 'battlefield'] }],
    [
      'starters duplicados con whitespace interno distinto',
      { ...smashRules, starters: ['Final Destination', 'Final  Destination'] },
    ],
    ['counterpicks duplicados', { ...smashRules, counterpicks: ['Smashville', ' smashville '] }],
    [
      'escenarios solapados',
      { ...smashRules, counterpicks: ['Kalos Pokémon League', 'BATTLEFIELD'] },
    ],
    [
      'escenarios solapados con whitespace interno distinto',
      { ...smashRules, counterpicks: ['Kalos Pokémon   League', 'Final  Destination'] },
    ],
  ])('rechaza %s', (_caseName, gameRules) => {
    const result = createTournamentSchema.safeParse(
      createTournament({
        settings: {
          grandFinalReset: true,
          presencial: true,
          templateKey: 'smash_ultimate.standard_v1',
          templateVersion: 1,
          gameRules,
        },
      }),
    );

    expect(result.success).toBe(false);
  });

  it.each([
    ['stocks', { ...smashRules, stocks: 0 }],
    ['timeLimitMinutes', { ...smashRules, timeLimitMinutes: 0 }],
    ['launchRate', { ...smashRules, launchRate: 0.4 }],
    ['stageBans', { ...smashRules, stageBans: -1 }],
  ])('rechaza %s fuera de rango', (_field, gameRules) => {
    const result = createTournamentSchema.safeParse(
      createTournament({
        settings: {
          grandFinalReset: true,
          presencial: true,
          templateKey: 'smash_ultimate.standard_v1',
          templateVersion: 1,
          gameRules,
        },
      }),
    );

    expect(result.success).toBe(false);
  });

  it.each(['stocks', 'timeLimitMinutes', 'launchRate', 'stageBans'] as const)(
    'rechaza booleanos en el campo numérico %s',
    (field) => {
      for (const booleanValue of [true, false]) {
        const result = createTournamentSchema.safeParse(
          createTournament({
            settings: {
              grandFinalReset: true,
              presencial: true,
              templateKey: 'smash_ultimate.standard_v1',
              templateVersion: 1,
              gameRules: { ...smashRules, [field]: booleanValue },
            },
          }),
        );

        expect(result.success).toBe(false);
      }
    },
  );

  it('conserva la coerción de strings de formulario para reglas numéricas', () => {
    const result = createTournamentSchema.safeParse(
      createTournament({
        settings: {
          grandFinalReset: true,
          presencial: true,
          templateKey: 'smash_ultimate.standard_v1',
          templateVersion: 1,
          gameRules: {
            ...smashRules,
            stocks: '3',
            timeLimitMinutes: '7',
            launchRate: '1',
            stageBans: '3',
          },
        },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings.gameRules).toMatchObject({
        stocks: 3,
        timeLimitMinutes: 7,
        launchRate: 1,
        stageBans: 3,
      });
    }
  });

  it.each(['generic', 'valorant', 'cs2'] as const)(
    'rechaza metadatos de plantilla para el adaptador %s, que no tiene plantilla',
    (gameAdapterKey) => {
      const invalidMetadata = [
        { templateKey: 'plantilla.falsa', templateVersion: 99 },
        { templateKey: 'smash_ultimate.standard_v1', templateVersion: 1 },
        { templateKey: 'plantilla-sin-version' },
        { templateVersion: 1 },
      ];

      for (const metadata of invalidMetadata) {
        const result = createTournamentSchema.safeParse(
          createTournament({
            gameAdapterKey,
            settings: {
              grandFinalReset: false,
              presencial: false,
              ...metadata,
            },
          }),
        );

        expect(result.success).toBe(false);
      }
    },
  );
});

describe('validación del roster por juego', () => {
  it('permite tags de jugador de Smash entre 1 y 32 caracteres, incluidos símbolos', () => {
    expect(
      createTeamSchema.parse({
        organizationId,
        name: 'Jugador Smash',
        tag: 'MkLeo #1',
        gameAdapterKey: 'smash_ultimate',
      }),
    ).toMatchObject({ tag: 'MkLeo #1', gameAdapterKey: 'smash_ultimate' });
    expect(
      createTeamSchema.safeParse({
        organizationId,
        name: 'Jugador Smash',
        tag: 'A',
        gameAdapterKey: 'smash_ultimate',
      }).success,
    ).toBe(true);
    expect(
      createTeamSchema.safeParse({
        organizationId,
        name: 'Jugador Smash',
        tag: 'a'.repeat(33),
        gameAdapterKey: 'smash_ultimate',
      }).success,
    ).toBe(false);
  });

  it('conserva tags alfanuméricos de 2 a 8 caracteres para los demás juegos', () => {
    const team = { organizationId, name: 'Equipo tradicional' };

    expect(createTeamSchema.safeParse({ ...team, tag: 'AB12' }).success).toBe(true);
    expect(
      createTeamSchema.safeParse({ ...team, tag: 'AB12', gameAdapterKey: 'valorant' }).success,
    ).toBe(true);
    expect(createTeamSchema.safeParse({ ...team, tag: 'A' }).success).toBe(false);
    expect(createTeamSchema.safeParse({ ...team, tag: 'AB 12' }).success).toBe(false);
    expect(
      createTeamSchema.safeParse({
        ...team,
        tag: 'Smash #1',
        gameAdapterKey: 'valorant',
      }).success,
    ).toBe(false);
  });

  it('acepta miembros y suplentes, pero nunca permite asignar otro capitán', () => {
    expect(addTeamMemberSchema.parse({ email: 'PLAYER@EXAMPLE.COM' })).toEqual({
      email: 'player@example.com',
      role: 'member',
    });
    expect(addTeamMemberSchema.parse({ email: 'sub@example.com', role: 'substitute' })).toEqual({
      email: 'sub@example.com',
      role: 'substitute',
    });
    expect(
      addTeamMemberSchema.safeParse({ email: 'captain@example.com', role: 'captain' }).success,
    ).toBe(false);
  });

  it('solo permite asignar un adaptador competitivo concreto a un equipo genérico', () => {
    expect(assignTeamGameAdapterSchema.parse({ gameAdapterKey: 'smash_ultimate' })).toEqual({
      gameAdapterKey: 'smash_ultimate',
    });
    expect(assignTeamGameAdapterSchema.safeParse({ gameAdapterKey: 'generic' }).success).toBe(
      false,
    );
  });
});

describe('detalle de games en reportes de Smash Ultimate', () => {
  const validGame = {
    number: 1,
    stage: ' Battlefield ',
    homeCharacter: ' Mario ',
    awayCharacter: ' Link ',
    winnerTeamId: homeTeamId,
    homeStocks: 2,
    awayStocks: 0,
  };

  it('normaliza un game estructurado válido', () => {
    const result = reportResultSchema.parse({
      winnerTeamId: homeTeamId,
      homeScore: 2,
      awayScore: 0,
      games: [validGame],
    });

    expect(result.games).toEqual([
      {
        ...validGame,
        stage: 'Battlefield',
        homeCharacter: 'Mario',
        awayCharacter: 'Link',
      },
    ]);
  });

  it.each(['number', 'homeStocks', 'awayStocks'] as const)(
    'rechaza booleanos en el campo numérico %s',
    (field) => {
      expect(
        reportResultSchema.safeParse({
          winnerTeamId: homeTeamId,
          games: [{ ...validGame, [field]: true }],
        }).success,
      ).toBe(false);
    },
  );

  it('rechaza personajes vacíos y más de cinco games', () => {
    expect(
      reportResultSchema.safeParse({
        winnerTeamId: homeTeamId,
        games: [{ ...validGame, homeCharacter: '   ' }],
      }).success,
    ).toBe(false);
    expect(
      reportResultSchema.safeParse({
        winnerTeamId: homeTeamId,
        games: Array.from({ length: 6 }, (_, index) => ({
          ...validGame,
          number: index + 1,
        })),
      }).success,
    ).toBe(false);
  });
});

describe('detalle de partidas en reportes de League of Legends', () => {
  const validGame = {
    number: 1,
    winnerTeamId: homeTeamId,
    blueTeamId: awayTeamId,
    durationMinutes: 31,
    riotMatchId: ' LA1_123456789 ',
  };

  it('normaliza una partida estructurada válida', () => {
    const result = reportResultSchema.parse({
      winnerTeamId: homeTeamId,
      homeScore: 2,
      awayScore: 0,
      lolGames: [validGame],
    });

    expect(result.lolGames).toEqual([{ ...validGame, riotMatchId: 'LA1_123456789' }]);
  });

  it('rechaza duración, identificador o combinación de detalles inválidos', () => {
    expect(
      reportResultSchema.safeParse({ lolGames: [{ ...validGame, durationMinutes: 4 }] }).success,
    ).toBe(false);
    expect(
      reportResultSchema.safeParse({ lolGames: [{ ...validGame, riotMatchId: 'id con espacios' }] })
        .success,
    ).toBe(false);
    expect(
      reportResultSchema.safeParse({
        games: [
          {
            number: 1,
            stage: 'Battlefield',
            homeCharacter: 'Mario',
            awayCharacter: 'Link',
            winnerTeamId: homeTeamId,
            homeStocks: 1,
            awayStocks: 0,
          },
        ],
        lolGames: [validGame],
      }).success,
    ).toBe(false);
  });
});

describe('acceso sin cuenta y reporte de resultados', () => {
  it('usa reporte bilateral como opción segura por defecto', () => {
    expect(tournamentSettingsSchema.parse({})).toMatchObject({
      reportingMode: 'bilateral',
    });
  });

  it.each(['bilateral', 'winner_reports', 'staff_only'] as const)(
    'acepta el modo de reporte %s',
    (reportingMode) => {
      expect(tournamentSettingsSchema.safeParse({ reportingMode }).success).toBe(true);
    },
  );

  it('rechaza modos de reporte desconocidos', () => {
    expect(tournamentSettingsSchema.safeParse({ reportingMode: 'anyone_reports' }).success).toBe(
      false,
    );
  });

  it('permite cambiar sólo el modo de reporte de un torneo existente', () => {
    expect(updateTournamentSchema.parse({ reportingMode: 'staff_only' })).toEqual({
      reportingMode: 'staff_only',
    });
  });

  it('valida el equipo y la duración de un pase de participante', () => {
    expect(
      createParticipantAccessPassSchema.parse({
        teamId: homeTeamId,
        expiresInHours: '48',
      }),
    ).toEqual({ teamId: homeTeamId, expiresInHours: 48 });

    expect(
      createParticipantAccessPassSchema.safeParse({
        teamId: 'no-es-un-uuid',
        expiresInHours: 48,
      }).success,
    ).toBe(false);
    expect(
      createParticipantAccessPassSchema.safeParse({
        teamId: homeTeamId,
        expiresInHours: 24 * 366,
      }).success,
    ).toBe(false);
  });

  it('normaliza un token de acceso y rechaza tokens demasiado cortos', () => {
    const token = 'a'.repeat(64);

    expect(exchangeParticipantAccessPassSchema.parse({ token: `  ${token}  ` })).toEqual({
      token,
    });
    expect(exchangeParticipantAccessPassSchema.safeParse({ token: 'corto' }).success).toBe(false);
  });
});
