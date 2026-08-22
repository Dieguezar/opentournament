interface StatusPresentation {
  label: string;
  className: string;
}

const GAME_ADAPTER_LABELS: Record<string, string> = {
  generic: 'Juego genérico',
  valorant: 'Valorant',
  cs2: 'Counter-Strike 2',
  lol: 'League of Legends',
};

const TOURNAMENT_STATUS_LABELS: Record<string, StatusPresentation> = {
  draft: { label: 'Borrador', className: 'badge' },
  open: { label: 'Inscripciones abiertas', className: 'badge badge-success' },
  checkin_open: { label: 'Check-in abierto', className: 'badge badge-warn' },
  in_progress: { label: 'En curso', className: 'badge badge-warn' },
  finalized: { label: 'Finalizado', className: 'badge badge-success' },
  cancelled: { label: 'Cancelado', className: 'badge badge-danger' },
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  in_progress: 'En juego',
  disputed: 'En disputa',
  finalized: 'Finalizada',
  walkover: 'Walkover',
  cancelled: 'Cancelada',
};

const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  waitlisted: 'En lista de espera',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  in_review: 'En revisión',
  resolved: 'Resuelta',
};

const DISPUTE_REASON_LABELS: Record<string, string> = {
  result_conflict: 'Resultados contradictorios',
  captain_request: 'Solicitud del capitán',
  system: 'Escalada por el sistema',
};

function humanize(value: string): string {
  const words = value.replaceAll('-', ' ').replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatGameAdapter(value: string): string {
  return GAME_ADAPTER_LABELS[value] ?? humanize(value);
}

export function getTournamentStatus(value: string): StatusPresentation {
  return TOURNAMENT_STATUS_LABELS[value] ?? { label: humanize(value), className: 'badge' };
}

export function formatMatchStatus(value: string): string {
  return MATCH_STATUS_LABELS[value] ?? humanize(value);
}

export function formatRegistrationStatus(value: string): string {
  return REGISTRATION_STATUS_LABELS[value] ?? humanize(value);
}

export function shouldShowRegistrationDecisionActions(status: string): boolean {
  return status !== 'approved' && status !== 'rejected';
}

export function canGenerateBracket(tournamentStatus: string): boolean {
  return tournamentStatus === 'open';
}

export function canDeclareWalkover(matchStatus: string): boolean {
  return matchStatus === 'scheduled' || matchStatus === 'in_progress';
}

export function formatDisputeStatus(value: string): string {
  return DISPUTE_STATUS_LABELS[value] ?? humanize(value);
}

export function formatDisputeReason(value: string): string {
  return DISPUTE_REASON_LABELS[value] ?? humanize(value);
}

export function formatBracketType(value: string): string {
  if (value === 'winners') return 'Ganadores';
  if (value === 'losers') return 'Perdedores';
  if (value === 'final') return 'Gran final';
  return humanize(value);
}

export function formatOrganizationRole(value: string): string {
  if (value === 'owner') return 'Propietario';
  if (value === 'admin') return 'Administrador';
  if (value === 'member') return 'Miembro';
  return humanize(value);
}

export function formatParticipantStatus(value: string): string {
  if (value === 'active') return 'En competencia';
  if (value === 'eliminated') return 'Eliminado';
  if (value === 'winner') return 'Campeón';
  if (value === 'disqualified') return 'Descalificado';
  return humanize(value);
}
