/**
 * OpenTournament tournament engine.
 *
 * Pure deterministic logic: receives participants and returns a bracket
 * structure with advancement pointers. It does not depend on HTTP, databases,
 * or Discord.
 */

export interface EngineParticipant {
  id: string;
  seed?: number | null;
}

export type SeatRef =
  | { source: 'participant'; participantId: string }
  | { source: 'match'; matchId: string; slot: 'winner' | 'loser' };

export interface EngineBracketMatch {
  id: string;
  bracket: 'winners' | 'losers' | 'final';
  /** One-based round number within this bracket. */
  round: number;
  /** Zero-based position within the round. */
  position: number;
  home: string | null;
  away: string | null;
  isBye?: boolean;
  homeFrom?: SeatRef;
  awayFrom?: SeatRef;
  winnerNext?: { matchId: string; slot: 'home' | 'away' };
  loserNext?: { matchId: string; slot: 'home' | 'away' };
  /** With a reset, GF-2 is played only when the losers-side home participant wins GF-1. */
  gfReset?: boolean;
  winner?: string | null;
  status: 'scheduled' | 'finalized';
}

export interface EngineBracket {
  matches: EngineBracketMatch[];
  byes: string[];
}

export interface BracketGenerationOptions {
  grandFinalReset?: boolean;
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

export function countByes(participantCount: number): number {
  if (participantCount <= 0) return 0;
  return nextPowerOfTwo(participantCount) - participantCount;
}

export function roundCountForSingleElimination(participantCount: number): number {
  if (participantCount <= 1) return 0;
  return Math.ceil(Math.log2(participantCount));
}

/**
 * Standard seed order for a power-of-two bracket.
 * Returns each seed's one-based position.
 */
export function seedOrder(size: number): number[] {
  if (!isPowerOfTwo(size)) {
    throw new Error(`seedOrder requires a power of 2; received ${size}`);
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

/** Sort participants by ascending seed, leaving unseeded entries last and stable. */
export function orderParticipants(participants: EngineParticipant[]): EngineParticipant[] {
  return [...participants].sort((a, b) => {
    const sa = a.seed ?? Number.POSITIVE_INFINITY;
    const sb = b.seed ?? Number.POSITIVE_INFINITY;
    if (sa === sb) return 0;
    return sa - sb;
  });
}

function winnerSeat(matchId: string): SeatRef {
  return { source: 'match', matchId, slot: 'winner' };
}

function loserSeat(matchId: string): SeatRef {
  return { source: 'match', matchId, slot: 'loser' };
}

function participantSeat(participantId: string): SeatRef {
  return { source: 'participant', participantId };
}

function linkSeat(
  matches: EngineBracketMatch[],
  seat: SeatRef | undefined,
  targetId: string,
  targetSlot: 'home' | 'away',
): void {
  if (!seat || seat.source !== 'match') return;
  const from = matches.find((m) => m.id === seat.matchId);
  if (!from) return;
  if (seat.slot === 'loser') {
    from.loserNext = { matchId: targetId, slot: targetSlot };
  } else {
    from.winnerNext = { matchId: targetId, slot: targetSlot };
  }
}

function createMatch(
  id: string,
  bracket: EngineBracketMatch['bracket'],
  round: number,
  position: number,
  homeFrom: SeatRef | undefined,
  awayFrom: SeatRef | undefined,
  winnerNext?: { matchId: string; slot: 'home' | 'away' },
  loserNext?: { matchId: string; slot: 'home' | 'away' },
): EngineBracketMatch {
  return {
    id,
    bracket,
    round,
    position,
    home: null,
    away: null,
    homeFrom,
    awayFrom,
    winnerNext,
    loserNext,
    winner: null,
    status: 'scheduled',
  };
}

/** Build winners-bracket rounds using the single-elimination structure. */
function buildWinnersBracket(participants: EngineParticipant[]): {
  matches: EngineBracketMatch[];
  byeMatches: EngineBracketMatch[];
} {
  const n = participants.length;
  const effective = nextPowerOfTwo(n);
  const order = seedOrder(effective);
  const sorted = orderParticipants(participants);

  const slots: (string | null)[] = new Array(effective).fill(null);
  for (let position = 0; position < effective; position++) {
    const seedAtPosition = order[position]!;
    const participant = sorted[seedAtPosition - 1];
    slots[position] = participant?.id ?? null;
  }

  const rounds = roundCountForSingleElimination(effective);
  const matches: EngineBracketMatch[] = [];
  const byeMatches: EngineBracketMatch[] = [];

  for (let r = 1; r <= rounds; r++) {
    const count = effective / Math.pow(2, r);
    for (let p = 0; p < count; p++) {
      const id = `W${r}-${p + 1}`;
      const home = r === 1 ? (slots[2 * p] ?? null) : null;
      const away = r === 1 ? (slots[2 * p + 1] ?? null) : null;
      const isBye = r === 1 && home !== null && away === null;
      const winnerNext =
        r < rounds
          ? {
              matchId: `W${r + 1}-${Math.floor(p / 2) + 1}`,
              slot: (p % 2 === 0 ? 'home' : 'away') as 'home' | 'away',
            }
          : undefined;
      const match: EngineBracketMatch = {
        id,
        bracket: 'winners',
        round: r,
        position: p,
        home,
        away,
        isBye: isBye || undefined,
        homeFrom: r === 1 && home ? participantSeat(home) : undefined,
        awayFrom: r === 1 && away ? participantSeat(away) : undefined,
        winnerNext,
        winner: null,
        status: 'scheduled',
      };
      matches.push(match);
      if (isBye) byeMatches.push(match);
    }
  }
  return { matches, byeMatches };
}

function matchesInRound(
  matches: EngineBracketMatch[],
  prefix: string,
  round: number,
): EngineBracketMatch[] {
  return matches.filter((m) => m.id.startsWith(prefix) && m.round === round);
}

/** Pair seats into a new losers-bracket round. */
function pairSeats(
  matches: EngineBracketMatch[],
  seats: SeatRef[],
  roundNumber: number,
): { winners: SeatRef[]; played: number } {
  const winners: SeatRef[] = [];
  let played = 0;
  let position = 0;
  for (let i = 0; i < seats.length; i += 2) {
    const a = seats[i]!;
    const b = seats[i + 1];
    if (!b) {
      winners.push(a); // Carry an odd seat forward without creating a match.
      continue;
    }
    const id = `L${roundNumber}-${position + 1}`;
    matches.push(createMatch(id, 'losers', roundNumber, position, a, b));
    linkSeat(matches, a, id, 'home');
    linkSeat(matches, b, id, 'away');
    winners.push(winnerSeat(id));
    position += 1;
    played += 1;
  }
  return { winners, played };
}

/**
 * Generate a single-elimination bracket.
 * BYEs are represented by first-round matches with `isBye`.
 */
export function generateSingleElimination(participants: EngineParticipant[]): EngineBracket {
  if (participants.length < 2) {
    throw new Error('At least two participants are required');
  }
  const { matches } = buildWinnersBracket(participants);
  const byes = matches.filter((m) => m.isBye && m.home).map((m) => m.home!) ?? [];
  return { matches, byes };
}

/**
 * Generate a double-elimination bracket.
 * - First-round BYEs advance automatically.
 * - Each winners-round loser is paired with surviving losers-bracket seats.
 * - The grand final is one match by default; `grandFinalReset` adds GF-2.
 */
export function generateDoubleElimination(
  participants: EngineParticipant[],
  options: BracketGenerationOptions = {},
): EngineBracket {
  if (participants.length < 2) {
    throw new Error('At least two participants are required');
  }
  const { grandFinalReset = false } = options;
  const n = participants.length;
  const effective = nextPowerOfTwo(n);
  const rounds = roundCountForSingleElimination(effective);
  const winners = buildWinnersBracket(participants);
  const matches: EngineBracketMatch[] = [...winners.matches];
  const byes = winners.byeMatches.map((m) => m.home!).filter(Boolean);

  let losersRound = 0;
  let survivors: SeatRef[] = [];

  // First losers round: pair actual W1 losers.
  const w1Real = winners.matches.filter((m) => m.round === 1 && !m.isBye);
  if (w1Real.length > 0) {
    losersRound += 1;
    const seats = w1Real.map((m) => loserSeat(m.id));
    const result = pairSeats(matches, seats, losersRound);
    survivors = result.winners;
  }

  // Later rounds: pair W_r losers with surviving losers-bracket seats.
  for (let r = 2; r <= rounds; r++) {
    const incoming = matchesInRound(matches, 'W', r).map((m) => loserSeat(m.id));
    const pool = [...survivors, ...incoming];
    losersRound += 1;
    const result = pairSeats(matches, pool, losersRound);
    survivors = result.winners;
  }

  // Pair remaining survivors until only one remains.
  while (survivors.length > 1) {
    losersRound += 1;
    const result = pairSeats(matches, survivors, losersRound);
    survivors = result.winners;
  }

  // Grand final.
  const winnersFinal = matches.find((m) => m.bracket === 'winners' && m.round === rounds)!;
  let gfHome: SeatRef | undefined;
  let gfAway: SeatRef | undefined;
  if (rounds === 1) {
    // Two participants: winners-final loser versus winners-final winner.
    gfHome = loserSeat(winnersFinal.id);
    gfAway = winnerSeat(winnersFinal.id);
  } else {
    gfHome = survivors[0];
    gfAway = winnerSeat(winnersFinal.id);
  }

  const gf1 = createMatch('GF-1', 'final', 1, 0, gfHome, gfAway);
  if (grandFinalReset) {
    const gf2 = createMatch('GF-2', 'final', 1, 1, gfHome, gfAway);
    gf1.gfReset = true;
    gf1.winnerNext = { matchId: 'GF-2', slot: 'home' };
    gf1.loserNext = { matchId: 'GF-2', slot: 'away' };
    matches.push(gf1, gf2);
  } else {
    matches.push(gf1);
  }

  // Wire the winners final into the grand final.
  if (rounds === 1) {
    winnersFinal.loserNext = { matchId: 'GF-1', slot: 'home' };
    winnersFinal.winnerNext = { matchId: 'GF-1', slot: 'away' };
  } else {
    winnersFinal.winnerNext = { matchId: 'GF-1', slot: 'away' };
    if (gfHome) linkSeat(matches, gfHome, 'GF-1', 'home');
  }

  return { matches, byes };
}

function resolveSeat(matches: EngineBracketMatch[], seat: SeatRef | undefined): string | null {
  if (!seat) return null;
  if (seat.source === 'participant') return seat.participantId;
  const match = matches.find((m) => m.id === seat.matchId);
  if (!match || match.status !== 'finalized' || !match.winner) return null;
  if (seat.slot === 'winner') return match.winner;
  return match.home === match.winner ? match.away : match.home;
}

/** Finalize BYEs and fill their next-round slots. */
export function finalizeByes(bracket: EngineBracket): EngineBracket {
  const matches = bracket.matches.map((m) => ({ ...m }));
  for (const bye of matches.filter((m) => m.isBye && m.home)) {
    const idx = matches.findIndex((m) => m.id === bye.id);
    const updated = { ...bye, status: 'finalized' as const, winner: bye.home };
    matches[idx] = updated;
    if (updated.winnerNext) {
      const target = matches.findIndex((m) => m.id === updated.winnerNext!.matchId);
      if (target >= 0) {
        matches[target] = {
          ...matches[target]!,
          [updated.winnerNext!.slot]: updated.winner,
        };
      }
    }
  }
  return { matches, byes: bracket.byes };
}

export interface AdvanceResult {
  bracket: EngineBracket;
  champion: string | null;
}

/**
 * Record a match winner, update winner/loser destinations, and return the
 * updated bracket.
 */
export function advanceMatch(
  bracket: EngineBracket,
  matchId: string,
  winnerId: string,
): AdvanceResult {
  const matches = bracket.matches.map((m) => ({ ...m }));
  const idx = matches.findIndex((m) => m.id === matchId);
  if (idx < 0) throw new Error(`Unknown match: ${matchId}`);
  const match = matches[idx]!;
  if (match.status === 'finalized') throw new Error(`Match ${matchId} is already finalized`);
  if (match.home !== winnerId && match.away !== winnerId) {
    throw new Error(`Winner ${winnerId} does not participate in ${matchId}`);
  }

  const updated = { ...match, status: 'finalized' as const, winner: winnerId };
  matches[idx] = updated;

  const loserId = match.home === winnerId ? match.away : match.home;

  const gfResetWin = updated.gfReset === true && winnerId === updated.home;
  const normalAdvance = updated.winnerNext !== undefined && !updated.gfReset;

  if (normalAdvance && updated.winnerNext) {
    const target = matches.findIndex((m) => m.id === updated.winnerNext!.matchId);
    if (target >= 0) {
      matches[target] = { ...matches[target]!, [updated.winnerNext!.slot]: winnerId };
    }
  }
  if (normalAdvance && updated.loserNext && loserId) {
    const target = matches.findIndex((m) => m.id === updated.loserNext!.matchId);
    if (target >= 0) {
      matches[target] = { ...matches[target]!, [updated.loserNext!.slot]: loserId };
    }
  }

  // Grand-final reset: a losers-side home win sends both participants to GF-2;
  // an undefeated away win decides the champion immediately.
  if (gfResetWin) {
    const target = matches.findIndex((m) => m.id === 'GF-2');
    if (target >= 0) {
      matches[target] = {
        ...matches[target]!,
        home: updated.home,
        away: updated.away,
      };
    }
  }

  // Champion: a final match with no winner destination, or GF-1 won by away.
  const isChampion =
    updated.gfReset === true ? winnerId !== updated.home : updated.winnerNext === undefined;

  return { bracket: { matches, byes: bracket.byes }, champion: isChampion ? winnerId : null };
}

/** Resolve a match's actual participants by following its seat references. */
export function resolveMatchParticipants(
  bracket: EngineBracket,
  match: EngineBracketMatch,
): { home: string | null; away: string | null } {
  return {
    home: match.home ?? resolveSeat(bracket.matches, match.homeFrom),
    away: match.away ?? resolveSeat(bracket.matches, match.awayFrom),
  };
}

export function isChampionMatch(bracket: EngineBracket, match: EngineBracketMatch): boolean {
  return !match.winnerNext && match.bracket === 'final';
}
