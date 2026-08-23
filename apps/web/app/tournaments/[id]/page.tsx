import {
  buildBracketWorkspacePresentation,
  type BracketMatchNode,
} from '@opentournament/bracket-ui';
import type { MatchStatus } from '@opentournament/shared-types';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  BracketWorkspace,
  type BracketWorkspaceMatch,
} from '@/components/bracket-workspace';
import styles from '@/components/bracket-workspace.module.css';
import { RegistrationActions, type RegistrationView } from '@/components/registration-actions';
import { TournamentActions } from '@/components/tournament-actions';
import {
  formatGameAdapter,
  formatParticipantStatus,
  formatRegistrationStatus,
  getTournamentStatus,
} from '@/lib/presentation';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface TournamentView {
  id: string;
  name: string;
  slug: string;
  status: string;
  format: string;
  capacity: number;
  gameAdapterKey: string;
  startsAt: string | null;
  seriesConfig: { bo?: number } | null;
}

interface MatchResultView {
  winnerId?: string;
  homeScore?: number;
  awayScore?: number;
}

interface MatchView {
  id: string;
  position: number;
  status: MatchStatus;
  scheduledAt: string | null;
  roundNumber: number;
  roundName: string;
  bracketType: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  result: MatchResultView | null;
}

interface BracketParticipantView {
  participantId: string;
  teamId: string;
  name: string;
  tag: string | null;
}

interface BracketMatchView {
  id: string;
  position: number;
  status: MatchStatus;
  home: BracketParticipantView | null;
  away: BracketParticipantView | null;
  result: MatchResultView | null;
  scheduledAt: string | null;
}

interface BracketView {
  type: string;
  rounds: Array<{
    number: number;
    name: string;
    matches: BracketMatchView[];
  }>;
}

interface CheckInView {
  teamName: string;
  checkedIn: boolean;
  status: string;
}

interface DisputeView {
  id: string;
  status: string;
}

function fallbackWinnerId(match: MatchView): string | null {
  const winnerId = match.result?.winnerId;
  if (!winnerId) return null;
  if (winnerId === match.homeTeamId || winnerId === match.awayTeamId) return winnerId;
  return null;
}

function toWorkspaceMatches(
  matches: readonly MatchView[],
  brackets: readonly BracketView[],
): BracketWorkspaceMatch[] {
  const detailsByMatchId = new Map(matches.map((match) => [match.id, match]));
  const bracketMatches = brackets.flatMap((bracket) =>
    bracket.rounds.flatMap((round) =>
      round.matches.map((match): BracketWorkspaceMatch => {
        const details = detailsByMatchId.get(match.id);
        return {
          id: match.id,
          round: round.number,
          position: match.position,
          home: match.home
            ? {
                id: match.home.participantId,
                name: match.home.name,
                tag: match.home.tag,
              }
            : null,
          away: match.away
            ? {
                id: match.away.participantId,
                name: match.away.name,
                tag: match.away.tag,
              }
            : null,
          homeScore: match.result?.homeScore,
          awayScore: match.result?.awayScore,
          winnerId: match.result?.winnerId,
          status: match.status,
          bracketType: bracket.type,
          roundName: round.name,
          scheduledAt: match.scheduledAt ?? details?.scheduledAt ?? null,
          homeTeamId: match.home?.teamId ?? details?.homeTeamId ?? null,
          awayTeamId: match.away?.teamId ?? details?.awayTeamId ?? null,
        };
      }),
    ),
  );

  if (bracketMatches.length > 0) return bracketMatches;

  return matches.map(
    (match): BracketWorkspaceMatch => ({
      id: match.id,
      round: match.roundNumber,
      position: match.position,
      home:
        match.homeTeam && match.homeTeamId
          ? { id: match.homeTeamId, name: match.homeTeam }
          : null,
      away:
        match.awayTeam && match.awayTeamId
          ? { id: match.awayTeamId, name: match.awayTeam }
          : null,
      homeScore: match.result?.homeScore,
      awayScore: match.result?.awayScore,
      winnerId: fallbackWinnerId(match),
      status: match.status,
      bracketType: match.bracketType,
      roundName: match.roundName,
      scheduledAt: match.scheduledAt,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
    }),
  );
}

function tournamentFormatLabel(format: string): string {
  return format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla';
}

function nextActionLabel(
  nextMatch: BracketMatchNode | null,
  workspaceMatches: readonly BracketWorkspaceMatch[],
  canManage: boolean,
): string {
  if (!nextMatch) return 'Ver bracket';
  const details = workspaceMatches.find((match) => match.id === nextMatch.id);
  if (!details) return canManage ? 'Gestionar partida' : 'Ver partida';
  const action = canManage ? 'Gestionar' : 'Ver';
  return `${action} ${details.roundName.toLocaleLowerCase('es')}`;
}

