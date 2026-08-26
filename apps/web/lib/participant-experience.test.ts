import { describe, expect, it } from 'vitest';
import {
  getHeaderPresentation,
  getReportOutcomeMessage,
  getReportPanelState,
} from './participant-experience';

describe('participant experience', () => {
  it('limits participant navigation to the scoped public tournament', () => {
    expect(
      getHeaderPresentation({
        user: { displayName: 'Aurora Gaming · participante' },
        participantAccess: {
          tournamentSlug: 'copa-nexo-demo',
          teamName: 'Aurora Gaming',
        },
      }),
    ).toEqual({
      workspaceLabel: 'Participante',
      accountLabel: 'Aurora Gaming',
      links: [{ href: '/t/copa-nexo-demo', label: 'Mi torneo' }],
    });
  });

  it('preserves the organizer workspace navigation', () => {
    expect(
      getHeaderPresentation({
        user: { displayName: 'Organizador' },
        participantAccess: null,
      }),
    ).toEqual({
      workspaceLabel: 'Workspace personal',
      accountLabel: 'Organizador',
      links: [
        { href: '/dashboard', label: 'Torneos' },
        { href: '/tournaments/new', label: 'Nuevo torneo' },
        { href: '/teams/new', label: 'Nuevo participante' },
      ],
    });
  });

  it('shows a useful empty state only for an authenticated participant', () => {
    expect(
      getReportPanelState({
        loadState: 'ready',
        staffMode: false,
        reportingMode: 'bilateral',
        teamCount: 1,
        reportableMatchCount: 0,
      }),
    ).toEqual({ kind: 'empty', title: 'No tenés partidas pendientes' });

    expect(
      getReportPanelState({
        loadState: 'anonymous',
        staffMode: false,
        reportingMode: 'bilateral',
        teamCount: 0,
        reportableMatchCount: 0,
      }),
    ).toEqual({ kind: 'hidden' });

    expect(
      getReportPanelState({
        loadState: 'ready',
        staffMode: true,
        reportingMode: 'bilateral',
        teamCount: 0,
        reportableMatchCount: 0,
      }),
    ).toEqual({ kind: 'hidden' });
  });

  it('keeps reportable matches visible and hides participant reporting in staff-only mode', () => {
    expect(
      getReportPanelState({
        loadState: 'ready',
        staffMode: false,
        reportingMode: 'bilateral',
        teamCount: 1,
        reportableMatchCount: 1,
      }),
    ).toEqual({ kind: 'matches' });

    expect(
      getReportPanelState({
        loadState: 'ready',
        staffMode: false,
        reportingMode: 'staff_only',
        teamCount: 1,
        reportableMatchCount: 1,
      }),
    ).toEqual({ kind: 'hidden' });
  });

  it('describes pending, confirmed and conflicting bilateral outcomes accurately', () => {
    expect(
      getReportOutcomeMessage(
        { confirmed: false, waiting: true },
        { staffMode: false, reportingMode: 'bilateral' },
      ),
    ).toBe('Reporte enviado. Esperando la confirmación del rival…');
    expect(
      getReportOutcomeMessage(
        { confirmed: true },
        { staffMode: false, reportingMode: 'bilateral' },
      ),
    ).toBe('Resultado confirmado y bracket actualizado.');
    expect(
      getReportOutcomeMessage(
        { confirmed: false, conflict: true },
        { staffMode: false, reportingMode: 'bilateral' },
      ),
    ).toBe('Los reportes no coinciden. Se abrió una disputa para que la revise el staff.');
  });
});
