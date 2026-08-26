'use client';

import {
  buildBracketWorkspacePresentation,
  type BracketMatchNode,
  type BracketMatchPresentation,
  type BracketTeamNode,
} from '@opentournament/bracket-ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { formatMessage, type Dictionary, type Locale } from '@/lib/i18n';
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

function formatScheduledAt(
  value: string | null,
  locale: Locale,
  copy: Dictionary['bracketWorkspace'],
): string {
  if (!value) return copy.unscheduled;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function TeamRow({ participant, score, isWinner }: TeamRowProps) {
  const { dictionary } = useI18n();
  const copy = dictionary.bracketWorkspace;
  return (
    <span className={`${styles.teamRow} ${isWinner ? styles.teamWinner : ''}`}>
      <span className={styles.teamIdentity}>
        {participant?.tag && <small>{participant.tag}</small>}
        <strong>{participant?.name ?? copy.participantTbd}</strong>
      </span>
      <span className={styles.score}>{score ?? copy.noResult}</span>
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
  const { locale } = useI18n();
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
        <span className={statusClassName(match.status)}>
          {formatMatchStatus(match.status, locale)}
        </span>
        <span>
          {matchLabel} {match.position + 1}
        </span>
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
  const { dictionary, locale } = useI18n();
  const copy = dictionary.bracketWorkspace;
  const matchLabel = isSmash ? copy.set : copy.match;
  const matchLabelPlural = isSmash ? copy.sets : copy.matches;
  const participantLabelPlural = isSmash ? copy.players : copy.teams;
  const presentation = useMemo(() => buildBracketWorkspacePresentation(matches), [matches]);
  const matchesById = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);
  const presentationById = useMemo(
    () =>
      new Map(
        presentation.rounds.flatMap((round) =>
          round.matches.map((match) => [match.id, match] as const),
        ),
      ),
    [presentation.rounds],
  );
  const [selectedMatchId, setSelectedMatchId] = useState(presentation.initialSelectedMatchId);
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
        <h2 id="bracket-title">{formatMessage(copy.noItems, { items: matchLabelPlural })}</h2>
        <p>{formatMessage(copy.generateHint, { participants: participantLabelPlural })}</p>
      </section>
    );
  }

  return (
    <section id="bracket" className={styles.workspace} aria-labelledby="bracket-title">
      <aside className={styles.roundRail} aria-label={copy.bracketRounds}>
        <h2 id="bracket-title">{copy.rounds}</h2>
        <div className={styles.roundList}>
          {presentation.rounds.map((round) => {
            const firstMatch = round.matches[0];
            const roundName = firstMatch
              ? (matchesById.get(firstMatch.id)?.roundName ??
                formatMessage(copy.round, { number: round.number }))
              : formatMessage(copy.round, { number: round.number });
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
                <small>{isComplete ? copy.complete : isCurrent ? copy.active : copy.pending}</small>
              </button>
            );
          })}
        </div>
      </aside>

      <div
        className={styles.boardScroller}
        role="region"
        tabIndex={0}
        aria-label={formatMessage(copy.scrollableBoard, { items: matchLabelPlural })}
      >
        <div className={styles.board}>
          {presentation.rounds.map((round, index) => {
            const roundName = round.matches[0]
              ? (matchesById.get(round.matches[0].id)?.roundName ??
                formatMessage(copy.round, { number: round.number }))
              : formatMessage(copy.round, { number: round.number });
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
                  <small>
                    {formatMessage(copy.itemCount, {
                      count: round.matches.length,
                      items: matchLabelPlural,
                    })}
                  </small>
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
                <p className={styles.eyebrow}>
                  {formatBracketType(selectedDetails.bracketType, locale)}
                </p>
                <h2>{selectedDetails.roundName}</h2>
              </div>
              <span className={statusClassName(selectedMatch.status)}>
                {formatMatchStatus(selectedMatch.status, locale)}
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
                <dt>{isSmash ? copy.setFormat : copy.seriesFormat}</dt>
                <dd>BO{seriesBestOf}</dd>
              </div>
              <div>
                <dt>{copy.scheduledDate}</dt>
                <dd>{formatScheduledAt(selectedDetails.scheduledAt, locale, copy)}</dd>
              </div>
              <div>
                <dt>{copy.roundLabel}</dt>
                <dd>{selectedDetails.roundName}</dd>
              </div>
              <div>
                <dt>{copy.status}</dt>
                <dd>{formatMatchStatus(selectedMatch.status, locale)}</dd>
              </div>
            </dl>

            {canManage && (
              <div className={styles.operations}>
                <h3>{copy.operations}</h3>
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
                  {copy.reviewDisputes}
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className={styles.detailsEmpty}>
            <h2>{isSmash ? copy.selectSet : copy.selectMatch}</h2>
            <p>{copy.selectHint}</p>
          </div>
        )}
      </aside>
    </section>
  );
}
