'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { adapters } from '@opentournament/game-adapters';
import { apiClient, ApiClientError } from '@/lib/api';
import type { GameAdapterKey, OrganizationSummary } from '@opentournament/shared-types';

const GAME_OPTIONS = Object.values(adapters).map((adapter) => ({
  key: adapter.key,
  label: adapter.name,
}));

export default function NewTeamPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [gameAdapterKey, setGameAdapterKey] = useState<GameAdapterKey>('generic');
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
          gameAdapterKey,
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

  const isSmash = gameAdapterKey === 'smash_ultimate';

  return (
    <main className="container">
      <h1>Crear {isSmash ? 'jugador' : 'equipo'}</h1>
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
          onChange={(event) => setGameAdapterKey(event.target.value as GameAdapterKey)}
        >
          {GAME_OPTIONS.map((game) => (
            <option key={game.key} value={game.key}>
              {game.label}
            </option>
          ))}
        </select>
        {isSmash && (
          <p className="muted">
            En Smash Ultimate cada participante es individual: este perfil representa a un solo
            jugador. Podés usar un nombre visible distinto de su tag competitivo.
          </p>
        )}
        <label htmlFor="name">Nombre visible {isSmash ? 'del jugador' : 'del equipo'}</label>
        <input
          id="name"
          required
          minLength={2}
          maxLength={40}
          aria-describedby="team-name-help"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="muted" id="team-name-help">
          {isSmash
            ? 'Es el nombre que verá el staff para identificar al jugador.'
            : 'Es el nombre completo que aparecerá en torneos y resultados.'}
        </p>
        <label htmlFor="tag">
          {isSmash ? 'Tag competitivo' : 'Identificador corto'} (opcional)
        </label>
        <input
          id="tag"
          minLength={isSmash ? 1 : 2}
          maxLength={isSmash ? 32 : 8}
          pattern={isSmash ? undefined : '[A-Za-z0-9]+'}
          placeholder={isSmash ? 'Ej. MkLeo' : 'Ej. OTGG'}
          aria-describedby="team-tag-help"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <p className="muted" id="team-tag-help">
          {isSmash
            ? 'Entre 1 y 32 caracteres; se permiten espacios y símbolos.'
            : 'Entre 2 y 8 letras o números, sin espacios.'}
        </p>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting || organizations.length === 0}>
          {submitting ? 'Creando…' : `Crear ${isSmash ? 'jugador' : 'equipo'}`}
        </button>
      </form>
      <p className="muted">
        <Link href="/dashboard">← Volver al panel</Link>
      </p>
    </main>
  );
}
