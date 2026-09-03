import { expect, expectTypeOf, test } from 'vitest';
import {
  OVERLAY_MATCH_STATUS_ORDER,
  PUBLIC_MEDIA_KINDS,
  PUBLIC_PLAYER_PROFILE_FIELDS,
  type PublicPlayerProfile,
} from './index.js';

test('exports safe public profile and media contracts in deterministic order', () => {
  expect(PUBLIC_MEDIA_KINDS).toEqual(['avatar', 'logo', 'banner']);
  expect(PUBLIC_PLAYER_PROFILE_FIELDS).toEqual([
    'slug',
    'gamertag',
    'avatar',
    'realName',
    'biography',
  ]);
  expect(OVERLAY_MATCH_STATUS_ORDER).toEqual(['in_progress', 'scheduled']);
  expectTypeOf<PublicPlayerProfile>().toMatchTypeOf<{ slug: string; gamertag: string }>();
});
