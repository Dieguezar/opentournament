'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { GameAdapterKey, TournamentStatus } from '@opentournament/shared-types';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';
import { formatMessage, type Dictionary, type Locale } from '@/lib/i18n';
import { formatGameAdapter } from '@/lib/presentation';
import {
  classifyTeamsForRegistration,
  getRegisterPanelLoadState,
  getRegistrationEntryPresentation,
} from '@/lib/register-panel';

interface TeamEntry {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  registrationStatus: string | null;
  waitlistPosition: number | null;
  checkedIn: boolean | null;
}

interface MyTeam {
  id: string;
  name: string;
  captainId: string;
  gameAdapterKey: GameAdapterKey | null;
}

interface PanelData {
  entries: TeamEntry[];
  myTeams: MyTeam[];
  currentUserId: string | null;
  isAuthenticated: boolean;
}

function getRequestErrorMessage(
  error: unknown,
  locale: Locale,
  copy: Dictionary['registrationPanel'],
): string {
  if (error instanceof ApiClientError && locale === 'es') return error.message;
  return copy.actionError;
}

function getLoadErrorMessage(error: unknown, copy: Dictionary['registrationPanel']): string {
  if (error instanceof ApiClientError && error.status >= 500) {
    return copy.loadServiceError;
  }
  return copy.loadError;
}

function isUnauthorizedResult(result: PromiseSettledResult<unknown>): boolean {
  return (
    result.status === 'rejected' &&
    result.reason instanceof ApiClientError &&
    result.reason.status === 401
  );
}

async function loadPanelData(tournamentId: string, signal?: AbortSignal): Promise<PanelData> {
  const [entriesResult, teamsResult, meResult] = await Promise.allSettled([
    apiClient<{ teams: TeamEntry[] }>(`/tournaments/${tournamentId}/teams`, { signal }),
    apiClient<{ teams: MyTeam[] }>('/teams/mine', { signal }),
    apiClient<{ user: { id: string } }>('/auth/me', { signal }),
  ]);

  if (entriesResult.status === 'rejected') throw entriesResult.reason;
  if (isUnauthorizedResult(teamsResult) || isUnauthorizedResult(meResult)) {
    return {
      entries: entriesResult.value.teams,
      myTeams: [],
      currentUserId: null,
      isAuthenticated: false,
    };
  }
  if (teamsResult.status === 'rejected') throw teamsResult.reason;
  if (meResult.status === 'rejected') throw meResult.reason;

  return {
    entries: entriesResult.value.teams,
    myTeams: teamsResult.value.teams,
    currentUserId: meResult.value.user.id,
    isAuthenticated: true,
  };
}

