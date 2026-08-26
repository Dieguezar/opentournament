import type {
  GameAdapterKey,
  LeagueOfLegendsRules,
  SmashUltimateRules,
  TournamentSettings,
} from '@opentournament/shared-types';

export interface GameTerminology {
  participantSingular: string;
  participantPlural: string;
  teamSingular: string;
  teamPlural: string;
}

export interface TournamentTemplateDefaults {
  format: 'single_elimination' | 'double_elimination';
  capacity: number;
  seriesConfig: {
    bo: number;
    drawsAllowed: boolean;
  };
  checkinConfig: {
    delayToleranceMinutes: number;
  };
  settings: TournamentSettings;
}

export interface GameTournamentTemplate {
  key: string;
  version: number;
  editable: boolean;
  defaults: TournamentTemplateDefaults;
}

export interface GameAdapterConfig {
  key: GameAdapterKey;
  name: string;
  iconUrl?: string;
  platforms: string[];
  team: {
    minPlayers: number;
    maxPlayers: number;
    substitutes: number;
  };
  playerId: {
    label: string;
    format: RegExp;
    hint: string;
  };
  regions?: string[];
  maps?: string[];
  modes?: string[];
  scoring: {
    type: 'series' | 'first_to' | 'timed';
    drawAllowed: boolean;
    defaultSeries?: number[];
  };
  matchFormats: {
    series: boolean;
    timed: boolean;
  };
  veto: {
    mode: 'external';
    mapsRequired: boolean;
  };
  terminology?: GameTerminology;
  tournamentTemplate?: GameTournamentTemplate;
  customFields?: Array<{ key: string; label: string; type: 'text' | 'select'; options?: string[] }>;
  integrations?: string[];
}

export const genericAdapter: GameAdapterConfig = {
  key: 'generic',
  name: 'Generic',
  platforms: ['cualquiera'],
  team: { minPlayers: 1, maxPlayers: 10, substitutes: 2 },
  playerId: {
    label: 'Nombre de jugador',
    format: /^.{2,64}$/,
    hint: 'Cualquier identificador de jugador',
  },
  scoring: { type: 'series', drawAllowed: true, defaultSeries: [1, 3, 5] },
  matchFormats: { series: true, timed: false },
  veto: { mode: 'external', mapsRequired: false },
  integrations: [],
};

