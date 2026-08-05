'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';
import type { OrganizationSummary } from '@opentournament/shared-types';

export default function NewTeamPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient<{ user: { organizations: OrganizationSummary[] } }>('/auth/me')
      .then((data) => {
        setOrganizations(data.user.organizations);
        setOrganizationId(data.user.organizations[0]?.id ?? '');
      })
      .catch(() => router.push('/login'));
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient('/teams', {
        method: 'POST',
        body: JSON.stringify({
          organizationId,
          name,
          tag: tag || undefined,
        }),
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al crear el equipo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>Crear equipo</h1>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="organizationId">Organización</label>
        <select
          id="organizationId"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <label htmlFor="name">Nombre del equipo</label>
        <input
          id="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="tag">Tag (opcional)</label>
        <input
          id="tag"
          maxLength={8}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting || organizations.length === 0}>
          {submitting ? 'Creando…' : 'Crear equipo'}
        </button>
      </form>
      <p className="muted">
        <Link href="/dashboard">← Volver al panel</Link>
      </p>
    </main>
  );
}
