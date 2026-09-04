'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { useI18n } from './i18n-provider';
import { ApiClientError, apiClient } from '../lib/api';
import {
  loadOwnerProfile,
  saveOwnerProfile,
  deleteOwnerProfile,
  clearOwnerAvatar,
  uploadOwnerAvatar,
  type PublicProfileForm,
} from '../lib/public-profile-workflow';

function requestMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

type AvatarBusyState = 'upload' | 'clear' | null;

interface AvatarManagementControlsProps {
  avatar: PublicProfileForm['avatar'];
  busy: AvatarBusyState;
  copy: ReturnType<typeof useI18n>['dictionary']['publicProfileSettings'];
  onClear: () => void;
  onUpload: (file: File) => void;
}

export function AvatarManagementControls({
  avatar,
  busy,
  copy,
  onClear,
  onUpload,
}: AvatarManagementControlsProps) {
  const isUploading = busy === 'upload';

  return (
    <section aria-labelledby="avatar-title">
      <h2 id="avatar-title">{copy.avatar}</h2>
      {avatar && <img alt={copy.avatarPreview} src={`/api/v1/media/${avatar.id}`} />}
      <label htmlFor="avatar-file">{copy.avatarFile}</label>
      <input
        accept="image/png,image/jpeg,image/webp"
        aria-describedby={isUploading ? 'avatar-upload-status' : undefined}
        disabled={busy !== null}
        id="avatar-file"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.currentTarget.value = '';
        }}
      />
      {isUploading && (
        <p id="avatar-upload-status" role="status" aria-live="polite">
          {copy.uploadingAvatar}
        </p>
      )}
      <button
        type="button"
        className="button-secondary"
        disabled={busy !== null || !avatar}
        onClick={onClear}
      >
        {busy === 'clear' ? copy.clearingAvatar : copy.clearAvatar}
      </button>
    </section>
  );
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
  const [busy, setBusy] = useState<'save' | 'hide' | 'delete' | 'upload' | 'clear' | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const loadProfile = useCallback(async () => {
    setForm(await loadOwnerProfile(apiClient));
    setLoadState('ready');
  }, []);

  useEffect(() => {
    void loadProfile().catch((requestError: unknown) => {
      setLoadState(
        requestError instanceof ApiClientError && requestError.status === 401
          ? 'anonymous'
          : 'error',
      );
      setError(requestMessage(requestError, copy.actionError));
    });
  }, [copy.actionError, loadProfile]);

  async function save(isHiding: boolean) {
    if (!form) return;
    setBusy(isHiding ? 'hide' : 'save');
    setError(null);
    setSuccess(null);
    try {
      setForm(await saveOwnerProfile(apiClient, form, isHiding));
      setSuccess(isHiding ? copy.hidden : copy.saved);
      router.refresh();
    } catch (requestError) {
      setError(requestMessage(requestError, copy.actionError));
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy('upload');
    setError(null);
    setSuccess(null);
    try {
      setForm(await uploadOwnerAvatar(apiClient, file));
      setSuccess(copy.avatarUpdated);
      router.refresh();
    } catch (requestError) {
      setError(requestMessage(requestError, copy.actionError));
    } finally {
      setBusy(null);
    }
  }

  async function clearAvatar() {
    setBusy('clear');
    setError(null);
    setSuccess(null);
    try {
      setForm(await clearOwnerAvatar(apiClient));
      setSuccess(copy.avatarCleared);
      router.refresh();
    } catch (requestError) {
      setError(requestMessage(requestError, copy.actionError));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!form || !deleteConfirmed) return;
    setBusy('delete');
    setError(null);
    setSuccess(null);
    try {
      const result = await deleteOwnerProfile(apiClient, deleteConfirmed);
      if (result.state !== 'deleted') {
        setForm(null);
        setLoadState(
          result.state === 'failed' &&
            result.error instanceof ApiClientError &&
            result.error.status === 401
            ? 'anonymous'
            : 'error',
        );
        setError(
          result.state === 'failed'
            ? requestMessage(result.error, copy.actionError)
            : copy.actionError,
        );
        return;
      }
      setForm(null);
      setSuccess(copy.deleted);
      router.refresh();
    } catch (requestError) {
      setForm(null);
      setLoadState(
        requestError instanceof ApiClientError && requestError.status === 401
          ? 'anonymous'
          : 'error',
      );
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
  if (!form && success) {
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
        <AvatarManagementControls
          avatar={form.avatar}
          busy={busy === 'upload' || busy === 'clear' ? busy : null}
          copy={copy}
          onClear={() => void clearAvatar()}
          onUpload={(file) => void upload(file)}
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
          disabled={busy !== null || !deleteConfirmed}
          onClick={() => void remove()}
        >
          {busy === 'delete' ? copy.deleting : copy.delete}
        </button>
      </section>
    </main>
  );
}
