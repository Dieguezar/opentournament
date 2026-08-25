'use client';

import {
  buildBracketWorkspacePresentation,
  type BracketMatchNode,
  type BracketMatchPresentation,
  type BracketTeamNode,
} from '@opentournament/bracket-ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatBracketType, formatMatchStatus } from '@/lib/presentation';
import { WalkoverButton } from './walkover-button';
import styles from './bracket-workspace.module.css';

export interface BracketWorkspaceMatch extends BracketMatchNode {
  bracketType: string;
  roundName: string;
  scheduledAt: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

interface BracketWorkspaceProps {
  tournamentId: string;
  seriesBestOf: number;
  canManage: boolean;
  isSmash: boolean;
  matches: readonly BracketWorkspaceMatch[];
}

interface TeamRowProps {
  participant: BracketTeamNode | null;
  score: number | null | undefined;
  isWinner: boolean;
}

function statusClassName(status: string): string {
  const baseClassName = styles.status ?? '';
  if (status === 'finalized' || status === 'walkover') {
    return `${baseClassName} ${styles.statusSuccess ?? ''}`;
  }
  if (status === 'disputed') return `${baseClassName} ${styles.statusDanger ?? ''}`;
  if (status === 'in_progress') return `${baseClassName} ${styles.statusWarning ?? ''}`;
  return baseClassName;
}

function formatScheduledAt(value: string | null): string {
  if (!value) return 'Sin fecha programada';
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function TeamRow({ participant, score, isWinner }: TeamRowProps) {
  return (
    <span className={`${styles.teamRow} ${isWinner ? styles.teamWinner : ''}`}>
      <span className={styles.teamIdentity}>
        {participant?.tag && <small>{participant.tag}</small>}
        <strong>{participant?.name ?? 'Participante por definir'}</strong>
      </span>
      <span className={styles.score}>{score ?? 'Sin resultado'}</span>
    </span>
  );
}

function MatchCard({
  match,
  isSelected,
  onSelect,
  matchLabel,
}: {
  match: BracketMatchPresentation;
  isSelected: boolean;
  onSelect: (matchId: string) => void;
  matchLabel: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.matchCard} ${isSelected ? styles.matchCardSelected : ''}`}
      aria-pressed={isSelected}
      onClick={() => onSelect(match.id)}
    >
      <TeamRow
        participant={match.home}
        score={match.homeScore}
        isWinner={match.winner?.id === match.home?.id}
      />
      <TeamRow
        participant={match.away}
        score={match.awayScore}
        isWinner={match.winner?.id === match.away?.id}
      />
      <span className={styles.matchFooter}>
        <span className={statusClassName(match.status)}>{formatMatchStatus(match.status)}</span>
        <span>{matchLabel} {match.position + 1}</span>
      </span>
    </button>
  );
}

export function BracketWorkspace({
  tournamentId,
  seriesBestOf,
  canManage,
  isSmash,
  matches,
}: BracketWorkspaceProps) {
  const matchLabel = isSmash ? 'Set' : 'Partida';
  const matchLabelPlural = isSmash ? 'sets' : 'partidas';
  const participantLabelPlural = isSmash ? 'jugadores' : 'equipos';
  const presentation = useMemo(() => buildBracketWorkspacePresentation(matches), [matches]);
  const matchesById = useMemo(
    () => new Map(matches.map((match) => [match.id, match])),
    [matches],
  );
  const presentationById = useMemo(
    () =>
      new Map(
        presentation.rounds.flatMap((round) =>
          round.matches.map((match) => [match.id, match] as const),
        ),
      ),
    [presentation.rounds],
  );
  const [selectedMatchId, setSelectedMatchId] = useState(
    presentation.initialSelectedMatchId,
  );
  const resolvedSelectedId = presentationById.has(selectedMatchId ?? '')
    ? selectedMatchId
    : presentation.initialSelectedMatchId;
  const selectedMatch = resolvedSelectedId
    ? (presentationById.get(resolvedSelectedId) ?? null)
    : null;
  const selectedDetails = resolvedSelectedId ? (matchesById.get(resolvedSelectedId) ?? null) : null;

  if (presentation.rounds.length === 0) {
    return (
      <section id="bracket" className={styles.emptyState} aria-labelledby="bracket-title">
        <p className={styles.eyebrow}>Bracket</p>
        <h2 id="bracket-title">Todavía no hay {matchLabelPlural}</h2>
        <p>
          Generá el bracket cuando haya al menos dos {participantLabelPlural} con check-in.
        </p>
      </section>
    );
  }

  return (
    <section id="bracket" className={styles.workspace} aria-labelledby="bracket-title">
      <aside className={styles.roundRail} aria-label="Rondas del bracket">
        <h2 id="bracket-title">Rondas</h2>
        <div className={styles.roundList}>
          {presentation.rounds.map((round) => {
            const firstMatch = round.matches[0];
            const roundName = firstMatch
              ? (matchesById.get(firstMatch.id)?.roundName ?? `Ronda ${round.number}`)
              : `Ronda ${round.number}`;
            const isComplete = round.matches.every(
              (match) => match.status === 'finalized' || match.status === 'walkover',
            );
            const isCurrent = round.matches.some((match) => match.id === resolvedSelectedId);
            return (
              <button
                type="button"
                className={`${styles.roundButton} ${isCurrent ? styles.roundButtonActive : ''}`}
                key={`${round.bracketType ?? 'default'}:${round.number}`}
                onClick={() => firstMatch && setSelectedMatchId(firstMatch.id)}
              >
                <span>{roundName}</span>
                <small>{isComplete ? 'Completa' : isCurrent ? 'Activa' : 'Pendiente'}</small>
              </button>
            );
          })}
        </div>
      </aside>

      <div
        className={styles.boardScroller}
        role="region"
        tabIndex={0}
        aria-label={`Cuadro de ${matchLabelPlural} desplazable`}
      >
        <div className={styles.board}>
          {presentation.rounds.map((round, index) => {
            const roundName = round.matches[0]
              ? (matchesById.get(round.matches[0].id)?.roundName ?? `Ronda ${round.number}`)
              : `Ronda ${round.number}`;
            const previousRound = presentation.rounds[index - 1];
            const nextRound = presentation.rounds[index + 1];
            const isGroupStart = index === 0 || previousRound?.bracketType !== round.bracketType;
            const isGroupEnd =
              index === presentation.rounds.length - 1 ||
              nextRound?.bracketType !== round.bracketType;
            return (
              <section
                className={styles.roundColumn}
                data-group-start={isGroupStart}
                data-group-end={isGroupEnd}
                key={`${round.bracketType ?? 'default'}:${round.number}`}
              >
                <header>
                  <p>{roundName}</p>
                  <small>{round.matches.length} {matchLabelPlural}</small>
                </header>
                <div className={styles.roundMatches}>
                  {round.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      isSelected={match.id === resolvedSelectedId}
                      onSelect={setSelectedMatchId}
                      matchLabel={matchLabel}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <aside id="match-details" className={styles.details} aria-live="polite">
        {selectedMatch && selectedDetails ? (
          <>
            <header className={styles.detailsHeader}>
              <div>
                <p className={styles.eyebrow}>{formatBracketType(selectedDetails.bracketType)}</p>
                <h2>{selectedDetails.roundName}</h2>
              </div>
              <span className={statusClassName(selectedMatch.status)}>
                {formatMatchStatus(selectedMatch.status)}
              </span>
            </header>

            <div className={styles.detailTeams}>
              <TeamRow
                participant={selectedMatch.home}
                score={selectedMatch.homeScore}
                isWinner={selectedMatch.winner?.id === selectedMatch.home?.id}
              />
              <TeamRow
                participant={selectedMatch.away}
                score={selectedMatch.awayScore}
                isWinner={selectedMatch.winner?.id === selectedMatch.away?.id}
              />
            </div>

            <dl className={styles.definitionList}>
              <div>
                <dt>Formato de {isSmash ? 'set' : 'serie'}</dt>
                <dd>BO{seriesBestOf}</dd>
              </div>
              <div>
                <dt>Fecha programada</dt>
                <dd>{formatScheduledAt(selectedDetails.scheduledAt)}</dd>
              </div>
              <div>
                <dt>Ronda</dt>
                <dd>{selectedDetails.roundName}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{formatMatchStatus(selectedMatch.status)}</dd>
              </div>
            </dl>

            {canManage && (
              <div className={styles.operations}>
                <h3>Operaciones</h3>
                <WalkoverButton
                  matchId={selectedMatch.id}
                  homeTeamId={selectedDetails.homeTeamId}
                  awayTeamId={selectedDetails.awayTeamId}
                  homeName={selectedMatch.home?.name ?? null}
                  awayName={selectedMatch.away?.name ?? null}
                  matchStatus={selectedMatch.status}
                />
                <Link
                  href={`/tournaments/${tournamentId}/disputas`}
                  className={styles.secondaryAction}
                >
                  Revisar disputas
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className={styles.detailsEmpty}>
            <h2>Seleccioná {isSmash ? 'un set' : 'una partida'}</h2>
            <p>Elegí una tarjeta del bracket para ver sus datos y acciones disponibles.</p>
          </div>
        )}
      </aside>
    </section>
  );
}
