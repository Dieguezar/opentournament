import { describe, expect, it } from 'vitest';
import {
  advanceMatch,
  countByes,
  finalizeByes,
  generateDoubleElimination,
  generateSingleElimination,
  isPowerOfTwo,
  nextPowerOfTwo,
  roundCountForSingleElimination,
  seedOrder,
  type EngineBracket,
  type EngineParticipant,
} from './index.js';

function participants(n: number, seedOffset = 0): EngineParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    seed: i + 1 + seedOffset,
  }));
}

interface SimResult {
  bracket: EngineBracket;
  wins: Map<string, number>;
  losses: Map<string, number>;
  realMatches: number;
}

function simulate(bracket: EngineBracket, homeWins = true): SimResult {
  let b = finalizeByes(bracket);
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();

  const record = (id: string, won: boolean) => {
    if (won) wins.set(id, (wins.get(id) ?? 0) + 1);
    else losses.set(id, (losses.get(id) ?? 0) + 1);
  };

  let progress = true;
  while (progress) {
    progress = false;
    const pending = b.matches.filter((m) => m.status === 'scheduled' && m.home && m.away);
    for (const match of pending) {
      const winner = homeWins ? match.home! : match.away!;
      record(match.home!, winner === match.home);
      record(match.away!, winner === match.away);
      b = advanceMatch(b, match.id, winner).bracket;
      progress = true;
    }
  }

  const realMatches = b.matches.filter((m) => !m.isBye && m.status === 'finalized').length;
  return { bracket: b, wins, losses, realMatches };
}

function championOf(result: SimResult): string | null {
  const finals = result.bracket.matches.filter(
    (m) => m.status === 'finalized' && !m.isBye && !m.winnerNext,
  );
  const last = finals.at(-1);
  return last?.winner ?? null;
}

describe('utilidades del bracket', () => {
  it('detecta potencias de 2', () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(8)).toBe(true);
    expect(isPowerOfTwo(12)).toBe(false);
  });

  it('calcula la siguiente potencia de 2 y BYEs', () => {
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(12)).toBe(16);
    expect(countByes(8)).toBe(0);
    expect(countByes(12)).toBe(4);
  });

  it('calcula rondas de sencilla', () => {
    expect(roundCountForSingleElimination(1)).toBe(0);
    expect(roundCountForSingleElimination(8)).toBe(3);
    expect(roundCountForSingleElimination(128)).toBe(7);
  });

  it('ordena seeds en bracket estándar', () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

describe('eliminación sencilla', () => {
  for (const n of [2, 3, 4, 5, 8, 12, 16, 33, 64, 128]) {
    it(`genera un bracket válido para ${n} participantes`, () => {
      const bracket = generateSingleElimination(participants(n));
      expect(bracket.byes.length).toBe(countByes(n));
      const result = simulate(bracket);
      expect(result.realMatches).toBe(n - 1);

      const champion = championOf(result);
      expect(champion).not.toBeNull();
      expect(result.losses.get(champion!) ?? 0).toBe(0);

      // Every other participant loses exactly once.
      for (const p of participants(n)) {
        const losses = result.losses.get(p.id) ?? 0;
        if (p.id === champion) {
          expect(losses).toBe(0);
        } else {
          expect(losses).toBe(1);
        }
      }
    });
  }

  it('asigna BYEs a los mejores seeds', () => {
    const bracket = generateSingleElimination(participants(12));
    expect(new Set(bracket.byes)).toEqual(new Set(['p1', 'p2', 'p3', 'p4']));
  });

  it('rechaza participar con menos de 2 equipos', () => {
    expect(() => generateSingleElimination(participants(1))).toThrow();
  });
});

describe('doble eliminación', () => {
  for (const n of [2, 3, 4, 5, 8, 12, 16, 33, 64]) {
    it(`sin reset genera 2n-2 partidas reales y un campeón válido (${n})`, () => {
      const bracket = generateDoubleElimination(participants(n));
      const result = simulate(bracket);
      expect(result.realMatches).toBe(2 * n - 2);

      const champion = championOf(result);
      expect(champion).not.toBeNull();
      expect(result.losses.get(champion!) ?? 0).toBeLessThanOrEqual(1);

      // No participant loses more than twice.
      for (const p of participants(n)) {
        expect(result.losses.get(p.id) ?? 0).toBeLessThanOrEqual(2);
      }
      // Suma de derrotas = partidas reales.
      const totalLosses = [...result.losses.values()].reduce((a, b) => a + b, 0);
      expect(totalLosses).toBe(2 * n - 2);
    });
  }

  it('con reset genera 2n-1 partidas y GF-2 cuando gana el bracket de perdedores', () => {
    const n = 4;
    const bracket = generateDoubleElimination(participants(n), { grandFinalReset: true });
    const result = simulate(bracket);
    expect(result.realMatches).toBe(2 * n - 1);
    expect(result.bracket.matches.some((m) => m.id === 'GF-2' && m.status === 'finalized')).toBe(
      true,
    );

    const champion = championOf(result);
    expect(champion).not.toBeNull();
    expect(result.losses.get(champion!) ?? 0).toBeLessThanOrEqual(1);
  });

  it('valida que el ganador pertenezca a la partida', () => {
    const bracket = generateDoubleElimination(participants(8));
    const first = bracket.matches.find((m) => m.home && m.away)!;
    expect(() => advanceMatch(bracket, first.id, 'forastero')).toThrow();
  });
});
