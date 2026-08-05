'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, ApiClientError } from '@/lib/api';
import type { OrganizationSummary } from '@opentournament/shared-types';

const GAME_OPTIONS = [
  { key: 'generic', label: 'Genérico' },
  { key: 'valorant', label: 'Valorant' },
  { key: 'cs2', label: 'Counter-Strike 2' },
  { key: 'lol', label: 'League of Legends' },
];

export default function NewTournamentPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [gameAdapterKey, setGameAdapterKey] = useState('generic');
  const [format, setFormat] = useState('single_elimination');
  const [capacity, setCapacity] = useState('16');
  const [bo, setBo] = useState('3');
  const [manualApproval, setManualApproval] = useState(false);
  const [grandFinalReset, setGrandFinalReset] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
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
      const result = await apiClient<{ tournament: { id: string } }>('/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          organizationId,
          gameAdapterKey,
          slug,
          name,
          format,
          capacity: Number(capacity),
          seriesConfig: { bo: Number(bo), drawsAllowed: false },
          registrationConfig: { manualApproval },
          settings: { grandFinalReset, presencial: false },
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          description: description || undefined,
          rules: rules || undefined,
        }),
      });
      router.push(`/tournaments/${result.tournament.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al crear el torneo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>Crear torneo</h1>
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
        <label htmlFor="gameAdapterKey">Juego</label>
        <select
          id="gameAdapterKey"
          value={gameAdapterKey}
          onChange={(e) => setGameAdapterKey(e.target.value)}
        >
          {GAME_OPTIONS.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
        <label htmlFor="name">Nombre del torneo</label>
        <input id="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="slug">Slug (URL)</label>
        <input
          id="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <label htmlFor="format">Formato</label>
        <select id="format" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="single_elimination">Eliminación sencilla</option>
          <option value="double_elimination">Doble eliminación</option>
        </select>
        <label htmlFor="capacity">Cupo</label>
        <input
          id="capacity"
          type="number"
          min={2}
          max={512}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <label htmlFor="bo">Formato de series</label>
        <select id="bo" value={bo} onChange={(e) => setBo(e.target.value)}>
          <option value="1">BO1</option>
          <option value="3">BO3</option>
          <option value="5">BO5</option>
        </select>
        <label htmlFor="startsAt">Inicio</label>
        <input
          id="startsAt"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={manualApproval}
            onChange={(e) => setManualApproval(e.target.checked)}
          />{' '}
          Aprobación manual de inscripciones
        </label>
        <label>
          <input
            type="checkbox"
            checked={grandFinalReset}
            onChange={(e) => setGrandFinalReset(e.target.checked)}
          />{' '}
          Gran final con reset (doble eliminación)
        </label>
        <label htmlFor="description">Descripción</label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label htmlFor="rules">Reglas</label>
        <textarea id="rules" rows={5} value={rules} onChange={(e) => setRules(e.target.value)} />
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting || organizations.length === 0}>
          {submitting ? 'Creando…' : 'Crear torneo'}
        </button>
      </form>
      <p className="muted">
        <Link href="/dashboard">← Volver al panel</Link>
      </p>
    </main>
  );
}