export function RegisterPanel({
  tournamentId,
  gameAdapterKey,
  tournamentStatus,
}: {
  tournamentId: string;
  gameAdapterKey: GameAdapterKey;
  tournamentStatus: TournamentStatus;
}) {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.registrationPanel;
  const router = useRouter();
  const isPlayer = gameAdapterKey === 'smash_ultimate';
  const [entries, setEntries] = useState<TeamEntry[]>([]);
  const [myTeams, setMyTeams] = useState<MyTeam[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyTeam, setBusyTeam] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPanelData = useCallback(
    async (signal?: AbortSignal) => {
      const data = await loadPanelData(tournamentId, signal);
      setEntries(data.entries);
      setMyTeams(data.myTeams);
      setCurrentUserId(data.currentUserId);
      setIsAuthenticated(data.isAuthenticated);
    },
    [tournamentId],
  );

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    void refreshPanelData(controller.signal)
      .catch((requestError: unknown) => {
        if (!isActive) return;
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setLoadError(getLoadErrorMessage(requestError, copy));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [copy, refreshPanelData]);

  const { compatibleTeams, configurableTeams, readOnlyTeams, hiddenTeamCount } =
    classifyTeamsForRegistration(myTeams, gameAdapterKey, currentUserId);
  const panelLoadState = getRegisterPanelLoadState({
    isLoading,
    loadError,
    isAuthenticated,
  });

  async function run(teamId: string, action: 'register' | 'checkin') {
    const path =
      action === 'checkin'
        ? `/tournaments/${tournamentId}/check-in`
        : `/tournaments/${tournamentId}/registrations`;
    setBusyTeam(teamId);
    setActionError(null);
    setStatusMessage(null);
    try {
      await apiClient(path, { method: 'POST', body: JSON.stringify({ teamId }) });
      await refreshPanelData();
      setStatusMessage(action === 'checkin' ? copy.checkInConfirmed : copy.registrationSent);
      router.refresh();
    } catch (err) {
      setActionError(getRequestErrorMessage(err, locale, copy));
    } finally {
      setBusyTeam(null);
    }
  }

  async function configureTeam(teamId: string) {
    const gameName = formatGameAdapter(gameAdapterKey, locale);
    setBusyTeam(teamId);
    setActionError(null);
    setStatusMessage(null);
    try {
      await apiClient(`/teams/${teamId}/game-adapter`, {
        method: 'PATCH',
        body: JSON.stringify({ gameAdapterKey }),
      });
      await refreshPanelData();
      setStatusMessage(formatMessage(copy.profileConfigured, { game: gameName }));
    } catch (requestError) {
      setActionError(getRequestErrorMessage(requestError, locale, copy));
    } finally {
      setBusyTeam(null);
    }
  }

  if (panelLoadState === 'loading') {
    return (
      <div className="card">
        <h2>{copy.participate}</h2>
        <p className="muted" role="status">
          {copy.loadingProfiles}
        </p>
      </div>
    );
  }

  if (panelLoadState === 'error') {
    return (
      <div className="card">
        <h2>{copy.participate}</h2>
        <p className="error" role="alert" aria-live="assertive">
          {loadError}
        </p>
      </div>
    );
  }

  if (panelLoadState === 'anonymous') {
    return (
      <div className="card">
        <h2>{copy.participate}</h2>
        <p className="muted">
          <Link href="/login">{copy.signIn}</Link> {copy.signInSuffix}
        </p>
      </div>
    );
  }

  if (myTeams.length === 0) {
    return (
      <div className="card">
        <h2>{copy.participate}</h2>
        {tournamentStatus === 'checkin_open' ? (
          <p className="muted">{copy.registrationClosedNoProfiles}</p>
        ) : (
          <p className="muted">
            {isPlayer ? copy.needPlayerProfile : copy.needTeam}{' '}
            <Link href="/teams/new">{isPlayer ? copy.createProfile : copy.createTeam}</Link>
          </p>
        )}
      </div>
    );
  }

  if (
    compatibleTeams.length === 0 &&
    configurableTeams.length === 0 &&
    readOnlyTeams.length === 0
  ) {
    return (
      <div className="card">
        <h2>{copy.participate}</h2>
        {tournamentStatus === 'checkin_open' ? (
          <p className="muted">{copy.registrationClosedNoCompatible}</p>
        ) : (
          <p className="muted">
            {isPlayer ? copy.noCompatiblePlayer : copy.noCompatibleTeam}{' '}
            <Link href="/teams/new">{copy.createCorrectGame}</Link> {copy.createCorrectGameSuffix}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{copy.participate}</h2>
      {tournamentStatus === 'checkin_open' && (
        <p className="muted">{copy.registrationClosedNotice}</p>
      )}
      {compatibleTeams.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {compatibleTeams.map((team) => {
            const entry = entries.find((candidate) => candidate.teamId === team.id) ?? null;
            const busy = busyTeam === team.id;
            const presentation = getRegistrationEntryPresentation(tournamentStatus, entry, locale);
            const statusLabel =
              entry?.registrationStatus === 'waitlisted' && entry.waitlistPosition
                ? formatMessage(copy.waitlistPosition, { position: entry.waitlistPosition })
                : presentation.statusLabel;

            return (
              <li key={team.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{team.name}</strong>{' '}
                <span className={presentation.badgeClassName}>{statusLabel}</span>
                {presentation.action && (
                  <div className="actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(team.id, presentation.action!)}
                    >
                      {busy
                        ? copy.processing
                        : presentation.action === 'checkin'
                          ? isPlayer
                            ? copy.checkInPlayer
                            : copy.checkInTeam
                          : isPlayer
                            ? copy.registerPlayer
                            : copy.registerTeam}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {tournamentStatus === 'open' && configurableTeams.length > 0 && (
        <section aria-labelledby="configure-game-title">
          <h3 id="configure-game-title">{isPlayer ? copy.configureProfile : copy.configureTeam}</h3>
          <p className="muted">{copy.undefinedGameDescription}</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {configurableTeams.map((team) => {
              const busy = busyTeam === team.id;
              return (
                <li key={team.id} style={{ marginBottom: '0.75rem' }}>
                  <strong>{team.name}</strong> <span className="badge">{copy.noGame}</span>
                  <div className="actions">
                    <button type="button" disabled={busy} onClick={() => configureTeam(team.id)}>
                      {busy
                        ? copy.configuring
                        : formatMessage(copy.configureFor, {
                            game: formatGameAdapter(gameAdapterKey, locale),
                          })}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {readOnlyTeams.length > 0 && (
        <section aria-labelledby="read-only-profiles-title">
          <h3 id="read-only-profiles-title">{copy.readOnlyProfiles}</h3>
          <p className="muted">{copy.readOnlyDescription}</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {readOnlyTeams.map((team) => (
              <li key={team.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{team.name}</strong> <span className="badge">{copy.noActions}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {hiddenTeamCount > 0 && <p className="muted">{copy.hiddenOtherGames}</p>}
      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}
      {statusMessage && (
        <p className="muted" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
