import { describe, expect, it, vi } from 'vitest';
import { fetchApiResource } from './server-api-core';
import {
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
  getTournamentStatus,
  shouldShowRegistrationDecisionActions,
} from './presentation';

describe('presentación del producto', () => {
  it('convierte estados internos en etiquetas comprensibles', () => {
    expect(formatGameAdapter('valorant')).toBe('Valorant');
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
