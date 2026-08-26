import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email'),
    passwordHash: text('password_hash'),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    locale: text('locale').notNull().default('es'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const identities = pgTable(
  'identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerSub: text('provider_sub').notNull(),
    providerEmail: text('provider_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('identities_provider_sub_unique').on(table.provider, table.providerSub),
    index('identities_user_id_idx').on(table.userId),
  ],
);

export type IdentityRow = typeof identities.$inferSelect;

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    logoUrl: text('logo_url'),
    settings: jsonb('settings').$type<{ allowMemberTournaments?: boolean }>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('organizations_slug_unique').on(table.slug)],
);

export type OrganizationRow = typeof organizations.$inferSelect;

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('organization_members_org_user_unique').on(table.organizationId, table.userId),
    index('organization_members_user_id_idx').on(table.userId),
  ],
);

export type OrganizationMemberRow = typeof organizationMembers.$inferSelect;

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('password_reset_tokens_token_hash_unique').on(table.tokenHash)],
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('email_verification_tokens_token_hash_unique').on(table.tokenHash)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    organizationId: uuid('organization_id'),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_logs_resource_idx').on(table.resourceType, table.resourceId)],
);

export type AuditLogRow = typeof auditLogs.$inferSelect;

export const jobs = pgTable(
  'jobs',
  {
    id: serial('id').primaryKey(),
    kind: text('kind').notNull(),
    runAt: timestamp('run_at', { withTimezone: true }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lockToken: text('lock_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('jobs_status_run_at_idx').on(table.status, table.runAt)],
);

export type JobRow = typeof jobs.$inferSelect;

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const demoFlags = pgTable('demo_flags', {
  key: text('key').primaryKey(),
  value: boolean('value').notNull().default(false),
});

export const gameAdapters = pgTable(
  'game_adapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    iconUrl: text('icon_url'),
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('game_adapters_key_unique').on(table.key)],
);

export type GameAdapterRow = typeof gameAdapters.$inferSelect;

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    tag: text('tag'),
    logoUrl: text('logo_url'),
    isPermanent: boolean('is_permanent').notNull().default(true),
    captainId: uuid('captain_id')
      .notNull()
      .references(() => users.id),
    gameAdapterKey: text('game_adapter_key'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('teams_organization_id_idx').on(table.organizationId)],
);

export type TeamRow = typeof teams.$inferSelect;

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('team_members_team_user_unique').on(table.teamId, table.userId),
    index('team_members_user_id_idx').on(table.userId),
  ],
);

// Structurally mirrors TournamentSettings from @opentournament/shared-types.
// The database package does not declare that workspace dependency; keeping this
// document type local preserves its current manifest and package boundary.
export interface TournamentSettingsDocument {
  grandFinalReset?: boolean;
  presencial?: boolean;
  reportingMode?: 'bilateral' | 'winner_reports' | 'staff_only';
  templateKey?: string;
  templateVersion?: number;
  gameRules?:
    | {
        game: 'smash_ultimate';
        stocks: number;
        timeLimitMinutes: number;
        itemsEnabled: boolean;
        finalSmashMeterEnabled: boolean;
        stageHazardsEnabled: boolean;
        launchRate: number;
        starters: readonly string[];
        counterpicks: readonly string[];
        stageBans: number;
        stageClause: 'none' | 'modified_dsr' | 'full_dsr';
      }
    | {
        game: 'lol';
        map: 'summoners_rift';
        region:
          | 'lan'
          | 'las'
          | 'br'
          | 'na'
          | 'euw'
          | 'eune'
          | 'kr'
          | 'jp'
          | 'oce'
          | 'tr'
          | 'ru'
          | 'ph'
          | 'sg'
          | 'th'
          | 'tw'
          | 'vn';
        draftMode: 'tournament_draft';
        fearlessDraft: boolean;
        patchPolicy: 'live' | 'fixed';
        patchVersion: string | null;
        sideSelection: 'higher_seed_game_1_then_loser' | 'alternating' | 'coin_toss';
        pauseBudgetMinutes: number;
        spectatorDelayMinutes: number;
      };
}

interface LeagueGameResultDocument {
  number: number;
  winnerTeamId: string;
  blueTeamId: string;
  durationMinutes: number;
  riotMatchId?: string;
}

