import type {
  GameAdapterKey,
  LeagueOfLegendsRules,
  SmashUltimateRules,
  SmashUltimateStageClause,
  TournamentGameRules,
} from '@opentournament/shared-types';
import type { Locale } from './i18n';

export interface TournamentTemplateFormState {
  gameAdapterKey: GameAdapterKey;
  format: string;
  capacity: string;
  bo: string;
  grandFinalReset: boolean;
  templateKey: string | null;
  templateVersion: number | null;
  gameRules: EditableTournamentGameRules | null;
}

export interface EditableSmashUltimateRules extends Omit<
  SmashUltimateRules,
  'starters' | 'counterpicks'
> {
  starters: string[];
  counterpicks: string[];
}

export type EditableLeagueOfLegendsRules = LeagueOfLegendsRules;

export type EditableTournamentGameRules = EditableSmashUltimateRules | EditableLeagueOfLegendsRules;

interface TournamentTemplateSelection {
  key: string;
  version: number;
  defaults: {
    format: 'single_elimination' | 'double_elimination';
    capacity: number;
    seriesConfig: { bo: number };
    settings: {
      grandFinalReset?: boolean;
      gameRules?: TournamentGameRules;
    };
  };
}

export type SmashUltimateRuleField =
  'stocks' | 'timeLimitMinutes' | 'stageBans' | 'starters' | 'counterpicks' | 'launchRate';

export type SmashUltimateRuleErrors = Partial<Record<SmashUltimateRuleField, string>>;

export interface SmashUltimateRulesValidation {
  rules: EditableSmashUltimateRules;
  errors: SmashUltimateRuleErrors;
  firstInvalidField: SmashUltimateRuleField | null;
}

export type LeagueOfLegendsRuleField =
  'patchVersion' | 'pauseBudgetMinutes' | 'spectatorDelayMinutes';

export type LeagueOfLegendsRuleErrors = Partial<Record<LeagueOfLegendsRuleField, string>>;

export interface LeagueOfLegendsRulesValidation {
  rules: EditableLeagueOfLegendsRules;
  errors: LeagueOfLegendsRuleErrors;
  firstInvalidField: LeagueOfLegendsRuleField | null;
}

const smashRuleFieldOrder: readonly SmashUltimateRuleField[] = [
  'stocks',
  'timeLimitMinutes',
  'stageBans',
  'starters',
  'counterpicks',
  'launchRate',
];

const GENERAL_BEST_OF_OPTIONS = ['1', '3', '5'] as const;
const SMASH_BEST_OF_OPTIONS = ['3', '5'] as const;

const ruleValidationMessages = {
  es: {
    stocks: 'Los stocks deben ser un número entero entre 1 y 10.',
    timeLimit: 'El tiempo límite debe ser un número entero entre 1 y 60 minutos.',
    stageBans: 'Los vetos deben ser un número entero entre 0 y 10.',
    starterRequired: 'Agregá al menos un escenario inicial.',
    counterpickRequired: 'Agregá al menos un escenario counterpick.',
    starterLimit: 'Usá como máximo 20 escenarios iniciales.',
    counterpickLimit: 'Usá como máximo 20 escenarios de counterpick.',
    starterLength: 'Cada escenario inicial puede tener hasta 80 caracteres.',
    counterpickLength: 'Cada escenario counterpick puede tener hasta 80 caracteres.',
    starterRepeated: 'Los escenarios iniciales no pueden repetirse.',
    counterpickRepeated: 'Los escenarios de counterpick no pueden repetirse.',
    stagePoolOverlap: 'Un escenario no puede ser inicial y counterpick a la vez.',
    stageBansAvailability: 'Los vetos deben dejar al menos un escenario disponible.',
    launchRate: 'El launch rate debe estar entre 0.5× y 2×.',
    patchVersion: 'Indicá una versión de parche, por ejemplo 26.16.',
    pauseBudget: 'La pausa total debe estar entre 0 y 120 minutos.',
    spectatorDelay: 'El retraso debe estar entre 0 y 30 minutos.',
  },
  en: {
    stocks: 'Stocks must be a whole number between 1 and 10.',
    timeLimit: 'The time limit must be a whole number between 1 and 60 minutes.',
    stageBans: 'Stage bans must be a whole number between 0 and 10.',
    starterRequired: 'Add at least one starter stage.',
    counterpickRequired: 'Add at least one counterpick stage.',
    starterLimit: 'Use no more than 20 starter stages.',
    counterpickLimit: 'Use no more than 20 counterpick stages.',
    starterLength: 'Each starter stage can contain up to 80 characters.',
    counterpickLength: 'Each counterpick stage can contain up to 80 characters.',
    starterRepeated: 'Starter stages cannot be repeated.',
    counterpickRepeated: 'Counterpick stages cannot be repeated.',
    stagePoolOverlap: 'A stage cannot be both a starter and a counterpick.',
    stageBansAvailability: 'Stage bans must leave at least one stage available.',
    launchRate: 'The launch rate must be between 0.5× and 2×.',
    patchVersion: 'Enter a patch version, for example 26.16.',
    pauseBudget: 'The total pause allowance must be between 0 and 120 minutes.',
    spectatorDelay: 'The spectator delay must be between 0 and 30 minutes.',
  },
} as const;

