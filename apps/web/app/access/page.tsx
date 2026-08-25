'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';
import styles from './page.module.css';

export default function ParticipantAccessPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', '/access');
    if (!token) {
      setError('Este enlace no contiene un pase válido. Pedile uno nuevo a la organización.');
      return;
    }

    void apiClient<{ tournament: { slug: string } }>('/auth/participant-pass', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(({ tournament }) => {
        router.replace(`/t/${tournament.slug}#reportar`);
        router.refresh();
      })
      .catch((exchangeError: unknown) => {
        setError(
          exchangeError instanceof ApiClientError
            ? exchangeError.message
            : 'No pudimos abrir el pase. Intentá de nuevo.',
        );
      });
  }, [router]);

  return (
    <main className={`container narrow ${styles.page}`}>
      <section className={`card ${styles.card}`} aria-live="polite">
        <p className={styles.eyebrow}>Acceso de participante</p>
        <h1>{error ? 'No pudimos abrir el pase' : 'Preparando tu torneo…'}</h1>
        <p>{error ?? 'Estamos verificando el enlace y limitando la sesión a tu participante.'}</p>
        {!error && <div className={styles.progress} aria-hidden="true" />}
        {error && <Link href="/">Volver al inicio</Link>}
      </section>
    </main>
  );
}
