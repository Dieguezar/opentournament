import { DEFAULT_LOCALE, formatMessage, getDictionary, type Locale } from './i18n';

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

interface HomePresentation {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: HeaderLink;
  secondaryAction: HeaderLink;
}

export function getHeaderPresentation(
  auth: AuthSummary,
  locale: Locale = DEFAULT_LOCALE,
): HeaderPresentation {
  const { navigation } = getDictionary(locale);
  if (auth.participantAccess) {
    return {
      workspaceLabel: navigation.participantWorkspace,
      accountLabel: auth.participantAccess.teamName,
      links: [
        { href: `/t/${auth.participantAccess.tournamentSlug}`, label: navigation.myTournament },
      ],
    };
  }

  return {
    workspaceLabel: navigation.personalWorkspace,
    accountLabel: auth.user.displayName,
    links: [
      { href: '/dashboard', label: navigation.tournaments },
      { href: '/tournaments/new', label: navigation.newTournament },
      { href: '/teams/new', label: navigation.newParticipant },
    ],
  };
}

export function getHomePresentation(
  auth: AuthSummary,
  locale: Locale = DEFAULT_LOCALE,
): HomePresentation {
  const { home } = getDictionary(locale);
  if (auth.participantAccess) {
    const tournamentHref = `/t/${auth.participantAccess.tournamentSlug}`;
    return {
      eyebrow: home.participantEyebrow,
      title: auth.participantAccess.teamName,
      description: home.participantDescription,
      primaryAction: { href: tournamentHref, label: home.viewMyTournament },
      secondaryAction: { href: `${tournamentHref}#reportar`, label: home.reportResult },
    };
  }

  return {
    eyebrow: home.organizerEyebrow,
    title: formatMessage(home.organizerGreeting, { name: auth.user.displayName }),
    description: home.organizerDescription,
    primaryAction: { href: '/dashboard', label: home.openDashboard },
    secondaryAction: { href: '/tournaments/new', label: home.createTournament },
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
  { kind: 'hidden' } | { kind: 'empty'; title: string } | { kind: 'matches' };

export function getReportPanelState(
  input: ReportPanelStateInput,
  locale: Locale = DEFAULT_LOCALE,
): ReportPanelState {
  if (
    input.loadState !== 'ready' ||
    (input.staffMode && input.reportableMatchCount === 0) ||
    (!input.staffMode && input.reportingMode === 'staff_only') ||
    (!input.staffMode && input.teamCount === 0)
  ) {
    return { kind: 'hidden' };
  }
  if (input.reportableMatchCount === 0) {
    return { kind: 'empty', title: getDictionary(locale).reportPanel.noPendingMatches };
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
  locale: Locale = DEFAULT_LOCALE,
): string {
  const copy = getDictionary(locale).reportPanel;
  if (outcome.conflict) {
    return copy.outcomeConflict;
  }
  if (outcome.confirmed || context.staffMode || context.reportingMode !== 'bilateral') {
    return copy.outcomeConfirmed;
  }
  return copy.outcomePending;
}
