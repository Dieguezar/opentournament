import type { GameAdapterKey, TournamentStatus } from '@opentournament/shared-types';
import { DEFAULT_LOCALE, getDictionary, type Locale } from './i18n';

export interface RegistrationTeam {
  id: string;
  name: string;
  captainId: string;
  gameAdapterKey: GameAdapterKey | null;
}

interface RegistrationTeamClassification<T extends RegistrationTeam> {
  compatibleTeams: T[];
  configurableTeams: T[];
  readOnlyTeams: T[];
  hiddenTeamCount: number;
}

interface RegistrationEntry {
  registrationStatus: string | null;
  checkedIn: boolean | null;
}

export interface RegistrationEntryPresentation {
  statusLabel: string;
  badgeClassName: string;
  action: 'register' | 'checkin' | null;
}

interface RegisterPanelLoadStateInput {
  isLoading: boolean;
  loadError: string | null;
  isAuthenticated: boolean;
}

export type RegisterPanelLoadState = 'loading' | 'error' | 'anonymous' | 'ready';

export function getRegisterPanelLoadState({
  isLoading,
  loadError,
  isAuthenticated,
}: RegisterPanelLoadStateInput): RegisterPanelLoadState {
  if (isLoading) return 'loading';
  if (loadError) return 'error';
  if (!isAuthenticated) return 'anonymous';
  return 'ready';
}

export function getRegistrationEntryPresentation(
  tournamentStatus: TournamentStatus,
  entry: RegistrationEntry | null,
  locale: Locale = DEFAULT_LOCALE,
): RegistrationEntryPresentation {
  const status = getDictionary(locale).registrationPanel.entryStatus;
  if (!entry) {
    if (tournamentStatus === 'open') {
      return {
        statusLabel: status.notRegistered,
        badgeClassName: 'badge',
        action: 'register',
      };
    }

    return {
      statusLabel: status.registrationClosed,
      badgeClassName: 'badge',
      action: null,
    };
  }

  if (entry.checkedIn) {
    return {
      statusLabel: status.checkedIn,
      badgeClassName: 'badge badge-success',
      action: null,
    };
  }

  if (entry.registrationStatus === 'pending') {
    return {
      statusLabel: status.pendingApproval,
      badgeClassName: 'badge badge-warn',
      action: null,
    };
  }

  if (entry.registrationStatus === 'waitlisted') {
    return {
      statusLabel: status.waitlisted,
      badgeClassName: 'badge badge-warn',
      action: null,
    };
  }

  if (entry.registrationStatus === 'rejected') {
    return {
      statusLabel: status.rejected,
      badgeClassName: 'badge badge-danger',
      action: null,
    };
  }

  if (entry.registrationStatus === 'cancelled') {
    return {
      statusLabel: status.cancelled,
      badgeClassName: 'badge',
      action: null,
    };
  }

  if (entry.registrationStatus !== 'approved') {
    return {
      statusLabel: status.unavailable,
      badgeClassName: 'badge',
      action: null,
    };
  }

  if (tournamentStatus === 'open' || tournamentStatus === 'checkin_open') {
    return {
      statusLabel: status.registered,
      badgeClassName: 'badge badge-success',
      action: 'checkin',
    };
  }

  return {
    statusLabel: status.registered,
    badgeClassName: 'badge badge-success',
    action: null,
  };
}

export function classifyTeamsForRegistration<T extends RegistrationTeam>(
  teams: readonly T[],
  tournamentGameAdapterKey: GameAdapterKey,
  currentUserId: string | null,
): RegistrationTeamClassification<T> {
  if (tournamentGameAdapterKey === 'generic') {
    return {
      compatibleTeams: teams.filter((team) => team.captainId === currentUserId),
      configurableTeams: [],
      readOnlyTeams: teams.filter((team) => team.captainId !== currentUserId),
      hiddenTeamCount: 0,
    };
  }

  const compatibleTeams = teams.filter(
    (team) => team.gameAdapterKey === tournamentGameAdapterKey && team.captainId === currentUserId,
  );
  const readOnlyTeams = teams.filter(
    (team) => team.gameAdapterKey === tournamentGameAdapterKey && team.captainId !== currentUserId,
  );
  const configurableTeams = teams.filter(
    (team) =>
      (team.gameAdapterKey === null || team.gameAdapterKey === 'generic') &&
      team.captainId === currentUserId,
  );

  return {
    compatibleTeams,
    configurableTeams,
    readOnlyTeams,
    hiddenTeamCount:
      teams.length - compatibleTeams.length - configurableTeams.length - readOnlyTeams.length,
  };
}
