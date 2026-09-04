'use client';

import { useEffect, useRef, useState } from 'react';

import { useI18n } from './i18n-provider';
import { ApiClientError, apiClient } from '../lib/api';
import type { Dictionary } from '../lib/i18n';

export type TournamentMediaSlot = 'logo' | 'banner';

export interface TournamentMedia {
  logoMediaId: string | null;
  bannerMediaId: string | null;
}

export type TournamentMediaClient = <T>(path: string, init?: RequestInit) => Promise<T>;

export function createTournamentMediaMutationQueue() {
  let tail = Promise.resolve();
  return {
    run<T>(mutation: () => Promise<T>): Promise<T> {
      const result = tail.then(mutation);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}

export interface TournamentMediaControllerState {
  busy: boolean;
  error: string | null;
  media: TournamentMedia;
  success: string | null;
}

export interface TournamentMediaController {
  readonly state: TournamentMediaControllerState;
  remove(slot: TournamentMediaSlot): Promise<void>;
  subscribe(listener: (state: TournamentMediaControllerState) => void): () => void;
  upload(slot: TournamentMediaSlot, file: File): Promise<void>;
}

const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mediaPath(mediaId: string | null): string | null {
  return mediaId && mediaIdPattern.test(mediaId) ? `/api/v1/media/${mediaId}` : null;
}

export async function loadTournamentMedia(
  client: TournamentMediaClient,
  tournamentId: string,
): Promise<TournamentMedia> {
  const { appearance } = await client<{ appearance?: Partial<TournamentMedia> | null }>(
    `/tournaments/${tournamentId}`,
  );
  return {
    logoMediaId: appearance?.logoMediaId ?? null,
    bannerMediaId: appearance?.bannerMediaId ?? null,
  };
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

export function createTournamentMediaController(
  client: TournamentMediaClient,
  tournamentId: string,
  initialMedia: TournamentMedia,
  getCopy: () => Pick<Dictionary['tournamentAdmin'], 'mediaError' | 'mediaSaved'>,
): TournamentMediaController {
  const queue = createTournamentMediaMutationQueue();
  const listeners = new Set<(state: TournamentMediaControllerState) => void>();
  let pending = 0;
  let state: TournamentMediaControllerState = {
    busy: false,
    error: null,
    media: initialMedia,
    success: null,
  };
  const publish = () => listeners.forEach((listener) => listener(state));

  const mutate = (slot: TournamentMediaSlot, file?: File) => {
    pending += 1;
    state = { ...state, busy: true };
    publish();
    return queue.run(async () => {
      state = { ...state, error: null, success: null };
      publish();
      try {
        const media = file
          ? await uploadTournamentMedia(client, tournamentId, slot, file)
          : await deleteTournamentMedia(client, tournamentId, slot);
        state = { ...state, media, success: getCopy().mediaSaved };
      } catch (requestError) {
        state = {
          ...state,
          error:
            requestError instanceof ApiClientError ? requestError.message : getCopy().mediaError,
        };
      } finally {
        pending -= 1;
        state = { ...state, busy: pending > 0 };
        publish();
      }
    });
  };

  return {
    get state() {
      return state;
    },
    remove: (slot) => mutate(slot),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    upload: (slot, file) => mutate(slot, file),
  };
}

interface TournamentMediaFormProps {
  busy: boolean;
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
        const pending = busy;
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
            <button
              id={`${slot}-remove`}
              type="button"
              disabled={pending || !preview}
              onClick={() => onDelete(slot)}
            >
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
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const controllerRef = useRef<TournamentMediaController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createTournamentMediaController(
      apiClient,
      tournamentId,
      {
        logoMediaId: initialMedia?.logoMediaId ?? null,
        bannerMediaId: initialMedia?.bannerMediaId ?? null,
      },
      () => copyRef.current,
    );
  }
  const controller = controllerRef.current;
  const [state, setState] = useState<TournamentMediaControllerState>(() => controller.state);

  useEffect(() => controller.subscribe(setState), [controller]);

  return (
    <TournamentMediaForm
      busy={state.busy}
      copy={copy}
      error={state.error}
      media={state.media}
      success={state.success}
      onDelete={(slot) => void controller.remove(slot)}
      onUpload={(slot, file) => void controller.upload(slot, file)}
    />
  );
}
