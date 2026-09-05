'use client';

import { useState } from 'react';

import { useI18n } from './i18n-provider';
import { TournamentBranding } from './tournament-branding';
import { TournamentMediaControls, type TournamentMedia } from './tournament-media-controls';
import styles from './tournament-personalization.module.css';
import { ApiClientError, apiClient } from '../lib/api';
import type { Dictionary } from '../lib/i18n';
import { tournamentThemeStyle } from '../lib/tournament-theme';
import themeStyles from './tournament-theme.module.css';

export interface AppearancePalette {
  primaryColor: string | null;
  accentColor: string | null;
}

export type AppearanceClient = <T>(path: string, init?: RequestInit) => Promise<T>;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
export const DEFAULT_PALETTE = { primaryColor: '#4C7DFF', accentColor: '#4C7DFF' };
const PRESETS = [
  { name: 'presetBlue' as const, primaryColor: '#4C7DFF', accentColor: '#38BDF8' },
  { name: 'presetEmerald' as const, primaryColor: '#10B981', accentColor: '#A3E635' },
  { name: 'presetViolet' as const, primaryColor: '#8B5CF6', accentColor: '#F472B6' },
];

function project(appearance: AppearancePalette | null | undefined): AppearancePalette {
  return {
    primaryColor: appearance?.primaryColor?.toUpperCase() ?? null,
    accentColor: appearance?.accentColor?.toUpperCase() ?? null,
  };
}

export function validatePalette(palette: AppearancePalette): AppearancePalette | null {
  if (Object.values(palette).some((color) => color !== null && !HEX_COLOR.test(color))) return null;
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
  tournamentName?: string;
  media?: TournamentMedia;
  dirty?: boolean;
  onPaletteChange: (field: keyof AppearancePalette, value: string | null) => void;
  onSubmit: () => void;
}

export function TournamentAppearanceForm({
  busy,
  copy,
  error,
  palette,
  success,
  tournamentName,
  media,
  dirty = false,
  onPaletteChange,
  onSubmit,
}: TournamentAppearanceFormProps) {
  const previewPalette = validatePalette(palette) ?? DEFAULT_PALETTE;

  return (
    <form
      className={styles.paletteForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className={styles.editor}>
        <fieldset className={styles.presets} disabled={busy}>
          <legend>{copy.palettePresets}</legend>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                onPaletteChange('primaryColor', preset.primaryColor);
                onPaletteChange('accentColor', preset.accentColor);
              }}
            >
              <span
                className={styles.swatch}
                style={{ background: preset.primaryColor }}
                aria-hidden="true"
              />
              {copy[preset.name]}
            </button>
          ))}
        </fieldset>
        <div className={styles.colorGrid}>
          {(['primaryColor', 'accentColor'] as const).map((field) => {
            const id = field === 'primaryColor' ? 'primary-color' : 'accent-color';
            const color = palette[field];
            return (
              <div key={field}>
                <label htmlFor={`${id}-picker`}>{copy[field]}</label>
                <div className={styles.colorField}>
                  <input
                    id={`${id}-picker`}
                    type="color"
                    disabled={busy}
                    value={color && HEX_COLOR.test(color) ? color : DEFAULT_PALETTE[field]}
                    onChange={(event) => onPaletteChange(field, event.target.value)}
                  />
                  <input
                    id={id}
                    aria-label={`${copy[field]} HEX`}
                    maxLength={7}
                    aria-describedby={`palette-help${error ? ' palette-error' : ''}`}
                    spellCheck={false}
                    disabled={busy}
                    value={color ?? ''}
                    placeholder={DEFAULT_PALETTE[field]}
                    onChange={(event) => onPaletteChange(field, event.target.value || null)}
                    aria-invalid={color !== null && !HEX_COLOR.test(color)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p id="palette-help" className={styles.hint}>
          {copy.paletteHelp}
        </p>
        <button
          type="button"
          className="button-secondary"
          disabled={busy}
          onClick={() => {
            onPaletteChange('primaryColor', null);
            onPaletteChange('accentColor', null);
          }}
        >
          {copy.resetPalette}
        </button>
      </div>
      <div
        className={`${styles.preview} ${themeStyles.theme}`}
        style={tournamentThemeStyle(previewPalette)}
        aria-label={copy.appearancePreview}
      >
        <div className={styles.previewLabel}>
          <strong>{copy.previewTitle}</strong>
          <span>{dirty ? copy.unsavedAppearance : copy.savedAppearance}</span>
        </div>
        <TournamentBranding
          tournamentName={tournamentName ?? copy.previewTitle}
          appearance={{
            ...previewPalette,
            logoMediaId: media?.logoMediaId ?? null,
            bannerMediaId: media?.bannerMediaId ?? null,
          }}
        >
          <h3>{tournamentName ?? copy.previewTitle}</h3>
          <p className={styles.hint}>{copy.headerPreviewDescription}</p>
        </TournamentBranding>
        <div className={styles.previewCard}>
          <h3>{copy.pagePreviewTitle}</h3>
          <p className={styles.hint}>{copy.pagePreviewDescription}</p>
          <span className="button">{copy.pagePreviewAction}</span>
        </div>
      </div>
      <div className={styles.saveRow}>
        {busy && (
          <p role="status" aria-live="polite">
            {copy.savingAppearance}
          </p>
        )}
        {error && (
          <p id="palette-error" role="alert">
            {error}
          </p>
        )}
        {success && <p role="status">{success}</p>}
        <button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? copy.savingAppearance : copy.saveAppearance}
        </button>
      </div>
    </form>
  );
}

export function TournamentAppearanceControls({
  tournamentId,
  initialAppearance,
  tournamentName,
  mediaVisible = true,
}: {
  tournamentId: string;
  initialAppearance: (AppearancePalette & Partial<TournamentMedia>) | null;
  tournamentName?: string;
  mediaVisible?: boolean;
}) {
  const { dictionary } = useI18n();
  const copy = dictionary.tournamentAdmin;
  const [palette, setPalette] = useState(() => project(initialAppearance));
  const [savedPalette, setSavedPalette] = useState(() => project(initialAppearance));
  const [media, setMedia] = useState<TournamentMedia>(() => ({
    logoMediaId: initialAppearance?.logoMediaId ?? null,
    bannerMediaId: initialAppearance?.bannerMediaId ?? null,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dirty = JSON.stringify(project(palette)) !== JSON.stringify(savedPalette);

  async function submit() {
    const valid = validatePalette(palette);
    setError(null);
    setSuccess(null);
    if (!valid) return setError(copy.invalidAppearance);
    setBusy(true);
    try {
      const saved = await saveAppearance(apiClient, tournamentId, valid);
      setPalette(saved);
      setSavedPalette(saved);
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
    <section className={styles.personalization} aria-labelledby="appearance-title">
      <h3 id="appearance-title">{copy.appearanceTitle}</h3>
      <p>{copy.appearanceDescription}</p>
      <TournamentAppearanceForm
        busy={busy}
        copy={copy}
        error={error}
        palette={palette}
        success={success}
        tournamentName={tournamentName}
        media={mediaVisible ? media : undefined}
        dirty={dirty}
        onPaletteChange={(field, value) => {
          setPalette((current) => ({ ...current, [field]: value }));
          setSuccess(null);
          setError(null);
        }}
        onSubmit={() => void submit()}
      />
      <TournamentMediaControls
        tournamentId={tournamentId}
        initialMedia={media}
        onMediaChange={setMedia}
        mediaVisible={mediaVisible}
      />
    </section>
  );
}
