import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RegistrationActions, type RegistrationView } from '@/components/registration-actions';
import { TournamentActions } from '@/components/tournament-actions';
import { WalkoverButton } from '@/components/walkover-button';
import {
  formatBracketType,
  formatGameAdapter,
  formatMatchStatus,
  formatParticipantStatus,
  formatRegistrationStatus,
  getTournamentStatus,
} from '@/lib/presentation';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface MatchView {
  id: string;
  status: string;
  scheduledAt: string | null;
  roundName: string;
  bracketType: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

interface CheckInView {
  teamName: string;
  checkedIn: boolean;
  status: string;
}

const STEPS = [
  { key: 'draft', label: 'Publicar' },
  { key: 'open', label: 'Inscripciones' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'bracket', label: 'Bracket' },
  { key: 'finalized', label: 'Resultados' },
];

function currentStep(status: string): number {
  if (status === 'draft') return 0;
  if (status === 'open' || status === 'checkin_open') return 1;
  if (status === 'in_progress') return 2;
  if (status === 'finalized') return 4;
  return 0;
}

export default async function TournamentAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournamentRes = await serverFetch<{
    tournament: {
      id: string;
      name: string;
      slug: string;
      status: string;
      format: string;
      capacity: number;
      gameAdapterKey: string;
    };
  }>(`/tournaments/${id}`);
  if (tournamentRes.status === 401) redirect('/login');
  if (tournamentRes.status === 404) notFound();
  const tournament = tournamentRes.data.tournament;
  if (!tournament) notFound();

  const [regsRes, checkRes, matchesRes] = await Promise.all([
    serverFetch<{ registrations: RegistrationView[] }>(`/tournaments/${id}/registrations`),
    serverFetch<{ participants: CheckInView[] }>(`/tournaments/${id}/check-in/status`),
    serverFetch<{ matches: MatchView[] }>(`/tournaments/${id}/matches`),
  ]);

  const isAdmin = regsRes.status !== 403;
  const registrations = regsRes.data?.registrations ?? [];
  const participants = checkRes.data?.participants ?? [];
  const matches = matchesRes.data?.matches ?? [];
  const step =
    tournament.status === 'in_progress' && matches.some((match) => match.status === 'finalized')
      ? 4
      : currentStep(tournament.status);
  const tournamentStatus = getTournamentStatus(tournament.status);

  return (
    <main className="container">
      <p>
        <Link href="/dashboard">← Panel</Link> ·{' '}
        <Link href={`/t/${tournament.slug}`}>Página pública</Link> ·{' '}
        <Link href={`/tournaments/${id}/disputas`}>Disputas</Link>
      </p>
      <header className="page-heading tournament-hero compact-hero">
        <div>
          <p className="eyebrow">Operación del torneo</p>
          <h1>{tournament.name}</h1>
        </div>
        <span className={tournamentStatus.className}>{tournamentStatus.label}</span>
      </header>
      <p className="muted tournament-meta">
        {formatGameAdapter(tournament.gameAdapterKey)} ·{' '}
        {tournament.format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla'}{' '}
        · Cupo {tournament.capacity}
      </p>

      <ol className="steps">
        {STEPS.map((s, i) => (
          <li
            key={s.key}
            className={`step ${i < step ? 'step-done' : ''} ${i === step ? 'step-current' : ''}`}
          >
            <span className="step-dot" /> {s.label}
          </li>
        ))}
      </ol>

      {isAdmin && <TournamentActions tournamentId={id} status={tournament.status} />}

      <div className="card">
        <h2>Inscripciones ({registrations.length})</h2>
        {registrations.length === 0 ? (
          <p className="muted">
            Comparte la <Link href={`/t/${tournament.slug}`}>página pública</Link> para recibir
            inscripciones.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {registrations.map((reg) => (
              <li key={reg.id} style={{ marginBottom: '0.6rem' }}>
                <strong>{reg.teamName}</strong>{' '}
                <span className="muted">
                  ({reg.teamTag ?? 'sin tag'} · capitán: {reg.captainName ?? '—'} · {formatRegistrationStatus(reg.status)}
                  {reg.waitlistPosition ? ` · espera #${reg.waitlistPosition}` : ''})
                </span>{' '}
                {isAdmin && <RegistrationActions tournamentId={id} registration={reg} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Check-in ({participants.length})</h2>
        {participants.length === 0 ? (
          <p className="muted">Sin participantes confirmados. Aprueba inscripciones primero.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {participants.map((p) => (
              <li key={p.teamName} style={{ marginBottom: '0.4rem' }}>
                {p.teamName}{' '}
                <span className={`badge ${p.checkedIn ? 'badge-success' : 'badge-warn'}`}>
                  {p.checkedIn ? 'Check-in hecho' : 'Sin check-in'}
                </span>{' '}
                <span className="muted">({formatParticipantStatus(p.status)})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Partidas ({matches.length})</h2>
        {matches.length === 0 ? (
          <p className="muted">
            Genera el bracket cuando haya al menos 2 equipos con check-in.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {matches.map((match) => (
              <li key={match.id} style={{ marginBottom: '0.6rem' }}>
                <span className="muted">
                  [{formatBracketType(match.bracketType)} · {match.roundName}]
                </span>{' '}
                <strong>
                  {match.homeTeam ?? 'TBD'} vs {match.awayTeam ?? 'TBD'}
                </strong>{' '}
                <span className={`badge ${match.status === 'finalized' ? 'badge-success' : ''}`}>
                  {formatMatchStatus(match.status)}
                </span>
                {isAdmin && (
                  <WalkoverButton
                    matchId={match.id}
                    homeTeamId={match.homeTeamId}
                    awayTeamId={match.awayTeamId}
                    homeName={match.homeTeam}
                    awayName={match.awayTeam}
                    matchStatus={match.status}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
