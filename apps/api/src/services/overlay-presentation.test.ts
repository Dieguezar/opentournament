import { describe, expect, it } from 'vitest';
import { buildTournamentPresentation, type OverlayMatch } from './overlay-presentation.js';

const publicTournament = {
  id: 'tournament-1',
  slug: 'open-cup',
  name: 'Open Cup',
  visibility: 'public',
  publishedAt: new Date('2026-09-01T00:00:00.000Z'),
  deletedAt: null,
  status: 'in_progress',
  appearance: {
    logoMediaId: 'logo-1',
    bannerMediaId: null,
    primaryColor: '#112233',
    secondaryColor: null,
    accentColor: '#445566',
  },
};

const participants = [
  { id: 'participant-a', label: 'Alpha', status: 'active' },
  { id: 'participant-b', label: 'Bravo', status: 'active' },
  { id: 'participant-c', label: 'Charlie', status: 'active' },
  { id: 'participant-d', label: 'Delta', status: 'winner' },
];

function match(overrides: Partial<OverlayMatch> = {}): OverlayMatch {
  return {
    id: 'match-1',
    status: 'scheduled',
    scheduledAt: new Date('2026-09-02T10:00:00.000Z'),
    stagePosition: 0,
    bracketType: 'winners',
    roundNumber: 1,
    position: 1,
    homeParticipantId: 'participant-a',
    awayParticipantId: 'participant-b',
    homeScore: null,
    awayScore: null,
    ...overrides,
  };
}

describe('overlay presentation', () => {
  it('returns no presentation for a tournament that is not publicly published', () => {
    expect(
      buildTournamentPresentation({
        tournament: { ...publicTournament, visibility: 'unlisted' },
        participants,
        matches: [],
      }),
    ).toBeNull();

    expect(
      buildTournamentPresentation({
        tournament: { ...publicTournament, publishedAt: null },
        participants,
        matches: [],
      }),
    ).toBeNull();
  });

  it('projects public labels and appearance without inferring an unavailable participant', () => {
    const presentation = buildTournamentPresentation({
      tournament: publicTournament,
      participants,
      matches: [match({ homeParticipantId: null })],
    });

    expect(presentation).toMatchObject({
      tournament: {
        id: 'tournament-1',
        slug: 'open-cup',
        name: 'Open Cup',
        appearance: publicTournament.appearance,
      },
      scoreboard: null,
      upNext: null,
      champion: null,
    });
  });

  it('falls back to TBD for blank participant labels', () => {
    const presentation = buildTournamentPresentation({
      tournament: publicTournament,
      participants: [
        { id: 'participant-a', label: '   ', status: 'active' },
        { id: 'participant-b', label: '', status: 'active' },
      ],
      matches: [match()],
    });

    expect(presentation?.scoreboard?.home).toEqual({ id: 'participant-a', label: 'TBD' });
    expect(presentation?.scoreboard?.away).toEqual({ id: 'participant-b', label: 'TBD' });
  });
  it('uses an active match for the scoreboard and the next ready match for Up Next', () => {
    const presentation = buildTournamentPresentation({
      tournament: publicTournament,
      participants,
      matches: [
        match({ id: 'ready-match', status: 'scheduled' }),
        match({ id: 'live-match', status: 'in_progress', position: 9, homeScore: 1, awayScore: 0 }),
      ],
    });

    expect(presentation?.scoreboard).toMatchObject({
      id: 'live-match',
      home: { id: 'participant-a', label: 'Alpha' },
      away: { id: 'participant-b', label: 'Bravo' },
      homeScore: 1,
      awayScore: 0,
    });
    expect(presentation?.upNext).toMatchObject({ id: 'ready-match' });
  });

  it('orders scheduled matches by time before unscheduled matches', () => {
    const presentation = buildTournamentPresentation({
      tournament: publicTournament,
      participants,
      matches: [
        match({ id: 'unscheduled', scheduledAt: null }),
        match({ id: 'later', scheduledAt: new Date('2026-09-02T11:00:00.000Z') }),
        match({ id: 'earlier', scheduledAt: new Date('2026-09-02T09:00:00.000Z') }),
      ],
    });

    expect(presentation?.scoreboard?.id).toBe('earlier');
    expect(presentation?.upNext?.id).toBe('later');
  });

  it('orders matching schedules by bracket rank', () => {
    const presentation = buildTournamentPresentation({
      tournament: publicTournament,
      participants,
      matches: [
        match({ id: 'final', bracketType: 'final' }),
        match({ id: 'losers', bracketType: 'losers' }),
        match({ id: 'winners', bracketType: 'winners' }),
      ],
    });

    expect(presentation?.scoreboard?.id).toBe('winners');
    expect(presentation?.upNext?.id).toBe('losers');
  });

  it('orders matching brackets by round number', () => {
    const presentation = buildTournamentPresentation({
      tournament: publicTournament,
      participants,
      matches: [
        match({ id: 'later-round', roundNumber: 2 }),
        match({ id: 'earlier-round', roundNumber: 1 }),
      ],
    });

    expect(presentation?.scoreboard?.id).toBe('earlier-round');
    expect(presentation?.upNext?.id).toBe('later-round');
  });
  it('uses persisted order and identifiers to resolve ready-match ties deterministically', () => {
    const presentation = buildTournamentPresentation({
      tournament: publicTournament,
      participants,
      matches: [
        match({ id: 'later-position', position: 2 }),
        match({ id: 'stable-b', position: 1 }),
        match({ id: 'stable-a', position: 1 }),
      ],
    });

    expect(presentation?.scoreboard?.id).toBe('stable-a');
    expect(presentation?.upNext?.id).toBe('stable-b');
  });

  it('returns the persisted champion only once the tournament is finalized', () => {
    expect(
      buildTournamentPresentation({
        tournament: publicTournament,
        participants,
        matches: [],
      })?.champion,
    ).toBeNull();

    expect(
      buildTournamentPresentation({
        tournament: { ...publicTournament, status: 'finalized' },
        participants,
        matches: [],
      })?.champion,
    ).toEqual({ id: 'participant-d', label: 'Delta' });
  });
});
