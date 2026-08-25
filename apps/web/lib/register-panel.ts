import type { GameAdapterKey, TournamentStatus } from '@opentournament/shared-types';

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
): RegistrationEntryPresentation {
  if (!entry) {
    if (tournamentStatus === 'open') {
      return {
        statusLabel: 'Sin inscripción',
        badgeClassName: 'badge',
        action: 'register',
      };
    }

    return {
      statusLabel: 'Inscripciones cerradas',
      badgeClassName: 'badge',
      action: null,
    };
  }

  if (entry.checkedIn) {
    return {
      statusLabel: 'Check-in confirmado',
      badgeClassName: 'badge badge-success',
      action: null,
    };
  }

  if (entry.registrationStatus === 'pending') {
    return {
      statusLabel: 'Pendiente de aprobación',
      badgeClassName: 'badge badge-warn',
      action: null,
    };
  }

  if (entry.registrationStatus === 'waitlisted') {
    return {
      statusLabel: 'En lista de espera',
      badgeClassName: 'badge badge-warn',
      action: null,
    };
  }

  if (entry.registrationStatus === 'rejected') {
    return {
      statusLabel: 'Inscripción rechazada',
      badgeClassName: 'badge badge-danger',
      action: null,
    };
  }

  if (entry.registrationStatus === 'cancelled') {
    return {
      statusLabel: 'Inscripción cancelada',
      badgeClassName: 'badge',
      action: null,
    };
  }

  if (entry.registrationStatus !== 'approved') {
    return {
      statusLabel: 'Estado de inscripción no disponible',
      badgeClassName: 'badge',
      action: null,
    };
  }

  if (tournamentStatus === 'open' || tournamentStatus === 'checkin_open') {
    return {
      statusLabel: 'Inscrito',
      badgeClassName: 'badge badge-success',
      action: 'checkin',
    };
  }

  return {
    statusLabel: 'Inscrito',
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
    (team) =>
      team.gameAdapterKey === tournamentGameAdapterKey && team.captainId === currentUserId,
  );
  const readOnlyTeams = teams.filter(
    (team) =>
      team.gameAdapterKey === tournamentGameAdapterKey && team.captainId !== currentUserId,
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