export const tournaments = pgTable(
  'tournaments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    gameAdapterKey: text('game_adapter_key').notNull().default('generic'),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    rules: text('rules'),
    format: text('format').notNull().default('single_elimination'),
    visibility: text('visibility').notNull().default('public'),
    status: text('status').notNull().default('draft'),
    capacity: integer('capacity').notNull().default(16),
    seriesConfig: jsonb('series_config')
      .$type<{ bo?: number; drawsAllowed?: boolean }>()
      .notNull()
      .default({ bo: 3, drawsAllowed: false }),
    registrationConfig: jsonb('registration_config')
      .$type<{ manualApproval?: boolean; opensAt?: string; closesAt?: string }>()
      .notNull()
      .default({ manualApproval: false }),
    checkinConfig: jsonb('checkin_config')
      .$type<{ opensAt?: string; closesAt?: string; delayToleranceMinutes?: number }>()
      .notNull()
      .default({ delayToleranceMinutes: 10 }),
    timingConfig: jsonb('timing_config')
      .$type<{ resultConfirmMinutes?: number; disputeWindowMinutes?: number }>()
      .notNull()
      .default({ resultConfirmMinutes: 30, disputeWindowMinutes: 60 }),
    settings: jsonb('settings')
      .$type<TournamentSettingsDocument>()
      .notNull()
      .default({ grandFinalReset: false, presencial: false, reportingMode: 'bilateral' }),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tournaments_org_slug_unique').on(table.organizationId, table.slug),
    index('tournaments_org_status_idx').on(table.organizationId, table.status),
  ],
);

export type TournamentRow = typeof tournaments.$inferSelect;

export const tournamentStaff = pgTable(
  'tournament_staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tournament_staff_unique').on(table.tournamentId, table.userId, table.role),
  ],
);

export const tournamentRegistrations = pgTable(
  'tournament_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    approvedBy: uuid('approved_by').references(() => users.id),
    waitlistPosition: integer('waitlist_position'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tournament_registrations_unique').on(table.tournamentId, table.teamId),
    index('tournament_registrations_status_idx').on(table.tournamentId, table.status),
  ],
);

export type TournamentRegistrationRow = typeof tournamentRegistrations.$inferSelect;

export const tournamentParticipants = pgTable(
  'tournament_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    registrationId: uuid('registration_id').references(() => tournamentRegistrations.id, {
      onDelete: 'set null',
    }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    seed: integer('seed'),
    checkedIn: boolean('checked_in').notNull().default(false),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tournament_participants_unique').on(table.tournamentId, table.teamId),
    index('tournament_participants_status_idx').on(table.tournamentId, table.status),
  ],
);

export type TournamentParticipantRow = typeof tournamentParticipants.$inferSelect;

export const participantAccessPasses = pgTable(
  'participant_access_passes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('participant_access_passes_token_hash_unique').on(table.tokenHash),
    index('participant_access_passes_team_idx').on(
      table.tournamentId,
      table.teamId,
      table.revokedAt,
    ),
  ],
);

export type ParticipantAccessPassRow = typeof participantAccessPasses.$inferSelect;

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    participantAccessPassId: uuid('participant_access_pass_id').references(
      () => participantAccessPasses.id,
      { onDelete: 'cascade' },
    ),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_participant_access_pass_id_idx').on(table.participantAccessPassId),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;

export const stages = pgTable(
  'stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('bracket'),
    format: text('format').notNull(),
    status: text('status').notNull().default('pending'),
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('stages_tournament_id_idx').on(table.tournamentId)],
);

export type StageRow = typeof stages.$inferSelect;

export const brackets = pgTable(
  'brackets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // winners | losers | final
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('brackets_stage_id_idx').on(table.stageId)],
);

export type BracketRow = typeof brackets.$inferSelect;

export const rounds = pgTable(
  'rounds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bracketId: uuid('bracket_id')
      .notNull()
      .references(() => brackets.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('pending'),
  },
  (table) => [uniqueIndex('rounds_bracket_number_unique').on(table.bracketId, table.number)],
);

