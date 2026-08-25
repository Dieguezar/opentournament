import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import {
  advanceMatch,
  generateSingleElimination,
  type EngineBracket,
} from '@opentournament/tournament-engine';
import type { Db, DbExecutor } from './client.js';
import { seedSmashDemoData } from './seed-smash-demo.js';
import {
  auditLogs,
  brackets,
  checkIns,
  demoFlags,
  disputeMessages,
  disputes,
  matches,
  notifications,
  organizationMembers,
  organizations,
  resultSubmissions,
  rounds,
  rulings,
  stages,
  teamMembers,
  teams,
  tournamentParticipants,
  tournamentRegistrations,
  tournamentStaff,
  tournaments,
  users,
} from './schema.js';

const DEMO_FLAG = 'showcase-v1';

const IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  captains: [
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000014',
  ],
  organization: '00000000-0000-4000-8000-000000000100',
  teams: [
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000204',
  ],
  tournament: '00000000-0000-4000-8000-000000000300',
  registrations: [
    '00000000-0000-4000-8000-000000000311',
    '00000000-0000-4000-8000-000000000312',
    '00000000-0000-4000-8000-000000000313',
    '00000000-0000-4000-8000-000000000314',
  ],
  participants: [
    '00000000-0000-4000-8000-000000000321',
    '00000000-0000-4000-8000-000000000322',
    '00000000-0000-4000-8000-000000000323',
    '00000000-0000-4000-8000-000000000324',
  ],
  stage: '00000000-0000-4000-8000-000000000400',
  bracket: '00000000-0000-4000-8000-000000000410',
  rounds: ['00000000-0000-4000-8000-000000000421', '00000000-0000-4000-8000-000000000422'],
  matches: [
    '00000000-0000-4000-8000-000000000431',
    '00000000-0000-4000-8000-000000000432',
    '00000000-0000-4000-8000-000000000433',
  ],
  submissions: [
    '00000000-0000-4000-8000-000000000441',
    '00000000-0000-4000-8000-000000000442',
    '00000000-0000-4000-8000-000000000443',
    '00000000-0000-4000-8000-000000000444',
  ],
  dispute: '00000000-0000-4000-8000-000000000450',
  messages: ['00000000-0000-4000-8000-000000000451', '00000000-0000-4000-8000-000000000452'],
  ruling: '00000000-0000-4000-8000-000000000460',
} as const;

const DEMO_USERS = [
  { id: IDS.captains[0], email: 'aurora@opentournament.local', displayName: 'Valeria “Nova” Cruz' },
  { id: IDS.captains[1], email: 'titans@opentournament.local', displayName: 'Mateo “Atlas” Ruiz' },
  { id: IDS.captains[2], email: 'pixel@opentournament.local', displayName: 'Sofía “Byte” López' },
  { id: IDS.captains[3], email: 'quetzal@opentournament.local', displayName: 'Diego “Kuk” Méndez' },
] as const;

const DEMO_TEAMS = [
  { id: IDS.teams[0], name: 'Aurora Gaming', tag: 'AUR' },
  { id: IDS.teams[1], name: 'Titanes del Centro', tag: 'TDC' },
  { id: IDS.teams[2], name: 'Pixel Forge', tag: 'PXF' },
  { id: IDS.teams[3], name: 'Quetzal Esports', tag: 'QTZ' },
] as const;

export interface DemoSeedResult {
  adminUserId: string;
  organizationId: string;
  tournamentId: string;
  smashTournamentId: string;
  disputeId: string;
}

async function findUserIdByEmail(db: DbExecutor, email: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) throw new Error(`No se pudo preparar el usuario demo ${email}`);
  return user.id;
}

async function findOrganizationIdBySlug(db: DbExecutor, slug: string): Promise<string> {
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  if (!organization) throw new Error(`No se pudo preparar la organización demo ${slug}`);
  return organization.id;
}

function buildDemoBracket(): EngineBracket {
  const initial = generateSingleElimination(
    IDS.participants.map((id, index) => ({ id, seed: index + 1 })),
  );
  const firstSemifinal = advanceMatch(initial, 'W1-1', IDS.participants[0]).bracket;
  return advanceMatch(firstSemifinal, 'W1-2', IDS.participants[2]).bracket;
}

