import { describe, expect, it } from 'vitest';
import {
  leagueOfLegendsStandardTemplate,
  smashUltimateStandardTemplate,
} from '@opentournament/game-adapters';
import {
  applyGameTemplateSelection,
  getSeriesBestOfOptions,
  parseStageList,
  restoreGameTemplateDefaults,
  validateSmashUltimateRules,
  validateLeagueOfLegendsRules,
  type TournamentTemplateFormState,
} from './tournament-template';

const editedForm: TournamentTemplateFormState = {
  gameAdapterKey: 'generic',
  format: 'single_elimination',
  capacity: '64',
  bo: '5',
  grandFinalReset: false,
  templateKey: null,
  templateVersion: null,
  gameRules: null,
};

describe('explicit game template selection', () => {
  it('normalizes editable stage lists', () => {
    expect(parseStageList(' Battlefield\n\nFinal Destination \n')).toEqual([
      'Battlefield',
      'Final Destination',
    ]);
  });

  it('applies editable Smash Ultimate defaults when selecting the game', () => {
    const result = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );

    expect(result).toMatchObject({
      gameAdapterKey: 'smash_ultimate',
      format: 'double_elimination',
      capacity: '32',
      bo: '3',
      grandFinalReset: true,
      templateKey: 'smash_ultimate.standard_v1',
      templateVersion: 1,
      gameRules: {
        game: 'smash_ultimate',
        stocks: 3,
        timeLimitMinutes: 7,
        stageBans: 3,
        stageClause: 'none',
      },
    });
  });

  it('sanitizes BO1 to BO3 when switching from generic to Smash Ultimate', () => {
    const result = applyGameTemplateSelection(
      'smash_ultimate',
      { ...editedForm, bo: '1' },
      smashUltimateStandardTemplate,
    );

    expect(result.bo).toBe('3');
  });

  it('applies and clones editable League of Legends defaults', () => {
    const result = applyGameTemplateSelection('lol', editedForm, leagueOfLegendsStandardTemplate);

    expect(result).toMatchObject({
      gameAdapterKey: 'lol',
      format: 'single_elimination',
      capacity: '16',
      bo: '3',
      grandFinalReset: false,
      templateKey: 'lol.standard_v1',
      templateVersion: 1,
      gameRules: {
        game: 'lol',
        map: 'summoners_rift',
        region: 'lan',
        draftMode: 'tournament_draft',
        fearlessDraft: false,
        patchPolicy: 'live',
        patchVersion: null,
        sideSelection: 'higher_seed_game_1_then_loser',
      },
    });
  });

  it('offers only BO3 and BO5 for Smash and keeps BO1 for other games', () => {
    expect(getSeriesBestOfOptions('smash_ultimate')).toEqual(['3', '5']);
    expect(getSeriesBestOfOptions('generic')).toEqual(['1', '3', '5']);
  });

  it('preserves general settings and clears the template when choosing another game', () => {
    const smashForm = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );
    const result = applyGameTemplateSelection('valorant', {
      ...smashForm,
      capacity: '48',
      bo: '5',
    });

    expect(result).toEqual({
      ...smashForm,
      gameAdapterKey: 'valorant',
      capacity: '48',
      bo: '5',
      templateKey: null,
      templateVersion: null,
      gameRules: null,
    });
  });

  it('clones stage lists so form edits do not mutate the registry', () => {
    const first = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );
    if (first.gameRules?.game !== 'smash_ultimate') {
      throw new Error('La plantilla de Smash debe incluir reglas');
    }
    first.gameRules.starters.splice(0, 1);

    const second = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );

    expect(second.gameRules?.game).toBe('smash_ultimate');
    if (second.gameRules?.game === 'smash_ultimate') {
      expect(second.gameRules.starters).toContain('Battlefield');
    }
  });

  it('restores all competitive defaults without replacing the rest of the state', () => {
    const customized = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );
    if (customized.gameRules?.game !== 'smash_ultimate') {
      throw new Error('La plantilla de Smash debe incluir reglas');
    }
    const result = restoreGameTemplateDefaults(
      {
        ...customized,
        format: 'single_elimination',
        capacity: '128',
        bo: '5',
        grandFinalReset: false,
        gameRules: {
          ...customized.gameRules,
          stocks: 4,
          itemsEnabled: true,
          starters: ['Mi escenario'],
        },
      },
      smashUltimateStandardTemplate,
    );

    expect(result).toMatchObject({
      gameAdapterKey: 'smash_ultimate',
      format: 'double_elimination',
      capacity: '32',
      bo: '3',
      grandFinalReset: true,
      templateKey: 'smash_ultimate.standard_v1',
      templateVersion: 1,
      gameRules: {
        stocks: 3,
        itemsEnabled: false,
      },
    });
    if (result.gameRules?.game === 'smash_ultimate') {
      expect(result.gameRules.starters).toContain('Battlefield');
    }
  });
});

