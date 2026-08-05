import { describe, expect, it } from 'vitest';
import { adapters, getAdapter } from './index.js';

describe('adaptadores de juegos', () => {
  it('expone los adaptadores del MVP', () => {
    expect(Object.keys(adapters).sort()).toEqual(['cs2', 'generic', 'lol', 'valorant']);
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
  });
});
