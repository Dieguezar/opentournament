import type { GameAdapterKey } from '@opentournament/shared-types';

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
  customFields?: Array<{ key: string; label: string; type: 'text' | 'select'; options?: string[] }>;
  integrations?: string[];
}

export const genericAdapter: GameAdapterConfig = {
  key: 'generic',
  name: 'Genérico',
  platforms: ['cualquiera'],
  team: { minPlayers: 1, maxPlayers: 10, substitutes: 2 },
  playerId: { label: 'Nombre de jugador', format: /^.{2,64}$/, hint: 'Cualquier identificador de jugador' },
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
  maps: ['Abyss', 'Ascent', 'Bind', 'Breeze', 'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'],
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
  playerId: { label: 'Steam ID 64', format: /^7656119\d{10}$/, hint: 'SteamID64 (17 dígitos)' },
  regions: ['latam', 'na', 'eu', 'apac'],
  maps: ['Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage', 'Nuke', 'Overpass', 'Train', 'Vertigo'],
  scoring: { type: 'series', drawAllowed: false, defaultSeries: [1, 3, 5] },
  matchFormats: { series: true, timed: false },
  veto: { mode: 'external', mapsRequired: true },
  integrations: [],
};

export const lolAdapter: GameAdapterConfig = {
  key: 'lol',
  name: 'League of Legends',
  platforms: ['pc'],
  team: { minPlayers: 5, maxPlayers: 5, substitutes: 1 },
  playerId: {
    label: 'Nombre de invocador',
    format: /^.{2,16}$/,
    hint: 'Nombre de invocador + región',
  },
  regions: ['lan', 'las', 'br', 'na', 'eu'],
  maps: ["Summoner's Rift"],
  scoring: { type: 'series', drawAllowed: false, defaultSeries: [1, 3, 5] },
  matchFormats: { series: true, timed: false },
  veto: { mode: 'external', mapsRequired: true },
  integrations: [],
};

export const adapters: Record<GameAdapterKey, GameAdapterConfig> = {
  generic: genericAdapter,
  valorant: valorantAdapter,
  cs2: cs2Adapter,
  lol: lolAdapter,
};

export function getAdapter(key: GameAdapterKey): GameAdapterConfig {
  return adapters[key];
}
