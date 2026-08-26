'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';
import { formatMessage } from '@/lib/i18n';
import styles from './page.module.css';

export default function ParticipantAccessPage() {
  const { dictionary } = useI18n();
  const copy = dictionary.secondaryFlows;
  const router = useRouter();
  const [state, setState] = useState<
    | { kind: 'checking' | 'exchanging' }
    | { kind: 'confirm'; token: string; currentUser: string }
    | { kind: 'error'; message: string }
  >({ kind: 'checking' });

  const exchangePass = useCallback(
    async (token: string) => {
      setState({ kind: 'exchanging' });
      try {
        const { tournament } = await apiClient<{ tournament: { slug: string } }>(
          '/auth/participant-pass',
          {
            method: 'POST',
            body: JSON.stringify({ token }),
          },
        );
        router.replace(`/t/${tournament.slug}#reportar`);
        router.refresh();
      } catch (exchangeError: unknown) {
        setState({
          kind: 'error',
          message:
            exchangeError instanceof ApiClientError ? exchangeError.message : copy.accessOpenError,
        });
      }
    },
    [copy.accessOpenError, router],
  );

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', '/access');
    if (!token) {
      setState({
        kind: 'error',
        message: copy.invalidPass,
      });
      return;
    }

    void apiClient<{ user: { displayName: string } }>('/auth/me')
      .then(({ user }) => {
        setState({ kind: 'confirm', token, currentUser: user.displayName });
      })
      .catch((authError: unknown) => {
        if (authError instanceof ApiClientError && authError.status === 401) {
          void exchangePass(token);
          return;
        }
        setState({
          kind: 'error',
          message: copy.sessionCheckError,
        });
      });
  }, [copy.invalidPass, copy.sessionCheckError, exchangePass]);

  const isError = state.kind === 'error';
  const isConfirm = state.kind === 'confirm';

  return (
    <main className={`container narrow ${styles.page}`}>
      <section className={`card ${styles.card}`} aria-live="polite">
        <p className={styles.eyebrow}>{copy.accessEyebrow}</p>
        <h1>
          {isError
            ? copy.unableToOpenPass
            : isConfirm
              ? copy.replaceSession
              : copy.preparingTournament}
        </h1>
        {isConfirm ? (
          <>
            <p className={styles.warning} role="alert">
              {formatMessage(copy.sessionWarning, { name: state.currentUser })}
            </p>
            <div className={styles.actions}>
              <button type="button" onClick={() => void exchangePass(state.token)}>
                {copy.continueWithPass}
              </button>
              <Link href="/">{copy.cancel}</Link>
            </div>
          </>
        ) : (
          <p>{isError ? state.message : copy.verifyingPass}</p>
        )}
        {(state.kind === 'checking' || state.kind === 'exchanging') && (
          <div className={styles.progress} aria-hidden="true" />
        )}
        {isError && <Link href="/">{copy.backHome}</Link>}
      </section>
    </main>
  );
}
