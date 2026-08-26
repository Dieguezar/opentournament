interface StatusPresentation {
  label: string;
  className: string;
}

const GAME_ADAPTER_LABELS: Record<string, string> = {
  generic: 'Juego genérico',
  valorant: 'Valorant',
  cs2: 'Counter-Strike 2',
  lol: 'League of Legends',
  smash_ultimate: 'Super Smash Bros. Ultimate',
};

interface SmashRulesetInput {
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
  stageClause: string;
}

interface LeagueRulesetInput {
  game: 'lol';
  map: 'summoners_rift';
  region: string;
  draftMode: 'tournament_draft';
  fearlessDraft: boolean;
  patchPolicy: 'live' | 'fixed';
  patchVersion: string | null;
  sideSelection: string;
  pauseBudgetMinutes: number;
  spectatorDelayMinutes: number;
}

interface RulesetSummaryInput {
  gameAdapterKey: string;
  format: string;
  seriesBestOf: number;
  grandFinalReset: boolean;
  gameRules: SmashRulesetInput | LeagueRulesetInput | null | undefined;
}

export interface RulesetSummaryPresentation {
  kind: 'smash_ultimate';
  title: string;
  format: string;
  set: string;
  grandFinal: string;
  stagePolicy: string;
  switches: string;
  starters: readonly string[];
  counterpicks: readonly string[];
}

export interface LeagueRulesetSummaryPresentation {
  kind: 'lol';
  title: string;
  format: string;
  set: string;
  draft: string;
  patch: string;
  sideSelection: string;
  operations: string;
}

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

function formatStageClause(value: string): string {
  if (value === 'modified_dsr') return 'DSR modificado';
  if (value === 'full_dsr') return 'DSR completo';
  if (value === 'none') return 'Sin DSR';
  return humanize(value);
}

function formatRulesSwitches(rules: SmashRulesetInput): string {
  if (!rules.itemsEnabled && !rules.finalSmashMeterEnabled && !rules.stageHazardsEnabled) {
    return 'Items, FS Meter y hazards desactivados';
  }

  const state = (isEnabled: boolean) => (isEnabled ? 'activados' : 'desactivados');
  return [
    `Items ${state(rules.itemsEnabled)}`,
    `FS Meter ${state(rules.finalSmashMeterEnabled)}`,
    `Hazards ${state(rules.stageHazardsEnabled)}`,
  ].join(' · ');
}

function isSmashRulesetInput(value: unknown): value is SmashRulesetInput {
  if (!value || typeof value !== 'object') return false;

  const rules = value as Record<string, unknown>;
  const hasValidStages = (stages: unknown) =>
    Array.isArray(stages) && stages.every((stage) => typeof stage === 'string');

  return (
    rules.game === 'smash_ultimate' &&
    typeof rules.stocks === 'number' &&
    Number.isFinite(rules.stocks) &&
    typeof rules.timeLimitMinutes === 'number' &&
    Number.isFinite(rules.timeLimitMinutes) &&
    typeof rules.itemsEnabled === 'boolean' &&
    typeof rules.finalSmashMeterEnabled === 'boolean' &&
    typeof rules.stageHazardsEnabled === 'boolean' &&
    typeof rules.launchRate === 'number' &&
    Number.isFinite(rules.launchRate) &&
    hasValidStages(rules.starters) &&
    hasValidStages(rules.counterpicks) &&
    typeof rules.stageBans === 'number' &&
    Number.isInteger(rules.stageBans) &&
    typeof rules.stageClause === 'string'
  );
}

