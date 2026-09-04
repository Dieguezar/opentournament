export interface OverlayAppearance {
  logoMediaId: string | null;
  bannerMediaId: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
}

export interface OverlayTournament {
  id: string;
  slug: string;
  name: string;
  visibility: string;
  publishedAt: Date | null;
  deletedAt: Date | null;
  status: string;
  appearance: OverlayAppearance | null;
}

export interface OverlayParticipant {
  id: string;
  label: string;
  status: string;
}

export interface OverlayMatch {
  id: string;
  status: string;
  scheduledAt: Date | null;
  stagePosition: number;
  bracketType: string;
  roundNumber: number;
  position: number;
  homeParticipantId: string | null;
  awayParticipantId: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface TournamentPresentationInput {
  tournament: OverlayTournament;
  participants: readonly OverlayParticipant[];
  matches: readonly OverlayMatch[];
}

interface PublicParticipant {
  id: string;
  label: string;
}

interface PublicMatch {
  id: string;
  status: string;
  scheduledAt: string | null;
  stagePosition: number;
  bracketType: string;
  roundNumber: number;
  position: number;
  home: PublicParticipant;
  away: PublicParticipant;
  homeScore: number | null;
  awayScore: number | null;
}

export interface TournamentPresentation {
  tournament: {
    id: string;
    slug: string;
    name: string;
    appearance: OverlayAppearance | null;
  };
  scoreboard: PublicMatch | null;
  upNext: PublicMatch | null;
  champion: PublicParticipant | null;
}

const bracketRanks: Record<string, number> = {
  winners: 0,
  losers: 1,
  final: 2,
};

export function buildTournamentPresentation(
  input: TournamentPresentationInput,
): TournamentPresentation | null {
  const { tournament } = input;
  if (tournament.visibility !== 'public' || !tournament.publishedAt || tournament.deletedAt) {
    return null;
  }

  const participantsById = new Map(
    input.participants.map((participant) => [participant.id, publicParticipant(participant)]),
  );
  const readyMatches = input.matches
    .filter((match) => match.status === 'scheduled')
    .sort(compareMatches)
    .map((match) => toPublicMatch(match, participantsById))
    .filter((match): match is PublicMatch => match !== null);
  const activeMatches = input.matches
    .filter((match) => match.status === 'in_progress')
    .sort(compareMatches)
    .map((match) => toPublicMatch(match, participantsById))
    .filter((match): match is PublicMatch => match !== null);
  const completedMatches = input.matches
    .filter((match) => match.status === 'finalized')
    .sort(compareMatches)
    .map((match) => toPublicMatch(match, participantsById))
    .filter((match): match is PublicMatch => match !== null);
  const scoreboard = activeMatches[0] ?? readyMatches[0] ?? completedMatches[0] ?? null;
  const upNext = readyMatches.find((match) => match.id !== scoreboard?.id) ?? null;
  const champion =
    tournament.status === 'finalized'
      ? (input.participants
          .filter((participant) => participant.status === 'winner')
          .sort((left, right) => left.id.localeCompare(right.id))
          .map(publicParticipant)[0] ?? null)
      : null;

  return {
    tournament: {
      id: tournament.id,
      slug: tournament.slug,
      name: tournament.name,
      appearance: tournament.appearance,
    },
    scoreboard,
    upNext,
    champion,
  };
}

function publicParticipant(participant: OverlayParticipant): PublicParticipant {
  return { id: participant.id, label: participant.label.trim() || 'TBD' };
}

function toPublicMatch(
  match: OverlayMatch,
  participantsById: ReadonlyMap<string, PublicParticipant>,
): PublicMatch | null {
  const home = match.homeParticipantId ? participantsById.get(match.homeParticipantId) : undefined;
  const away = match.awayParticipantId ? participantsById.get(match.awayParticipantId) : undefined;
  if (!home || !away) return null;

  return {
    id: match.id,
    status: match.status,
    scheduledAt: match.scheduledAt?.toISOString() ?? null,
    stagePosition: match.stagePosition,
    bracketType: match.bracketType,
    roundNumber: match.roundNumber,
    position: match.position,
    home,
    away,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  };
}

function compareMatches(left: OverlayMatch, right: OverlayMatch): number {
  return (
    compareScheduledAt(left.scheduledAt, right.scheduledAt) ||
    left.stagePosition - right.stagePosition ||
    bracketRank(left.bracketType) - bracketRank(right.bracketType) ||
    left.roundNumber - right.roundNumber ||
    left.position - right.position ||
    left.id.localeCompare(right.id)
  );
}

function compareScheduledAt(left: Date | null, right: Date | null): number {
  if (left && right) return left.getTime() - right.getTime();
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function bracketRank(type: string): number {
  return bracketRanks[type] ?? Number.MAX_SAFE_INTEGER;
}
