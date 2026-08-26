'use client';

import { createContext, type ReactNode, useContext } from 'react';
import type { Dictionary, Locale } from '../lib/i18n';

interface I18nContextValue {
  dictionary: Dictionary;
  locale: Locale;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  dictionary,
  locale,
}: I18nContextValue & { children: ReactNode }) {
  return <I18nContext.Provider value={{ dictionary, locale }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