function isLeagueRulesetInput(value: unknown): value is LeagueRulesetInput {
  if (!value || typeof value !== 'object') return false;
  const rules = value as Record<string, unknown>;

  return (
    rules.game === 'lol' &&
    rules.map === 'summoners_rift' &&
    typeof rules.region === 'string' &&
    rules.draftMode === 'tournament_draft' &&
    typeof rules.fearlessDraft === 'boolean' &&
    (rules.patchPolicy === 'live' || rules.patchPolicy === 'fixed') &&
    (rules.patchVersion === null || typeof rules.patchVersion === 'string') &&
    typeof rules.sideSelection === 'string' &&
    typeof rules.pauseBudgetMinutes === 'number' &&
    Number.isInteger(rules.pauseBudgetMinutes) &&
    typeof rules.spectatorDelayMinutes === 'number' &&
    Number.isInteger(rules.spectatorDelayMinutes)
  );
}

function formatLeagueSideSelection(value: string): string {
  if (value === 'higher_seed_game_1_then_loser') {
    return 'Seed superior en Game 1; luego el perdedor elige';
  }
  if (value === 'alternating') return 'Selección de lado alternada';
  if (value === 'coin_toss') return 'Selección inicial por sorteo';
  return humanize(value);
}

export function buildRulesetSummary(
  input: RulesetSummaryInput,
): RulesetSummaryPresentation | LeagueRulesetSummaryPresentation | null {
  if (input.gameAdapterKey === 'lol' && isLeagueRulesetInput(input.gameRules)) {
    const rules = input.gameRules;
    const format =
      input.format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla';
    return {
      kind: 'lol',
      title: 'Reglas competitivas de League of Legends',
      format: `5v5 · ${format}`,
      set: `BO${input.seriesBestOf} · Summoner’s Rift`,
      draft: `Tournament Draft · Fearless ${rules.fearlessDraft ? 'activado' : 'desactivado'}`,
      patch:
        rules.patchPolicy === 'fixed'
          ? `Parche fijo ${rules.patchVersion} · Región ${rules.region.toUpperCase()}`
          : `Parche live · Región ${rules.region.toUpperCase()}`,
      sideSelection: formatLeagueSideSelection(rules.sideSelection),
      operations: `${rules.pauseBudgetMinutes} min de pausa · ${rules.spectatorDelayMinutes} min de retraso para espectadores`,
    };
  }

  if (input.gameAdapterKey !== 'smash_ultimate' || !isSmashRulesetInput(input.gameRules)) {
    return null;
  }

  const rules = input.gameRules;
  const format =
    input.format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla';
  const bans = `${rules.stageBans} ${rules.stageBans === 1 ? 'ban' : 'bans'}`;

  return {
    kind: 'smash_ultimate',
    title: 'Reglas competitivas de Smash Ultimate',
    format: `Singles 1v1 · ${format}`,
    set: `BO${input.seriesBestOf} · ${rules.stocks} stocks · ${rules.timeLimitMinutes} min`,
    grandFinal: input.grandFinalReset ? 'Gran final con reset' : 'Gran final sin reset',
    stagePolicy: `${bans} · ${formatStageClause(rules.stageClause)}`,
    switches: formatRulesSwitches(rules),
    starters: rules.starters,
    counterpicks: rules.counterpicks,
  };
}

export function getPublicRegistrationMessage(
  tournamentStatus: string,
  isSmash: boolean,
): string | null {
  if (tournamentStatus === 'open' || tournamentStatus === 'checkin_open') return null;
  if (tournamentStatus === 'draft') return 'Las inscripciones todavía no abrieron.';
  if (tournamentStatus === 'cancelled') {
    return 'El torneo fue cancelado y no admite nuevas inscripciones.';
  }

  const matchLabel = isSmash ? 'los sets' : 'las partidas';
  if (tournamentStatus === 'in_progress') {
    return `El torneo ya está en curso. Las inscripciones y el check-in cerraron; seguí ${matchLabel} en el bracket.`;
  }
  if (tournamentStatus === 'finalized') {
    return `El torneo finalizó. Consultá ${matchLabel} y los resultados publicados en el bracket.`;
  }

  return 'Las inscripciones no están disponibles en este momento.';
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
