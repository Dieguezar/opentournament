import { describe, expect, it } from 'vitest';
import {
  generateSingleElimination,
  resolveMatchParticipants,
} from '@opentournament/tournament-engine';
import { applyCheckInWalkovers } from './tournaments.js';

const participants = Array.from({ length: 4 }, (_, index) => ({
  id: `p${index + 1}`,
  seed: index + 1,
}));

describe('applyCheckInWalkovers', () => {
  it('avanza a quienes hicieron check-in y conserva varios walkovers de la ronda', () => {
    const bracket = generateSingleElimination(participants);
    const firstRound = bracket.matches.filter(
      (match) => match.bracket === 'winners' && match.round === 1,
    );
    const first = resolveMatchParticipants(bracket, firstRound[0]!);
    const second = resolveMatchParticipants(bracket, firstRound[1]!);
    const checkedIn = new Map([
      [first.home!, true],
      [first.away!, false],
      [second.home!, false],
      [second.away!, true],
    ]);

    const result = applyCheckInWalkovers(bracket, checkedIn);

    expect(result.matches.find((match) => match.id === firstRound[0]!.id)?.winner).toBe(first.home);
    expect(result.matches.find((match) => match.id === firstRound[1]!.id)?.winner).toBe(second.away);
  });

  it('no asigna ganador cuando ninguno hizo check-in', () => {
    const bracket = generateSingleElimination(participants);
    const checkedIn = new Map(participants.map((participant) => [participant.id, false]));

    const result = applyCheckInWalkovers(bracket, checkedIn);

    expect(result.matches.filter((match) => match.round === 1).every((match) => !match.winner)).toBe(
      true,
    );
  });
});
