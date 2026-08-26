'use client';

import { DesktopIcon } from '@phosphor-icons/react/Desktop';
import { MoonIcon } from '@phosphor-icons/react/Moon';
import { SunIcon } from '@phosphor-icons/react/Sun';
import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import {
  getThemeState,
  persistThemePreference,
  readStoredThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme-preference';

interface ThemeOption {
  labelKey: 'system' | 'light' | 'dark';
  value: ThemePreference;
  icon: typeof DesktopIcon;
}

const themeOptions: ThemeOption[] = [
  { labelKey: 'system', value: 'system', icon: DesktopIcon },
  { labelKey: 'light', value: 'light', icon: SunIcon },
  { labelKey: 'dark', value: 'dark', icon: MoonIcon },
];

function applyResolvedTheme(resolvedTheme: ResolvedTheme) {
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

function getBrowserThemeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ThemeToggle() {
  const { dictionary } = useI18n();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const state = getThemeState(
      readStoredThemePreference(getBrowserThemeStorage()),
      mediaQuery.matches,
    );

    setPreference(state.preference);
    applyResolvedTheme(state.resolvedTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function handleSystemThemeChange(event: MediaQueryListEvent) {
      if (preference === 'system') {
        applyResolvedTheme(event.matches ? 'dark' : 'light');
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [preference]);

  function chooseTheme(nextPreference: ThemePreference) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const state = getThemeState(nextPreference, mediaQuery.matches);

    setPreference(nextPreference);
    applyResolvedTheme(state.resolvedTheme);
    persistThemePreference(getBrowserThemeStorage(), nextPreference);
  }

  return (
    <div className="theme-toggle" role="group" aria-label={dictionary.theme.label}>
      {themeOptions.map(({ icon: Icon, labelKey, value }) => {
        const label = dictionary.theme[labelKey];
        return (
          <button
            type="button"
            className="theme-toggle-button"
            key={value}
            aria-label={label}
            aria-pressed={preference === value}
            title={label}
            onClick={() => chooseTheme(value)}
          >
            <Icon aria-hidden="true" size={15} weight={preference === value ? 'fill' : 'regular'} />
          </button>
        );
      })}
    </div>
  );
}
