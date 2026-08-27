'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';

export default function RegisterPage() {
  const { dictionary, locale } = useI18n();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient<{
        requiresEmailVerification: boolean;
        verificationDelivery: 'smtp' | 'console' | null;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, password, locale }),
      });
      if (result.requiresEmailVerification) {
        const verificationDelivery = result.verificationDelivery ?? 'console';
        router.push(
          `/verify-email?email=${encodeURIComponent(email)}&delivery=${verificationDelivery}`,
        );
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : dictionary.auth.registerError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>{dictionary.auth.registerTitle}</h1>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="displayName">{dictionary.auth.displayName}</label>
        <input
          id="displayName"
          required
          minLength={2}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label htmlFor="email">{dictionary.auth.email}</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password">{dictionary.auth.passwordRequirements}</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? dictionary.auth.registerSubmitting : dictionary.auth.registerSubmit}
        </button>
      </form>
      <p className="muted">
        {dictionary.auth.hasAccount} <Link href="/login">{dictionary.auth.loginLink}</Link>
      </p>
    </main>
  );
}
