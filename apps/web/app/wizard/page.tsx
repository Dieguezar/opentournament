'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';

export default function WizardPage() {
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
      setError(err instanceof ApiClientError ? err.message : 'Error al crear la organización');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>Crear tu organización</h1>
      <p className="muted">
        Las organizaciones agrupan tus torneos y equipos. Este es el primer paso.
      </p>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="name">Nombre de la organización</label>
        <input
          id="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="slug">Slug (URL)</label>
        <input
          id="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="mi-comunidad"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear organización'}
        </button>
      </form>
    </main>
  );
}