export default async function TournamentAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournamentRes = await serverFetch<{ tournament: TournamentView }>(`/tournaments/${id}`);
  if (tournamentRes.status === 401) redirect('/login');
  if (tournamentRes.status === 404) notFound();
  const tournament = tournamentRes.data.tournament;
  if (!tournament) notFound();

  const [regsRes, checkRes, matchesRes, bracketRes, disputesRes] = await Promise.all([
    serverFetch<{ registrations: RegistrationView[] }>(`/tournaments/${id}/registrations`),
    serverFetch<{ participants: CheckInView[] }>(`/tournaments/${id}/check-in/status`),
    serverFetch<{ matches: MatchView[] }>(`/tournaments/${id}/matches`),
    serverFetch<{ brackets: BracketView[] }>(`/tournaments/${id}/bracket`),
    serverFetch<{ disputes: DisputeView[] }>(`/tournaments/${id}/disputes`),
  ]);

  const isAdmin = regsRes.status === 200;
  const registrations = regsRes.data?.registrations ?? [];
  const participants = checkRes.data?.participants ?? [];
  const matches = matchesRes.data?.matches ?? [];
  const brackets = bracketRes.data?.brackets ?? [];
  const disputes = disputesRes.data?.disputes ?? [];
  const workspaceMatches = toWorkspaceMatches(matches, brackets);
  const presentation = buildBracketWorkspacePresentation(workspaceMatches);
  const tournamentStatus = getTournamentStatus(tournament.status);
  const seriesBestOf = tournament.seriesConfig?.bo ?? 1;
  const publicTeamCount = new Set(
    workspaceMatches.flatMap((match) =>
      [match.home?.id, match.away?.id].filter((teamId): teamId is string => Boolean(teamId)),
    ),
  ).size;
  const teamCount = isAdmin ? participants.length : publicTeamCount;

  return (
    <main className={styles.page}>
      <nav className={styles.utilityLinks} aria-label="Navegación del torneo">
        <Link href="/dashboard">Panel de torneos</Link>
        <Link href={`/t/${tournament.slug}`}>Página pública</Link>
        {isAdmin && <Link href={`/tournaments/${id}/disputas`}>Disputas</Link>}
      </nav>

      <header id="overview" className={styles.hero}>
        <div>
          <div className={styles.titleLine}>
            <h1>{tournament.name}</h1>
            <span className={tournamentStatus.className}>{tournamentStatus.label}</span>
          </div>
          <p className={styles.meta}>
            <span>{formatGameAdapter(tournament.gameAdapterKey)}</span>
            <span>{tournamentFormatLabel(tournament.format)}</span>
            <span>Cupo {tournament.capacity}</span>
            <span>BO{seriesBestOf}</span>
            {tournament.startsAt && (
              <span>
                {new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(
                  new Date(tournament.startsAt),
                )}
              </span>
            )}
          </p>
        </div>

        <div className={styles.metrics} aria-label="Resumen del torneo">
          <div className={styles.metric}>
            <strong>{teamCount}</strong>
            <span>equipos</span>
          </div>
          <div className={styles.metric}>
            <strong>
              {presentation.metrics.finalizedMatches} / {presentation.metrics.totalMatches}
            </strong>
            <span>finalizadas</span>
          </div>
          {isAdmin && (
            <div className={styles.metric}>
              <strong>{disputes.filter((dispute) => dispute.status !== 'resolved').length}</strong>
              <span>disputas abiertas</span>
            </div>
          )}
        </div>

        <a
          className={styles.primaryAction}
          href={presentation.metrics.totalMatches > 0 ? '#match-details' : '#bracket'}
        >
          {nextActionLabel(presentation.nextActionableMatch, workspaceMatches, isAdmin)}
        </a>
      </header>

      <nav className={styles.tabs} aria-label="Secciones del torneo">
        <a href="#overview">Resumen</a>
        {isAdmin && <a href="#participants">Participantes</a>}
        <a href={presentation.metrics.totalMatches > 0 ? '#match-details' : '#bracket'}>
          Partidas
        </a>
        <a href="#bracket">Bracket</a>
        {isAdmin && <a href="#settings">Configuración</a>}
      </nav>

      <BracketWorkspace
        tournamentId={id}
        seriesBestOf={seriesBestOf}
        canManage={isAdmin}
        matches={workspaceMatches}
      />

      {isAdmin && (
        <section id="participants" className={styles.supportGrid} aria-label="Participantes">
          <div className={styles.supportPanel}>
            <h2>Inscripciones ({registrations.length})</h2>
            {registrations.length === 0 ? (
              <p>
                Compartí la <Link href={`/t/${tournament.slug}`}>página pública</Link> para recibir
                inscripciones.
              </p>
            ) : (
              <ul className={styles.supportList}>
                {registrations.map((registration) => (
                  <li key={registration.id}>
                    <strong>{registration.teamName}</strong>
                    <span className={styles.itemMeta}>
                      {registration.teamTag ?? 'Sin tag'} · Capitán:{' '}
                      {registration.captainName ?? 'Sin asignar'} ·{' '}
                      {formatRegistrationStatus(registration.status)}
                      {registration.waitlistPosition
                        ? ` · Espera ${registration.waitlistPosition}`
                        : ''}
                    </span>
                    <RegistrationActions tournamentId={id} registration={registration} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.supportPanel}>
            <h2>Check-in ({participants.length})</h2>
            {participants.length === 0 ? (
              <p>Sin participantes confirmados. Aprobá inscripciones primero.</p>
            ) : (
              <ul className={styles.supportList}>
                {participants.map((participant) => (
                  <li key={participant.teamName}>
                    <strong>{participant.teamName}</strong>
                    <span className={styles.itemMeta}>
                      {participant.checkedIn ? 'Check-in hecho' : 'Sin check-in'} ·{' '}
                      {formatParticipantStatus(participant.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {isAdmin && (
        <section id="settings" className={`${styles.supportPanel} ${styles.settings}`}>
          <h2>Configuración y estado</h2>
          <p>Publicá, generá el bracket o cancelá el torneo según su estado actual.</p>
          <TournamentActions tournamentId={id} status={tournament.status} />
        </section>
      )}
    </main>
  );
}