describe('local League of Legends rule validation', () => {
  function getRules() {
    const result = applyGameTemplateSelection('lol', editedForm, leagueOfLegendsStandardTemplate);
    if (result.gameRules?.game !== 'lol')
      throw new Error('La plantilla de LoL debe incluir reglas');
    return result.gameRules;
  }

  it('accepts a live patch without a version and normalizes a fixed version', () => {
    expect(validateLeagueOfLegendsRules(getRules())).toMatchObject({
      errors: {},
      firstInvalidField: null,
      rules: { patchPolicy: 'live', patchVersion: null },
    });
    expect(
      validateLeagueOfLegendsRules({
        ...getRules(),
        patchPolicy: 'fixed',
        patchVersion: ' 26.16 ',
      }),
    ).toMatchObject({
      errors: {},
      firstInvalidField: null,
      rules: { patchPolicy: 'fixed', patchVersion: '26.16' },
    });
  });

  it('identifies invalid patch and operational limits', () => {
    const result = validateLeagueOfLegendsRules({
      ...getRules(),
      patchPolicy: 'fixed',
      patchVersion: '',
      pauseBudgetMinutes: 121,
      spectatorDelayMinutes: -1,
    });

    expect(result.errors.patchVersion).toBe('Indicá una versión de parche, por ejemplo 26.16.');
    expect(result.errors.pauseBudgetMinutes).toBe(
      'La pausa total debe estar entre 0 y 120 minutos.',
    );
    expect(result.errors.spectatorDelayMinutes).toBe('El retraso debe estar entre 0 y 30 minutos.');
    expect(result.firstInvalidField).toBe('patchVersion');
  });

  it('returns validation errors in English when requested', () => {
    const result = validateLeagueOfLegendsRules(
      {
        ...getRules(),
        patchPolicy: 'fixed',
        patchVersion: '',
        pauseBudgetMinutes: 121,
        spectatorDelayMinutes: -1,
      },
      'en',
    );

    expect(result.errors.patchVersion).toBe('Enter a patch version, for example 26.16.');
    expect(result.errors.pauseBudgetMinutes).toBe(
      'The total pause allowance must be between 0 and 120 minutes.',
    );
    expect(result.errors.spectatorDelayMinutes).toBe(
      'The spectator delay must be between 0 and 30 minutes.',
    );
  });
});

describe('local Smash Ultimate rule validation', () => {
  function getRules() {
    const result = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );

    if (result.gameRules?.game !== 'smash_ultimate') {
      throw new Error('La plantilla de Smash debe incluir reglas');
    }
    return result.gameRules;
  }

  it('normalizes valid lists before building the payload', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: [' Battlefield ', '', 'Final Destination'],
      counterpicks: [' Small Battlefield '],
      stageBans: 2,
    });

    expect(result.errors).toEqual({});
    expect(result.firstInvalidField).toBeNull();
    expect(result.rules.starters).toEqual(['Battlefield', 'Final Destination']);
    expect(result.rules.counterpicks).toEqual(['Small Battlefield']);
  });

  it('identifies duplicate starter stages regardless of case or Unicode form', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Battlefield', ' battlefield '],
      counterpicks: ['Small Battlefield'],
      stageBans: 1,
    });

    expect(result.errors.starters).toBe('Los escenarios iniciales no pueden repetirse.');
    expect(result.firstInvalidField).toBe('starters');
  });

  it('collapses internal whitespace when detecting duplicate stages', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Final Destination', 'Final\t  Destination'],
      counterpicks: ['Small Battlefield'],
      stageBans: 1,
    });

    expect(result.errors.starters).toBe('Los escenarios iniciales no pueden repetirse.');
    expect(result.firstInvalidField).toBe('starters');
  });

  it('identifies duplicate counterpick stages', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Battlefield'],
      counterpicks: ['Town and City', 'town and city'],
      stageBans: 1,
    });

    expect(result.errors.counterpicks).toBe('Los escenarios de counterpick no pueden repetirse.');
    expect(result.firstInvalidField).toBe('counterpicks');
  });

  it('identifies a stage present in both pools', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Battlefield'],
      counterpicks: ['BATTLEFIELD'],
      stageBans: 0,
    });

    expect(result.errors.counterpicks).toBe(
      'Un escenario no puede ser inicial y counterpick a la vez.',
    );
  });

  it('applies NFKC, whitespace, and case normalization when comparing pools', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Ｆｉｎａｌ   Ｄｅｓｔｉｎａｔｉｏｎ'],
      counterpicks: [' final destination '],
      stageBans: 0,
    });

    expect(result.errors.counterpicks).toBe(
      'Un escenario no puede ser inicial y counterpick a la vez.',
    );
    expect(result.firstInvalidField).toBe('counterpicks');
  });

  it('requires at least one stage in each pool', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: [],
      counterpicks: [],
    });

    expect(result.errors.starters).toBe('Agregá al menos un escenario inicial.');
    expect(result.errors.counterpicks).toBe('Agregá al menos un escenario counterpick.');
  });

  it('limits each pool to twenty stages', () => {
    const stages = Array.from({ length: 21 }, (_, index) => `Escenario ${index + 1}`);
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: stages,
      counterpicks: ['Small Battlefield'],
    });

    expect(result.errors.starters).toBe('Usá como máximo 20 escenarios iniciales.');
  });

  it('requires stage bans to leave at least one stage available', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Battlefield'],
      counterpicks: ['Small Battlefield'],
      stageBans: 2,
    });

    expect(result.errors.stageBans).toBe('Los vetos deben dejar al menos un escenario disponible.');
    expect(result.firstInvalidField).toBe('stageBans');
  });

  it('validates the editable launch rate within the supported competitive range', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      launchRate: 2.5,
    });

    expect(result.errors.launchRate).toBe('El launch rate debe estar entre 0.5× y 2×.');
    expect(result.firstInvalidField).toBe('launchRate');
  });

  it('returns validation errors in English when requested', () => {
    const result = validateSmashUltimateRules(
      {
        ...getRules(),
        starters: [],
        counterpicks: [],
        launchRate: 2.5,
      },
      'en',
    );

    expect(result.errors.starters).toBe('Add at least one starter stage.');
    expect(result.errors.counterpicks).toBe('Add at least one counterpick stage.');
    expect(result.errors.launchRate).toBe('The launch rate must be between 0.5× and 2×.');
  });
});