export const valorantAdapter: GameAdapterConfig = {
  key: 'valorant',
  name: 'Valorant',
  platforms: ['pc'],
  team: { minPlayers: 5, maxPlayers: 5, substitutes: 1 },
  playerId: { label: 'Riot ID', format: /^[^#]{3,16}#(?:[A-Z0-9]{3,5})$/i, hint: 'Nombre#TAG' },
  regions: ['latam', 'br', 'na', 'eu', 'apac'],
  maps: [
    'Abyss',
    'Ascent',
    'Bind',
    'Breeze',
    'Haven',
    'Icebox',
    'Lotus',
    'Pearl',
    'Split',
    'Sunset',
  ],
  scoring: { type: 'series', drawAllowed: false, defaultSeries: [1, 3, 5] },
  matchFormats: { series: true, timed: false },
  veto: { mode: 'external', mapsRequired: true },
  integrations: [],
};

export const cs2Adapter: GameAdapterConfig = {
  key: 'cs2',
  name: 'Counter-Strike 2',
  platforms: ['pc'],
  team: { minPlayers: 5, maxPlayers: 5, substitutes: 1 },
  playerId: { label: 'Steam ID 64', format: /^7656119\d{10}$/, hint: 'SteamID64 (17 digits)' },
  regions: ['latam', 'na', 'eu', 'apac'],
  maps: ['Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage', 'Nuke', 'Overpass', 'Train', 'Vertigo'],
  scoring: { type: 'series', drawAllowed: false, defaultSeries: [1, 3, 5] },
  matchFormats: { series: true, timed: false },
  veto: { mode: 'external', mapsRequired: true },
  integrations: [],
};

export const leagueOfLegendsStandardRules = {
  game: 'lol',
  map: 'summoners_rift',
  region: 'lan',
  draftMode: 'tournament_draft',
  fearlessDraft: false,
  patchPolicy: 'live',
  patchVersion: null,
  sideSelection: 'higher_seed_game_1_then_loser',
  pauseBudgetMinutes: 10,
  spectatorDelayMinutes: 3,
} as const satisfies LeagueOfLegendsRules;

export const leagueOfLegendsStandardTemplate = {
  key: 'lol.standard_v1',
  version: 1,
  editable: true,
  defaults: {
    format: 'single_elimination',
    capacity: 16,
    seriesConfig: { bo: 3, drawsAllowed: false },
    checkinConfig: { delayToleranceMinutes: 10 },
    settings: {
      grandFinalReset: false,
      presencial: false,
      templateKey: 'lol.standard_v1',
      templateVersion: 1,
      gameRules: leagueOfLegendsStandardRules,
    },
  },
} as const satisfies GameTournamentTemplate;

export const leagueOfLegendsAdapter: GameAdapterConfig = {
  key: 'lol',
  name: 'League of Legends',
  platforms: ['pc'],
  team: { minPlayers: 5, maxPlayers: 5, substitutes: 1 },
  playerId: {
    label: 'Riot ID',
    format: /^[^#]{3,16}#(?:[A-Z0-9]{3,5})$/i,
    hint: 'Nombre#TAG',
  },
  regions: [
    'lan',
    'las',
    'br',
    'na',
    'euw',
    'eune',
    'kr',
    'jp',
    'oce',
    'tr',
    'ru',
    'ph',
    'sg',
    'th',
    'tw',
    'vn',
  ],
  modes: ['Tournament Draft'],
  maps: ["Summoner's Rift"],
  scoring: { type: 'series', drawAllowed: false, defaultSeries: [1, 3, 5] },
  matchFormats: { series: true, timed: false },
  veto: { mode: 'external', mapsRequired: true },
  terminology: {
    participantSingular: 'equipo',
    participantPlural: 'equipos',
    teamSingular: 'equipo',
    teamPlural: 'equipos',
  },
  tournamentTemplate: leagueOfLegendsStandardTemplate,
  integrations: [],
};

export const lolAdapter = leagueOfLegendsAdapter;

export const smashUltimateStandardRules = {
  game: 'smash_ultimate',
  stocks: 3,
  timeLimitMinutes: 7,
  itemsEnabled: false,
  finalSmashMeterEnabled: false,
  stageHazardsEnabled: false,
  launchRate: 1,
  starters: [
    'Battlefield',
    'Small Battlefield',
    'Pokémon Stadium 2',
    'Final Destination',
    'Town & City',
  ],
  counterpicks: ['Kalos Pokémon League', 'Smashville', 'Hollow Bastion'],
  stageBans: 3,
  stageClause: 'none',
} as const satisfies SmashUltimateRules;

export const smashUltimateStandardTemplate = {
  key: 'smash_ultimate.standard_v1',
  version: 1,
  editable: true,
  defaults: {
    format: 'double_elimination',
    capacity: 32,
    seriesConfig: { bo: 3, drawsAllowed: false },
    checkinConfig: { delayToleranceMinutes: 10 },
    settings: {
      grandFinalReset: true,
      presencial: true,
      templateKey: 'smash_ultimate.standard_v1',
      templateVersion: 1,
      gameRules: smashUltimateStandardRules,
    },
  },
} as const satisfies GameTournamentTemplate;

export const smashUltimateAdapter: GameAdapterConfig = {
  key: 'smash_ultimate',
  name: 'Super Smash Bros. Ultimate',
  platforms: ['nintendo_switch'],
  team: { minPlayers: 1, maxPlayers: 1, substitutes: 0 },
  playerId: {
    label: 'Tag',
    format: /^.{1,32}$/,
    hint: 'Tag usado por el competidor en el bracket',
  },
  modes: ['Singles'],
  maps: [...smashUltimateStandardRules.starters, ...smashUltimateStandardRules.counterpicks],
  scoring: { type: 'series', drawAllowed: false, defaultSeries: [3, 5] },
  matchFormats: { series: true, timed: false },
  veto: { mode: 'external', mapsRequired: true },
  terminology: {
    participantSingular: 'competidor',
    participantPlural: 'competidores',
    teamSingular: 'jugador',
    teamPlural: 'jugadores',
  },
  tournamentTemplate: smashUltimateStandardTemplate,
  integrations: [],
};

export const adapters: Record<GameAdapterKey, GameAdapterConfig> = {
  generic: genericAdapter,
  valorant: valorantAdapter,
  cs2: cs2Adapter,
  lol: leagueOfLegendsAdapter,
  smash_ultimate: smashUltimateAdapter,
};

export function getAdapter(key: GameAdapterKey): GameAdapterConfig {
  return adapters[key];
}
