'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { GameAdapterKey, TournamentStatus } from '@opentournament/shared-types';
import { apiClient, ApiClientError } from '@/lib/api';
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

function getRequestErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return 'No se pudo completar la acción. Intentá de nuevo.';
}

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.status >= 500) {
    return 'No pudimos cargar tus perfiles porque el servicio no está disponible. Intentá de nuevo en unos minutos.';
  }
  return 'No pudimos cargar tus perfiles. Recargá la página para intentar de nuevo.';
}

function isUnauthorizedResult(
  result: PromiseSettledResult<unknown>,
): boolean {
  return (
    result.status === 'rejected' &&
    result.reason instanceof ApiClientError &&
    result.reason.status === 401
  );
}

async function loadPanelData(
  tournamentId: string,
  signal?: AbortSignal,
): Promise<PanelData> {
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
        setLoadError(getLoadErrorMessage(requestError));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [refreshPanelData]);

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
      setStatusMessage(
        action === 'checkin'
          ? 'Check-in confirmado. El estado ya está actualizado.'
          : 'Inscripción enviada. El estado ya está actualizado.',
      );
      router.refresh();
    } catch (err) {
      setActionError(getRequestErrorMessage(err));
    } finally {
      setBusyTeam(null);
    }
  }

  async function configureTeam(teamId: string) {
    const gameName = formatGameAdapter(gameAdapterKey);
    setBusyTeam(teamId);
    setActionError(null);
    setStatusMessage(null);
    try {
      await apiClient(`/teams/${teamId}/game-adapter`, {
        method: 'PATCH',
        body: JSON.stringify({ gameAdapterKey }),
      });
      await refreshPanelData();
      setStatusMessage(`Perfil configurado para ${gameName}. Ya podés inscribirte.`);
    } catch (requestError) {
      setActionError(getRequestErrorMessage(requestError));
    } finally {
      setBusyTeam(null);
    }
  }

  if (panelLoadState === 'loading') {
    return (
      <div className="card">
        <h2>Participar</h2>
        <p className="muted" role="status">Cargando tus perfiles…</p>
      </div>
    );
  }

  if (panelLoadState === 'error') {
    return (
      <div className="card">
        <h2>Participar</h2>
        <p className="error" role="alert" aria-live="assertive">
          {loadError}
        </p>
      </div>
    );
  }

  if (panelLoadState === 'anonymous') {
    return (
      <div className="card">
        <h2>Participar</h2>
        <p className="muted">
          <Link href="/login">Iniciá sesión</Link> para inscribirte o completar tu check-in.
        </p>
      </div>
    );
  }

  if (myTeams.length === 0) {
    return (
      <div className="card">
        <h2>Participar</h2>
        {tournamentStatus === 'checkin_open' ? (
          <p className="muted">
            Las inscripciones están cerradas y no tenés perfiles inscritos habilitados para
            completar el check-in.
          </p>
        ) : (
          <p className="muted">
            Para inscribirte necesitás {isPlayer ? 'un perfil de jugador' : 'un equipo'}.{' '}
            <Link href="/teams/new">Creá {isPlayer ? 'tu perfil' : 'tu equipo'}</Link>
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
        <h2>Participar</h2>
        {tournamentStatus === 'checkin_open' ? (
          <p className="muted">
            Las inscripciones están cerradas y no tenés perfiles compatibles ya inscritos para
            completar el check-in.
          </p>
        ) : (
          <p className="muted">
            No tenés {isPlayer ? 'un jugador' : 'un equipo'} compatible con este torneo.{' '}
            <Link href="/teams/new">Crealo con el juego correcto</Link> para poder inscribirte.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Participar</h2>
      {tournamentStatus === 'checkin_open' && (
        <p className="muted">
          Las inscripciones están cerradas. Sólo los perfiles ya inscritos pueden completar el
          check-in.
        </p>
      )}
      {compatibleTeams.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {compatibleTeams.map((team) => {
            const entry = entries.find((candidate) => candidate.teamId === team.id) ?? null;
            const busy = busyTeam === team.id;
            const presentation = getRegistrationEntryPresentation(tournamentStatus, entry);
            const statusLabel =
              entry?.registrationStatus === 'waitlisted' && entry.waitlistPosition
                ? `En lista de espera #${entry.waitlistPosition}`
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
                        ? 'Procesando…'
                        : presentation.action === 'checkin'
                          ? `Check-in del ${isPlayer ? 'jugador' : 'equipo'}`
                          : `Inscribir ${isPlayer ? 'jugador' : 'equipo'}`}
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
          <h3 id="configure-game-title">
            Configurá {isPlayer ? 'tu perfil' : 'tu equipo'}
          </h3>
          <p className="muted">
            Estos perfiles todavía no tienen un juego definido. La configuración sólo cambia al
            confirmarla.
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {configurableTeams.map((team) => {
              const busy = busyTeam === team.id;
              return (
                <li key={team.id} style={{ marginBottom: '0.75rem' }}>
                  <strong>{team.name}</strong> <span className="badge">Sin juego definido</span>
                  <div className="actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => configureTeam(team.id)}
                    >
                      {busy
                        ? 'Configurando…'
                        : `Configurar para ${formatGameAdapter(gameAdapterKey)}`}
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
          <h3 id="read-only-profiles-title">Perfiles en modo lectura</h3>
          <p className="muted">
            Formás parte de estos perfiles, pero sólo su capitán puede inscribirlos o completar el
            check-in.
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {readOnlyTeams.map((team) => (
              <li key={team.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{team.name}</strong> <span className="badge">Sin acciones disponibles</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {hiddenTeamCount > 0 && (
        <p className="muted">
          No mostramos tus perfiles de otros juegos porque no pueden participar en este torneo.
        </p>
      )}
      {actionError && <p className="error" role="alert">{actionError}</p>}
      {statusMessage && (
        <p className="muted" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
