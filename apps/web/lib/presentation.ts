interface StatusPresentation {
  label: string;
  className: string;
}

const GAME_ADAPTER_LABELS: Record<string, string> = {
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

const TOURNAMENT_STATUS_CLASSES: Record<string, string> = {
  draft: 'badge',
  open: 'badge badge-success',
  checkin_open: 'badge badge-warn',
  in_progress: 'badge badge-warn',
  finalized: 'badge badge-success',
  cancelled: 'badge badge-danger',
};

function humanize(value: string): string {
  const words = value.replaceAll('-', ' ').replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatStageClause(value: string, locale: Locale): string {
  const ruleset = getDictionary(locale).ruleset;
  if (value === 'modified_dsr') return ruleset.modifiedDsr;
  if (value === 'full_dsr') return ruleset.fullDsr;
  if (value === 'none') return ruleset.noDsr;
  return humanize(value);
}

function formatRulesSwitches(rules: SmashRulesetInput, locale: Locale): string {
  const ruleset = getDictionary(locale).ruleset;
  if (!rules.itemsEnabled && !rules.finalSmashMeterEnabled && !rules.stageHazardsEnabled) {
    return ruleset.allSwitchesDisabled;
  }

  const state = (isEnabled: boolean) =>
    isEnabled ? ruleset.enabledPlural : ruleset.disabledPlural;
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

function formatLeagueSideSelection(value: string, locale: Locale): string {
  const ruleset = getDictionary(locale).ruleset;
  if (value === 'higher_seed_game_1_then_loser') {
    return ruleset.higherSeedThenLoser;
  }
  if (value === 'alternating') return ruleset.alternatingSides;
  if (value === 'coin_toss') return ruleset.coinToss;
  return humanize(value);
}

export function buildRulesetSummary(
  input: RulesetSummaryInput,
  locale: Locale = DEFAULT_LOCALE,
): RulesetSummaryPresentation | LeagueRulesetSummaryPresentation | null {
  const dictionary = getDictionary(locale);
  const { presentation, ruleset } = dictionary;
  if (input.gameAdapterKey === 'lol' && isLeagueRulesetInput(input.gameRules)) {
    const rules = input.gameRules;
    const format =
      input.format === 'double_elimination'
        ? presentation.doubleElimination
        : presentation.singleElimination;
    return {
      kind: 'lol',
      title: ruleset.leagueTitle,
      format: `5v5 · ${format}`,
      set: `BO${input.seriesBestOf} · Summoner’s Rift`,
      draft: `Tournament Draft · Fearless ${rules.fearlessDraft ? ruleset.enabled : ruleset.disabled}`,
      patch:
        rules.patchPolicy === 'fixed'
          ? formatMessage(ruleset.fixedPatch, {
              patch: rules.patchVersion ?? '',
              region: rules.region.toUpperCase(),
            })
          : formatMessage(ruleset.livePatch, { region: rules.region.toUpperCase() }),
      sideSelection: formatLeagueSideSelection(rules.sideSelection, locale),
      operations: formatMessage(ruleset.pauseOperations, {
        pause: rules.pauseBudgetMinutes,
        delay: rules.spectatorDelayMinutes,
      }),
    };
  }

  if (input.gameAdapterKey !== 'smash_ultimate' || !isSmashRulesetInput(input.gameRules)) {
    return null;
  }

  const rules = input.gameRules;
  const format =
    input.format === 'double_elimination'
      ? presentation.doubleElimination
      : presentation.singleElimination;
  const bans = formatMessage(rules.stageBans === 1 ? ruleset.stageBan : ruleset.stageBans, {
    count: rules.stageBans,
  });

  return {
    kind: 'smash_ultimate',
    title: ruleset.smashTitle,
    format: `Singles 1v1 · ${format}`,
    set: `BO${input.seriesBestOf} · ${rules.stocks} stocks · ${rules.timeLimitMinutes} min`,
    grandFinal: input.grandFinalReset
      ? ruleset.grandFinalWithReset
      : ruleset.grandFinalWithoutReset,
    stagePolicy: `${bans} · ${formatStageClause(rules.stageClause, locale)}`,
    switches: formatRulesSwitches(rules, locale),
    starters: rules.starters,
    counterpicks: rules.counterpicks,
  };
}

export function getPublicRegistrationMessage(
  tournamentStatus: string,
  isSmash: boolean,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  const presentation = getDictionary(locale).presentation;
  if (tournamentStatus === 'open' || tournamentStatus === 'checkin_open') return null;
  if (tournamentStatus === 'draft') return presentation.registrationsNotOpen;
  if (tournamentStatus === 'cancelled') {
    return presentation.tournamentCancelled;
  }

  if (tournamentStatus === 'in_progress') {
    return isSmash
      ? presentation.tournamentInProgressSets
      : presentation.tournamentInProgressMatches;
  }
  if (tournamentStatus === 'finalized') {
    return isSmash ? presentation.tournamentFinalizedSets : presentation.tournamentFinalizedMatches;
  }

  return presentation.registrationsUnavailable;
}

export function formatGameAdapter(value: string, locale: Locale = DEFAULT_LOCALE): string {
  if (value === 'generic') return getDictionary(locale).presentation.genericGame;
  return GAME_ADAPTER_LABELS[value] ?? humanize(value);
}

export function getTournamentStatus(
  value: string,
  locale: Locale = DEFAULT_LOCALE,
): StatusPresentation {
  const labels = getDictionary(locale).presentation.tournamentStatus as Record<string, string>;
  return {
    label: labels[value] ?? humanize(value),
    className: TOURNAMENT_STATUS_CLASSES[value] ?? 'badge',
  };
}

export function formatMatchStatus(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = getDictionary(locale).presentation.matchStatus as Record<string, string>;
  return labels[value] ?? humanize(value);
}

export function formatRegistrationStatus(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = getDictionary(locale).presentation.registrationStatus as Record<string, string>;
  return labels[value] ?? humanize(value);
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

export function formatDisputeStatus(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = getDictionary(locale).presentation.disputeStatus as Record<string, string>;
  return labels[value] ?? humanize(value);
}

export function formatDisputeReason(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = getDictionary(locale).presentation.disputeReason as Record<string, string>;
  return labels[value] ?? humanize(value);
}

export function formatBracketType(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = getDictionary(locale).presentation.bracketType as Record<string, string>;
  return labels[value] ?? humanize(value);
}

export function formatOrganizationRole(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = getDictionary(locale).presentation.organizationRole as Record<string, string>;
  return labels[value] ?? humanize(value);
}

export function formatParticipantStatus(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = getDictionary(locale).presentation.participantStatus as Record<string, string>;
  return labels[value] ?? humanize(value);
}
import { DEFAULT_LOCALE, formatMessage, getDictionary, type Locale } from './i18n';
