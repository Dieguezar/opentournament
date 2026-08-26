import { describe, expect, it, vi } from 'vitest';
import { cleanupDevelopmentPwa, getPwaRuntimeAction } from './pwa-cache';

describe('PWA cache policy', () => {
  it('registers the service worker only in production', () => {
    expect(getPwaRuntimeAction('production')).toBe('register');
    expect(getPwaRuntimeAction('development')).toBe('cleanup');
    expect(getPwaRuntimeAction('test')).toBe('cleanup');
  });

  it('removes OpenTournament workers and caches during development', async () => {
    const unregisterFirst = vi.fn().mockResolvedValue(true);
    const unregisterSecond = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const serviceWorkers = {
      getRegistrations: vi
        .fn()
        .mockResolvedValue([{ unregister: unregisterFirst }, { unregister: unregisterSecond }]),
    };
    const cacheStorage = {
      keys: vi.fn().mockResolvedValue(['opentournament-v1', 'third-party-cache']),
      delete: deleteCache,
    };

    await cleanupDevelopmentPwa(serviceWorkers, cacheStorage);

    expect(unregisterFirst).toHaveBeenCalledOnce();
    expect(unregisterSecond).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledWith('opentournament-v1');
  });
});
