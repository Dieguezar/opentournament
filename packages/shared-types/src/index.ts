export const ORG_ROLES = ['owner', 'admin', 'member'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const TOURNAMENT_ROLES = ['admin', 'referee', 'moderator'] as const;
export type TournamentRole = (typeof TOURNAMENT_ROLES)[number];

export const TEAM_ROLES = ['captain', 'member', 'substitute'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const API_ERROR_CODES = [
  'ALREADY_MEMBER',
  'ALREADY_REGISTERED',
  'ALREADY_RESOLVED',
  'BRACKET_ALREADY_EXISTS',
  'CHECKIN_CLOSED',
  'CSRF_INVALID',
  'DISCORD_LINK_FAILED',
  'DISCORD_NOT_CONFIGURED',
  'DISCORD_OAUTH_STATE',
  'DISPUTE_FAILED',
  'DISPUTE_OPEN',
  'DRAW_NOT_ALLOWED',
  'DUPLICATE_RIOT_MATCH_ID',
  'EMAIL_NOT_VERIFIED',
  'EMAIL_TAKEN',
  'ENGINE_MISSING',
  'FILE_MISSING',
  'FILE_TOO_LARGE',
  'FORBIDDEN',
  'GAME_DETAILS_NOT_ALLOWED',
  'INTERNAL_ERROR',
  'INVALID_CREDENTIALS',
  'INVALID_GAME_SEQUENCE',
  'INVALID_GAME_STAGE',
  'INVALID_GAME_STOCKS',
  'INVALID_GAME_WINNER',
  'INVALID_KEY',
  'INVALID_LOL_GAME_SEQUENCE',
  'INVALID_LOL_GAME_SIDE',
  'INVALID_LOL_GAME_WINNER',
  'INVALID_LOL_SERIES_LENGTH',
  'INVALID_LOL_SERIES_SCORE',
  'INVALID_LOL_SERIES_WINNER',
  'INVALID_MATCH',
  'INVALID_PARTICIPANT_PASS',
  'INVALID_RESET_TOKEN',
  'INVALID_SET_LENGTH',
  'INVALID_SET_SCORE',
  'INVALID_SET_WINNER',
  'INVALID_SIGNATURE',
  'INVALID_STATUS',
  'INVALID_TOURNAMENT_STATUS',
  'INVALID_TYPE',
  'INVALID_VERIFICATION_TOKEN',
  'INVALID_WINNER',
  'LOL_GAME_DETAILS_NOT_ALLOWED',
  'MATCH_NOT_FOUND',
  'MATCH_NOT_READY',
  'MISSING_TOURNAMENT',
  'NOT_ENOUGH_PARTICIPANTS',
  'NOT_FOUND',
  'NOT_REGISTERED',
  'ORG_CREATE_FAILED',
  'PASS_NOT_FOUND',
  'REGISTER_FAILED',
  'REGISTRATION_CLOSED',
  'REGISTRATION_FAILED',
  'RESULT_ALREADY_REPORTED',
  'SLUG_TAKEN',
  'STAFF_ONLY',
  'STAGE_CREATE_FAILED',
  'STAGE_NOT_FOUND',
  'SUBMISSION_FAILED',
  'TEAM_CREATE_FAILED',
  'TEAM_GAME_LOCKED',
  'TEAM_GAME_MISMATCH',
  'TEAM_NOT_ELIGIBLE',
  'TEAM_NOT_FOUND',
  'TEAM_ROSTER_LIMIT',
  'TEAM_ROSTER_SIZE_INVALID',
  'TEAM_SUBSTITUTE_LIMIT',
  'TOO_MANY_FILES',
  'TOURNAMENT_CREATE_FAILED',
  'TOURNAMENT_NOT_FOUND',
  'UNAUTHORIZED',
  'UNKNOWN',
  'UNKNOWN_GAME_ADAPTER',
  'USER_NOT_FOUND',
  'VALIDATION_ERROR',
  'WINNER_MUST_REPORT',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const GAME_ADAPTER_KEYS = ['generic', 'valorant', 'cs2', 'lol', 'smash_ultimate'] as const;
export type GameAdapterKey = (typeof GAME_ADAPTER_KEYS)[number];

export const SMASH_ULTIMATE_STAGE_CLAUSES = ['none', 'modified_dsr', 'full_dsr'] as const;
export type SmashUltimateStageClause = (typeof SMASH_ULTIMATE_STAGE_CLAUSES)[number];

export interface SmashUltimateRules {
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
  stageClause: SmashUltimateStageClause;
}

export const LEAGUE_OF_LEGENDS_REGIONS = [
  'lan',
  'las',
  'br',
  'na',
  'euw',
  'eune',
  'kr',
  'jp',
  'oce',
  'tr',
  'ru',
  'ph',
  'sg',
  'th',
  'tw',
  'vn',
] as const;
export type LeagueOfLegendsRegion = (typeof LEAGUE_OF_LEGENDS_REGIONS)[number];

export const LEAGUE_OF_LEGENDS_SIDE_SELECTIONS = [
  'higher_seed_game_1_then_loser',
  'alternating',
  'coin_toss',
] as const;
export type LeagueOfLegendsSideSelection = (typeof LEAGUE_OF_LEGENDS_SIDE_SELECTIONS)[number];

export interface LeagueOfLegendsRules {
  game: 'lol';
  map: 'summoners_rift';
  region: LeagueOfLegendsRegion;
  draftMode: 'tournament_draft';
  fearlessDraft: boolean;
  patchPolicy: 'live' | 'fixed';
  patchVersion: string | null;
  sideSelection: LeagueOfLegendsSideSelection;
  pauseBudgetMinutes: number;
  spectatorDelayMinutes: number;
}

export type TournamentGameRules = SmashUltimateRules | LeagueOfLegendsRules;

export const RESULT_REPORTING_MODES = ['bilateral', 'winner_reports', 'staff_only'] as const;
export type ResultReportingMode = (typeof RESULT_REPORTING_MODES)[number];

export interface TournamentSettings {
  grandFinalReset?: boolean;
  presencial?: boolean;
  reportingMode?: ResultReportingMode;
  templateKey?: string;
  templateVersion?: number;
  gameRules?: TournamentGameRules;
}

export const TOURNAMENT_STATUSES = [
  'draft',
  'open',
  'checkin_open',
  'in_progress',
  'finalized',
  'cancelled',
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const REGISTRATION_STATUSES = [
  'pending',
  'approved',
  'waitlisted',
  'rejected',
  'cancelled',
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const MATCH_STATUSES = [
  'scheduled',
  'in_progress',
  'finalized',
  'disputed',
  'voided',
  'walkover',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export interface User {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface Identity {
  id: string;
  userId: string;
  provider: string;
  providerSub: string;
  providerEmail: string | null;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
}

export interface OrganizationSummary {
  id: string;
  slug: string;
  name: string;
  role: OrgRole;
}

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  emailVerified: boolean;
  organizations: OrganizationSummary[];
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
