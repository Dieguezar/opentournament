import type { BracketMatchNode, BracketTeamNode } from './index';

export interface BracketMatchPresentation extends BracketMatchNode {
  winner: BracketTeamNode | null;
}

export interface BracketRoundPresentation {
  bracketType: string | null;
  number: number;
  matches: BracketMatchPresentation[];
}

export interface BracketWorkspaceMetrics {
  finalizedMatches: number;
  totalMatches: number;
}

export interface BracketWorkspacePresentation {
  rounds: BracketRoundPresentation[];
  metrics: BracketWorkspaceMetrics;
  nextActionableMatch: BracketMatchPresentation | null;
  initialSelectedMatchId: string | null;
}

interface IndexedMatch {
  match: BracketMatchNode;
  originalIndex: number;
}

const BRACKET_TYPE_PRIORITY: Readonly<Record<string, number>> = {
  winners: 0,
  losers: 1,
  final: 2,
  grand_final: 2,
};

function compareBracketTypes(left: string | undefined, right: string | undefined): number {
  const leftType = left ?? '';
  const rightType = right ?? '';
  const priorityDifference =
    (BRACKET_TYPE_PRIORITY[leftType] ?? 3) - (BRACKET_TYPE_PRIORITY[rightType] ?? 3);
  if (priorityDifference !== 0) return priorityDifference;
  return leftType.localeCompare(rightType);
}

function resolveWinner(match: BracketMatchNode): BracketTeamNode | null {
  if (!match.winnerId) return null;
  if (match.home?.id === match.winnerId) return match.home;
  if (match.away?.id === match.winnerId) return match.away;
  return null;
}

function isActionable(match: BracketMatchNode): boolean {
  const canBePlayed = match.status === 'scheduled' || match.status === 'in_progress';
  return canBePlayed && match.home !== null && match.away !== null;
}

export function buildBracketWorkspacePresentation(
  matches: readonly BracketMatchNode[],
): BracketWorkspacePresentation {
  const orderedMatches = matches
    .map((match, originalIndex): IndexedMatch => ({ match, originalIndex }))
    .sort((left, right) => {
      return (
        compareBracketTypes(left.match.bracketType, right.match.bracketType) ||
        left.match.round - right.match.round ||
        left.match.position - right.match.position ||
        left.originalIndex - right.originalIndex
      );
    })
    .map(({ match }): BracketMatchPresentation => ({
      ...match,
      winner: resolveWinner(match),
    }));

  const roundsByBracket = new Map<string, BracketRoundPresentation>();
  for (const match of orderedMatches) {
    const bracketType = match.bracketType ?? null;
    const groupKey = `${bracketType ?? ''}:${match.round}`;
    const existingRound = roundsByBracket.get(groupKey);
    roundsByBracket.set(groupKey, {
      bracketType,
      number: match.round,
      matches: [...(existingRound?.matches ?? []), match],
    });
  }

  const rounds = [...roundsByBracket.values()];
  const nextActionableMatch = orderedMatches.find(isActionable) ?? null;

  return {
    rounds,
    metrics: {
      finalizedMatches: orderedMatches.filter((match) => match.status === 'finalized').length,
      totalMatches: orderedMatches.length,
    },
    nextActionableMatch,
    initialSelectedMatchId: nextActionableMatch?.id ?? orderedMatches[0]?.id ?? null,
  };
}
