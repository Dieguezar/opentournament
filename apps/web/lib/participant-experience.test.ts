import { describe, expect, it } from 'vitest';
import {
  getHeaderPresentation,
  getHomePresentation,
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

  it('offers a useful next step on the home page for organizers and participants', () => {
    expect(
      getHomePresentation({
        user: { displayName: 'Admin Demo' },
        participantAccess: null,
      }),
    ).toEqual({
      eyebrow: 'Tu espacio',
      title: 'Hola, Admin Demo',
      description:
        'Retomá la organización desde el panel o creá un torneo con las plantillas de Smash Ultimate y League of Legends.',
      primaryAction: { href: '/dashboard', label: 'Abrir panel' },
      secondaryAction: { href: '/tournaments/new', label: 'Crear torneo' },
    });

    expect(
      getHomePresentation({
        user: { displayName: 'Aurora Gaming · participante' },
        participantAccess: {
          tournamentSlug: 'copa-nexo-demo',
          teamName: 'Aurora Gaming',
        },
      }),
    ).toEqual({
      eyebrow: 'Tu competencia',
      title: 'Aurora Gaming',
      description:
        'Volvé al torneo para seguir el bracket, revisar tus partidas y reportar resultados.',
      primaryAction: { href: '/t/copa-nexo-demo', label: 'Ver mi torneo' },
      secondaryAction: { href: '/t/copa-nexo-demo#reportar', label: 'Reportar resultado' },
    });
  });

  it('localizes organizer and participant navigation without changing route scope', () => {
    expect(
      getHeaderPresentation(
        {
          user: { displayName: 'Organizer' },
          participantAccess: null,
        },
        'en',
      ),
    ).toEqual({
      workspaceLabel: 'Personal workspace',
      accountLabel: 'Organizer',
      links: [
        { href: '/dashboard', label: 'Tournaments' },
        { href: '/tournaments/new', label: 'New tournament' },
        { href: '/teams/new', label: 'New participant' },
      ],
    });

    expect(
      getHomePresentation(
        {
          user: { displayName: 'Player' },
          participantAccess: {
            tournamentSlug: 'open-cup',
            teamName: 'Northern Lights',
          },
        },
        'en',
      ),
    ).toEqual({
      eyebrow: 'Your competition',
      title: 'Northern Lights',
      description:
        'Return to the tournament to follow the bracket, review your matches, and report results.',
      primaryAction: { href: '/t/open-cup', label: 'View my tournament' },
      secondaryAction: { href: '/t/open-cup#reportar', label: 'Report result' },
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
      getReportPanelState(
        {
          loadState: 'ready',
          staffMode: false,
          reportingMode: 'bilateral',
          teamCount: 1,
          reportableMatchCount: 0,
        },
        'en',
      ),
    ).toEqual({ kind: 'empty', title: 'You have no pending matches' });

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
    expect(
      getReportOutcomeMessage(
        { confirmed: false, conflict: true },
        { staffMode: false, reportingMode: 'bilateral' },
        'en',
      ),
    ).toBe('The reports do not match. A dispute was opened for staff review.');
  });
});
