import { describe, expect, it } from 'vitest';
import {
  countByes,
  isPowerOfTwo,
  nextPowerOfTwo,
  roundCountForSingleElimination,
  seedOrder,
} from './index.js';

describe('utilidades del bracket', () => {
  it('detecta potencias de 2', () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(8)).toBe(true);
    expect(isPowerOfTwo(12)).toBe(false);
  });

  it('calcula la siguiente potencia de 2', () => {
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(12)).toBe(16);
    expect(nextPowerOfTwo(33)).toBe(64);
  });

  it('calcula BYEs', () => {
    expect(countByes(8)).toBe(0);
    expect(countByes(12)).toBe(4);
    expect(countByes(33)).toBe(31);
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
