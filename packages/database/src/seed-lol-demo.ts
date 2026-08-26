import { eq } from 'drizzle-orm';
import {
  advanceMatch,
  generateSingleElimination,
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

const LOL_DEMO_FLAG = 'lol-showcase-v1';

function demoId(value: number): string {
  return `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
}

export const LOL_DEMO_TOURNAMENT_ID = demoId(900);

const LOL_TEAMS = [
  { name: 'Quetzal Storm', tag: 'QTZ' },
  { name: 'Jaguar Five', tag: 'JGF' },
  { name: 'Volcanic Rift', tag: 'VRT' },
  { name: 'Maya Nexus', tag: 'MYN' },
  { name: 'Caribe Titans', tag: 'CBT' },
  { name: 'Andean Wolves', tag: 'ADW' },
  { name: 'Pacific Serpents', tag: 'PCS' },
  { name: 'Isthmus Arc', tag: 'ISA' },
] as const;

const TEAM_IDS = LOL_TEAMS.map((_, index) => demoId(901 + index));
const REGISTRATION_IDS = LOL_TEAMS.map((_, index) => demoId(911 + index));
const PARTICIPANT_IDS = LOL_TEAMS.map((_, index) => demoId(921 + index));
const STAGE_ID = demoId(930);
const BRACKET_ID = demoId(931);

interface PlayedMatch {
  engineId: string;
  homeParticipantId: string;
  awayParticipantId: string;
  winnerParticipantId: string;
}

interface LeagueGameResult {
  number: number;
  winnerTeamId: string;
  blueTeamId: string;
  durationMinutes: number;
  riotMatchId: string;
}

function simulateLeagueBracket(): { bracket: EngineBracket; playedMatches: PlayedMatch[] } {
  let bracket = generateSingleElimination(
    PARTICIPANT_IDS.map((id, index) => ({ id, seed: index + 1 })),
  );
  let playedMatches: PlayedMatch[] = [];
  let matchIndex = 0;

  while (true) {
    const readyMatch = bracket.matches.find(
      (match) => match.status === 'scheduled' && match.home && match.away,
    );
    if (!readyMatch?.home || !readyMatch.away) break;

    const winnerParticipantId =
      (matchIndex + readyMatch.position) % 4 === 0 ? readyMatch.away : readyMatch.home;
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
  if (index < 0) throw new Error(`Unknown LoL participant: ${participantId}`);
  return TEAM_IDS[index]!;
}

function createGameResults(
  playedMatch: PlayedMatch,
  matchIndex: number,
): { homeScore: number; awayScore: number; lolGames: LeagueGameResult[] } {
  const loserParticipantId =
    playedMatch.winnerParticipantId === playedMatch.homeParticipantId
      ? playedMatch.awayParticipantId
      : playedMatch.homeParticipantId;
  const participantWinners =
    matchIndex % 3 === 0
      ? [playedMatch.winnerParticipantId, loserParticipantId, playedMatch.winnerParticipantId]
      : [playedMatch.winnerParticipantId, playedMatch.winnerParticipantId];
  const homeScore = participantWinners.filter(
    (participantId) => participantId === playedMatch.homeParticipantId,
  ).length;
  const awayScore = participantWinners.length - homeScore;
  const homeTeamId = teamIdForParticipant(playedMatch.homeParticipantId);
  const awayTeamId = teamIdForParticipant(playedMatch.awayParticipantId);
  const lolGames = participantWinners.map((winnerParticipantId, gameIndex) => ({
    number: gameIndex + 1,
    winnerTeamId: teamIdForParticipant(winnerParticipantId),
    blueTeamId: gameIndex % 2 === 0 ? homeTeamId : awayTeamId,
    durationMinutes: 27 + ((matchIndex * 5 + gameIndex * 7) % 17),
    riotMatchId: `LA1_${2608001000 + matchIndex * 10 + gameIndex}`,
  }));

  return { homeScore, awayScore, lolGames };
}

function roundName(roundNumber: number): string {
  if (roundNumber === 1) return 'Cuartos de final';
  if (roundNumber === 2) return 'Semifinales';
  return 'Gran final';
}

export async function seedLeagueDemoData(
  db: DbExecutor,
  adminUserId: string,
  organizationId: string,
): Promise<string> {
  const [existingFlag] = await db
    .select({ value: demoFlags.value })
    .from(demoFlags)
    .where(eq(demoFlags.key, LOL_DEMO_FLAG))
    .limit(1);
  if (existingFlag?.value) return LOL_DEMO_TOURNAMENT_ID;

  await db
    .insert(teams)
    .values(
      LOL_TEAMS.map((team, index) => ({
        id: TEAM_IDS[index]!,
        organizationId,
        name: team.name,
        tag: team.tag,
        isPermanent: true,
        captainId: adminUserId,
        gameAdapterKey: 'lol',
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
      id: LOL_DEMO_TOURNAMENT_ID,
      organizationId,
      gameAdapterKey: 'lol',
      slug: 'liga-nexo-lol',
      name: 'Liga Nexo LoL',
      description:
        'Showcase competitivo 5v5 de ocho equipos con Tournament Draft, Fearless Draft y reporte detallado por partida.',
      rules:
        'Summoner’s Rift 5v5. Series BO3 con Tournament Draft y Fearless Draft. El seed superior elige lado en Game 1; después elige el perdedor de la partida anterior.',
      format: 'single_elimination',
      visibility: 'public',
      status: 'finalized',
      capacity: 8,
      seriesConfig: { bo: 3, drawsAllowed: false },
      registrationConfig: { manualApproval: false },
      checkinConfig: { delayToleranceMinutes: 10 },
      timingConfig: { resultConfirmMinutes: 15, disputeWindowMinutes: 30 },
      settings: {
        grandFinalReset: false,
        presencial: false,
        reportingMode: 'bilateral',
        templateKey: 'lol.standard_v1',
        templateVersion: 1,
        gameRules: {
          game: 'lol',
          map: 'summoners_rift',
          region: 'lan',
          draftMode: 'tournament_draft',
          fearlessDraft: true,
          patchPolicy: 'fixed',
          patchVersion: '26.16',
          sideSelection: 'higher_seed_game_1_then_loser',
          pauseBudgetMinutes: 10,
          spectatorDelayMinutes: 3,
        },
      },
      startsAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() - 45 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();
  await db
    .insert(tournamentStaff)
    .values({ tournamentId: LOL_DEMO_TOURNAMENT_ID, userId: adminUserId, role: 'admin' })
    .onConflictDoNothing();
  await db
    .insert(tournamentRegistrations)
    .values(
      TEAM_IDS.map((teamId, index) => ({
        id: REGISTRATION_IDS[index]!,
        tournamentId: LOL_DEMO_TOURNAMENT_ID,
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
        tournamentId: LOL_DEMO_TOURNAMENT_ID,
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
        tournamentId: LOL_DEMO_TOURNAMENT_ID,
        teamId,
        userId: adminUserId,
      })),
    )
    .onConflictDoNothing();

  const { bracket: engineBracket, playedMatches } = simulateLeagueBracket();
  const roundNumbers = [...new Set(engineBracket.matches.map((match) => match.round))].sort(
    (left, right) => left - right,
  );
  const roundIds = new Map(roundNumbers.map((number, index) => [number, demoId(941 + index)]));

  await db
    .insert(stages)
    .values({
      id: STAGE_ID,
      tournamentId: LOL_DEMO_TOURNAMENT_ID,
      type: 'bracket',
      format: 'single_elimination',
      status: 'finalized',
      config: { engineBracket },
    })
    .onConflictDoNothing();
  await db
    .insert(brackets)
    .values({ id: BRACKET_ID, stageId: STAGE_ID, type: 'winners', config: {} })
    .onConflictDoNothing();
  await db
    .insert(rounds)
    .values(
      roundNumbers.map((number) => ({
        id: roundIds.get(number)!,
        bracketId: BRACKET_ID,
        number,
        name: roundName(number),
        status: 'finalized',
      })),
    )
    .onConflictDoNothing();

  const playedByEngineId = new Map(playedMatches.map((match) => [match.engineId, match]));
  const matchRows = engineBracket.matches.map((engineMatch, matchIndex) => {
    const playedMatch = playedByEngineId.get(engineMatch.id);
    if (!playedMatch || !engineMatch.home || !engineMatch.away || !engineMatch.winner) {
      throw new Error(`LoL series ${engineMatch.id} was not finalized`);
    }
    const result = createGameResults(playedMatch, matchIndex);
    return {
      id: demoId(951 + matchIndex),
      roundId: roundIds.get(engineMatch.round)!,
      tournamentId: LOL_DEMO_TOURNAMENT_ID,
      engineId: engineMatch.id,
      position: engineMatch.position,
      homeParticipantId: engineMatch.home,
      awayParticipantId: engineMatch.away,
      status: 'finalized',
      series: { bo: 3, maps: ["Summoner's Rift"] },
      scheduledAt: new Date(
        now.getTime() - (engineBracket.matches.length - matchIndex) * 55 * 60 * 1000,
      ),
      result: {
        winnerId: engineMatch.winner,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        lolGames: result.lolGames,
      },
    };
  });
  await db.insert(matches).values(matchRows).onConflictDoNothing();

  await db
    .insert(resultSubmissions)
    .values(
      matchRows.flatMap((match, matchIndex) =>
        [match.homeParticipantId, match.awayParticipantId].map(
          (participantId, submissionIndex) => ({
            id: demoId(971 + matchIndex * 2 + submissionIndex),
            matchId: match.id,
            teamId: teamIdForParticipant(participantId),
            reportedBy: adminUserId,
            result: match.result,
            status: 'confirmed',
          }),
        ),
      ),
    )
    .onConflictDoNothing();
  await db
    .insert(demoFlags)
    .values({ key: LOL_DEMO_FLAG, value: true })
    .onConflictDoUpdate({ target: demoFlags.key, set: { value: true } });

  return LOL_DEMO_TOURNAMENT_ID;
}
