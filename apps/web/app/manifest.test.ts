import { describe, expect, it } from 'vitest';

import manifest from './manifest';

describe('web app manifest', () => {
  it('uses the approved dark canvas and official application icons', () => {
    const value = manifest();

    expect(value.background_color).toBe('#111318');
    expect(value.theme_color).toBe('#111318');
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/icon-192.png',
          sizes: '192x192',
          purpose: 'maskable',
        }),
        expect.objectContaining({
          src: '/icon-512.png',
          sizes: '512x512',
          purpose: 'maskable',
        }),
      ]),
    );
  });
});
