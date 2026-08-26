import { eq } from 'drizzle-orm';
import {
  advanceMatch,
  generateDoubleElimination,
  type EngineBracket,
} from '@opentournament/tournament-engine';
import type { DbExecutor } from './client.js';
import {
  brackets,
  checkIns,
  demoFlags,
  matches,
  resultSubmissions,
  rounds,
  stages,
  teamMembers,
  teams,
  tournamentParticipants,
  tournamentRegistrations,
  tournamentStaff,
  tournaments,
} from './schema.js';

const SMASH_DEMO_FLAG = 'smash-showcase-v1';

function demoId(value: number): string {
  return `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
}

export const SMASH_DEMO_TOURNAMENT_ID = demoId(600);

const SMASH_PLAYERS = [
  { name: 'Nebula', tag: 'NEB' },
  { name: 'Koi', tag: 'KOI' },
  { name: 'Runa', tag: 'RUN' },
  { name: 'Volt', tag: 'VLT' },
  { name: 'Mako', tag: 'MAK' },
  { name: 'Luna', tag: 'LUN' },
  { name: 'Atlas', tag: 'ATL' },
  { name: 'Ember', tag: 'EMB' },
] as const;

const SMASH_CHARACTERS = [
  'Mario',
  'Joker',
  'Samus',
  'Pikachu',
  'Cloud',
  'Peach',
  'Fox',
  'Pyra / Mythra',
  'Link',
  'Captain Falcon',
  'Palutena',
  'Sonic',
  'Roy',
  'Lucina',
  'Pokémon Trainer',
  'Mr. Game & Watch',
] as const;

const SMASH_STAGES = [
  'Battlefield',
  'Small Battlefield',
  'Pokémon Stadium 2',
  'Final Destination',
  'Town & City',
  'Kalos Pokémon League',
  'Smashville',
  'Hollow Bastion',
] as const;

const TEAM_IDS = SMASH_PLAYERS.map((_, index) => demoId(501 + index));
const REGISTRATION_IDS = SMASH_PLAYERS.map((_, index) => demoId(611 + index));
const PARTICIPANT_IDS = SMASH_PLAYERS.map((_, index) => demoId(621 + index));
const STAGE_ID = demoId(700);

interface PlayedMatch {
  engineId: string;
  homeParticipantId: string;
  awayParticipantId: string;
  winnerParticipantId: string;
}

interface SmashGameResult {
  number: number;
  stage: string;
  homeCharacter: string;
  awayCharacter: string;
  winnerTeamId: string;
  homeStocks: number;
  awayStocks: number;
}

function simulateSmashBracket(): { bracket: EngineBracket; playedMatches: PlayedMatch[] } {
  let bracket = generateDoubleElimination(
    PARTICIPANT_IDS.map((id, index) => ({ id, seed: index + 1 })),
    { grandFinalReset: true },
  );
  let playedMatches: PlayedMatch[] = [];
  let matchIndex = 0;

  while (true) {
    const readyMatch = bracket.matches.find(
      (match) => match.status === 'scheduled' && match.home && match.away,
    );
    if (!readyMatch?.home || !readyMatch.away) break;

    const winnerParticipantId =
      (matchIndex * 7 + readyMatch.position) % 3 === 0 ? readyMatch.away : readyMatch.home;
    playedMatches = [
      ...playedMatches,
      {
        engineId: readyMatch.id,
        homeParticipantId: readyMatch.home,
        awayParticipantId: readyMatch.away,
        winnerParticipantId,
      },
    ];
    bracket = advanceMatch(bracket, readyMatch.id, winnerParticipantId).bracket;
    matchIndex += 1;
  }

  return { bracket, playedMatches };
}

function teamIdForParticipant(participantId: string): string {
  const index = PARTICIPANT_IDS.indexOf(participantId);
  if (index < 0) throw new Error(`Unknown Smash participant: ${participantId}`);
  return TEAM_IDS[index]!;
}

function createGameResults(
  playedMatch: PlayedMatch,
  matchIndex: number,
  bestOf: 3 | 5,
): { homeScore: number; awayScore: number; games: SmashGameResult[] } {
  const winsRequired = bestOf === 5 ? 3 : 2;
  const loserParticipantId =
    playedMatch.winnerParticipantId === playedMatch.homeParticipantId
      ? playedMatch.awayParticipantId
      : playedMatch.homeParticipantId;
  const loserScore = matchIndex % winsRequired;
  const gameWinners = Array.from({ length: winsRequired + loserScore }, (_, gameIndex) =>
    gameIndex < loserScore * 2 && gameIndex % 2 === 1
      ? loserParticipantId
      : playedMatch.winnerParticipantId,
  );
  const homeScore = gameWinners.filter(
    (participantId) => participantId === playedMatch.homeParticipantId,
  ).length;
  const awayScore = gameWinners.length - homeScore;
  const homePlayerIndex = PARTICIPANT_IDS.indexOf(playedMatch.homeParticipantId);
  const awayPlayerIndex = PARTICIPANT_IDS.indexOf(playedMatch.awayParticipantId);

  const games = gameWinners.map((winnerParticipantId, gameIndex) => {
    const homeWon = winnerParticipantId === playedMatch.homeParticipantId;
    const remainingStocks = ((matchIndex + gameIndex) % 3) + 1;
    return {
      number: gameIndex + 1,
      stage: SMASH_STAGES[(matchIndex + gameIndex * 3) % SMASH_STAGES.length]!,
      homeCharacter:
        SMASH_CHARACTERS[(homePlayerIndex * 3 + matchIndex + gameIndex) % SMASH_CHARACTERS.length]!,
      awayCharacter:
        SMASH_CHARACTERS[
          (awayPlayerIndex * 5 + matchIndex + gameIndex * 2) % SMASH_CHARACTERS.length
        ]!,
      winnerTeamId: teamIdForParticipant(winnerParticipantId),
      homeStocks: homeWon ? remainingStocks : 0,
      awayStocks: homeWon ? 0 : remainingStocks,
    };
  });

  return { homeScore, awayScore, games };
}

function roundName(bracketType: string, roundNumber: number): string {
  if (bracketType === 'winners') {
    if (roundNumber === 1) return 'Cuartos de final';
    if (roundNumber === 2) return 'Semifinales';
    return 'Final de ganadores';
  }
  if (bracketType === 'final') return roundNumber === 1 ? 'Gran final' : 'Reset de gran final';
  return `Perdedores · Ronda ${roundNumber}`;
}

export async function seedSmashDemoData(
  db: DbExecutor,
  adminUserId: string,
  organizationId: string,
): Promise<string> {
  const [existingFlag] = await db
    .select({ value: demoFlags.value })
    .from(demoFlags)
    .where(eq(demoFlags.key, SMASH_DEMO_FLAG))
    .limit(1);
  if (existingFlag?.value) {
    await db
      .update(tournaments)
      .set({ status: 'finalized' })
      .where(eq(tournaments.id, SMASH_DEMO_TOURNAMENT_ID));
    return SMASH_DEMO_TOURNAMENT_ID;
  }

  await db
    .insert(teams)
    .values(
      SMASH_PLAYERS.map((player, index) => ({
        id: TEAM_IDS[index]!,
        organizationId,
        name: player.name,
        tag: player.tag,
        isPermanent: true,
        captainId: adminUserId,
        gameAdapterKey: 'smash_ultimate',
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(teamMembers)
    .values(TEAM_IDS.map((teamId) => ({ teamId, userId: adminUserId, role: 'captain' })))
    .onConflictDoNothing();

  const now = new Date();
  await db
    .insert(tournaments)
    .values({
      id: SMASH_DEMO_TOURNAMENT_ID,
      organizationId,
      gameAdapterKey: 'smash_ultimate',
      slug: 'smash-random-showdown',
      name: 'Smash Random Showdown',
      description:
        'Simulación completa de ocho jugadores: doble eliminación, personajes rotativos, escenarios legales y gran final con reset.',
      rules:
        'Singles competitivo: 3 stocks, 7 minutos, objetos y hazards desactivados. BO3 hasta finales y BO5 en las finales.',
      format: 'double_elimination',
      visibility: 'public',
      status: 'finalized',
      capacity: 8,
      seriesConfig: { bo: 3, drawsAllowed: false },
      registrationConfig: { manualApproval: false },
      checkinConfig: { delayToleranceMinutes: 10 },
      timingConfig: { resultConfirmMinutes: 15, disputeWindowMinutes: 30 },
      settings: {
        grandFinalReset: true,
        presencial: true,
        templateKey: 'smash_ultimate.standard_v1',
        templateVersion: 1,
        gameRules: {
          game: 'smash_ultimate',
          stocks: 3,
          timeLimitMinutes: 7,
          itemsEnabled: false,
          finalSmashMeterEnabled: false,
          stageHazardsEnabled: false,
          launchRate: 1,
          starters: SMASH_STAGES.slice(0, 5),
          counterpicks: SMASH_STAGES.slice(5),
          stageBans: 3,
          stageClause: 'modified_dsr',
        },
      },
      startsAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() - 30 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();
  await db
    .insert(tournamentStaff)
    .values({ tournamentId: SMASH_DEMO_TOURNAMENT_ID, userId: adminUserId, role: 'admin' })
    .onConflictDoNothing();
  await db
    .insert(tournamentRegistrations)
    .values(
      TEAM_IDS.map((teamId, index) => ({
        id: REGISTRATION_IDS[index]!,
        tournamentId: SMASH_DEMO_TOURNAMENT_ID,
        teamId,
        status: 'approved',
        approvedBy: adminUserId,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(tournamentParticipants)
    .values(
      TEAM_IDS.map((teamId, index) => ({
        id: PARTICIPANT_IDS[index]!,
        tournamentId: SMASH_DEMO_TOURNAMENT_ID,
        registrationId: REGISTRATION_IDS[index]!,
        teamId,
        seed: index + 1,
        checkedIn: true,
        status: 'active',
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(checkIns)
    .values(
      TEAM_IDS.map((teamId) => ({
        tournamentId: SMASH_DEMO_TOURNAMENT_ID,
        teamId,
        userId: adminUserId,
      })),
    )
    .onConflictDoNothing();

  const { bracket: engineBracket, playedMatches } = simulateSmashBracket();
  const bracketTypes = ['winners', 'losers', 'final'] as const;
  const bracketIds = new Map(
    bracketTypes.map((bracketType, index) => [bracketType, demoId(711 + index)]),
  );
  const roundKeys = bracketTypes.flatMap((bracketType) =>
    [
      ...new Set(
        engineBracket.matches
          .filter((match) => match.bracket === bracketType)
          .map((match) => match.round),
      ),
    ]
      .sort((left, right) => left - right)
      .map((roundNumber) => ({ bracketType, roundNumber })),
  );
  const roundIds = new Map(
    roundKeys.map(({ bracketType, roundNumber }, index) => [
      `${bracketType}-${roundNumber}`,
      demoId(721 + index),
    ]),
  );

  await db
    .insert(stages)
    .values({
      id: STAGE_ID,
      tournamentId: SMASH_DEMO_TOURNAMENT_ID,
      type: 'bracket',
      format: 'double_elimination',
      status: 'finalized',
      config: { engineBracket },
    })
    .onConflictDoNothing();
  await db
    .insert(brackets)
    .values(
      bracketTypes.map((bracketType) => ({
        id: bracketIds.get(bracketType)!,
        stageId: STAGE_ID,
        type: bracketType,
        config: { grandFinalReset: true },
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(rounds)
    .values(
      roundKeys.map(({ bracketType, roundNumber }) => ({
        id: roundIds.get(`${bracketType}-${roundNumber}`)!,
        bracketId: bracketIds.get(bracketType)!,
        number: roundNumber,
        name: roundName(bracketType, roundNumber),
        status: 'finalized',
      })),
    )
    .onConflictDoNothing();

  const playedByEngineId = new Map(playedMatches.map((match) => [match.engineId, match]));
  const matchRows = engineBracket.matches.map((engineMatch, matchIndex) => {
    const playedMatch = playedByEngineId.get(engineMatch.id);
    if (!playedMatch || !engineMatch.home || !engineMatch.away || !engineMatch.winner) {
      throw new Error(`Smash set ${engineMatch.id} was not finalized`);
    }
    const bestOf: 3 | 5 =
      engineMatch.bracket === 'final' ||
      (engineMatch.bracket === 'winners' && engineMatch.round === 3)
        ? 5
        : 3;
    const result = createGameResults(playedMatch, matchIndex, bestOf);
    return {
      id: demoId(751 + matchIndex),
      roundId: roundIds.get(`${engineMatch.bracket}-${engineMatch.round}`)!,
      tournamentId: SMASH_DEMO_TOURNAMENT_ID,
      engineId: engineMatch.id,
      position: engineMatch.position,
      homeParticipantId: engineMatch.home,
      awayParticipantId: engineMatch.away,
      status: 'finalized',
      series: { bo: bestOf, maps: result.games.map((game) => game.stage) },
      scheduledAt: new Date(
        now.getTime() - (engineBracket.matches.length - matchIndex) * 20 * 60 * 1000,
      ),
      result: {
        winnerId: engineMatch.winner,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        games: result.games,
      },
    };
  });
  await db.insert(matches).values(matchRows).onConflictDoNothing();

  await db
    .insert(resultSubmissions)
    .values(
      matchRows.flatMap((match, matchIndex) => {
        const result = match.result;
        return [match.homeParticipantId, match.awayParticipantId].map(
          (participantId, submissionIndex) => ({
            id: demoId(801 + matchIndex * 2 + submissionIndex),
            matchId: match.id,
            teamId: teamIdForParticipant(participantId),
            reportedBy: adminUserId,
            result,
            status: 'confirmed',
          }),
        );
      }),
    )
    .onConflictDoNothing();
  await db
    .insert(demoFlags)
    .values({ key: SMASH_DEMO_FLAG, value: true })
    .onConflictDoUpdate({ target: demoFlags.key, set: { value: true } });

  return SMASH_DEMO_TOURNAMENT_ID;
}
