import { and, eq, inArray } from 'drizzle-orm';
import {
  brackets,
  matches,
  rounds,
  stages,
  tournamentParticipants,
  tournaments,
  type Db,
  type DbExecutor,
  type DbTransaction,
  type RoundRow,
  type StageRow,
  type TournamentRow,
} from '@opentournament/database';
import {
  advanceMatch,
  finalizeByes,
  generateDoubleElimination,
  generateSingleElimination,
  resolveMatchParticipants,
  type EngineBracket,
  type EngineBracketMatch,
  type EngineParticipant,
} from '@opentournament/tournament-engine';

export class DomainError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export interface MatchContext {
  match: typeof matches.$inferSelect;
  stage: StageRow;
  tournament: TournamentRow;
  home: (typeof tournamentParticipants.$inferSelect) | null;
  away: (typeof tournamentParticipants.$inferSelect) | null;
}

export async function loadMatchContext(db: DbExecutor, matchId: string): Promise<MatchContext | null> {
  const [row] = await db
    .select({
      match: matches,
      stageId: stages.id,
      tournamentId: stages.tournamentId,
    })
    .from(matches)
    .innerJoin(rounds, eq(rounds.id, matches.roundId))
    .innerJoin(brackets, eq(brackets.id, rounds.bracketId))
    .innerJoin(stages, eq(stages.id, brackets.stageId))
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!row) return null;

  const [stage] = await db
    .select()
    .from(stages)
    .where(eq(stages.id, row.stageId))
    .limit(1);
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, row.tournamentId))
    .limit(1);
  if (!stage || !tournament) return null;

  const ids = [row.match.homeParticipantId, row.match.awayParticipantId].filter(
    (id): id is string => Boolean(id),
  );
  const participants = ids.length
    ? await db
        .select()
        .from(tournamentParticipants)
        .where(inArray(tournamentParticipants.id, ids))
    : [];
  const home = participants.find((p) => p.id === row.match.homeParticipantId) ?? null;
  const away = participants.find((p) => p.id === row.match.awayParticipantId) ?? null;

  return { match: row.match, stage, tournament, home, away };
}

export async function lockMatchStage(
  transaction: DbTransaction,
  matchId: string,
): Promise<MatchContext> {
  const [stageReference] = await transaction
    .select({ id: stages.id })
    .from(matches)
    .innerJoin(rounds, eq(rounds.id, matches.roundId))
    .innerJoin(brackets, eq(brackets.id, rounds.bracketId))
    .innerJoin(stages, eq(stages.id, brackets.stageId))
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!stageReference) {
    throw new DomainError(404, 'MATCH_NOT_FOUND', 'La partida no existe');
  }

  await transaction
    .select({ id: stages.id })
    .from(stages)
    .where(eq(stages.id, stageReference.id))
    .for('update');

  const context = await loadMatchContext(transaction, matchId);
  if (!context) {
    throw new DomainError(404, 'MATCH_NOT_FOUND', 'La partida no existe');
  }
  return context;
}

const BRACKET_NAMES: Record<string, string> = {
  winners: 'Ganadores',
  losers: 'Perdedores',
  final: 'Gran final',
};

export async function generateTournamentBracket(
  db: Db,
  tournament: TournamentRow,
): Promise<StageRow> {
  const [existingStage] = await db
    .select({ id: stages.id })
    .from(stages)
    .where(eq(stages.tournamentId, tournament.id))
    .limit(1);
  if (existingStage) {
    throw new DomainError(
      409,
      'BRACKET_ALREADY_EXISTS',
      'El torneo ya tiene un bracket generado',
    );
  }

  const participants = await db
    .select()
    .from(tournamentParticipants)
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournament.id),
        eq(tournamentParticipants.status, 'active'),
      ),
    );

  const engineParticipants: EngineParticipant[] = participants.map((p) => ({
    id: p.id,
    seed: p.seed,
  }));
  if (engineParticipants.length < 2) {
    throw new DomainError(400, 'NOT_ENOUGH_PARTICIPANTS', 'Se necesitan al menos 2 participantes');
  }

  const engine = finalizeByes(
    tournament.format === 'double_elimination'
      ? generateDoubleElimination(engineParticipants, {
          grandFinalReset: tournament.settings?.grandFinalReset ?? false,
        })
      : generateSingleElimination(engineParticipants),
  );

  const [stage] = await db
    .insert(stages)
    .values({
      tournamentId: tournament.id,
      type: 'bracket',
      format: tournament.format,
      status: 'active',
      config: { engineBracket: engine },
    })
    .returning();
  if (!stage) throw new DomainError(500, 'STAGE_CREATE_FAILED', 'No se pudo crear la etapa');

  await persistEngineBracket(db, stage, engine);
  await db
    .update(tournaments)
    .set({ status: 'in_progress' })
    .where(eq(tournaments.id, tournament.id));

  return stage;
}

function groupByBracket(engine: EngineBracket): Record<string, EngineBracketMatch[]> {
  const grouped: Record<string, EngineBracketMatch[]> = { winners: [], losers: [], final: [] };
  for (const match of engine.matches) {
    grouped[match.bracket]?.push(match);
  }
  return grouped;
}

