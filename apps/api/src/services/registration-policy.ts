export const REGISTRATION_DECISION_TOURNAMENT_STATUSES = ['open', 'checkin_open'] as const;

export function canDecideRegistration(tournamentStatus: string): boolean {
  return REGISTRATION_DECISION_TOURNAMENT_STATUSES.some(
    (allowedStatus) => allowedStatus === tournamentStatus,
  );
}

export function isRegistrationClosed(closesAt: string | undefined, now = new Date()): boolean {
  if (!closesAt) return false;
  return new Date(closesAt).getTime() <= now.getTime();
}