export function getSeriesBestOfOptions(gameAdapterKey: GameAdapterKey): readonly string[] {
  return gameAdapterKey === 'smash_ultimate' ? SMASH_BEST_OF_OPTIONS : GENERAL_BEST_OF_OPTIONS;
}

function sanitizeSeriesBestOf(gameAdapterKey: GameAdapterKey, value: string): string {
  if (gameAdapterKey !== 'smash_ultimate') return value;
  return SMASH_BEST_OF_OPTIONS.some((option) => option === value) ? value : '3';
}

export function parseStageList(value: string): string[] {
  return value
    .split('\n')
    .map((stage) => stage.trim())
    .filter(Boolean);
}

function normalizeStageName(stageName: string): string {
  return stageName.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

function hasRepeatedStage(stageNames: readonly string[]): boolean {
  const normalizedNames = stageNames.map(normalizeStageName);
  return new Set(normalizedNames).size !== normalizedNames.length;
}

function validateStagePool(
  stageNames: readonly string[],
  pool: 'starters' | 'counterpicks',
  locale: Locale,
): string | undefined {
  const messages = ruleValidationMessages[locale];
  if (stageNames.length === 0) {
    return pool === 'starters' ? messages.starterRequired : messages.counterpickRequired;
  }
  if (stageNames.length > 20) {
    return pool === 'starters' ? messages.starterLimit : messages.counterpickLimit;
  }
  if (stageNames.some((stageName) => stageName.length > 80)) {
    return pool === 'starters' ? messages.starterLength : messages.counterpickLength;
  }
  if (hasRepeatedStage(stageNames)) {
    return pool === 'starters' ? messages.starterRepeated : messages.counterpickRepeated;
  }

  return undefined;
}

export function validateSmashUltimateRules(
  rules: EditableSmashUltimateRules,
  locale: Locale = 'es',
): SmashUltimateRulesValidation {
  const messages = ruleValidationMessages[locale];
  const normalizedRules: EditableSmashUltimateRules = {
    ...rules,
    starters: parseStageList(rules.starters.join('\n')),
    counterpicks: parseStageList(rules.counterpicks.join('\n')),
  };
  const errors: SmashUltimateRuleErrors = {};

  if (
    !Number.isInteger(normalizedRules.stocks) ||
    normalizedRules.stocks < 1 ||
    normalizedRules.stocks > 10
  ) {
    errors.stocks = messages.stocks;
  }
  if (
    !Number.isInteger(normalizedRules.timeLimitMinutes) ||
    normalizedRules.timeLimitMinutes < 1 ||
    normalizedRules.timeLimitMinutes > 60
  ) {
    errors.timeLimitMinutes = messages.timeLimit;
  }
  if (
    !Number.isInteger(normalizedRules.stageBans) ||
    normalizedRules.stageBans < 0 ||
    normalizedRules.stageBans > 10
  ) {
    errors.stageBans = messages.stageBans;
  }

  const startersError = validateStagePool(normalizedRules.starters, 'starters', locale);
  const counterpicksError = validateStagePool(normalizedRules.counterpicks, 'counterpicks', locale);
  if (startersError) errors.starters = startersError;
  if (counterpicksError) errors.counterpicks = counterpicksError;

  const starterSet = new Set(normalizedRules.starters.map(normalizeStageName));
  if (
    !errors.counterpicks &&
    normalizedRules.counterpicks.some((stageName) => starterSet.has(normalizeStageName(stageName)))
  ) {
    errors.counterpicks = messages.stagePoolOverlap;
  }

  const totalUniqueStages = new Set([
    ...normalizedRules.starters.map(normalizeStageName),
    ...normalizedRules.counterpicks.map(normalizeStageName),
  ]).size;
  if (
    !errors.stageBans &&
    totalUniqueStages > 0 &&
    normalizedRules.stageBans >= totalUniqueStages
  ) {
    errors.stageBans = messages.stageBansAvailability;
  }

  if (
    !Number.isFinite(normalizedRules.launchRate) ||
    normalizedRules.launchRate < 0.5 ||
    normalizedRules.launchRate > 2
  ) {
    errors.launchRate = messages.launchRate;
  }

  for (const field of smashRuleFieldOrder) {
    if (errors[field]) {
      return { rules: normalizedRules, errors, firstInvalidField: field };
    }
  }

  return { rules: normalizedRules, errors, firstInvalidField: null };
}

export function validateLeagueOfLegendsRules(
  rules: EditableLeagueOfLegendsRules,
  locale: Locale = 'es',
): LeagueOfLegendsRulesValidation {
  const messages = ruleValidationMessages[locale];
  const normalizedRules: EditableLeagueOfLegendsRules = {
    ...rules,
    patchVersion: rules.patchVersion?.trim() || null,
  };
  const errors: LeagueOfLegendsRuleErrors = {};

  if (
    normalizedRules.patchPolicy === 'fixed' &&
    (!normalizedRules.patchVersion || !/^\d{1,2}\.\d{1,2}$/.test(normalizedRules.patchVersion))
  ) {
    errors.patchVersion = messages.patchVersion;
  }
  if (
    !Number.isInteger(normalizedRules.pauseBudgetMinutes) ||
    normalizedRules.pauseBudgetMinutes < 0 ||
    normalizedRules.pauseBudgetMinutes > 120
  ) {
    errors.pauseBudgetMinutes = messages.pauseBudget;
  }
  if (
    !Number.isInteger(normalizedRules.spectatorDelayMinutes) ||
    normalizedRules.spectatorDelayMinutes < 0 ||
    normalizedRules.spectatorDelayMinutes > 30
  ) {
    errors.spectatorDelayMinutes = messages.spectatorDelay;
  }

  const fieldOrder: readonly LeagueOfLegendsRuleField[] = [
    'patchVersion',
    'pauseBudgetMinutes',
    'spectatorDelayMinutes',
  ];
  return {
    rules: normalizedRules,
    errors,
    firstInvalidField: fieldOrder.find((field) => errors[field]) ?? null,
  };
}

export function applyGameTemplateSelection(
  gameAdapterKey: GameAdapterKey,
  current: TournamentTemplateFormState,
  template?: TournamentTemplateSelection,
): TournamentTemplateFormState {
  const gameRules = template?.defaults.settings.gameRules;

  if (!template || gameRules?.game !== gameAdapterKey) {
    return {
      ...current,
      gameAdapterKey,
      bo: sanitizeSeriesBestOf(gameAdapterKey, current.bo),
      templateKey: null,
      templateVersion: null,
      gameRules: null,
    };
  }

  const editableGameRules: EditableTournamentGameRules =
    gameRules.game === 'smash_ultimate'
      ? {
          ...gameRules,
          stageClause: gameRules.stageClause as SmashUltimateStageClause,
          starters: [...gameRules.starters],
          counterpicks: [...gameRules.counterpicks],
        }
      : { ...gameRules };

  return {
    ...current,
    gameAdapterKey,
    format: template.defaults.format,
    capacity: String(template.defaults.capacity),
    bo: sanitizeSeriesBestOf(gameAdapterKey, String(template.defaults.seriesConfig.bo)),
    grandFinalReset: template.defaults.settings.grandFinalReset ?? false,
    templateKey: template.key,
    templateVersion: template.version,
    gameRules: editableGameRules,
  };
}

export function restoreGameTemplateDefaults(
  current: TournamentTemplateFormState,
  template: TournamentTemplateSelection,
): TournamentTemplateFormState {
  return applyGameTemplateSelection(current.gameAdapterKey, current, template);
}
