'use client';

import { useState } from 'react';

import { useI18n } from './i18n-provider';
import { ApiClientError, apiClient } from '../lib/api';
import type { Dictionary } from '../lib/i18n';

export type TournamentMediaSlot = 'logo' | 'banner';

export interface TournamentMedia {
  logoMediaId: string | null;
  bannerMediaId: string | null;
}

export type TournamentMediaClient = <T>(path: string, init?: RequestInit) => Promise<T>;

const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function project(media: Partial<TournamentMedia> | null | undefined): TournamentMedia {
  return { logoMediaId: media?.logoMediaId ?? null, bannerMediaId: media?.bannerMediaId ?? null };
}

function mediaPath(mediaId: string | null): string | null {
  return mediaId && mediaIdPattern.test(mediaId) ? `/api/v1/media/${mediaId}` : null;
}

export async function loadTournamentMedia(
  client: TournamentMediaClient,
  tournamentId: string,
): Promise<TournamentMedia> {
  const response = await client<{ appearance?: Partial<TournamentMedia> | null }>(
    `/tournaments/${tournamentId}`,
  );
  return project(response.appearance);
}

export async function uploadTournamentMedia(
  client: TournamentMediaClient,
  tournamentId: string,
  slot: TournamentMediaSlot,
  file: File,
): Promise<TournamentMedia> {
  const body = new FormData();
  body.set('file', file);
  await client(`/tournaments/${tournamentId}/appearance/${slot}`, { method: 'POST', body });
  return loadTournamentMedia(client, tournamentId);
}

export async function deleteTournamentMedia(
  client: TournamentMediaClient,
  tournamentId: string,
  slot: TournamentMediaSlot,
): Promise<TournamentMedia> {
  await client(`/tournaments/${tournamentId}/appearance/${slot}`, { method: 'DELETE' });
  return loadTournamentMedia(client, tournamentId);
}

interface TournamentMediaFormProps {
  busy: TournamentMediaSlot | null;
  copy: Dictionary['tournamentAdmin'];
  error: string | null;
  media: TournamentMedia;
  success: string | null;
  onDelete: (slot: TournamentMediaSlot) => void;
  onUpload: (slot: TournamentMediaSlot, file: File) => void;
}

export function TournamentMediaForm({
  busy,
  copy,
  error,
  media,
  success,
  onDelete,
  onUpload,
}: TournamentMediaFormProps) {
  const slots = [
    { slot: 'logo' as const, id: media.logoMediaId, title: copy.logoTitle, file: copy.logoFile },
    {
      slot: 'banner' as const,
      id: media.bannerMediaId,
      title: copy.bannerTitle,
      file: copy.bannerFile,
    },
  ];

  return (
    <section aria-labelledby="media-title">
      <h3 id="media-title">{copy.mediaTitle}</h3>
      <p>{copy.mediaDescription}</p>
      {slots.map(({ slot, id, title, file }) => {
        const pending = busy === slot;
        const preview = mediaPath(id);
        return (
          <fieldset key={slot}>
            <legend>{title}</legend>
            {preview && <img alt={title} src={preview} />}
            <label htmlFor={`${slot}-file`}>{file}</label>
            <input
              accept="image/png,image/jpeg,image/webp"
              aria-describedby={pending ? `${slot}-status` : undefined}
              disabled={pending}
              id={`${slot}-file`}
              type="file"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) onUpload(slot, selected);
                event.currentTarget.value = '';
              }}
            />
            {pending && (
              <p id={`${slot}-status`} role="status" aria-live="polite">
                {slot === 'logo' ? copy.uploadingLogo : copy.uploadingBanner}
              </p>
            )}
            <button type="button" disabled={pending || !preview} onClick={() => onDelete(slot)}>
              {copy.deleteMedia}
            </button>
          </fieldset>
        );
      })}
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  );
}

export function TournamentMediaControls({
  tournamentId,
  initialMedia,
}: {
  tournamentId: string;
  initialMedia: Partial<TournamentMedia> | null;
}) {
  const { dictionary } = useI18n();
  const copy = dictionary.tournamentAdmin;
  const [media, setMedia] = useState(() => project(initialMedia));
  const [busy, setBusy] = useState<TournamentMediaSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function mutate(slot: TournamentMediaSlot, file?: File) {
    setBusy(slot);
    setError(null);
    setSuccess(null);
    try {
      setMedia(
        file
          ? await uploadTournamentMedia(apiClient, tournamentId, slot, file)
          : await deleteTournamentMedia(apiClient, tournamentId, slot),
      );
      setSuccess(copy.mediaSaved);
    } catch (requestError) {
      setError(requestError instanceof ApiClientError ? requestError.message : copy.mediaError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <TournamentMediaForm
      busy={busy}
      copy={copy}
      error={error}
      media={media}
      success={success}
      onDelete={(slot) => void mutate(slot)}
      onUpload={(slot, file) => void mutate(slot, file)}
    />
  );
}
