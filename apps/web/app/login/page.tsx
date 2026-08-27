'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';

export default function LoginPage() {
  const { dictionary } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : dictionary.auth.loginError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container narrow">
      <h1>{dictionary.auth.loginTitle}</h1>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="email">{dictionary.auth.email}</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password">{dictionary.auth.password}</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? dictionary.auth.loginSubmitting : dictionary.auth.loginSubmit}
        </button>
      </form>
      <p className="muted">
        {dictionary.auth.noAccount} <Link href="/register">{dictionary.auth.registerLink}</Link> ·{' '}
        <Link href="/api/v1/auth/discord">{dictionary.auth.discordLogin}</Link>
      </p>
    </main>
  );
}