export type RoundRow = typeof rounds.$inferSelect;

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roundId: uuid('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    engineId: text('engine_id').notNull(),
    position: integer('position').notNull(),
    homeParticipantId: uuid('home_participant_id').references(() => tournamentParticipants.id, {
      onDelete: 'set null',
    }),
    awayParticipantId: uuid('away_participant_id').references(() => tournamentParticipants.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('scheduled'),
    series: jsonb('series').$type<{ bo?: number; maps?: string[] }>().notNull().default({}),
    lobbyUrl: text('lobby_url'),
    maps: jsonb('maps').$type<{ maps?: string[] }>(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    result: jsonb('result').$type<{
      winnerId?: string;
      homeScore?: number;
      awayScore?: number;
      games?: Array<{
        number: number;
        stage: string;
        homeCharacter: string;
        awayCharacter: string;
        winnerTeamId: string;
        homeStocks: number;
        awayStocks: number;
      }>;
      lolGames?: LeagueGameResultDocument[];
    }>(),
    rescheduleCount: integer('reschedule_count').notNull().default(0),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('matches_tournament_status_idx').on(table.tournamentId, table.status),
    index('matches_round_id_idx').on(table.roundId),
    uniqueIndex('matches_round_position_unique').on(table.roundId, table.position),
  ],
);

export type MatchRow = typeof matches.$inferSelect;

export const matchGames = pgTable(
  'match_games',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    map: text('map'),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    winnerId: uuid('winner_id').references(() => tournamentParticipants.id),
  },
  (table) => [uniqueIndex('match_games_match_number_unique').on(table.matchId, table.number)],
);

export const checkIns = pgTable(
  'check_ins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('check_ins_tournament_team_unique').on(table.tournamentId, table.teamId)],
);

export const streamLinks = pgTable(
  'stream_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    url: text('url').notNull(),
    platform: text('platform').notNull().default('other'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('stream_links_tournament_id_idx').on(table.tournamentId)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notifications_user_read_idx').on(table.userId, table.readAt)],
);

export type NotificationRow = typeof notifications.$inferSelect;

export const resultSubmissions = pgTable(
  'result_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    reportedBy: uuid('reported_by')
      .notNull()
      .references(() => users.id),
    result: jsonb('result')
      .$type<{
        winnerId?: string;
        homeScore?: number;
        awayScore?: number;
        draw?: boolean;
        games?: Array<{
          number: number;
          stage: string;
          homeCharacter: string;
          awayCharacter: string;
          winnerTeamId: string;
          homeStocks: number;
          awayStocks: number;
        }>;
        lolGames?: LeagueGameResultDocument[];
      }>()
      .notNull(),
    status: text('status').notNull().default('pending'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('result_submissions_match_team_unique').on(table.matchId, table.teamId),
    index('result_submissions_match_status_idx').on(table.matchId, table.status),
  ],
);

export type ResultSubmissionRow = typeof resultSubmissions.$inferSelect;

export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resultSubmissionId: uuid('result_submission_id')
      .notNull()
      .references(() => resultSubmissions.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // screenshot | link
    url: text('url').notNull(),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('evidence_result_submission_idx').on(table.resultSubmissionId)],
);

export type EvidenceRow = typeof evidence.$inferSelect;

export const disputes = pgTable(
  'disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    openedBy: uuid('opened_by').references(() => users.id),
    reason: text('reason').notNull(), // result_conflict | captain_request | system
    status: text('status').notNull().default('open'),
    assigneeId: uuid('assignee_id').references(() => users.id),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('disputes_match_id_idx').on(table.matchId)],
);

export type DisputeRow = typeof disputes.$inferSelect;

export const disputeMessages = pgTable(
  'dispute_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disputeId: uuid('dispute_id')
      .notNull()
      .references(() => disputes.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('dispute_messages_dispute_idx').on(table.disputeId)],
);

export const rulings = pgTable(
  'rulings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disputeId: uuid('dispute_id')
      .notNull()
      .references(() => disputes.id, { onDelete: 'cascade' }),
    resolvedBy: uuid('resolved_by')
      .notNull()
      .references(() => users.id),
    decision: jsonb('decision')
      .$type<{ winnerId?: string; homeScore?: number; awayScore?: number; draw?: boolean }>()
      .notNull(),
    rationale: text('rationale').notNull(),
    consideredEvidence: jsonb('considered_evidence').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('rulings_dispute_unique').on(table.disputeId)],
);

export type RulingRow = typeof rulings.$inferSelect;
