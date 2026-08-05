import { and, eq } from 'drizzle-orm';
import {
  brackets,
  matches,
  rounds,
  stages,
  tournamentParticipants,
  tournaments,
  type Db,
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

const BRACKET_NAMES: Record<string, string> = {
  winners: 'Ganadores',
  losers: 'Perdedores',
  final: 'Gran final',
};

export async function generateTournamentBracket(
  db: Db,
  tournament: TournamentRow,
): Promise<StageRow> {
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

  // Regeneración: se elimina la etapa anterior (cascada).
  await db.delete(stages).where(eq(stages.tournamentId, tournament.id));

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

export async function loadEngineBracket(db: Db, stage: StageRow): Promise<EngineBracket> {
  const engine = (stage.config as { engineBracket?: EngineBracket }).engineBracket;
  if (!engine) throw new DomainError(500, 'ENGINE_MISSING', 'Bracket del motor ausente');
  return engine;
}

export async function syncMatchesFromEngine(db: Db, stage: StageRow, engine: EngineBracket) {
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
  db: Db,
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
    const byId = new Map(participants.map((p) => [p.id, p]));

    for (const match of engine.matches.filter(
      (m) => m.bracket === 'winners' && m.round === 1 && m.status === 'scheduled',
    )) {
      const resolved = resolveMatchParticipants(engine, match);
      if (!resolved.home || !resolved.away) continue;
      const homeOk = byId.get(resolved.home)?.checkedIn ?? false;
      const awayOk = byId.get(resolved.away)?.checkedIn ?? false;
      if (!homeOk || !awayOk) {
        const winnerId = homeOk ? resolved.away : awayOk ? resolved.home : null;
        if (winnerId) {
          const result = advanceMatch(engine, match.id, winnerId);
          await db
            .update(stages)
            .set({ config: { ...stage.config, engineBracket: result.bracket } })
            .where(eq(stages.id, stage.id));
          await syncMatchesFromEngine(db, stage, result.bracket);
        }
      }
    }
  }

  await db
    .update(tournaments)
    .set({ status: 'in_progress' })
    .where(eq(tournaments.id, tournamentId));
}

export { BRACKET_NAMES };
