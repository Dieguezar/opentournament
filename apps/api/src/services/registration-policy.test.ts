import { describe, expect, it } from 'vitest';
import {
  canDecideRegistration,
  isRegistrationClosed,
} from './registration-policy.js';

describe('política temporal de inscripciones', () => {
  it.each(['open', 'checkin_open'])(
    'permite decidir inscripciones durante %s',
    (tournamentStatus) => {
      expect(canDecideRegistration(tournamentStatus)).toBe(true);
    },
  );

  it.each(['draft', 'in_progress', 'finalized', 'cancelled'])(
    'bloquea decisiones durante %s',
    (tournamentStatus) => {
      expect(canDecideRegistration(tournamentStatus)).toBe(false);
    },
  );

  it('cierra el registro en el instante configurado, no después', () => {
    const now = new Date('2026-08-23T12:00:00.000Z');

    expect(isRegistrationClosed(undefined, now)).toBe(false);
    expect(isRegistrationClosed('2026-08-23T12:00:00.001Z', now)).toBe(false);
    expect(isRegistrationClosed('2026-08-23T12:00:00.000Z', now)).toBe(true);
    expect(isRegistrationClosed('2026-08-23T11:59:59.999Z', now)).toBe(true);
  });
});
