import { describe, expect, it } from 'vitest';
import { authorizeResultReport } from './result-reporting-policy.js';

const tournamentId = '00000000-0000-4000-8000-000000000300';
const homeTeamId = '11111111-1111-4111-8111-111111111111';
const awayTeamId = '22222222-2222-4222-8222-222222222222';

const baseRequest = {
  reportingMode: 'bilateral' as const,
  isTournamentAdmin: false,
  tournamentId,
  participantAccess: null,
  captainTeamIds: [homeTeamId],
  eligibleTeamIds: [homeTeamId, awayTeamId] as [string, string],
  winnerTeamId: homeTeamId,
};

describe('política de reporte de resultados', () => {
  it('mantiene la confirmación bilateral por defecto', () => {
    expect(authorizeResultReport(baseRequest)).toEqual({
      ok: true,
      reporterTeamId: homeTeamId,
      strategy: 'bilateral',
    });
  });

  it('autoriza a administración como fuente definitiva en cualquier modo', () => {
    expect(
      authorizeResultReport({
        ...baseRequest,
        reportingMode: 'staff_only',
        isTournamentAdmin: true,
        captainTeamIds: [],
      }),
    ).toEqual({ ok: true, reporterTeamId: null, strategy: 'authoritative' });
  });

  it('limita un pase al torneo y equipo exactos', () => {
    expect(
      authorizeResultReport({
        ...baseRequest,
        captainTeamIds: [],
        participantAccess: { tournamentId, teamId: awayTeamId },
      }),
    ).toEqual({
      ok: true,
      reporterTeamId: awayTeamId,
      strategy: 'bilateral',
    });

    expect(
      authorizeResultReport({
        ...baseRequest,
        captainTeamIds: [],
        participantAccess: { tournamentId: 'otro-torneo', teamId: awayTeamId },
      }),
    ).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  });

  it('sólo deja reportar al ganador en winner_reports', () => {
    expect(
      authorizeResultReport({
        ...baseRequest,
        reportingMode: 'winner_reports',
      }),
    ).toEqual({
      ok: true,
      reporterTeamId: homeTeamId,
      strategy: 'authoritative',
    });

    expect(
      authorizeResultReport({
        ...baseRequest,
        reportingMode: 'winner_reports',
        captainTeamIds: [awayTeamId],
      }),
    ).toMatchObject({ ok: false, code: 'WINNER_MUST_REPORT' });
  });

  it('reserva staff_only para administración y rechaza participantes ajenos al match', () => {
    expect(authorizeResultReport({ ...baseRequest, reportingMode: 'staff_only' })).toMatchObject({
      ok: false,
      code: 'STAFF_ONLY',
    });

    expect(
      authorizeResultReport({
        ...baseRequest,
        captainTeamIds: ['33333333-3333-4333-8333-333333333333'],
      }),
    ).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  });
});
