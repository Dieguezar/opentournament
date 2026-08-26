import { describe, expect, it } from 'vitest';
import {
  classifyTeamsForRegistration,
  getRegisterPanelLoadState,
  getRegistrationEntryPresentation,
} from './register-panel';

const teams = [
  {
    id: 'compatible',
    name: 'Smash Player',
    captainId: 'captain',
    gameAdapterKey: 'smash_ultimate' as const,
  },
  {
    id: 'compatible-member',
    name: 'Smash Member',
    captainId: 'another-user',
    gameAdapterKey: 'smash_ultimate' as const,
  },
  {
    id: 'generic-captain',
    name: 'Generic Captain',
    captainId: 'captain',
    gameAdapterKey: 'generic' as const,
  },
  {
    id: 'legacy-captain',
    name: 'Legacy Captain',
    captainId: 'captain',
    gameAdapterKey: null,
  },
  {
    id: 'legacy-member',
    name: 'Legacy Member',
    captainId: 'another-user',
    gameAdapterKey: null,
  },
  {
    id: 'other-game',
    name: 'Valorant Team',
    captainId: 'captain',
    gameAdapterKey: 'valorant' as const,
  },
];

describe('classifyTeamsForRegistration', () => {
  it('separates compatible profiles from legacy profiles configurable by their captain', () => {
    const result = classifyTeamsForRegistration(teams, 'smash_ultimate', 'captain');

    expect(result.compatibleTeams.map((team) => team.id)).toEqual(['compatible']);
    expect(result.readOnlyTeams.map((team) => team.id)).toEqual(['compatible-member']);
    expect(result.configurableTeams.map((team) => team.id)).toEqual([
      'generic-captain',
      'legacy-captain',
    ]);
    expect(result.hiddenTeamCount).toBe(2);
  });

  it('limits actions to the captain in generic tournaments too', () => {
    const result = classifyTeamsForRegistration(teams, 'generic', 'captain');

    expect(result.compatibleTeams.map((team) => team.id)).toEqual([
      'compatible',
      'generic-captain',
      'legacy-captain',
      'other-game',
    ]);
    expect(result.readOnlyTeams.map((team) => team.id)).toEqual([
      'compatible-member',
      'legacy-member',
    ]);
    expect(result.configurableTeams).toEqual([]);
    expect(result.hiddenTeamCount).toBe(0);
  });
});

describe('getRegistrationEntryPresentation', () => {
  it('localizes the entry state without changing available actions', () => {
    expect(getRegistrationEntryPresentation('open', null, 'en')).toEqual({
      statusLabel: 'Not registered',
      badgeClassName: 'badge',
      action: 'register',
    });
    expect(
      getRegistrationEntryPresentation(
        'checkin_open',
        { registrationStatus: 'approved', checkedIn: true },
        'en',
      ),
    ).toEqual({
      statusLabel: 'Check-in confirmed',
      badgeClassName: 'badge badge-success',
      action: null,
    });
  });

  it('offers registration only while the tournament is open', () => {
    expect(getRegistrationEntryPresentation('open', null)).toMatchObject({
      statusLabel: 'Sin inscripción',
      action: 'register',
    });
    expect(getRegistrationEntryPresentation('checkin_open', null)).toEqual({
      statusLabel: 'Inscripciones cerradas',
      badgeClassName: 'badge',
      action: null,
    });
  });

  it('offers check-in in open and checkin_open for approved registrations', () => {
    const approved = { registrationStatus: 'approved', checkedIn: false };

    expect(getRegistrationEntryPresentation('open', approved)).toEqual({
      statusLabel: 'Inscrito',
      badgeClassName: 'badge badge-success',
      action: 'checkin',
    });
    expect(getRegistrationEntryPresentation('checkin_open', approved)).toMatchObject({
      statusLabel: 'Inscrito',
      action: 'checkin',
    });
  });

  it('does not offer late check-in after the tournament starts', () => {
    expect(
      getRegistrationEntryPresentation('in_progress', {
        registrationStatus: 'approved',
        checkedIn: false,
      }),
    ).toEqual({
      statusLabel: 'Inscrito',
      badgeClassName: 'badge badge-success',
      action: null,
    });
  });

  it('removes the action after check-in is confirmed', () => {
    expect(
      getRegistrationEntryPresentation('checkin_open', {
        registrationStatus: 'approved',
        checkedIn: true,
      }),
    ).toEqual({
      statusLabel: 'Check-in confirmado',
      badgeClassName: 'badge badge-success',
      action: null,
    });
  });

  it('offers no actions for cancelled or unknown registration states', () => {
    expect(
      getRegistrationEntryPresentation('open', {
        registrationStatus: 'cancelled',
        checkedIn: false,
      }),
    ).toMatchObject({ action: null });
    expect(
      getRegistrationEntryPresentation('checkin_open', {
        registrationStatus: null,
        checkedIn: false,
      }),
    ).toMatchObject({ action: null });
  });
});

describe('getRegisterPanelLoadState', () => {
  it('prioritizes a load failure over the empty state', () => {
    expect(
      getRegisterPanelLoadState({
        isLoading: false,
        loadError: 'No pudimos cargar tus perfiles.',
        isAuthenticated: true,
      }),
    ).toBe('error');
  });

  it('keeps separate states for loading, anonymous sessions, and ready data', () => {
    expect(
      getRegisterPanelLoadState({
        isLoading: true,
        loadError: null,
        isAuthenticated: true,
      }),
    ).toBe('loading');
    expect(
      getRegisterPanelLoadState({
        isLoading: false,
        loadError: null,
        isAuthenticated: false,
      }),
    ).toBe('anonymous');
    expect(
      getRegisterPanelLoadState({
        isLoading: false,
        loadError: null,
        isAuthenticated: true,
      }),
    ).toBe('ready');
  });
});