async function persistEngineBracket(
  db: Db,
  stage: StageRow,
  engine: EngineBracket,
): Promise<void> {
  const grouped = groupByBracket(engine);
  for (const [type, engineMatches] of Object.entries(grouped)) {
    if (engineMatches.length === 0) continue;
    const [bracketRow] = await db
      .insert(brackets)
      .values({ stageId: stage.id, type, config: {} })
      .returning();
    if (!bracketRow) continue;

    const roundsByNumber = new Map<number, RoundRow>();
    for (const match of engineMatches) {
      let roundRow = roundsByNumber.get(match.round);
      if (!roundRow) {
        const name =
          type === 'final'
            ? 'Gran final'
            : type === 'losers'
              ? `Ronda de perdedores ${match.round}`
              : `Ronda ${match.round}`;
        const [created] = await db
          .insert(rounds)
          .values({ bracketId: bracketRow.id, number: match.round, name })
          .returning();
        if (!created) continue;
        roundRow = created;
        roundsByNumber.set(match.round, created);
      }

      const participants = resolveMatchParticipants(engine, match);
      await db.insert(matches).values({
        roundId: roundRow.id,
        tournamentId: stage.tournamentId,
        engineId: match.id,
        position: match.position,
        homeParticipantId: participants.home,
        awayParticipantId: participants.away,
        status: match.status,
        result: match.status === 'finalized' && match.winner ? { winnerId: match.winner } : undefined,
        series: {},
      });
    }
  }
}

export async function loadEngineBracket(db: DbExecutor, stage: StageRow): Promise<EngineBracket> {
  const engine = (stage.config as { engineBracket?: EngineBracket }).engineBracket;
  if (!engine) throw new DomainError(500, 'ENGINE_MISSING', 'Bracket del motor ausente');
  return engine;
}

export async function syncMatchesFromEngine(db: DbExecutor, stage: StageRow, engine: EngineBracket) {
  const rows = await db
    .select({ id: matches.id, engineId: matches.engineId })
    .from(matches)
    .innerJoin(rounds, eq(rounds.id, matches.roundId))
    .innerJoin(brackets, eq(brackets.id, rounds.bracketId))
    .where(eq(brackets.stageId, stage.id));

  for (const row of rows) {
    const engineMatch = engine.matches.find((m) => m.id === row.engineId);
    if (!engineMatch) continue;
    const participants = resolveMatchParticipants(engine, engineMatch);
    await db
      .update(matches)
      .set({
        homeParticipantId: participants.home,
        awayParticipantId: participants.away,
        status: engineMatch.status,
        result:
          engineMatch.status === 'finalized' && engineMatch.winner
            ? { winnerId: engineMatch.winner }
            : null,
      })
      .where(eq(matches.id, row.id));
  }
}

export async function applyMatchWinner(
  db: DbExecutor,
  stage: StageRow,
  engineId: string,
  winnerId: string,
): Promise<{ champion: string | null }> {
  const engine = await loadEngineBracket(db, stage);
  const result = advanceMatch(engine, engineId, winnerId);
  await db
    .update(stages)
    .set({ config: { ...stage.config, engineBracket: result.bracket } })
    .where(eq(stages.id, stage.id));
  await syncMatchesFromEngine(db, stage, result.bracket);
  return { champion: result.champion };
}

export async function advanceMatchWinnerAtomically(
  db: Db,
  stageId: string,
  engineId: string,
  winnerId: string,
): Promise<{ champion: string | null }> {
  return db.transaction(async (transaction) => {
    const [stage] = await transaction
      .select()
      .from(stages)
      .where(eq(stages.id, stageId))
      .for('update');
    if (!stage) {
      throw new DomainError(404, 'STAGE_NOT_FOUND', 'La etapa no existe');
    }

    return applyMatchWinner(transaction, stage, engineId, winnerId);
  });
}

export function applyCheckInWalkovers(
  engine: EngineBracket,
  checkedInByParticipant: ReadonlyMap<string, boolean>,
): EngineBracket {
  const firstRoundMatchIds = engine.matches
    .filter(
      (match) =>
        match.bracket === 'winners' && match.round === 1 && match.status === 'scheduled',
    )
    .map((match) => match.id);
  let currentEngine = engine;

  for (const matchId of firstRoundMatchIds) {
    const match = currentEngine.matches.find((candidate) => candidate.id === matchId);
    if (!match || match.status !== 'scheduled') continue;

    const resolved = resolveMatchParticipants(currentEngine, match);
    if (!resolved.home || !resolved.away) continue;

    const homeCheckedIn = checkedInByParticipant.get(resolved.home) ?? false;
    const awayCheckedIn = checkedInByParticipant.get(resolved.away) ?? false;
    if (homeCheckedIn === awayCheckedIn) continue;

    const winnerId = homeCheckedIn ? resolved.home : resolved.away;
    currentEngine = advanceMatch(currentEngine, match.id, winnerId).bracket;
  }

  return currentEngine;
}

export async function closeCheckIn(db: Db, tournamentId: string): Promise<void> {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament || tournament.status === 'finalized' || tournament.status === 'cancelled') {
    return;
  }

  const [stage] = await db
    .select()
    .from(stages)
    .where(eq(stages.tournamentId, tournamentId))
    .limit(1);

  if (stage) {
    const engine = await loadEngineBracket(db, stage);
    const participants = await db
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId));
    const checkedInByParticipant = new Map(
      participants.map((participant) => [participant.id, participant.checkedIn]),
    );
    const updatedEngine = applyCheckInWalkovers(engine, checkedInByParticipant);

    if (updatedEngine !== engine) {
      await db
        .update(stages)
        .set({ config: { ...stage.config, engineBracket: updatedEngine } })
        .where(eq(stages.id, stage.id));
      await syncMatchesFromEngine(db, stage, updatedEngine);
    }
  }

  await db
    .update(tournaments)
    .set({ status: 'in_progress' })
    .where(eq(tournaments.id, tournamentId));
}

export { BRACKET_NAMES };
