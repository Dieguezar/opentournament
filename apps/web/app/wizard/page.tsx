'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';

export default function WizardPage() {
  const { dictionary } = useI18n();
  const copy = dictionary.secondaryFlows;
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : copy.createOrganizationError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>{copy.createOrganizationTitle}</h1>
      <p className="muted">{copy.createOrganizationIntro}</p>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="name">{copy.organizationName}</label>
        <input
          id="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="slug">{copy.slug}</label>
        <input
          id="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder={copy.organizationPlaceholder}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? copy.creating : copy.createOrganization}
        </button>
      </form>
    </main>
  );
}
