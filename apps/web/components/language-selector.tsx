'use client';

import { useRouter } from 'next/navigation';
import { type ChangeEvent, type ChangeEventHandler, useTransition } from 'react';
import { useI18n } from './i18n-provider';
import { resolveLocale, serializeLocaleCookie, type Dictionary, type Locale } from '../lib/i18n';

interface LanguageSelectorViewProps {
  dictionary: Dictionary;
  disabled?: boolean;
  locale: Locale;
  onChange: ChangeEventHandler<HTMLSelectElement>;
}

export function LanguageSelectorView({
  dictionary,
  disabled = false,
  locale,
  onChange,
}: LanguageSelectorViewProps) {
  return (
    <select
      className="language-selector"
      aria-label={dictionary.language.label}
      disabled={disabled}
      value={locale}
      onChange={onChange}
    >
      <option value="es">{dictionary.language.spanish}</option>
      <option value="en">{dictionary.language.english}</option>
    </select>
  );
}

export function LanguageSelector() {
  const router = useRouter();
  const { dictionary, locale } = useI18n();
  const [isPending, startTransition] = useTransition();

  function changeLanguage(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = resolveLocale(event.target.value);
    document.cookie = serializeLocaleCookie(nextLocale);
    document.documentElement.lang = nextLocale;
    startTransition(() => router.refresh());
  }

  return (
    <LanguageSelectorView
      dictionary={dictionary}
      disabled={isPending}
      locale={locale}
      onChange={changeLanguage}
    />
  );
}
