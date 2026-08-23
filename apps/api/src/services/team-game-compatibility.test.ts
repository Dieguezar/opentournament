import { describe, expect, it } from 'vitest';
import {
  getMemberCapacityIssue,
  getRegistrationCompatibilityIssue,
} from './team-game-compatibility.js';

describe('getRegistrationCompatibilityIssue', () => {
  it('mantiene los torneos genéricos compatibles con cualquier equipo', () => {
    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'generic',
        teamAdapterKey: null,
        activePlayers: 20,
        substitutes: 20,
      }),
    ).toBeNull();
  });

  it('rechaza un equipo configurado para otro juego', () => {
    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'smash_ultimate',
        teamAdapterKey: 'valorant',
        activePlayers: 5,
        substitutes: 1,
      }),
    ).toMatchObject({
      code: 'TEAM_GAME_MISMATCH',
      details: { expectedGameAdapterKey: 'smash_ultimate', actualGameAdapterKey: 'valorant' },
    });
  });

  it('exige exactamente un integrante activo para Smash Ultimate', () => {
    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'smash_ultimate',
        teamAdapterKey: 'smash_ultimate',
        activePlayers: 0,
        substitutes: 0,
      }),
    ).toMatchObject({
      code: 'TEAM_ROSTER_SIZE_INVALID',
      details: { minPlayers: 1, maxPlayers: 1, activePlayers: 0 },
    });
    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'smash_ultimate',
        teamAdapterKey: 'smash_ultimate',
        activePlayers: 1,
        substitutes: 0,
      }),
    ).toBeNull();
    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'smash_ultimate',
        teamAdapterKey: 'smash_ultimate',
        activePlayers: 2,
        substitutes: 0,
      }),
    ).toMatchObject({ code: 'TEAM_ROSTER_SIZE_INVALID' });
  });

  it('separa titulares y suplentes para un roster de Valorant 5+1', () => {
    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'valorant',
        teamAdapterKey: 'valorant',
        activePlayers: 5,
        substitutes: 1,
      }),
    ).toBeNull();

    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'valorant',
        teamAdapterKey: 'valorant',
        activePlayers: 6,
        substitutes: 0,
      }),
    ).toMatchObject({
      code: 'TEAM_ROSTER_SIZE_INVALID',
      details: { minPlayers: 5, maxPlayers: 5, activePlayers: 6 },
    });

    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'valorant',
        teamAdapterKey: 'valorant',
        activePlayers: 5,
        substitutes: 2,
      }),
    ).toMatchObject({
      code: 'TEAM_SUBSTITUTE_LIMIT',
      details: { maxSubstitutes: 1, substitutes: 2 },
    });
  });

  it('rechaza suplentes en Smash Ultimate', () => {
    expect(
      getRegistrationCompatibilityIssue({
        tournamentAdapterKey: 'smash_ultimate',
        teamAdapterKey: 'smash_ultimate',
        activePlayers: 1,
        substitutes: 1,
      }),
    ).toMatchObject({
      code: 'TEAM_SUBSTITUTE_LIMIT',
      details: { maxSubstitutes: 0, substitutes: 1 },
    });
  });
});

describe('getMemberCapacityIssue', () => {
  it('impide agregar un segundo integrante a un equipo de Smash Ultimate', () => {
    expect(
      getMemberCapacityIssue('smash_ultimate', {
        activePlayers: 1,
        substitutes: 0,
        requestedRole: 'member',
      }),
    ).toMatchObject({
      code: 'TEAM_ROSTER_LIMIT',
      details: { maxPlayers: 1, activePlayers: 1 },
    });
  });

  it('permite agregar integrantes mientras haya cupo en el adaptador', () => {
    expect(
      getMemberCapacityIssue('valorant', {
        activePlayers: 4,
        substitutes: 1,
        requestedRole: 'member',
      }),
    ).toBeNull();
  });

  it('aplica cupos independientes para titulares y suplentes', () => {
    expect(
      getMemberCapacityIssue('valorant', {
        activePlayers: 5,
        substitutes: 0,
        requestedRole: 'substitute',
      }),
    ).toBeNull();
    expect(
      getMemberCapacityIssue('valorant', {
        activePlayers: 4,
        substitutes: 1,
        requestedRole: 'substitute',
      }),
    ).toMatchObject({
      code: 'TEAM_SUBSTITUTE_LIMIT',
      details: { maxSubstitutes: 1, substitutes: 1 },
    });
    expect(
      getMemberCapacityIssue('smash_ultimate', {
        activePlayers: 1,
        substitutes: 0,
        requestedRole: 'substitute',
      }),
    ).toMatchObject({
      code: 'TEAM_SUBSTITUTE_LIMIT',
      details: { maxSubstitutes: 0, substitutes: 0 },
    });
  });
});
