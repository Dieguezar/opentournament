import { notFound } from 'next/navigation';
import { RegisterPanel } from '@/components/register-panel';
import { ReportPanel } from '@/components/report-panel';
import { LiveTournament } from '@/components/live-tournament';
import { serverFetch } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

interface BracketMatchView {
  id: string;
  engineId: string;
  status: string;
  home: { name: string; tag: string | null } | null;
  away: { name: string; tag: string | null } | null;
  result: { winnerId?: string } | null;
}

interface BracketView {
  type: string;
  rounds: Array<{ number: number; name: string; matches: BracketMatchView[] }>;
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
    };
    organization: { name: string } | null;
  }>(`/tournaments/by-slug/${slug}`);
  if (tournamentRes.status === 404) notFound();
  const tournament = tournamentRes.data?.tournament;
  if (!tournament) notFound();

  const bracketRes = await serverFetch<{ brackets: BracketView[] }>(
    `/tournaments/${tournament.id}/bracket`,
  );
  const brackets = bracketRes.data?.brackets ?? [];

  return (
    <main className="container">
      <p className="muted">{tournamentRes.data?.organization?.name}</p>
      <h1>{tournament.name}</h1>
      <p className="muted">
        {tournament.gameAdapterKey} · {tournament.format === 'double_elimination' ? 'Doble eliminación' : 'Eliminación sencilla'} · Estado: {tournament.status}
      </p>
      {tournament.description && <p>{tournament.description}</p>}

      <RegisterPanel tournamentId={tournament.id} />
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
          <p className="muted">El bracket se publicará cuando el organizador lo genere.</p>
        ) : (
          brackets.map((bracket) => (
            <section key={bracket.type}>
              <h3>{bracket.type === 'winners' ? 'Ganadores' : bracket.type === 'losers' ? 'Perdedores' : 'Gran final'}</h3>
              {bracket.rounds.map((round) => (
                <div key={round.number}>
                  <h4>{round.name}</h4>
                  <ul>
                    {round.matches.map((match) => (
                      <li key={match.id}>
                        {match.home?.name ?? 'TBD'} vs {match.away?.name ?? 'TBD'} — {match.status}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </main>
  );
}
