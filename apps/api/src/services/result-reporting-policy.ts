import type { ResultReportingMode } from '@opentournament/shared-types';

interface ParticipantAccessScope {
  tournamentId: string;
  teamId: string;
}

interface ResultReportAuthorizationRequest {
  reportingMode: ResultReportingMode;
  isTournamentAdmin: boolean;
  tournamentId: string;
  participantAccess: ParticipantAccessScope | null;
  captainTeamIds: readonly string[];
  eligibleTeamIds: readonly [string, string];
  winnerTeamId: string | null;
}

type ResultReportAuthorization =
  | {
      ok: true;
      reporterTeamId: string | null;
      strategy: 'bilateral' | 'authoritative';
    }
  | { ok: false; code: 'FORBIDDEN' | 'STAFF_ONLY' | 'WINNER_MUST_REPORT'; message: string };

export function authorizeResultReport(
  request: ResultReportAuthorizationRequest,
): ResultReportAuthorization {
  if (request.isTournamentAdmin) {
    return { ok: true, reporterTeamId: null, strategy: 'authoritative' };
  }

  if (request.reportingMode === 'staff_only') {
    return {
      ok: false,
      code: 'STAFF_ONLY',
      message: 'This tournament reserves result reporting for staff',
    };
  }

  let reporterTeamId: string | undefined;
  if (request.participantAccess) {
    if (request.participantAccess.tournamentId !== request.tournamentId) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        message: 'The pass does not belong to this tournament',
      };
    }
    reporterTeamId = request.participantAccess.teamId;
  } else {
    reporterTeamId = request.captainTeamIds.find((teamId) =>
      request.eligibleTeamIds.includes(teamId),
    );
  }

  if (!reporterTeamId || !request.eligibleTeamIds.includes(reporterTeamId)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'You cannot report results for this match',
    };
  }

  if (request.reportingMode === 'winner_reports') {
    if (!request.winnerTeamId || reporterTeamId !== request.winnerTeamId) {
      return {
        ok: false,
        code: 'WINNER_MUST_REPORT',
        message: 'The tournament winner must report the result',
      };
    }
    return { ok: true, reporterTeamId, strategy: 'authoritative' };
  }

  return { ok: true, reporterTeamId, strategy: 'bilateral' };
}
