import { getAdapter } from '@opentournament/game-adapters';
import type { GameAdapterKey } from '@opentournament/shared-types';
import {
  createTournamentSchema,
  gameAdapterKeySchema,
  type CreateTournamentInput,
} from '@opentournament/validation';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordOrEmpty(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function mergeNestedDefaults(defaults: UnknownRecord, override: unknown): unknown {
  if (override === undefined) return { ...defaults };
  if (!isRecord(override)) return override;
  return { ...defaults, ...override };
}

function mergeGameRules(defaultRules: unknown, requestedRules: unknown): unknown {
  if (requestedRules === undefined) return defaultRules;
  if (!isRecord(defaultRules) || !isRecord(requestedRules)) return requestedRules;

  const mergedRules = { ...defaultRules, ...requestedRules };
  return Object.hasOwn(defaultRules, 'game')
    ? { ...mergedRules, game: defaultRules.game }
    : mergedRules;
}

function mergeTemplateSettings(
  defaults: UnknownRecord,
  requested: unknown,
  templateKey: string,
  templateVersion: number,
): unknown {
  if (requested !== undefined && !isRecord(requested)) return requested;

  const requestedSettings = recordOrEmpty(requested);
  return {
    ...defaults,
    ...requestedSettings,
    templateKey,
    templateVersion,
    gameRules: mergeGameRules(defaults.gameRules, requestedSettings.gameRules),
  };
}

function detectAdapterKey(request: UnknownRecord): GameAdapterKey {
  const parsedKey = gameAdapterKeySchema.safeParse(request.gameAdapterKey ?? 'generic');
  if (parsedKey.success) return parsedKey.data;

  // Reuse the canonical schema error shape instead of introducing a second
  // validation contract just for adapter detection.
  return createTournamentSchema.parse(request).gameAdapterKey;
}

export function resolveTournamentCreationRequest(request: unknown): CreateTournamentInput {
  const requestObject = recordOrEmpty(request);
  const adapterKey = detectAdapterKey(requestObject);
  const template = getAdapter(adapterKey).tournamentTemplate;
  if (!template) return createTournamentSchema.parse(request);

  const defaultSettings = recordOrEmpty(template.defaults.settings);

  const mergedRequest = {
    ...template.defaults,
    ...requestObject,
    gameAdapterKey: adapterKey,
    seriesConfig: mergeNestedDefaults(template.defaults.seriesConfig, requestObject.seriesConfig),
    checkinConfig: mergeNestedDefaults(
      template.defaults.checkinConfig,
      requestObject.checkinConfig,
    ),
    settings: mergeTemplateSettings(
      defaultSettings,
      requestObject.settings,
      template.key,
      template.version,
    ),
  };

  return createTournamentSchema.parse(mergedRequest);
}
