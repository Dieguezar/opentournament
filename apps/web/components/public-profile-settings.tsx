'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { useI18n } from './i18n-provider';
import { ApiClientError, apiClient } from '../lib/api';

export interface OwnerPublicProfile {
  slug: string;
  gamertag: string;
  realName: string | null;
  biography: string | null;
  isPublished: boolean;
  showAvatar: boolean;
  showRealName: boolean;
  showBiography: boolean;
}

export interface PublicProfileForm {
  slug: OwnerPublicProfile['slug'];
  gamertag: OwnerPublicProfile['gamertag'];
  realName: string;
  biography: string;
  isPublished: OwnerPublicProfile['isPublished'];
  showAvatar: OwnerPublicProfile['showAvatar'];
  showRealName: OwnerPublicProfile['showRealName'];
  showBiography: OwnerPublicProfile['showBiography'];
}

export function projectOwnerProfile(profile: OwnerPublicProfile): PublicProfileForm {
  return { ...profile, realName: profile.realName ?? '', biography: profile.biography ?? '' };
}

export function buildProfilePayload(form: PublicProfileForm, isPublished = form.isPublished) {
  return {
    gamertag: form.gamertag,
    realName: form.realName || null,
    biography: form.biography || null,
    isPublished,
    showAvatar: form.showAvatar,
    showRealName: form.showRealName,
    showBiography: form.showBiography,
  };
}

export function canDeleteProfile(confirmed: boolean): boolean {
  return confirmed;
}

export function getProfileLoadState(status: number): 'anonymous' | 'error' {
  return status === 401 ? 'anonymous' : 'error';
}

export function getMutationState(failed: boolean, complete: boolean): 'idle' | 'error' | 'success' {
  return failed ? 'error' : complete ? 'success' : 'idle';
}

function requestMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

export function PublicProfileSettings() {
  const { dictionary } = useI18n();
  const copy = dictionary.publicProfileSettings;
  const router = useRouter();
  const [form, setForm] = useState<PublicProfileForm | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'anonymous' | 'error' | 'ready'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'hide' | 'delete' | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const loadProfile = useCallback(async () => {
    const response = await apiClient<{ profile: OwnerPublicProfile }>('/profile/public');
    setForm(projectOwnerProfile(response.profile));
    setLoadState('ready');
  }, []);

  useEffect(() => {
    void loadProfile().catch((requestError: unknown) => {
      const status = requestError instanceof ApiClientError ? requestError.status : 500;
      setLoadState(getProfileLoadState(status));
      setError(requestMessage(requestError, copy.actionError));
    });
  }, [copy.actionError, loadProfile]);

  async function save(isHiding: boolean) {
    if (!form) return;
    setBusy(isHiding ? 'hide' : 'save');
    setError(null);
    setSuccess(null);
    try {
      await apiClient('/profile/public', {
        method: 'PUT',
        body: JSON.stringify(buildProfilePayload(form, isHiding ? false : form.isPublished)),
      });
      await loadProfile();
      setSuccess(isHiding ? copy.hidden : copy.saved);
      router.refresh();
    } catch (requestError) {
      setError(requestMessage(requestError, copy.actionError));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!form || !canDeleteProfile(deleteConfirmed)) return;
    setBusy('delete');
    setError(null);
    setSuccess(null);
    try {
      await apiClient<void>('/profile/public', { method: 'DELETE' });
      setForm(null);
      setSuccess(copy.deleted);
      router.refresh();
    } catch (requestError) {
      setError(requestMessage(requestError, copy.actionError));
    } finally {
      setBusy(null);
    }
  }

  if (loadState === 'loading') return <main className="container narrow">{copy.loading}</main>;
  if (loadState === 'anonymous')
    return (
      <main className="container narrow">
        <p>
          <Link href="/login">{dictionary.navigation.signIn}</Link>
        </p>
      </main>
    );
  if (!form && getMutationState(error !== null, success !== null) === 'success') {
    return (
      <main className="container narrow">
        <p role="status">{success}</p>
      </main>
    );
  }
  if (loadState === 'error' || !form) {
    return (
      <main className="container narrow">
        <p className="error" role="alert">
          {error ?? copy.actionError}
        </p>
      </main>
    );
  }

  const setText = (field: 'gamertag' | 'realName' | 'biography', value: string) =>
    setForm({ ...form, [field]: value });
  const setFlag = (field: 'isPublished' | 'showAvatar' | 'showRealName' | 'showBiography') =>
    setForm({ ...form, [field]: !form[field] });

  return (
    <main className="container narrow">
      <h1>{dictionary.navigation.publicProfile}</h1>
      <p className="muted">{copy.intro}</p>
      <form
        className="card"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void save(false);
        }}
      >
        <p>
          <strong>{copy.slug}:</strong> /players/{form.slug}
        </p>
        <label htmlFor="gamertag">{copy.gamertag}</label>
        <input
          id="gamertag"
          maxLength={32}
          required
          value={form.gamertag}
          onChange={(event) => setText('gamertag', event.target.value)}
        />
        <label htmlFor="realName">{copy.realName}</label>
        <input
          id="realName"
          maxLength={80}
          value={form.realName}
          onChange={(event) => setText('realName', event.target.value)}
        />
        <label htmlFor="biography">{copy.biography}</label>
        <textarea
          id="biography"
          maxLength={1000}
          value={form.biography}
          onChange={(event) => setText('biography', event.target.value)}
        />
        <fieldset>
          <legend>{copy.privacy}</legend>
          {(
            [
              ['isPublished', copy.published],
              ['showAvatar', copy.showAvatar],
              ['showRealName', copy.showRealName],
              ['showBiography', copy.showBiography],
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              <input type="checkbox" checked={form[field]} onChange={() => setFlag(field)} />{' '}
              {label}
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="muted" role="status">
            {success}
          </p>
        )}
        <div className="actions">
          <button type="submit" disabled={busy !== null}>
            {busy === 'save' ? copy.saving : copy.save}
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={busy !== null || !form.isPublished}
            onClick={() => void save(true)}
          >
            {busy === 'hide' ? copy.hiding : copy.hide}
          </button>
        </div>
      </form>
      <section className="card">
        <label>
          <input
            type="checkbox"
            checked={deleteConfirmed}
            onChange={(event) => setDeleteConfirmed(event.target.checked)}
          />{' '}
          {copy.deleteConfirm}
        </label>
        <button
          type="button"
          className="button-danger"
          disabled={busy !== null || !canDeleteProfile(deleteConfirmed)}
          onClick={() => void remove()}
        >
          {busy === 'delete' ? copy.deleting : copy.delete}
        </button>
      </section>
    </main>
  );
}
