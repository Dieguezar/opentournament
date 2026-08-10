import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RegistrationActions, type RegistrationView } from '@/components/registration-actions';
import { TournamentActions } from '@/components/tournament-actions';
import { WalkoverButton } from '@/components/walkover-button';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface MatchView {
  id: string;
  status: string;
  scheduledAt: string | null;
  lobbyUrl: string | null;
  roundName: string;
  bracketType: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  result: { winnerId?: string } | null;
}

interface CheckInView {
  teamName: string;
  checkedIn: boolean;
  status: string;
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
      rules: string | null;
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

  return (
    <main className="container">
      <p>
        <Link href="/dashboard">← Panel</Link> ·{' '}
        <Link href={`/t/${tournament.slug}`}>Ver página pública</Link> ·{' '}
        <Link href={`/tournaments/${id}/disputas`}>Disputas</Link>
      </p>
      <h1>{tournament.name}</h1>
      <p className="muted">
        {tournament.gameAdapterKey} · {tournament.format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla'} · Cupo {tournament.capacity} · Estado: {tournament.status}
      </p>
      {isAdmin && <TournamentActions tournamentId={id} status={tournament.status} />}

      <div className="card">
        <h2>Inscripciones</h2>
        {registrations.length === 0 ? (
          <p className="muted">Aún no hay inscripciones.</p>
        ) : (
          <ul>
            {registrations.map((reg) => (
              <li key={reg.id}>
                <strong>{reg.teamName}</strong>{' '}
                <span className="muted">
                  ({reg.teamTag ?? 'sin tag'} · capitán: {reg.captainName ?? '—'} · {reg.status}
                  {reg.waitlistPosition ? ` · espera #${reg.waitlistPosition}` : ''})
                </span>{' '}
                {isAdmin && <RegistrationActions tournamentId={id} registration={reg} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Check-in</h2>
        {participants.length === 0 ? (
          <p className="muted">Sin participantes confirmados.</p>
        ) : (
          <ul>
            {participants.map((p) => (
              <li key={p.teamName}>
                {p.teamName} — {p.checkedIn ? '✓ check-in' : 'sin check-in'} ({p.status})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Partidas</h2>
        {matches.length === 0 ? (
          <p className="muted">Genera el bracket para ver las partidas.</p>
        ) : (
          <ul>
            {matches.map((match) => (
              <li key={match.id}>
                [{match.bracketType} · {match.roundName}] {match.homeTeam ?? 'TBD'} vs{' '}
                {match.awayTeam ?? 'TBD'} — {match.status}
                {isAdmin && (
                  <WalkoverButton
                    matchId={match.id}
                    homeTeamId={match.homeTeamId}
                    awayTeamId={match.awayTeamId}
                    homeName={match.homeTeam}
                    awayName={match.awayTeam}
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
