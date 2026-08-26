'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ResultReportingMode } from '@opentournament/shared-types';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';
import { formatMessage, type Dictionary } from '@/lib/i18n';
import { ParticipantAccessSecret } from './participant-access-secret';
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

function errorMessage(error: unknown, copy: Dictionary['participantAccess']): string {
  return error instanceof ApiClientError ? error.message : copy.actionError;
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
  const { dictionary, locale } = useI18n();
  const copy = dictionary.participantAccess;
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
    void loadPasses().catch((loadError: unknown) => setError(errorMessage(loadError, copy)));
  }, [copy, loadPasses]);

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
      setMessage(copy.reportingModeUpdated);
    } catch (saveError) {
      setReportingMode(previousMode);
      setError(errorMessage(saveError, copy));
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
        teamName: team?.teamName ?? copy.participantFallback,
        url: `${window.location.origin}${response.path}`,
      });
      setMessage(copy.linkCreated);
      await loadPasses();
    } catch (createError) {
      setError(errorMessage(createError, copy));
    } finally {
      setBusy(false);
    }
  }

  async function copyLatestLink() {
    if (!latestLink) return;
    try {
      await navigator.clipboard.writeText(latestLink.url);
      setMessage(copy.linkCopied);
    } catch {
      setError(copy.copyFailed);
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
      setMessage(copy.passRevoked);
      await loadPasses();
    } catch (revokeError) {
      setError(errorMessage(revokeError, copy));
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
          <h3>{copy.resultReporting}</h3>
          <p>{copy.reportingDescription}</p>
        </div>
        <label>
          {copy.confirmationMode}
          <select
            value={reportingMode}
            onChange={(event) => void saveReportingMode(event.target.value as ResultReportingMode)}
          >
            <option value="bilateral">{copy.bilateral}</option>
            <option value="winner_reports">{copy.winnerReports}</option>
            <option value="staff_only">{copy.staffOnly}</option>
          </select>
        </label>
      </div>

      <div className={styles.block}>
        <div>
          <h3>{copy.privatePasses}</h3>
          <p>{copy.passesDescription}</p>
        </div>
        {eligibleTeams.length === 0 ? (
          <p>{copy.noApprovedParticipants}</p>
        ) : (
          <div className={styles.createRow}>
            <label>
              {copy.participant}
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
              {busy ? copy.processing : copy.createOrRegenerate}
            </button>
          </div>
        )}

        {latestLink && (
          <ParticipantAccessSecret
            teamName={latestLink.teamName}
            url={latestLink.url}
            onCopy={copyLatestLink}
          />
        )}

        {activePasses.length > 0 && (
          <ul className={styles.passList}>
            {activePasses.map((accessPass) => (
              <li key={accessPass.id}>
                <span>
                  <strong>{accessPass.teamName}</strong>
                  <small>
                    {accessPass.lastUsedAt
                      ? formatMessage(copy.usedAt, {
                          date: new Intl.DateTimeFormat(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(accessPass.lastUsedAt)),
                        })
                      : copy.neverUsed}
                  </small>
                </span>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => void revokePass(accessPass.id)}
                >
                  {copy.revoke}
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
