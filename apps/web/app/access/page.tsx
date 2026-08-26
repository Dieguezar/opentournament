'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';
import styles from './page.module.css';

export default function ParticipantAccessPage() {
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
            exchangeError instanceof ApiClientError
              ? exchangeError.message
              : 'No pudimos abrir el pase. Intentá de nuevo.',
        });
      }
    },
    [router],
  );

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', '/access');
    if (!token) {
      setState({
        kind: 'error',
        message: 'Este enlace no contiene un pase válido. Pedile uno nuevo a la organización.',
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
          message: 'No pudimos comprobar la sesión actual. Intentá de nuevo.',
        });
      });
  }, [exchangePass]);

  const isError = state.kind === 'error';
  const isConfirm = state.kind === 'confirm';

  return (
    <main className={`container narrow ${styles.page}`}>
      <section className={`card ${styles.card}`} aria-live="polite">
        <p className={styles.eyebrow}>Acceso de participante</p>
        <h1>
          {isError
            ? 'No pudimos abrir el pase'
            : isConfirm
              ? '¿Reemplazar la sesión activa?'
              : 'Preparando tu torneo…'}
        </h1>
        {isConfirm ? (
          <>
            <p className={styles.warning} role="alert">
              Este pase reemplazará la sesión activa en este navegador y en todas sus pestañas.
              Ahora estás como {state.currentUser}.
            </p>
            <div className={styles.actions}>
              <button type="button" onClick={() => void exchangePass(state.token)}>
                Continuar con el pase
              </button>
              <Link href="/">Cancelar</Link>
            </div>
          </>
        ) : (
          <p>
            {isError
              ? state.message
              : 'Estamos verificando el enlace y limitando la sesión a tu participante.'}
          </p>
        )}
        {(state.kind === 'checking' || state.kind === 'exchanging') && (
          <div className={styles.progress} aria-hidden="true" />
        )}
        {isError && <Link href="/">Volver al inicio</Link>}
      </section>
    </main>
  );
}
