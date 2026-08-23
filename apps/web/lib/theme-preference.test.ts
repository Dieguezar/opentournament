import { describe, expect, it } from 'vitest';
import {
  getThemeState,
  persistThemePreference,
  readStoredThemePreference,
  serializeThemePreference,
} from './theme-preference';

describe('preferencia de tema', () => {
  it('prioriza una preferencia guardada válida sobre el tema del sistema', () => {
    const darkState = getThemeState('dark', false);
    const lightState = getThemeState('light', true);

    expect(darkState).toEqual({ preference: 'dark', resolvedTheme: 'dark' });
    expect(lightState).toEqual({ preference: 'light', resolvedTheme: 'light' });
  });

  it('respeta prefers-color-scheme cuando no existe una preferencia guardada', () => {
    const darkSystemState = getThemeState(null, true);
    const lightSystemState = getThemeState(null, false);

    expect(darkSystemState).toEqual({ preference: 'system', resolvedTheme: 'dark' });
    expect(lightSystemState).toEqual({ preference: 'system', resolvedTheme: 'light' });
  });

  it('trata los valores guardados inválidos como preferencia del sistema', () => {
    const state = getThemeState('sepia', true);

    expect(state).toEqual({ preference: 'system', resolvedTheme: 'dark' });
  });

  it('serializa las tres elecciones persistibles sin perder información', () => {
    expect(serializeThemePreference('light')).toBe('light');
    expect(serializeThemePreference('dark')).toBe('dark');
    expect(serializeThemePreference('system')).toBe('system');
  });

  it('degrada a system cuando localStorage rechaza la lectura', () => {
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

  it('no interrumpe la elección en memoria cuando localStorage rechaza la escritura', () => {
    const storage = {
      setItem() {
        throw new Error('SecurityError');
      },
    };

    expect(() => persistThemePreference(storage, 'light')).not.toThrow();
  });
});
