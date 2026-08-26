import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  dictionaries,
  formatMessage,
  getDictionary,
  resolveLocale,
  serializeLocaleCookie,
} from './i18n';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof nested === 'string' ? [path] : flattenKeys(nested, path);
  });
}

describe('internationalization', () => {
  it('defaults safely to Spanish and accepts both supported locales', () => {
    expect(DEFAULT_LOCALE).toBe('es');
    expect(resolveLocale('es')).toBe('es');
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('EN')).toBe('en');
    expect(resolveLocale('fr')).toBe('es');
    expect(resolveLocale(undefined)).toBe('es');
  });

  it('keeps the English and Spanish dictionaries structurally identical', () => {
    expect(flattenKeys(dictionaries.en).sort()).toEqual(flattenKeys(dictionaries.es).sort());
  });

  it('returns localized navigation and accessibility copy', () => {
    expect(getDictionary('es').navigation.signIn).toBe('Iniciar sesión');
    expect(getDictionary('en').navigation.signIn).toBe('Sign in');
    expect(getDictionary('es').accessibility.skipToContent).toBe('Saltar al contenido');
    expect(getDictionary('en').accessibility.skipToContent).toBe('Skip to content');
  });

  it('interpolates named values without evaluating translation content', () => {
    expect(formatMessage('Hola, {name}. Tenés {count} torneos.', { name: 'Ada', count: 2 })).toBe(
      'Hola, Ada. Tenés 2 torneos.',
    );
    expect(formatMessage('{missing} stays visible', {})).toBe('{missing} stays visible');
  });

  it('persists the locale in a long-lived first-party cookie', () => {
    expect(serializeLocaleCookie('en')).toBe(
      'opentournament-locale=en; Path=/; Max-Age=31536000; SameSite=Lax',
    );
  });
});
