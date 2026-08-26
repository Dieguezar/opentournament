import { describe, expect, it } from 'vitest';
import {
  getThemeState,
  persistThemePreference,
  readStoredThemePreference,
  serializeThemePreference,
} from './theme-preference';

describe('theme preference', () => {
  it('prioritizes a valid saved preference over the system theme', () => {
    const darkState = getThemeState('dark', false);
    const lightState = getThemeState('light', true);

    expect(darkState).toEqual({ preference: 'dark', resolvedTheme: 'dark' });
    expect(lightState).toEqual({ preference: 'light', resolvedTheme: 'light' });
  });

  it('respects prefers-color-scheme when no saved preference exists', () => {
    const darkSystemState = getThemeState(null, true);
    const lightSystemState = getThemeState(null, false);

    expect(darkSystemState).toEqual({ preference: 'system', resolvedTheme: 'dark' });
    expect(lightSystemState).toEqual({ preference: 'system', resolvedTheme: 'light' });
  });

  it('treats invalid saved values as the system preference', () => {
    const state = getThemeState('sepia', true);

    expect(state).toEqual({ preference: 'system', resolvedTheme: 'dark' });
  });

  it('serializes all three persistent choices without losing information', () => {
    expect(serializeThemePreference('light')).toBe('light');
    expect(serializeThemePreference('dark')).toBe('dark');
    expect(serializeThemePreference('system')).toBe('system');
  });

  it('falls back to system when localStorage rejects reads', () => {
    const storage = {
      getItem() {
        throw new Error('SecurityError');
      },
    };

    const storedPreference = readStoredThemePreference(storage);

    expect(getThemeState(storedPreference, true)).toEqual({
      preference: 'system',
      resolvedTheme: 'dark',
    });
  });

  it('keeps the in-memory choice when localStorage rejects writes', () => {
    const storage = {
      setItem() {
        throw new Error('SecurityError');
      },
    };

    expect(() => persistThemePreference(storage, 'light')).not.toThrow();
  });
});
