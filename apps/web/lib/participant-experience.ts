interface ParticipantAccessSummary {
  tournamentSlug: string;
  teamName: string;
}

interface AuthSummary {
  user: { displayName: string };
  participantAccess: ParticipantAccessSummary | null;
}

interface HeaderLink {
  href: string;
  label: string;
}

interface HeaderPresentation {
  workspaceLabel: string;
  accountLabel: string;
  links: HeaderLink[];
}

export function getHeaderPresentation(auth: AuthSummary): HeaderPresentation {
  if (auth.participantAccess) {
    return {
      workspaceLabel: 'Participante',
      accountLabel: auth.participantAccess.teamName,
      links: [{ href: `/t/${auth.participantAccess.tournamentSlug}`, label: 'Mi torneo' }],
    };
  }

  return {
    workspaceLabel: 'Workspace personal',
    accountLabel: auth.user.displayName,
    links: [
      { href: '/dashboard', label: 'Torneos' },
      { href: '/tournaments/new', label: 'Nuevo torneo' },
      { href: '/teams/new', label: 'Nuevo participante' },
    ],
  };
}

interface ReportPanelStateInput {
  loadState: 'loading' | 'anonymous' | 'ready';
  staffMode: boolean;
  reportingMode: 'bilateral' | 'winner_reports' | 'staff_only';
  teamCount: number;
  reportableMatchCount: number;
}

export type ReportPanelState =
  | { kind: 'hidden' }
  | { kind: 'empty'; title: string }
  | { kind: 'matches' };

export function getReportPanelState(input: ReportPanelStateInput): ReportPanelState {
  if (
    input.loadState !== 'ready' ||
    (input.staffMode && input.reportableMatchCount === 0) ||
    (!input.staffMode && input.reportingMode === 'staff_only') ||
    (!input.staffMode && input.teamCount === 0)
  ) {
    return { kind: 'hidden' };
  }
  if (input.reportableMatchCount === 0) {
    return { kind: 'empty', title: 'No tenés partidas pendientes' };
  }
  return { kind: 'matches' };
}

interface ReportOutcome {
  confirmed: boolean;
  waiting?: boolean;
  conflict?: boolean;
}

interface ReportContext {
  staffMode: boolean;
  reportingMode: 'bilateral' | 'winner_reports' | 'staff_only';
}

export function getReportOutcomeMessage(
  outcome: ReportOutcome,
  context: ReportContext,
): string {
  if (outcome.conflict) {
    return 'Los reportes no coinciden. Se abrió una disputa para que la revise el staff.';
  }
  if (outcome.confirmed || context.staffMode || context.reportingMode !== 'bilateral') {
    return 'Resultado confirmado y bracket actualizado.';
  }
  return 'Reporte enviado. Esperando la confirmación del rival…';
}
