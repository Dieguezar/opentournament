export type ThemePreference = 'light' | 'dark' | 'system';

export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export interface ThemeState {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

export interface ThemeStorageReader {
  getItem(key: string): string | null;
}

export interface ThemeStorageWriter {
  setItem(key: string, value: string): void;
}

export const THEME_STORAGE_KEY = 'opentournament-theme';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getThemeState(
  storedPreference: string | null,
  prefersDarkMode: boolean,
): ThemeState {
  const preference = isThemePreference(storedPreference) ? storedPreference : 'system';
  const resolvedTheme = preference === 'system' ? (prefersDarkMode ? 'dark' : 'light') : preference;

  return { preference, resolvedTheme };
}

export function serializeThemePreference(preference: ThemePreference): string {
  return preference;
}

export function readStoredThemePreference(storage: ThemeStorageReader | null): string | null {
  if (!storage) return null;

  try {
    return storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistThemePreference(
  storage: ThemeStorageWriter | null,
  preference: ThemePreference,
): void {
  if (!storage) return;

  try {
    storage.setItem(THEME_STORAGE_KEY, serializeThemePreference(preference));
  } catch {
    return;
  }
}
