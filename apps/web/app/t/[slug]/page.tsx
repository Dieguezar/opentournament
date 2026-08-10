import { notFound } from 'next/navigation';
import { LiveTournament } from '@/components/live-tournament';
import { RegisterPanel } from '@/components/register-panel';
import { ReportPanel } from '@/components/report-panel';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface BracketMatchView {
  id: string;
  status: string;
  home: { participantId: string; name: string } | null;
  away: { participantId: string; name: string } | null;
  result: { winnerId?: string } | null;
}

interface BracketView {
  type: string;
  rounds: Array<{ number: number; name: string; matches: BracketMatchView[] }>;
}

interface TeamEntryView {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  registrationStatus: string;
  checkedIn: boolean | null;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'badge' },
  open: { label: 'Inscripciones abiertas', className: 'badge badge-success' },
  checkin_open: { label: 'Check-in abierto', className: 'badge badge-warn' },
  in_progress: { label: 'En curso', className: 'badge badge-warn' },
  finalized: { label: 'Finalizado', className: 'badge badge-success' },
  cancelled: { label: 'Cancelado', className: 'badge badge-danger' },
};

function teamLabel(team: { name: string } | null): string {
  return team?.name ?? 'TBD';
}

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournamentRes = await serverFetch<{
    tournament: {
      id: string;
      name: string;
      description: string | null;
      rules: string | null;
      status: string;
      format: string;
      gameAdapterKey: string;
      startsAt: string | null;
      capacity: number;
    };
    organization: { name: string } | null;
  }>(`/tournaments/by-slug/${slug}`);
  if (tournamentRes.status === 404) notFound();
  const tournament = tournamentRes.data?.tournament;
  if (!tournament) notFound();

  const [teamsRes, bracketRes] = await Promise.all([
    serverFetch<{ teams: TeamEntryView[] }>(`/tournaments/${tournament.id}/teams`),
    serverFetch<{ brackets: BracketView[] }>(`/tournaments/${tournament.id}/bracket`),
  ]);
  const teams = teamsRes.data?.teams ?? [];
  const brackets = bracketRes.data?.brackets ?? [];
  const status = STATUS_LABELS[tournament.status] ?? STATUS_LABELS.draft!;

  return (
    <main className="container">
      <p className="muted">{tournamentRes.data?.organization?.name}</p>
      <h1>{tournament.name}</h1>
      <p>
        <span className={status.className}>{status.label}</span>{' '}
        <span className="muted">
          {tournament.gameAdapterKey} ·{' '}
          {tournament.format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla'}{' '}
          · Cupo {tournament.capacity}
          {tournament.startsAt
            ? ` · Inicia ${new Date(tournament.startsAt).toLocaleString('es')}`
            : ''}
        </span>
      </p>
      {tournament.description && <p>{tournament.description}</p>}

      <div className="card">
        <h2>Cómo participar</h2>
        <ol className="steps">
          <li className="step step-done">
            <span className="step-dot" /> Crea tu equipo
          </li>
          <li className="step step-current">
            <span className="step-dot" /> Inscríbete
          </li>
          <li className="step">
            <span className="step-dot" /> Check-in
          </li>
          <li className="step">
            <span className="step-dot" /> Sigue el bracket
          </li>
        </ol>
        <RegisterPanel tournamentId={tournament.id} />
      </div>

      <div className="card">
        <h2>Equipos inscritos ({teams.length})</h2>
        {teams.length === 0 ? (
          <p className="muted">Aún no hay equipos inscritos. ¡Sé el primero!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {teams.map((team) => (
              <li key={team.teamId} style={{ marginBottom: '0.4rem' }}>
                {team.teamName} {team.teamTag ? <span className="muted">[{team.teamTag}]</span> : null}{' '}
                {team.registrationStatus === 'approved' ? (
                  <span className={`badge ${team.checkedIn ? 'badge-success' : 'badge-warn'}`}>
                    {team.checkedIn ? 'Check-in hecho' : 'Inscrito, sin check-in'}
                  </span>
                ) : (
                  <span className="badge">{team.registrationStatus}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReportPanel tournamentId={tournament.id} />

      {tournament.rules && (
        <div className="card">
          <h2>Reglas</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{tournament.rules}</p>
        </div>
      )}

      <div className="card">
        <h2>
          Bracket <LiveTournament tournamentId={tournament.id} />
        </h2>
        {brackets.length === 0 ? (
          <p className="muted">
            El bracket se publicará aquí cuando el organizador lo genere (tras el check-in).
          </p>
        ) : (
          brackets.map((bracket) => (
            <section key={bracket.type} style={{ marginBottom: '1.25rem' }}>
              <h3>
                {bracket.type === 'winners'
                  ? 'Ganadores'
                  : bracket.type === 'losers'
                    ? 'Perdedores'
                    : 'Gran final'}
              </h3>
              {bracket.rounds.map((round) => (
                <div key={round.number} style={{ marginBottom: '0.75rem' }}>
                  <p className="muted" style={{ margin: '0.25rem 0' }}>
                    {round.name}
                  </p>
                  <div className="grid">
                    {round.matches.map((match) => {
                      const homeWinner =
                        match.result?.winnerId &&
                        match.home?.participantId === match.result.winnerId;
                      const awayWinner =
                        match.result?.winnerId &&
                        match.away?.participantId === match.result.winnerId;
                      return (
                        <div
                          className="card"
                          key={match.id}
                          style={{ padding: '0.75rem', margin: 0 }}
                        >
                          <p style={{ margin: 0 }}>
                            <strong style={homeWinner ? { color: '#4ade80' } : undefined}>
                              {teamLabel(match.home)}
                            </strong>{' '}
                            vs{' '}
                            <strong style={awayWinner ? { color: '#4ade80' } : undefined}>
                              {teamLabel(match.away)}
                            </strong>
                          </p>
                          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                            {match.status}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </main>
  );
}
