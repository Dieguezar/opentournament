'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ResultReportingMode } from '@opentournament/shared-types';
import { apiClient, ApiClientError } from '@/lib/api';
import styles from './participant-access-manager.module.css';

interface EligibleTeam {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  status: string;
}

interface AccessPassView {
  id: string;
  teamId: string;
  teamName: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : 'No pudimos completar la acción';
}

export function ParticipantAccessManager({
  tournamentId,
  registrations,
  initialReportingMode,
}: {
  tournamentId: string;
  registrations: EligibleTeam[];
  initialReportingMode: ResultReportingMode;
}) {
  const eligibleTeams = useMemo(
    () => registrations.filter((registration) => registration.status === 'approved'),
    [registrations],
  );
  const [reportingMode, setReportingMode] = useState<ResultReportingMode>(initialReportingMode);
  const [passes, setPasses] = useState<AccessPassView[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(eligibleTeams[0]?.teamId ?? '');
  const [latestLink, setLatestLink] = useState<{ teamName: string; url: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadPasses = useCallback(async () => {
    const response = await apiClient<{ accessPasses: AccessPassView[] }>(
      `/tournaments/${tournamentId}/access-passes`,
    );
    setPasses(response.accessPasses);
  }, [tournamentId]);

  useEffect(() => {
    void loadPasses().catch((loadError: unknown) => setError(errorMessage(loadError)));
  }, [loadPasses]);

  async function saveReportingMode(nextMode: ResultReportingMode) {
    const previousMode = reportingMode;
    setReportingMode(nextMode);
    setError(null);
    setMessage(null);
    try {
      await apiClient(`/tournaments/${tournamentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ reportingMode: nextMode }),
      });
      setMessage('Modo de reporte actualizado.');
    } catch (saveError) {
      setReportingMode(previousMode);
      setError(errorMessage(saveError));
    }
  }

  async function createPass() {
    if (!selectedTeamId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiClient<{
        token: string;
        path: string;
      }>(`/tournaments/${tournamentId}/access-passes`, {
        method: 'POST',
        body: JSON.stringify({ teamId: selectedTeamId, expiresInHours: 24 * 7 }),
      });
      const team = eligibleTeams.find((candidate) => candidate.teamId === selectedTeamId);
      setLatestLink({
        teamName: team?.teamName ?? 'Participante',
        url: `${window.location.origin}${response.path}`,
      });
      setMessage('Enlace creado. Si ya existía otro para este equipo, quedó revocado.');
      await loadPasses();
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setBusy(false);
    }
  }

  async function copyLatestLink() {
    if (!latestLink) return;
    try {
      await navigator.clipboard.writeText(latestLink.url);
      setMessage('Enlace copiado al portapapeles.');
    } catch {
      setError('No pudimos copiarlo automáticamente. Seleccioná y copiá el enlace.');
    }
  }

  async function revokePass(passId: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiClient(`/tournaments/${tournamentId}/access-passes/${passId}`, {
        method: 'DELETE',
      });
      setLatestLink(null);
      setMessage('Pase revocado. Sus sesiones ya no tienen acceso.');
      await loadPasses();
    } catch (revokeError) {
      setError(errorMessage(revokeError));
    } finally {
      setBusy(false);
    }
  }

  const activePasses = passes.filter(
    (accessPass) => !accessPass.revokedAt && new Date(accessPass.expiresAt) > new Date(),
  );

  return (
    <div className={styles.manager}>
      <div className={styles.block}>
        <div>
          <h3>Reporte de resultados</h3>
          <p>Podés cambiar esta política sin volver a crear el torneo.</p>
        </div>
        <label>
          Modo de confirmación
          <select
            value={reportingMode}
            onChange={(event) => void saveReportingMode(event.target.value as ResultReportingMode)}
          >
            <option value="bilateral">Ambos participantes confirman</option>
            <option value="winner_reports">El ganador reporta</option>
            <option value="staff_only">Sólo el staff reporta</option>
          </select>
        </label>
      </div>

      <div className={styles.block}>
        <div>
          <h3>Pases privados</h3>
          <p>
            Dan acceso sólo a este torneo y equipo. El token se muestra una vez y no viaja en la URL
            al servidor.
          </p>
        </div>
        {eligibleTeams.length === 0 ? (
          <p>No hay participantes aprobados todavía.</p>
        ) : (
          <div className={styles.createRow}>
            <label>
              Participante
              <select
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(event.target.value)}
              >
                {eligibleTeams.map((team) => (
                  <option value={team.teamId} key={team.teamId}>
                    {team.teamName}
                    {team.teamTag ? ` · ${team.teamTag}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy || !selectedTeamId} onClick={createPass}>
              {busy ? 'Procesando…' : 'Crear o regenerar enlace'}
            </button>
          </div>
        )}

        {latestLink && (
          <div className={styles.secretBox}>
            <strong>Enlace nuevo para {latestLink.teamName}</strong>
            <input aria-label="Enlace privado recién generado" readOnly value={latestLink.url} />
            <button type="button" className="button button-secondary" onClick={copyLatestLink}>
              Copiar enlace
            </button>
            <small>Guardalo ahora: por seguridad no podremos volver a mostrar el token.</small>
          </div>
        )}

        {activePasses.length > 0 && (
          <ul className={styles.passList}>
            {activePasses.map((accessPass) => (
              <li key={accessPass.id}>
                <span>
                  <strong>{accessPass.teamName}</strong>
                  <small>
                    {accessPass.lastUsedAt
                      ? `Usado ${new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(accessPass.lastUsedAt))}`
                      : 'Todavía no fue usado'}
                  </small>
                </span>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => void revokePass(accessPass.id)}
                >
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.feedback} aria-live="polite">
        {message && <p className={styles.success}>{message}</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
