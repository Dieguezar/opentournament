import { notFound } from 'next/navigation';
import { LiveTournament } from '@/components/live-tournament';
import { RegisterPanel } from '@/components/register-panel';
import { ReportPanel } from '@/components/report-panel';
import {
  formatGameAdapter,
  formatMatchStatus,
  formatRegistrationStatus,
  getTournamentStatus,
} from '@/lib/presentation';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface BracketMatchView {
  id: string;
  status: string;
  home: { participantId: string; name: string } | null;
  away: { participantId: string; name: string } | null;
  result: { winnerId?: string; homeScore?: number; awayScore?: number } | null;
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
  if (tournamentRes.status === 503) {
    return (
      <main className="container narrow">
        <div className="card service-state" role="status">
          <p className="eyebrow">Servicio temporalmente no disponible</p>
          <h1>No pudimos cargar este torneo</h1>
          <p className="muted">
            La interfaz sigue disponible, pero la API no está respondiendo. Intentá nuevamente en
            unos instantes.
          </p>
        </div>
      </main>
    );
  }
  if (tournamentRes.status === 404) notFound();
  const tournament = tournamentRes.data?.tournament;
  if (!tournament) notFound();

  const [teamsRes, bracketRes] = await Promise.all([
    serverFetch<{ teams: TeamEntryView[] }>(`/tournaments/${tournament.id}/teams`),
    serverFetch<{ brackets: BracketView[] }>(`/tournaments/${tournament.id}/bracket`),
  ]);
  const teams = teamsRes.data?.teams ?? [];
  const brackets = bracketRes.data?.brackets ?? [];
  const status = getTournamentStatus(tournament.status);
  const isRegistrationActive = tournament.status === 'open' || tournament.status === 'checkin_open';
  const isTournamentRunning = tournament.status === 'in_progress' || tournament.status === 'finalized';

  return (
    <main className="container">
      <header className="page-heading tournament-hero">
        <div>
          <p className="eyebrow">{tournamentRes.data?.organization?.name}</p>
          <h1>{tournament.name}</h1>
          {tournament.description && <p className="hero-copy">{tournament.description}</p>}
        </div>
      </header>
      <p>
        <span className={status.className}>{status.label}</span>{' '}
        <span className="muted">
          {formatGameAdapter(tournament.gameAdapterKey)} ·{' '}
          {tournament.format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla'}{' '}
          · Cupo {tournament.capacity}
          {tournament.startsAt
            ? ` · Inicia ${new Date(tournament.startsAt).toLocaleString('es')}`
            : ''}
        </span>
      </p>

      <div className="card journey-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recorrido</p>
            <h2>{isTournamentRunning ? 'Seguí la competencia' : 'Cómo participar'}</h2>
          </div>
        </div>
        <ol className="steps">
          <li className="step step-done">
            <span className="step-dot" /> Crea tu equipo
          </li>
          <li className={`step ${isRegistrationActive ? 'step-current' : 'step-done'}`}>
            <span className="step-dot" /> Inscríbete
          </li>
          <li className={`step ${isTournamentRunning ? 'step-done' : ''}`}>
            <span className="step-dot" /> Check-in
          </li>
          <li className={`step ${isTournamentRunning ? 'step-current' : ''}`}>
            <span className="step-dot" /> Sigue el bracket
          </li>
        </ol>
        {isRegistrationActive ? (
          <RegisterPanel tournamentId={tournament.id} />
        ) : (
          <p className="muted">
            Las inscripciones finalizaron. Consultá las partidas y resultados en vivo debajo.
          </p>
        )}
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
                  <span className="badge">{formatRegistrationStatus(team.registrationStatus)}</span>
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
                        <article className="match-card" key={match.id}>
                          <div className={`match-row ${homeWinner ? 'is-winner' : ''}`}>
                            <strong>{teamLabel(match.home)}</strong>
                            <span>{match.result?.homeScore ?? '—'}</span>
                          </div>
                          <div className={`match-row ${awayWinner ? 'is-winner' : ''}`}>
                            <strong>{teamLabel(match.away)}</strong>
                            <span>{match.result?.awayScore ?? '—'}</span>
                          </div>
                          <footer>
                            <span className={`badge ${match.status === 'finalized' ? 'badge-success' : ''}`}>
                              {formatMatchStatus(match.status)}
                            </span>
                          </footer>
                        </article>
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
