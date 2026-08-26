export const ORG_ROLES = ['owner', 'admin', 'member'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const TOURNAMENT_ROLES = ['admin', 'referee', 'moderator'] as const;
export type TournamentRole = (typeof TOURNAMENT_ROLES)[number];

export const TEAM_ROLES = ['captain', 'member', 'substitute'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

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
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
