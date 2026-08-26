'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { adapters } from '@opentournament/game-adapters';
import { useI18n } from '@/components/i18n-provider';
import { apiClient, ApiClientError } from '@/lib/api';
import { formatGameAdapter } from '@/lib/presentation';
import type { GameAdapterKey, OrganizationSummary } from '@opentournament/shared-types';

const GAME_OPTIONS = Object.values(adapters).map((adapter) => ({
  key: adapter.key,
}));

export default function NewTeamPage() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.secondaryFlows;
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
      setError(err instanceof ApiClientError ? err.message : copy.createTeamError);
    } finally {
      setSubmitting(false);
    }
  }

  const isSmash = gameAdapterKey === 'smash_ultimate';

  return (
    <main className="container">
      <h1>{isSmash ? copy.createPlayer : copy.createTeam}</h1>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="organizationId">{copy.organization}</label>
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
        <label htmlFor="gameAdapterKey">{copy.game}</label>
        <select
          id="gameAdapterKey"
          value={gameAdapterKey}
          onChange={(event) => setGameAdapterKey(event.target.value as GameAdapterKey)}
        >
          {GAME_OPTIONS.map((game) => (
            <option key={game.key} value={game.key}>
              {formatGameAdapter(game.key, locale)}
            </option>
          ))}
        </select>
        {isSmash && <p className="muted">{copy.smashProfileHelp}</p>}
        <label htmlFor="name">{isSmash ? copy.playerDisplayName : copy.teamDisplayName}</label>
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
          {isSmash ? copy.playerNameHelp : copy.teamNameHelp}
        </p>
        <label htmlFor="tag">
          {isSmash ? copy.competitiveTag : copy.shortIdentifier} ({copy.optional})
        </label>
        <input
          id="tag"
          minLength={isSmash ? 1 : 2}
          maxLength={isSmash ? 32 : 8}
          pattern={isSmash ? undefined : '[A-Za-z0-9]+'}
          placeholder={isSmash ? copy.playerTagPlaceholder : copy.teamTagPlaceholder}
          aria-describedby="team-tag-help"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <p className="muted" id="team-tag-help">
          {isSmash ? copy.playerTagHelp : copy.teamTagHelp}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting || organizations.length === 0}>
          {submitting ? copy.creating : isSmash ? copy.createPlayer : copy.createTeam}
        </button>
      </form>
      <p className="muted">
        <Link href="/dashboard">← {copy.backDashboard}</Link>
      </p>
    </main>
  );
}