export async function seedDemoData(db: Db): Promise<DemoSeedResult> {
  const existingFlag = await db
    .select({ value: demoFlags.value })
    .from(demoFlags)
    .where(eq(demoFlags.key, DEMO_FLAG))
    .limit(1);
  if (existingFlag[0]?.value) {
    const [tournament] = await db
      .select({ organizationId: tournaments.organizationId })
      .from(tournaments)
      .where(eq(tournaments.id, IDS.tournament))
      .limit(1);
    if (!tournament) throw new Error('El escenario demo está marcado pero incompleto');
    const adminUserId = await findUserIdByEmail(db, 'admin@opentournament.local');
    const smashTournamentId = await db.transaction((transaction) =>
      seedSmashDemoData(transaction, adminUserId, tournament.organizationId),
    );
    return {
      adminUserId,
      organizationId: tournament.organizationId,
      tournamentId: IDS.tournament,
      smashTournamentId,
      disputeId: IDS.dispute,
    };
  }

  const passwordHash = await argon2.hash('demo-password-123', {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  return db.transaction(async (transaction) => {
    await transaction
      .insert(users)
      .values({
        id: IDS.admin,
        email: 'admin@opentournament.local',
        passwordHash,
        displayName: 'Admin Demo',
        emailVerifiedAt: new Date(),
      })
      .onConflictDoNothing();
    await transaction
      .insert(users)
      .values(DEMO_USERS.map((user) => ({ ...user, emailVerifiedAt: new Date() })))
      .onConflictDoNothing();

    const adminUserId = await findUserIdByEmail(transaction, 'admin@opentournament.local');
    const captainIds = await Promise.all(
      DEMO_USERS.map((user) => findUserIdByEmail(transaction, user.email)),
    );

    await transaction
      .insert(organizations)
      .values({
        id: IDS.organization,
        slug: 'opentournament-demo',
        name: 'OpenTournament Demo',
        description: 'Comunidad de demostración con un torneo activo y datos realistas.',
      })
      .onConflictDoNothing();
    const organizationId = await findOrganizationIdBySlug(transaction, 'opentournament-demo');

    await transaction
      .insert(organizationMembers)
      .values([
        { organizationId, userId: adminUserId, role: 'owner' },
        ...captainIds.map((userId) => ({ organizationId, userId, role: 'member' })),
      ])
      .onConflictDoNothing();

    await transaction
      .insert(teams)
      .values(
        DEMO_TEAMS.map((team, index) => ({
          ...team,
          organizationId,
          captainId: captainIds[index]!,
          gameAdapterKey: 'valorant',
          isPermanent: true,
        })),
      )
      .onConflictDoNothing();
    await transaction
      .insert(teamMembers)
      .values(
        DEMO_TEAMS.flatMap((team, index) => [
          { teamId: team.id, userId: captainIds[index]!, role: 'captain' },
          { teamId: team.id, userId: adminUserId, role: 'manager' },
        ]),
      )
      .onConflictDoNothing();

    const now = new Date();
    await transaction
      .insert(tournaments)
      .values({
        id: IDS.tournament,
        organizationId,
        gameAdapterKey: 'valorant',
        slug: 'copa-nexo-demo',
        name: 'Copa Nexo 2026',
        description:
          'Cuatro equipos compiten en una copa comunitaria de Valorant. Dos semifinales ya terminaron y la gran final está lista.',
        rules:
          'Formato BO3. Cada capitán reporta el resultado al terminar. Las discrepancias pasan al panel de arbitraje.',
        format: 'single_elimination',
        visibility: 'public',
        status: 'in_progress',
        capacity: 8,
        seriesConfig: { bo: 3, drawsAllowed: false },
        registrationConfig: { manualApproval: true },
        checkinConfig: { delayToleranceMinutes: 10 },
        timingConfig: { resultConfirmMinutes: 30, disputeWindowMinutes: 60 },
        settings: { grandFinalReset: false, presencial: false },
        startsAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing();
    await transaction
      .insert(tournamentStaff)
      .values({ tournamentId: IDS.tournament, userId: adminUserId, role: 'admin' })
      .onConflictDoNothing();

    await transaction
      .insert(tournamentRegistrations)
      .values(
        DEMO_TEAMS.map((team, index) => ({
          id: IDS.registrations[index],
          tournamentId: IDS.tournament,
          teamId: team.id,
          status: 'approved',
          approvedBy: adminUserId,
        })),
      )
      .onConflictDoNothing();
    await transaction
      .insert(tournamentParticipants)
      .values(
        DEMO_TEAMS.map((team, index) => ({
          id: IDS.participants[index],
          tournamentId: IDS.tournament,
          registrationId: IDS.registrations[index],
          teamId: team.id,
          seed: index + 1,
          checkedIn: true,
          status: 'active',
        })),
      )
      .onConflictDoNothing();
    await transaction
      .insert(checkIns)
      .values(
        DEMO_TEAMS.map((team, index) => ({
          tournamentId: IDS.tournament,
          teamId: team.id,
          userId: captainIds[index]!,
        })),
      )
      .onConflictDoNothing();

    const engineBracket = buildDemoBracket();
    await transaction
      .insert(stages)
      .values({
        id: IDS.stage,
        tournamentId: IDS.tournament,
        type: 'bracket',
        format: 'single_elimination',
        status: 'active',
        config: { engineBracket },
      })
      .onConflictDoNothing();
    await transaction
      .insert(brackets)
      .values({ id: IDS.bracket, stageId: IDS.stage, type: 'winners', config: {} })
      .onConflictDoNothing();
    await transaction
      .insert(rounds)
      .values([
        {
          id: IDS.rounds[0],
          bracketId: IDS.bracket,
          number: 1,
          name: 'Semifinales',
          status: 'finalized',
        },
        {
          id: IDS.rounds[1],
          bracketId: IDS.bracket,
          number: 2,
          name: 'Gran final',
          status: 'active',
        },
      ])
      .onConflictDoNothing();

    const matchByEngineId = new Map(engineBracket.matches.map((match) => [match.id, match]));
    const matchRows = [
      { id: IDS.matches[0], roundId: IDS.rounds[0], engineId: 'W1-1' },
      { id: IDS.matches[1], roundId: IDS.rounds[0], engineId: 'W1-2' },
      { id: IDS.matches[2], roundId: IDS.rounds[1], engineId: 'W2-1' },
    ].map((row) => {
      const match = matchByEngineId.get(row.engineId)!;
      return {
        ...row,
        tournamentId: IDS.tournament,
        position: match.position,
        homeParticipantId: match.home,
        awayParticipantId: match.away,
        status: match.status,
        series: { bo: 3, maps: ['Ascent', 'Haven', 'Lotus'] },
        scheduledAt: row.engineId === 'W2-1' ? new Date(now.getTime() + 60 * 60 * 1000) : null,
        result: match.winner
          ? {
              winnerId: match.winner,
              homeScore: row.engineId === 'W1-1' ? 13 : 11,
              awayScore: row.engineId === 'W1-1' ? 7 : 13,
            }
          : null,
      };
    });
    await transaction.insert(matches).values(matchRows).onConflictDoNothing();

    await transaction
      .insert(resultSubmissions)
      .values([
        {
          id: IDS.submissions[0],
          matchId: IDS.matches[0],
          teamId: IDS.teams[0],
          reportedBy: captainIds[0]!,
          result: { winnerId: IDS.participants[0], homeScore: 13, awayScore: 7 },
          status: 'confirmed',
        },
        {
          id: IDS.submissions[1],
          matchId: IDS.matches[0],
          teamId: IDS.teams[3],
          reportedBy: captainIds[3]!,
          result: { winnerId: IDS.participants[0], homeScore: 13, awayScore: 7 },
          status: 'confirmed',
        },
        {
          id: IDS.submissions[2],
          matchId: IDS.matches[1],
          teamId: IDS.teams[1],
          reportedBy: captainIds[1]!,
          result: { winnerId: IDS.participants[1], homeScore: 13, awayScore: 11 },
          status: 'disputed',
        },
        {
          id: IDS.submissions[3],
          matchId: IDS.matches[1],
          teamId: IDS.teams[2],
          reportedBy: captainIds[2]!,
          result: { winnerId: IDS.participants[2], homeScore: 11, awayScore: 13 },
          status: 'disputed',
        },
      ])
      .onConflictDoNothing();

    await transaction
      .insert(disputes)
      .values({
        id: IDS.dispute,
        matchId: IDS.matches[1],
        openedBy: captainIds[1]!,
        reason: 'result_conflict',
        status: 'resolved',
        assigneeId: adminUserId,
        openedAt: new Date(now.getTime() - 45 * 60 * 1000),
        resolvedAt: new Date(now.getTime() - 25 * 60 * 1000),
      })
      .onConflictDoNothing();
    await transaction
      .insert(disputeMessages)
      .values([
        {
          id: IDS.messages[0],
          disputeId: IDS.dispute,
          authorId: captainIds[1]!,
          body: 'Reportamos 13–11; adjuntamos la captura del marcador final.',
          createdAt: new Date(now.getTime() - 43 * 60 * 1000),
        },
        {
          id: IDS.messages[1],
          disputeId: IDS.dispute,
          authorId: adminUserId,
          body: 'Revisé ambas evidencias y el historial de la sala antes de resolver.',
          createdAt: new Date(now.getTime() - 27 * 60 * 1000),
        },
      ])
      .onConflictDoNothing();
    await transaction
      .insert(rulings)
      .values({
        id: IDS.ruling,
        disputeId: IDS.dispute,
        resolvedBy: adminUserId,
        decision: { winnerId: IDS.participants[2], homeScore: 11, awayScore: 13 },
        rationale:
          'La evidencia del servidor confirma 13–11 a favor de Pixel Forge; se corrige la orientación del marcador.',
        consideredEvidence: ['captura-marcador', 'historial-sala'],
      })
      .onConflictDoNothing();

    await transaction.insert(auditLogs).values([
      {
        organizationId,
        actorId: adminUserId,
        action: 'demo.seeded',
        resourceType: 'tournament',
        resourceId: IDS.tournament,
        reason: 'escenario demostrativo',
      },
      {
        organizationId,
        actorId: adminUserId,
        action: 'dispute.resolved',
        resourceType: 'dispute',
        resourceId: IDS.dispute,
        after: { winnerId: IDS.participants[2] },
      },
    ]);
    await transaction.insert(notifications).values({
      userId: adminUserId,
      type: 'demo.ready',
      payload: { tournamentId: IDS.tournament, disputeId: IDS.dispute },
    });
    await transaction
      .insert(demoFlags)
      .values({ key: DEMO_FLAG, value: true })
      .onConflictDoUpdate({ target: demoFlags.key, set: { value: true } });
    const smashTournamentId = await seedSmashDemoData(transaction, adminUserId, organizationId);

    return {
      adminUserId,
      organizationId,
      tournamentId: IDS.tournament,
      smashTournamentId,
      disputeId: IDS.dispute,
    };
  });
}
