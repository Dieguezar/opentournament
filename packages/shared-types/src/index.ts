export const ORG_ROLES = ['owner', 'admin', 'member'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const TOURNAMENT_ROLES = ['admin', 'referee', 'moderator'] as const;
export type TournamentRole = (typeof TOURNAMENT_ROLES)[number];

export const TEAM_ROLES = ['captain', 'member', 'substitute'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const GAME_ADAPTER_KEYS = ['generic', 'valorant', 'cs2', 'lol'] as const;
export type GameAdapterKey = (typeof GAME_ADAPTER_KEYS)[number];

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
