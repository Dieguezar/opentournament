import { describe, expect, it } from 'vitest';
import {
  adapters,
  getAdapter,
  leagueOfLegendsAdapter,
  leagueOfLegendsStandardTemplate,
  smashUltimateAdapter,
  smashUltimateStandardTemplate,
} from './index.js';

describe('adaptadores de juegos', () => {
  it('expone los adaptadores del MVP', () => {
    expect(Object.keys(adapters).sort()).toEqual([
      'cs2',
      'generic',
      'lol',
      'smash_ultimate',
      'valorant',
    ]);
  });

  it('los juegos oficiales son 5v5 sin empate', () => {
    for (const key of ['valorant', 'cs2', 'lol'] as const) {
      const adapter = getAdapter(key);
      expect(adapter.team.minPlayers).toBe(5);
      expect(adapter.team.maxPlayers).toBe(5);
      expect(adapter.scoring.drawAllowed).toBe(false);
    }
  });

  it('valida identificadores de jugador', () => {
    expect(adapters.valorant.playerId.format.test('Diego#LAN1')).toBe(true);
    expect(adapters.valorant.playerId.format.test('sin-tag')).toBe(false);
    expect(adapters.cs2.playerId.format.test('76561198000000000')).toBe(true);
    expect(adapters.lol.playerId.format.test('Faker#KR1')).toBe(true);
    expect(adapters.lol.playerId.format.test('sin-tag')).toBe(false);
  });

  it('modela League of Legends como competencia 5v5 con terminología propia', () => {
    expect(leagueOfLegendsAdapter).toMatchObject({
      key: 'lol',
      name: 'League of Legends',
      platforms: ['pc'],
      team: { minPlayers: 5, maxPlayers: 5, substitutes: 1 },
      playerId: { label: 'Riot ID' },
      maps: ["Summoner's Rift"],
      modes: ['Tournament Draft'],
      scoring: { type: 'series', drawAllowed: false, defaultSeries: [1, 3, 5] },
      terminology: {
        participantSingular: 'equipo',
        participantPlural: 'equipos',
        teamSingular: 'equipo',
        teamPlural: 'equipos',
      },
    });
  });

  it('expone una plantilla estándar v1 de LoL sin fijar un parche que quede obsoleto', () => {
    expect(leagueOfLegendsStandardTemplate).toEqual({
      key: 'lol.standard_v1',
      version: 1,
      editable: true,
      defaults: {
        format: 'single_elimination',
        capacity: 16,
        seriesConfig: { bo: 3, drawsAllowed: false },
        checkinConfig: { delayToleranceMinutes: 10 },
        settings: {
          grandFinalReset: false,
          presencial: false,
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
      },
    });
    expect(leagueOfLegendsAdapter.tournamentTemplate).toBe(leagueOfLegendsStandardTemplate);
  });

  it('modela Smash Ultimate como singles competitivo sin empates', () => {
    expect(smashUltimateAdapter).toMatchObject({
      key: 'smash_ultimate',
      name: 'Super Smash Bros. Ultimate',
      platforms: ['nintendo_switch'],
      team: { minPlayers: 1, maxPlayers: 1, substitutes: 0 },
      playerId: { label: 'Tag' },
      scoring: { type: 'series', drawAllowed: false, defaultSeries: [3, 5] },
      terminology: {
        participantSingular: 'competidor',
        participantPlural: 'competidores',
        teamSingular: 'jugador',
        teamPlural: 'jugadores',
      },
    });
  });

  it('expone una plantilla estándar v1 editable con reglas competitivas', () => {
    expect(smashUltimateStandardTemplate).toEqual({
      key: 'smash_ultimate.standard_v1',
      version: 1,
      editable: true,
      defaults: {
        format: 'double_elimination',
        capacity: 32,
        seriesConfig: { bo: 3, drawsAllowed: false },
        checkinConfig: { delayToleranceMinutes: 10 },
        settings: {
          grandFinalReset: true,
          presencial: true,
          templateKey: 'smash_ultimate.standard_v1',
          templateVersion: 1,
          gameRules: {
            game: 'smash_ultimate',
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
            stageClause: 'none',
          },
        },
      },
    });
    expect(smashUltimateAdapter.tournamentTemplate).toBe(smashUltimateStandardTemplate);
  });
});
