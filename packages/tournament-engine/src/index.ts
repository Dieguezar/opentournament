/**
 * Motor de torneos de OpenTournament.
 *
 * Lógica pura y determinista: recibe participantes y devuelve la estructura
 * de brackets (partidas con punteros de avance). No depende de HTTP, base de
 * datos ni Discord.
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
  /** Número de ronda dentro de su bracket, 1-based. */
  round: number;
  /** Posición dentro de la ronda, 0-based. */
  position: number;
  home: string | null;
  away: string | null;
  isBye?: boolean;
  homeFrom?: SeatRef;
  awayFrom?: SeatRef;
  winnerNext?: { matchId: string; slot: 'home' | 'away' };
  loserNext?: { matchId: string; slot: 'home' | 'away' };
  /** GF-1 con reset: solo se juega GF-2 si gana el equipo de perdedores (home). */
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
 * Ordenamiento estándar de seeds para un bracket de potencia de 2.
 * Devuelve la posición (1-based) del seed i.
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

/** Ordena participantes por seed ascendente (sin seed al final, estable). */
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

/** Crea las rondas del bracket de ganadores (estructura de sencilla). */
function buildWinnersBracket(
  participants: EngineParticipant[],
): { matches: EngineBracketMatch[]; byeMatches: EngineBracketMatch[] } {
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

/** Empareja seats en una nueva ronda del bracket de perdedores. */
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
      winners.push(a); // espera (BYE de perdedores)
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
 * Genera un bracket de eliminación sencilla.
 * Los BYEs se representan como partidas de la ronda 1 con `isBye`.
 */
export function generateSingleElimination(
  participants: EngineParticipant[],
): EngineBracket {
  if (participants.length < 2) {
    throw new Error('Se necesitan al menos 2 participantes');
  }
  const { matches } = buildWinnersBracket(participants);
  const byes = matches.filter((m) => m.isBye && m.home).map((m) => m.home!) ?? [];
  return { matches, byes };
}

/**
 * Genera un bracket de doble eliminación.
 * - Los BYEs de la ronda 1 son auto-avances.
 * - El bracket de perdedores empareja perdedores de cada ronda de ganadores
 *   contra sobrevivientes previos (algoritmo general, válido para cualquier N).
 * - La gran final es 1 partida por defecto; con `grandFinalReset` se genera GF-2.
 */
export function generateDoubleElimination(
  participants: EngineParticipant[],
  options: BracketGenerationOptions = {},
): EngineBracket {
  if (participants.length < 2) {
    throw new Error('Se necesitan al menos 2 participantes');
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

  // Ronda 1 de perdedores: empareja perdedores reales de W1.
  const w1Real = winners.matches.filter((m) => m.round === 1 && !m.isBye);
  if (w1Real.length > 0) {
    losersRound += 1;
    const seats = w1Real.map((m) => loserSeat(m.id));
    const result = pairSeats(matches, seats, losersRound);
    survivors = result.winners;
  }

  // Rondas siguientes: perdedores de W_r contra sobrevivientes del bracket L.
  for (let r = 2; r <= rounds; r++) {
    const incoming = matchesInRound(matches, 'W', r).map((m) => loserSeat(m.id));
    const pool = [...survivors, ...incoming];
    losersRound += 1;
    const result = pairSeats(matches, pool, losersRound);
    survivors = result.winners;
  }

  // Sobrevivientes restantes se emparejan entre sí hasta quedar 1.
  while (survivors.length > 1) {
    losersRound += 1;
    const result = pairSeats(matches, survivors, losersRound);
    survivors = result.winners;
  }

  // Gran final.
  const winnersFinal = matches.find((m) => m.bracket === 'winners' && m.round === rounds)!;
  let gfHome: SeatRef | undefined;
  let gfAway: SeatRef | undefined;
  if (rounds === 1) {
    // 2 participantes: perdedor vs ganador de la final de ganadores.
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

  // Cableado de la final de ganadores hacia la gran final.
  if (rounds === 1) {
    winnersFinal.loserNext = { matchId: 'GF-1', slot: 'home' };
    winnersFinal.winnerNext = { matchId: 'GF-1', slot: 'away' };
  } else {
    winnersFinal.winnerNext = { matchId: 'GF-1', slot: 'away' };
    if (gfHome) linkSeat(matches, gfHome, 'GF-1', 'home');
  }

  return { matches, byes };
}

function resolveSeat(
  matches: EngineBracketMatch[],
  seat: SeatRef | undefined,
): string | null {
  if (!seat) return null;
  if (seat.source === 'participant') return seat.participantId;
  const match = matches.find((m) => m.id === seat.matchId);
  if (!match || match.status !== 'finalized' || !match.winner) return null;
  if (seat.slot === 'winner') return match.winner;
  return match.home === match.winner ? match.away : match.home;
}

/** Aplica los BYEs (auto-avance) y completa los slots de la siguiente ronda. */
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
 * Registra el ganador de una partida, actualiza los punteros de avance
 * (ganador y, si aplica, perdedor) y devuelve el bracket actualizado.
 */
export function advanceMatch(
  bracket: EngineBracket,
  matchId: string,
  winnerId: string,
): AdvanceResult {
  const matches = bracket.matches.map((m) => ({ ...m }));
  const idx = matches.findIndex((m) => m.id === matchId);
  if (idx < 0) throw new Error(`Partida desconocida: ${matchId}`);
  const match = matches[idx]!;
  if (match.status === 'finalized') throw new Error(`La partida ${matchId} ya está finalizada`);
  if (match.home !== winnerId && match.away !== winnerId) {
    throw new Error(`El ganador ${winnerId} no participa en ${matchId}`);
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

  // Gran final con reset: si gana el equipo de perdedores (home), ambos
  // continúan a GF-2; si gana el invicto (away), es campeón.
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

  // Campeón: partida final sin winnerNext (o GF-1 con reset ganada por away).
  const isChampion = updated.gfReset === true
    ? winnerId !== updated.home
    : updated.winnerNext === undefined;

  return { bracket: { matches, byes: bracket.byes }, champion: isChampion ? winnerId : null };
}

/** Resuelve los participantes reales de una partida siguiendo sus seats. */
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
