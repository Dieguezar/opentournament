import { describe, expect, it, vi } from 'vitest';
import { fetchApiResource } from './server-api-core';
import {
  buildRulesetSummary,
  canDeclareWalkover,
  canGenerateBracket,
  formatDisputeReason,
  formatDisputeStatus,
  formatBracketType,
  formatGameAdapter,
  formatMatchStatus,
  formatOrganizationRole,
  formatParticipantStatus,
  formatRegistrationStatus,
  getPublicRegistrationMessage,
  getTournamentStatus,
  shouldShowRegistrationDecisionActions,
} from './presentation';

describe('presentación del producto', () => {
  it('convierte estados internos en etiquetas comprensibles', () => {
    expect(formatGameAdapter('valorant')).toBe('Valorant');
    expect(formatGameAdapter('smash_ultimate')).toBe('Super Smash Bros. Ultimate');
    expect(getTournamentStatus('in_progress')).toEqual({
      label: 'En curso',
      className: 'badge badge-warn',
    });
    expect(formatMatchStatus('finalized')).toBe('Finalizada');
    expect(formatRegistrationStatus('approved')).toBe('Aprobada');
    expect(formatDisputeStatus('resolved')).toBe('Resuelta');
    expect(formatDisputeReason('result_conflict')).toBe('Resultados contradictorios');
    expect(formatBracketType('winners')).toBe('Ganadores');
    expect(formatOrganizationRole('owner')).toBe('Propietario');
    expect(formatParticipantStatus('active')).toBe('En competencia');
  });

  it('presenta las reglas competitivas esenciales de Smash Ultimate', () => {
    expect(
      buildRulesetSummary({
        gameAdapterKey: 'smash_ultimate',
        format: 'double_elimination',
        seriesBestOf: 3,
        grandFinalReset: true,
        gameRules: {
          game: 'smash_ultimate',
          stocks: 3,
          timeLimitMinutes: 7,
          itemsEnabled: false,
          finalSmashMeterEnabled: false,
          stageHazardsEnabled: false,
          launchRate: 1,
          starters: ['Battlefield', 'Final Destination'],
          counterpicks: ['Small Battlefield'],
          stageBans: 3,
          stageClause: 'modified_dsr',
        },
      }),
    ).toEqual({
      title: 'Reglas competitivas de Smash Ultimate',
      format: 'Singles 1v1 · Doble eliminación',
      set: 'BO3 · 3 stocks · 7 min',
      grandFinal: 'Gran final con reset',
      stagePolicy: '3 bans · DSR modificado',
      switches: 'Items, FS Meter y hazards desactivados',
      starters: ['Battlefield', 'Final Destination'],
      counterpicks: ['Small Battlefield'],
    });
  });

  it('no inventa un resumen especializado para otros juegos', () => {
    expect(
      buildRulesetSummary({
        gameAdapterKey: 'valorant',
        format: 'single_elimination',
        seriesBestOf: 3,
        grandFinalReset: false,
        gameRules: null,
      }),
    ).toBeNull();
  });

  it('descarta reglas de juego incompletas sin romper el render del servidor', () => {
    expect(
      buildRulesetSummary({
        gameAdapterKey: 'smash_ultimate',
        format: 'double_elimination',
        seriesBestOf: 3,
        grandFinalReset: true,
        gameRules: { game: 'smash_ultimate', stocks: 3 } as never,
      }),
    ).toBeNull();
    expect(
      buildRulesetSummary({
        gameAdapterKey: 'smash_ultimate',
        format: 'double_elimination',
        seriesBestOf: 3,
        grandFinalReset: true,
        gameRules: {
          game: 'smash_ultimate',
          stocks: 3,
          timeLimitMinutes: 7,
          itemsEnabled: false,
          finalSmashMeterEnabled: false,
          stageHazardsEnabled: false,
          launchRate: 1,
          starters: null,
          counterpicks: [],
          stageBans: 3,
          stageClause: 'modified_dsr',
        } as never,
      }),
    ).toBeNull();
  });

  it('explica la disponibilidad pública según el estado del torneo', () => {
    expect(getPublicRegistrationMessage('draft', true)).toBe(
      'Las inscripciones todavía no abrieron.',
    );
    expect(getPublicRegistrationMessage('in_progress', true)).toBe(
      'El torneo ya está en curso. Las inscripciones y el check-in cerraron; seguí los sets en el bracket.',
    );
    expect(getPublicRegistrationMessage('finalized', false)).toBe(
      'El torneo finalizó. Consultá las partidas y los resultados publicados en el bracket.',
    );
    expect(getPublicRegistrationMessage('cancelled', true)).toBe(
      'El torneo fue cancelado y no admite nuevas inscripciones.',
    );
    expect(getPublicRegistrationMessage('open', true)).toBeNull();
    expect(getPublicRegistrationMessage('checkin_open', true)).toBeNull();
  });

  it('conserva un fallback legible para valores futuros', () => {
    expect(formatGameAdapter('nuevo-juego')).toBe('Nuevo juego');
    expect(formatMatchStatus('awaiting_review')).toBe('Awaiting review');
  });

  it('solo muestra acciones de decisión para inscripciones pendientes', () => {
    expect(shouldShowRegistrationDecisionActions('pending')).toBe(true);
    expect(shouldShowRegistrationDecisionActions('waitlisted')).toBe(true);
    expect(shouldShowRegistrationDecisionActions('approved')).toBe(false);
    expect(shouldShowRegistrationDecisionActions('rejected')).toBe(false);
  });

  it('oculta acciones que el estado del torneo o la partida ya no permite', () => {
    expect(canGenerateBracket('open')).toBe(true);
    expect(canGenerateBracket('in_progress')).toBe(false);
    expect(canDeclareWalkover('scheduled')).toBe(true);
    expect(canDeclareWalkover('in_progress')).toBe(true);
    expect(canDeclareWalkover('finalized')).toBe(false);
  });
});

describe('acceso seguro a la API', () => {
  it('devuelve 503 cuando la API no está disponible', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('connection refused'));

    await expect(
      fetchApiResource<{ user: null }>('http://localhost:4000', '/auth/me', '', fetcher),
    ).resolves.toEqual({ status: 503, data: {} });
  });

  it('preserva el estado y contenido de una respuesta válida', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { displayName: 'Admin Demo' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      fetchApiResource<{ user: { displayName: string } }>(
        'http://localhost:4000',
        '/auth/me',
        'session=demo',
        fetcher,
      ),
    ).resolves.toEqual({ status: 200, data: { user: { displayName: 'Admin Demo' } } });
  });
});
