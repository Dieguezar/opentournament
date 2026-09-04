'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import { useI18n } from './i18n-provider';
import { ApiClientError, apiClient } from '../lib/api';
import type { Dictionary } from '../lib/i18n';

export interface AppearancePalette {
  primaryColor: string | null;
  accentColor: string | null;
}

export type AppearanceClient = <T>(path: string, init?: RequestInit) => Promise<T>;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function project(appearance: AppearancePalette | null | undefined): AppearancePalette {
  return {
    primaryColor: appearance?.primaryColor?.toUpperCase() ?? '',
    accentColor: appearance?.accentColor?.toUpperCase() ?? '',
  };
}

export function validatePalette(palette: AppearancePalette): AppearancePalette | null {
  if (!palette.primaryColor || !palette.accentColor) return null;
  if (!HEX_COLOR.test(palette.primaryColor) || !HEX_COLOR.test(palette.accentColor)) return null;
  return project(palette);
}

export async function loadAppearance(
  client: AppearanceClient,
  tournamentId: string,
): Promise<AppearancePalette> {
  const response = await client<{ appearance?: AppearancePalette | null }>(
    `/tournaments/${tournamentId}`,
  );
  return project(response.appearance);
}

export async function saveAppearance(
  client: AppearanceClient,
  tournamentId: string,
  palette: AppearancePalette,
) {
  const response = await client<{ appearance: AppearancePalette }>(
    `/tournaments/${tournamentId}/appearance`,
    {
      method: 'PATCH',
      body: JSON.stringify(palette),
    },
  );
  return project(response.appearance);
}

interface TournamentAppearanceFormProps {
  busy: boolean;
  copy: Dictionary['tournamentAdmin'];
  error: string | null;
  palette: AppearancePalette;
  success: string | null;
  onPaletteChange: (field: keyof AppearancePalette, value: string) => void;
  onSubmit: () => void;
}

export function TournamentAppearanceForm({
  busy,
  copy,
  error,
  palette,
  success,
  onPaletteChange,
  onSubmit,
}: TournamentAppearanceFormProps) {
  const previewStyle = {
    '--appearance-primary': validatePalette(palette)?.primaryColor ?? '#374151',
    '--appearance-accent': validatePalette(palette)?.accentColor ?? '#9CA3AF',
  } as CSSProperties;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="primary-color">{copy.primaryColor}</label>
      <input
        id="primary-color"
        value={palette.primaryColor ?? ''}
        onChange={(event) => onPaletteChange('primaryColor', event.target.value)}
        aria-invalid={Boolean(error)}
        disabled={busy}
      />
      <label htmlFor="accent-color">{copy.accentColor}</label>
      <input
        id="accent-color"
        value={palette.accentColor ?? ''}
        onChange={(event) => onPaletteChange('accentColor', event.target.value)}
        aria-invalid={Boolean(error)}
        disabled={busy}
      />
      <div aria-label={copy.appearancePreview} style={previewStyle}>
        <strong style={{ color: 'var(--appearance-primary)' }}>{copy.previewTitle}</strong>{' '}
        <span style={{ color: 'var(--appearance-accent)' }}>●</span>
      </div>
      {busy && (
        <p role="status" aria-live="polite">
          {copy.savingAppearance}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
      <button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? copy.savingAppearance : copy.saveAppearance}
      </button>
    </form>
  );
}

export function TournamentAppearanceControls({
  tournamentId,
  initialAppearance,
}: {
  tournamentId: string;
  initialAppearance: AppearancePalette | null;
}) {
  const { dictionary } = useI18n();
  const copy = dictionary.tournamentAdmin;
  const [palette, setPalette] = useState(() => project(initialAppearance));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => setPalette(project(initialAppearance)), [initialAppearance]);

  async function submit() {
    const valid = validatePalette(palette);
    setError(null);
    setSuccess(null);
    if (!valid) return setError(copy.invalidAppearance);
    setBusy(true);
    try {
      setPalette(await saveAppearance(apiClient, tournamentId, valid));
      setSuccess(copy.appearanceSaved);
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError ? requestError.message : copy.appearanceError,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="appearance-title">
      <h3 id="appearance-title">{copy.appearanceTitle}</h3>
      <p>{copy.appearanceDescription}</p>
      <TournamentAppearanceForm
        busy={busy}
        copy={copy}
        error={error}
        palette={palette}
        success={success}
        onPaletteChange={(field, value) => setPalette({ ...palette, [field]: value })}
        onSubmit={() => void submit()}
      />
    </section>
  );
}
