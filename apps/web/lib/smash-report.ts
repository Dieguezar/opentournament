export interface SmashScorePreset {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string;
  label: string;
}

export interface SmashGameDraft {
  number: number;
  stage: string;
  homeCharacter: string;
  awayCharacter: string;
  winnerTeamId: string;
  homeStocks: number;
  awayStocks: number;
}

export interface SmashReportDraft {
  preset: SmashScorePreset;
  games: SmashGameDraft[];
  allowedStages: readonly string[];
  stockLimit: number;
  fieldIdPrefix?: string;
}

export interface SmashReportValidation {
  errors: Record<string, string>;
  firstInvalidFieldId: string | null;
  games: SmashGameDraft[];
}

export interface SmashReportPayload {
  winnerTeamId: string;
  homeScore: number;
  awayScore: number;
  games: SmashGameDraft[];
}

export const SMASH_ULTIMATE_CHARACTERS = [
  'Banjo & Kazooie',
  'Bayonetta',
  'Bowser',
  'Bowser Jr.',
  'Byleth',
  'Captain Falcon',
  'Chrom',
  'Cloud',
  'Corrin',
  'Daisy',
  'Dark Pit',
  'Dark Samus',
  'Diddy Kong',
  'Donkey Kong',
  'Dr. Mario',
  'Duck Hunt',
  'Falco',
  'Fox',
  'Ganondorf',
  'Greninja',
  'Hero',
  'Ice Climbers',
  'Ike',
  'Incineroar',
  'Inkling',
  'Isabelle',
  'Jigglypuff',
  'Joker',
  'Kazuya',
  'Ken',
  'King Dedede',
  'King K. Rool',
  'Kirby',
  'Link',
  'Little Mac',
  'Lucario',
  'Lucas',
  'Lucina',
  'Luigi',
  'Mario',
  'Marth',
  'Mega Man',
  'Meta Knight',
  'Mewtwo',
  'Mii Brawler',
  'Mii Gunner',
  'Mii Swordfighter',
  'Min Min',
  'Mr. Game & Watch',
  'Ness',
  'Olimar',
  'Pac-Man',
  'Palutena',
  'Peach',
  'Pichu',
  'Pikachu',
  'Piranha Plant',
  'Pit',
  'Pokémon Trainer',
  'Pyra/Mythra',
  'R.O.B.',
  'Richter',
  'Ridley',
  'Robin',
  'Rosalina & Luma',
  'Roy',
  'Ryu',
  'Samus',
  'Sephiroth',
  'Sheik',
  'Shulk',
  'Simon',
  'Snake',
  'Sonic',
  'Sora',
  'Steve',
  'Terry',
  'Toon Link',
  'Villager',
  'Wario',
  'Wii Fit Trainer',
  'Wolf',
  'Yoshi',
  'Young Link',
  'Zelda',
  'Zero Suit Samus',
] as const;

export function getSmashScorePresets(
  bestOf: number,
  homeTeamId: string,
  awayTeamId: string,
): SmashScorePreset[] {
  if (bestOf !== 3 && bestOf !== 5) return [];

  const winsRequired = Math.floor(bestOf / 2) + 1;
  const homeWins = Array.from({ length: winsRequired }, (_, awayScore) => ({
    homeTeamId,
    awayTeamId,
    homeScore: winsRequired,
    awayScore,
    winnerTeamId: homeTeamId,
    label: `${winsRequired}–${awayScore}`,
  }));
  const awayWins = Array.from({ length: winsRequired }, (_, homeScore) => ({
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore: winsRequired,
    winnerTeamId: awayTeamId,
    label: `${homeScore}–${winsRequired}`,
  }));

  return [...homeWins, ...awayWins];
}

function createWinnerSequence(preset: SmashScorePreset): string[] {
  const isHomeWinner = preset.homeScore > preset.awayScore;
  const winnerTeamId = preset.winnerTeamId;
  const loserTeamId = isHomeWinner ? preset.awayTeamId : preset.homeTeamId;
  const losingScore = Math.min(preset.homeScore, preset.awayScore);
  const winningScore = Math.max(preset.homeScore, preset.awayScore);
  const sequence: string[] = [];

  for (let index = 0; index < losingScore; index += 1) {
    sequence.push(winnerTeamId, loserTeamId);
  }
  while (sequence.filter((teamId) => teamId === winnerTeamId).length < winningScore) {
    sequence.push(winnerTeamId);
  }
  return sequence;
}

