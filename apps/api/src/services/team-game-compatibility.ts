import { adapters, getAdapter } from '@opentournament/game-adapters';
import type { GameAdapterKey } from '@opentournament/shared-types';

export interface TeamGameCompatibilityIssue {
  statusCode: 409;
  code:
    | 'TEAM_GAME_MISMATCH'
    | 'TEAM_ROSTER_SIZE_INVALID'
    | 'TEAM_ROSTER_LIMIT'
    | 'TEAM_SUBSTITUTE_LIMIT'
    | 'UNKNOWN_GAME_ADAPTER';
  message: string;
  details: Record<string, string | number | null>;
}

export interface TeamRosterCounts {
  activePlayers: number;
  substitutes: number;
}

export function countRosterRoles(
  roster: ReadonlyArray<{ role: string }>,
): TeamRosterCounts {
  return roster.reduce<TeamRosterCounts>(
    (counts, member) => ({
      activePlayers:
        counts.activePlayers + (member.role === 'captain' || member.role === 'member' ? 1 : 0),
      substitutes: counts.substitutes + (member.role === 'substitute' ? 1 : 0),
    }),
    { activePlayers: 0, substitutes: 0 },
  );
}

interface RegistrationCompatibilityInput {
  tournamentAdapterKey: string;
  teamAdapterKey: string | null;
  activePlayers: number;
  substitutes: number;
}

interface MemberCapacityInput extends TeamRosterCounts {
  requestedRole: 'member' | 'substitute';
}

function isGameAdapterKey(value: string): value is GameAdapterKey {
  return Object.hasOwn(adapters, value);
}

function unknownAdapterIssue(adapterKey: string): TeamGameCompatibilityIssue {
  return {
    statusCode: 409,
    code: 'UNKNOWN_GAME_ADAPTER',
    message: 'El juego configurado no está disponible',
    details: { gameAdapterKey: adapterKey },
  };
}

export function getRegistrationCompatibilityIssue({
  tournamentAdapterKey,
  teamAdapterKey,
  activePlayers,
  substitutes,
}: RegistrationCompatibilityInput): TeamGameCompatibilityIssue | null {
  if (tournamentAdapterKey === 'generic') return null;

  if (teamAdapterKey !== tournamentAdapterKey) {
    return {
      statusCode: 409,
      code: 'TEAM_GAME_MISMATCH',
      message: 'El equipo está configurado para otro juego',
      details: {
        expectedGameAdapterKey: tournamentAdapterKey,
        actualGameAdapterKey: teamAdapterKey,
      },
    };
  }

  if (!isGameAdapterKey(tournamentAdapterKey)) {
    return unknownAdapterIssue(tournamentAdapterKey);
  }

  return getRosterCompatibilityIssue(tournamentAdapterKey, {
    activePlayers,
    substitutes,
  });
}

export function getRosterCompatibilityIssue(
  adapterKey: string,
  { activePlayers, substitutes }: TeamRosterCounts,
): TeamGameCompatibilityIssue | null {
  if (!isGameAdapterKey(adapterKey)) return unknownAdapterIssue(adapterKey);

  const { minPlayers, maxPlayers, substitutes: maxSubstitutes } = getAdapter(adapterKey).team;
  if (activePlayers < minPlayers || activePlayers > maxPlayers) {
    return {
      statusCode: 409,
      code: 'TEAM_ROSTER_SIZE_INVALID',
      message:
        minPlayers === maxPlayers
          ? `El equipo debe tener exactamente ${minPlayers} integrante(s) activo(s)`
          : `El equipo debe tener entre ${minPlayers} y ${maxPlayers} integrantes activos`,
      details: { minPlayers, maxPlayers, activePlayers },
    };
  }

  if (substitutes > maxSubstitutes) {
    return {
      statusCode: 409,
      code: 'TEAM_SUBSTITUTE_LIMIT',
      message: `El roster admite como máximo ${maxSubstitutes} suplente(s)`,
      details: { maxSubstitutes, substitutes },
    };
  }

  return null;
}

export function getMemberCapacityIssue(
  teamAdapterKey: string | null,
  { activePlayers, substitutes, requestedRole }: MemberCapacityInput,
): TeamGameCompatibilityIssue | null {
  const adapterKey = teamAdapterKey ?? 'generic';
  if (!isGameAdapterKey(adapterKey)) return unknownAdapterIssue(adapterKey);

  const { maxPlayers, substitutes: maxSubstitutes } = getAdapter(adapterKey).team;
  if (requestedRole === 'substitute') {
    if (substitutes < maxSubstitutes) return null;

    return {
      statusCode: 409,
      code: 'TEAM_SUBSTITUTE_LIMIT',
      message: `El roster admite como máximo ${maxSubstitutes} suplente(s)`,
      details: { maxSubstitutes, substitutes },
    };
  }

  if (activePlayers >= maxPlayers) {
    return {
      statusCode: 409,
      code: 'TEAM_ROSTER_LIMIT',
      message: `El roster admite como máximo ${maxPlayers} integrante(s) activo(s)`,
      details: { maxPlayers, activePlayers },
    };
  }

  return null;
}
