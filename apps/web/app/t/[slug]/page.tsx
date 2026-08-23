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
import styles from '../../workspace-pages.module.css';

export const dynamic = 'force-dynamic';

interface BracketMatchView {
  id: string;
  status: string;
  home: { participantId: string; name: string } | null;
  away: { participantId: string; name: string } | null;
  result: { winnerId?: string; homeScore?: number; awayScore?: number } | null;
}

interface BracketRoundView {
  number: number;
  name: string;
  matches: BracketMatchView[];
}

interface BracketView {
  type: string;
  rounds: BracketRoundView[];
}

interface TeamEntryView {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  registrationStatus: string;
  checkedIn: boolean | null;
}

function teamLabel(team: { name: string } | null): string {
  return team?.name ?? 'Por definir';
}

function formatBracketName(type: string): string {
  if (type === 'winners') return 'Ganadores';
  if (type === 'losers') return 'Perdedores';
  return 'Gran final';
}

function BracketSection({
  brackets,
  tournamentId,
}: {
  brackets: BracketView[];
  tournamentId: string;
}) {
  return (
    <section className={styles.bracketPanel} aria-labelledby="bracket-title">
      <div className={styles.bracketHeader}>
        <div>
          <p className={styles.eyebrow}>Competencia</p>
          <h2 id="bracket-title">Bracket y partidas</h2>
        </div>
        <span className={styles.liveRegion}>
          <LiveTournament tournamentId={tournamentId} />
        </span>
      </div>

      {brackets.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>El bracket todavía no está publicado</h3>
          <p className={styles.emptyCopy}>
            Aparecerá en este espacio cuando la organización cierre el check-in y genere los cruces.
          </p>
        </div>
      ) : (
        <div
          className={styles.bracketViewport}
          role="region"
          tabIndex={0}
          aria-label="Bracket desplazable"
        >
          {brackets.map((bracket) => (
            <section className={styles.bracketGroup} key={bracket.type}>
              <h3>{formatBracketName(bracket.type)}</h3>
              <ol className={styles.bracketRounds}>
                {bracket.rounds.map((round) => (
                  <li className={styles.roundColumn} key={round.number}>
                    <p className={styles.bracketRoundMeta}>{round.name}</p>
                    <ol className={styles.roundMatches}>
                      {round.matches.map((match) => {
                        const isHomeWinner =
                          match.result?.winnerId !== undefined &&
                          match.home?.participantId === match.result.winnerId;
                        const isAwayWinner =
                          match.result?.winnerId !== undefined &&
                          match.away?.participantId === match.result.winnerId;

                        return (
                          <li key={match.id}>
                            <article className={styles.matchCard}>
                              <div
                                className={`${styles.matchTeam} ${isHomeWinner ? styles.matchWinner : ''}`}
                              >
                                <span>{teamLabel(match.home)}</span>
                                <span className={styles.matchScore}>
                                  {match.result?.homeScore ?? '—'}
                                </span>
                              </div>
                              <div
                                className={`${styles.matchTeam} ${isAwayWinner ? styles.matchWinner : ''}`}
                              >
                                <span>{teamLabel(match.away)}</span>
                                <span className={styles.matchScore}>
                                  {match.result?.awayScore ?? '—'}
                                </span>
                              </div>
                              <footer className={styles.matchFooter}>
                                <span>Partida</span>
                                <span>{formatMatchStatus(match.status)}</span>
                              </footer>
                            </article>
                          </li>
                        );
                      })}
                    </ol>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function JourneySection({
  isRegistrationActive,
  isTournamentRunning,
}: {
  isRegistrationActive: boolean;
  isTournamentRunning: boolean;
}) {
  return (
    <section className={styles.journeyPanel} aria-labelledby="journey-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Recorrido</p>
          <h2 id="journey-title">
            {isTournamentRunning ? 'Seguí la competencia' : 'Cómo participar'}
          </h2>
        </div>
      </div>
      <ol className={styles.journeyList}>
        <li>
          <strong>Paso 1</strong>
          Crear equipo
        </li>
        <li className={isRegistrationActive ? styles.currentJourney : undefined}>
          <strong>Paso 2</strong>
          Inscribirse
        </li>
        <li>
          <strong>Paso 3</strong>
          Completar check-in
        </li>
        <li className={isTournamentRunning ? styles.currentJourney : undefined}>
          <strong>Paso 4</strong>
          Seguir el bracket
        </li>
      </ol>
    </section>
  );
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
      <main className={`container narrow ${styles.formPage}`}>
        <div className={`${styles.notice} service-state`} role="status">
          <p className={styles.eyebrow}>Servicio temporalmente no disponible</p>
          <h1>No pudimos cargar este torneo</h1>
          <p>
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
  const isTournamentRunning =
    tournament.status === 'in_progress' || tournament.status === 'finalized';
  const roundCount = brackets.reduce((total, bracket) => total + bracket.rounds.length, 0);
  const matchCount = brackets.reduce(
    (total, bracket) =>
      total + bracket.rounds.reduce((roundTotal, round) => roundTotal + round.matches.length, 0),
    0,
  );

  return (
    <main className={`container ${styles.page}`}>
      <header className={`${styles.pageHeader} ${styles.tournamentHeader}`}>
        <div>
          <p className={styles.eyebrow}>
            {tournamentRes.data?.organization?.name ?? 'Torneo independiente'}
          </p>
          <h1>{tournament.name}</h1>
          {tournament.description && <p className={styles.intro}>{tournament.description}</p>}
        </div>
        <div className={styles.tournamentHeaderMeta}>
          <span className={status.className}>{status.label}</span>
          <span>{formatGameAdapter(tournament.gameAdapterKey)}</span>
          <span>
            {tournament.format === 'double_elimination'
              ? 'Doble eliminación'
              : 'Eliminación sencilla'}
          </span>
          <span>Cupo {tournament.capacity}</span>
          {tournament.startsAt && (
            <span>Inicia {new Date(tournament.startsAt).toLocaleString('es')}</span>
          )}
        </div>
      </header>

      <dl className={styles.metrics} aria-label="Resumen del torneo">
        <div>
          <dt>Equipos inscritos</dt>
          <dd>{teams.length}</dd>
        </div>
        <div>
          <dt>Rondas publicadas</dt>
          <dd>{roundCount}</dd>
        </div>
        <div>
          <dt>Partidas</dt>
          <dd>{matchCount}</dd>
        </div>
      </dl>

      {isTournamentRunning && <BracketSection brackets={brackets} tournamentId={tournament.id} />}

      <JourneySection
        isRegistrationActive={isRegistrationActive}
        isTournamentRunning={isTournamentRunning}
      />

      {isRegistrationActive ? (
        <RegisterPanel tournamentId={tournament.id} />
      ) : (
        <div className={styles.panel}>
          <p className={styles.meta}>
            Las inscripciones finalizaron. Consultá las partidas y resultados publicados en el
            bracket.
          </p>
        </div>
      )}

      {!isTournamentRunning && <BracketSection brackets={brackets} tournamentId={tournament.id} />}

      <ReportPanel tournamentId={tournament.id} />

      <div className={styles.publicSupportGrid}>
        <section className={styles.panel} aria-labelledby="teams-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Participantes</p>
              <h2 id="teams-title">Equipos inscritos ({teams.length})</h2>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className={styles.emptyCopy}>Aún no hay equipos inscritos.</p>
          ) : (
            <ul className={styles.teamList}>
              {teams.map((team) => (
                <li key={team.teamId}>
                  <span>
                    <strong>{team.teamName}</strong>
                    <small className={styles.teamMeta}>
                      {team.teamTag ? `Etiqueta ${team.teamTag}` : 'Sin etiqueta'}
                    </small>
                  </span>
                  {team.registrationStatus === 'approved' ? (
                    <span className={`badge ${team.checkedIn ? 'badge-success' : 'badge-warn'}`}>
                      {team.checkedIn ? 'Check-in hecho' : 'Sin check-in'}
                    </span>
                  ) : (
                    <span className="badge">
                      {formatRegistrationStatus(team.registrationStatus)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {tournament.rules && (
          <section className={styles.panel} aria-labelledby="rules-title">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Información</p>
                <h2 id="rules-title">Reglas</h2>
              </div>
            </div>
            <p className={styles.rules}>{tournament.rules}</p>
          </section>
        )}
      </div>
    </main>
  );
}
