import type { MatchStatus } from '@opentournament/shared-types';

/**
 * Contrato de datos para la UI de bracket.
 * Los componentes React se agregan en la Fase 2.
 */

export interface BracketTeamNode {
  id: string;
  name: string;
  tag?: string | null;
  seed?: number | null;
}

export interface BracketMatchNode {
  id: string;
  round: number;
  position: number;
  home: BracketTeamNode | null;
  away: BracketTeamNode | null;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerId?: string | null;
  status: MatchStatus;
  isBye?: boolean;
}

export interface BracketData {
  tournamentId: string;
  rounds: BracketMatchNode[][];
}