export function createSmashGames(preset: SmashScorePreset): SmashGameDraft[] {
  const sequence = createWinnerSequence(preset);

  return sequence.map((winnerTeamId, index) => ({
    number: index + 1,
    stage: '',
    homeCharacter: '',
    awayCharacter: '',
    winnerTeamId,
    homeStocks: winnerTeamId === preset.homeTeamId ? 1 : 0,
    awayStocks: winnerTeamId === preset.awayTeamId ? 1 : 0,
  }));
}

export function updateSmashGameWinner(
  game: SmashGameDraft,
  winnerTeamId: string,
  homeTeamId: string,
): SmashGameDraft {
  const isHomeWinner = winnerTeamId === homeTeamId;

  return {
    ...game,
    winnerTeamId,
    homeStocks: isHomeWinner ? Math.max(1, game.homeStocks) : 0,
    awayStocks: isHomeWinner ? 0 : Math.max(1, game.awayStocks),
  };
}

export function validateSmashReport(input: SmashReportDraft): SmashReportValidation {
  const errors: Record<string, string> = {};
  const games = input.games.map((game) => ({
    ...game,
    stage: game.stage.trim(),
    homeCharacter: game.homeCharacter.trim(),
    awayCharacter: game.awayCharacter.trim(),
  }));
  const allowedStages = new Set(input.allowedStages);

  for (const game of games) {
    const prefix = `${input.fieldIdPrefix ?? 'smash'}-game-${game.number}`;
    if (!game.stage) errors[`${prefix}-stage`] = `Elegí el escenario del game ${game.number}.`;
    else if (!allowedStages.has(game.stage)) {
      errors[`${prefix}-stage`] = 'Ese escenario no pertenece al ruleset.';
    }
    if (!game.homeCharacter) {
      errors[`${prefix}-home-character`] = 'Elegí el personaje del jugador local.';
    }
    if (!game.awayCharacter) {
      errors[`${prefix}-away-character`] = 'Elegí el personaje del jugador visitante.';
    }

    const isHomeWinner = game.winnerTeamId === input.preset.homeTeamId;
    const isAwayWinner = game.winnerTeamId === input.preset.awayTeamId;
    const winnerStocks = isHomeWinner ? game.homeStocks : game.awayStocks;
    const loserStocks = isHomeWinner ? game.awayStocks : game.homeStocks;
    const hasOneSurvivor = game.homeStocks > 0 !== game.awayStocks > 0;
    if ((isHomeWinner || isAwayWinner) && (winnerStocks === 0 || loserStocks > 0)) {
      errors[`${prefix}-stocks`] = 'Los stocks restantes deben pertenecer al ganador del game.';
    } else if (!hasOneSurvivor || winnerStocks < 1 || winnerStocks > input.stockLimit) {
      errors[`${prefix}-stocks`] =
        `Los stocks del ganador deben estar entre 1 y ${input.stockLimit}.`;
    }
  }

  const homeWins = games.filter((game) => game.winnerTeamId === input.preset.homeTeamId).length;
  const awayWins = games.filter((game) => game.winnerTeamId === input.preset.awayTeamId).length;
  const hasUnknownWinner = games.some(
    (game) =>
      game.winnerTeamId !== input.preset.homeTeamId &&
      game.winnerTeamId !== input.preset.awayTeamId,
  );
  if (
    hasUnknownWinner ||
    homeWins !== input.preset.homeScore ||
    awayWins !== input.preset.awayScore
  ) {
    errors.score = 'Los ganadores por game no coinciden con el marcador elegido.';
  }

  return {
    errors,
    firstInvalidFieldId: Object.keys(errors)[0] ?? null,
    games,
  };
}

export function buildSmashReportPayload(input: SmashReportDraft): SmashReportPayload {
  const validation = validateSmashReport(input);
  if (validation.firstInvalidFieldId) throw new Error('El reporte de Smash está incompleto.');

  return {
    winnerTeamId: input.preset.winnerTeamId,
    homeScore: input.preset.homeScore,
    awayScore: input.preset.awayScore,
    games: validation.games,
  };
}
