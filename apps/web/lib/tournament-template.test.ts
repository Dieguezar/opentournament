import { describe, expect, it } from 'vitest';
import { smashUltimateStandardTemplate } from '@opentournament/game-adapters';
import {
  applyGameTemplateSelection,
  getSeriesBestOfOptions,
  parseStageList,
  restoreGameTemplateDefaults,
  validateSmashUltimateRules,
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

describe('selección explícita de una plantilla de juego', () => {
  it('normaliza las listas editables de escenarios', () => {
    expect(parseStageList(' Battlefield\n\nFinal Destination \n')).toEqual([
      'Battlefield',
      'Final Destination',
    ]);
  });

  it('aplica los defaults editables de Smash Ultimate al seleccionar el juego', () => {
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

  it('sanea BO1 a BO3 al pasar de un torneo genérico a Smash Ultimate', () => {
    const result = applyGameTemplateSelection(
      'smash_ultimate',
      { ...editedForm, bo: '1' },
      smashUltimateStandardTemplate,
    );

    expect(result.bo).toBe('3');
  });

  it('ofrece sólo BO3 y BO5 para Smash y conserva BO1 en otros juegos', () => {
    expect(getSeriesBestOfOptions('smash_ultimate')).toEqual(['3', '5']);
    expect(getSeriesBestOfOptions('generic')).toEqual(['1', '3', '5']);
  });

  it('preserva la configuración general y limpia la plantilla al elegir otro juego', () => {
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

  it('clona las listas de escenarios para que editar el formulario no mute el registry', () => {
    const first = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );
    first.gameRules?.starters.splice(0, 1);

    const second = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );

    expect(second.gameRules?.starters).toContain('Battlefield');
  });

  it('restaura todos los defaults competitivos sin reemplazar el resto del estado', () => {
    const customized = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );
    const result = restoreGameTemplateDefaults(
      {
        ...customized,
        format: 'single_elimination',
        capacity: '128',
        bo: '5',
        grandFinalReset: false,
        gameRules: customized.gameRules
          ? {
              ...customized.gameRules,
              stocks: 4,
              itemsEnabled: true,
              starters: ['Mi escenario'],
            }
          : null,
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
    expect(result.gameRules?.starters).toContain('Battlefield');
  });
});

describe('validación local de reglas de Smash Ultimate', () => {
  function getRules() {
    const result = applyGameTemplateSelection(
      'smash_ultimate',
      editedForm,
      smashUltimateStandardTemplate,
    );

    if (!result.gameRules) throw new Error('La plantilla de Smash debe incluir reglas');
    return result.gameRules;
  }

  it('normaliza listas válidas antes de construir el payload', () => {
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

  it('señala escenarios iniciales repetidos sin distinguir mayúsculas o forma Unicode', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Battlefield', ' battlefield '],
      counterpicks: ['Small Battlefield'],
      stageBans: 1,
    });

    expect(result.errors.starters).toBe('Los escenarios iniciales no pueden repetirse.');
    expect(result.firstInvalidField).toBe('starters');
  });

  it('colapsa whitespace interno al detectar escenarios repetidos', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Final Destination', 'Final\t  Destination'],
      counterpicks: ['Small Battlefield'],
      stageBans: 1,
    });

    expect(result.errors.starters).toBe('Los escenarios iniciales no pueden repetirse.');
    expect(result.firstInvalidField).toBe('starters');
  });

  it('señala escenarios counterpick repetidos', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Battlefield'],
      counterpicks: ['Town and City', 'town and city'],
      stageBans: 1,
    });

    expect(result.errors.counterpicks).toBe(
      'Los escenarios de counterpick no pueden repetirse.',
    );
    expect(result.firstInvalidField).toBe('counterpicks');
  });

  it('señala un escenario presente en ambos pools', () => {
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

  it('aplica NFKC, whitespace y mayúsculas al comparar ambos pools', () => {
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

  it('exige al menos un escenario en cada pool', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: [],
      counterpicks: [],
    });

    expect(result.errors.starters).toBe('Agregá al menos un escenario inicial.');
    expect(result.errors.counterpicks).toBe('Agregá al menos un escenario counterpick.');
  });

  it('limita cada pool a veinte escenarios', () => {
    const stages = Array.from({ length: 21 }, (_, index) => `Escenario ${index + 1}`);
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: stages,
      counterpicks: ['Small Battlefield'],
    });

    expect(result.errors.starters).toBe('Usá como máximo 20 escenarios iniciales.');
  });

  it('exige que los vetos dejen al menos un escenario disponible', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      starters: ['Battlefield'],
      counterpicks: ['Small Battlefield'],
      stageBans: 2,
    });

    expect(result.errors.stageBans).toBe('Los vetos deben dejar al menos un escenario disponible.');
    expect(result.firstInvalidField).toBe('stageBans');
  });

  it('valida el launch rate editable dentro del rango competitivo admitido', () => {
    const result = validateSmashUltimateRules({
      ...getRules(),
      launchRate: 2.5,
    });

    expect(result.errors.launchRate).toBe('El launch rate debe estar entre 0.5× y 2×.');
    expect(result.firstInvalidField).toBe('launchRate');
  });
});
