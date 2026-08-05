import type { MatchStatus } from '@opentournament/shared-types';

/**
 * Núcleo del motor de torneos.
 *
 * Fase 1: contratos de dominio y utilidades matemáticas puras del bracket.
 * Fase 2: algoritmos completos (sencilla, doble eliminación, seeds, BYEs).
 */

export interface EngineParticipant {
  id: string;
  seed?: number | null;
}

export interface EngineMatch {
  id: string;
  roundNumber: number;
  position: number;
  home: EngineParticipant | null;
  away: EngineParticipant | null;
  status: MatchStatus;
  winnerId?: string | null;
  isBye?: boolean;
}

export interface GeneratedRound {
  number: number;
  matches: EngineMatch[];
}

export interface GeneratedBracket {
  rounds: GeneratedRound[];
  byes: string[];
}

export function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Cantidad de BYEs necesarios para completar la primera ronda.
 */
export function countByes(participantCount: number): number {
  if (participantCount <= 0) return 0;
  return nextPowerOfTwo(participantCount) - participantCount;
}

/**
 * Número total de rondas para un bracket de eliminación sencilla.
 */
export function roundCountForSingleElimination(participantCount: number): number {
  if (participantCount <= 1) return 0;
  return Math.ceil(Math.log2(participantCount));
}

/**
 * Ordenamiento estándar de seeds para un bracket de potencia de 2
 * (1, N, 5, N-3, 3, N-1, ...).
 */
export function seedOrder(size: number): number[] {
  if (!isPowerOfTwo(size)) {
    throw new Error(`seedOrder requiere una potencia de 2; recibió ${size}`);
  }
  if (size === 1) return [1];
  const order: number[] = [];
  const firstHalf = seedOrder(size / 2);
  for (const seed of firstHalf) {
    order.push(seed);
    order.push(size + 1 - seed);
  }
  return order;
}
