import { describe, expect, it } from 'vitest';
import type { BracketMatchNode, BracketTeamNode } from './index';
import { buildBracketWorkspacePresentation } from './bracket-presentation';

const aurora: BracketTeamNode = {
  id: 'participant-aurora',
  name: 'Aurora Gaming',
  tag: 'AUR',
  seed: 1,
};

const titanes: BracketTeamNode = {
  id: 'participant-titanes',
  name: 'Titanes del Centro',
  tag: 'TDC',
  seed: 2,
};

const pixelForge: BracketTeamNode = {
  id: 'participant-pixel-forge',
  name: 'Pixel Forge',
  tag: 'PXF',
  seed: 3,
};

const quetzal: BracketTeamNode = {
  id: 'participant-quetzal',
  name: 'Quetzal Esports',
  tag: 'QTZ',
  seed: 4,
};

const matches: readonly BracketMatchNode[] = [
  {
    id: 'grand-final',
    round: 2,
    position: 1,
    home: aurora,
    away: pixelForge,
    status: 'scheduled',
  },
  {
    id: 'semifinal-aurora',
    round: 1,
    position: 1,
    home: aurora,
    away: quetzal,
    homeScore: 13,
    awayScore: 7,
    winnerId: aurora.id,
    status: 'finalized',
  },
  {
    id: 'semifinal-pixel-forge',
    round: 1,
    position: 2,
    home: titanes,
    away: pixelForge,
    homeScore: 11,
    awayScore: 13,
    winnerId: pixelForge.id,
    status: 'finalized',
  },
];

describe('bracket workspace presentation', () => {
  it('groups matches by round and sorts them without mutating the input contract', () => {
    // Arrange
    const originalOrder = matches.map((match) => match.id);

    // Act
    const presentation = buildBracketWorkspacePresentation(matches);

    // Assert
    expect(presentation.rounds.map((round) => round.number)).toEqual([1, 2]);
    expect(presentation.rounds[0]?.matches.map((match) => match.id)).toEqual([
      'semifinal-aurora',
      'semifinal-pixel-forge',
    ]);
    expect(presentation.rounds[1]?.matches.map((match) => match.id)).toEqual(['grand-final']);
    expect(matches.map((match) => match.id)).toEqual(originalOrder);
  });

  it('derives metrics and selects the next actionable match', () => {
    // Arrange
    const bracketMatches = matches;

    // Act
    const presentation = buildBracketWorkspacePresentation(bracketMatches);

    // Assert
    expect(presentation.metrics).toEqual({
      finalizedMatches: 2,
      totalMatches: 3,
    });
    expect(presentation.nextActionableMatch?.id).toBe('grand-final');
    expect(presentation.initialSelectedMatchId).toBe('grand-final');
  });

  it('exposes the winning participant from each match winnerId', () => {
    // Arrange
    const bracketMatches = matches;

    // Act
    const presentation = buildBracketWorkspacePresentation(bracketMatches);

    // Assert
    expect(presentation.rounds[0]?.matches[0]?.winner).toEqual(aurora);
    expect(presentation.rounds[0]?.matches[1]?.winner).toEqual(pixelForge);
    expect(presentation.rounds[1]?.matches[0]?.winner).toBeNull();
  });

  it('keeps brackets with the same round number separate', () => {
    // Arrange
    const doubleEliminationMatches: readonly BracketMatchNode[] = [
      {
        id: 'losers-round-1',
        bracketType: 'losers',
        round: 1,
        position: 1,
        home: titanes,
        away: quetzal,
        status: 'scheduled',
      },
      {
        id: 'grand-final-round-1',
        bracketType: 'grand_final',
        round: 1,
        position: 1,
        home: aurora,
        away: pixelForge,
        status: 'scheduled',
      },
      {
        id: 'winners-round-1-match-2',
        bracketType: 'winners',
        round: 1,
        position: 2,
        home: titanes,
        away: pixelForge,
        status: 'scheduled',
      },
      {
        id: 'winners-round-1-match-1',
        bracketType: 'winners',
        round: 1,
        position: 1,
        home: aurora,
        away: quetzal,
        status: 'scheduled',
      },
    ];
    const originalOrder = doubleEliminationMatches.map((match) => match.id);

    // Act
    const presentation = buildBracketWorkspacePresentation(doubleEliminationMatches);

    // Assert
    expect(
      presentation.rounds.map((round) => ({
        bracketType: round.bracketType,
        number: round.number,
        matches: round.matches.map((match) => match.id),
      })),
    ).toEqual([
      {
        bracketType: 'winners',
        number: 1,
        matches: ['winners-round-1-match-1', 'winners-round-1-match-2'],
      },
      { bracketType: 'losers', number: 1, matches: ['losers-round-1'] },
      { bracketType: 'grand_final', number: 1, matches: ['grand-final-round-1'] },
    ]);
    expect(doubleEliminationMatches.map((match) => match.id)).toEqual(originalOrder);
  });
});
