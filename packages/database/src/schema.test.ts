import { expect, test } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { publicMedia, publicPlayerProfiles, tournamentAppearances } from './schema.js';

test('models exclusive media owners and opt-in presentation records', () => {
  expect([publicMedia.userId.name, publicMedia.tournamentId.name]).toEqual([
    'user_id',
    'tournament_id',
  ]);
  expect([
    publicPlayerProfiles.showAvatar.default,
    publicPlayerProfiles.showRealName.default,
  ]).toEqual([false, false]);
  expect([tournamentAppearances.primaryColor.name, tournamentAppearances.accentColor.name]).toEqual(
    ['primary_color', 'accent_color'],
  );
});

test('enforces exactly one public media owner with a database check', () => {
  const constraint = getTableConfig(publicMedia).checks.find(
    (check) => check.name === 'public_media_exactly_one_owner',
  );

  if (!constraint) {
    throw new Error('Expected public_media_exactly_one_owner check');
  }
  expect(
    constraint.value.queryChunks.flatMap((chunk) => (chunk && 'name' in chunk ? [chunk.name] : [])),
  ).toEqual(['user_id', 'tournament_id']);
  expect(
    constraint.value.queryChunks.flatMap((chunk) => (chunk && 'value' in chunk ? chunk.value : [])),
  ).toContain(' IS NOT NULL) <> (');
});
