import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES } from '@opentournament/shared-types';
import { getApiErrorMessage } from './api-error-messages';

describe('API error localization', () => {
  it('provides English and Spanish messages for every stable error code', () => {
    for (const code of API_ERROR_CODES) {
      expect(getApiErrorMessage(code, 'en')).not.toBe(code);
      expect(getApiErrorMessage(code, 'es')).not.toBe(code);
    }
  });

  it('uses the English server message for an unknown code in English', () => {
    expect(getApiErrorMessage('PLUGIN_FAILURE', 'en', 'Plugin failed')).toBe('Plugin failed');
  });

  it('does not expose an untranslated server message for an unknown code in Spanish', () => {
    expect(getApiErrorMessage('PLUGIN_FAILURE', 'es', 'Plugin failed')).toBe(
      'No se pudo completar la acción.',
    );
  });
});
