interface ServiceWorkerRegistrationLike {
  unregister(): Promise<boolean>;
}

interface ServiceWorkerContainerLike {
  getRegistrations(): Promise<readonly ServiceWorkerRegistrationLike[]>;
}

interface CacheStorageLike {
  keys(): Promise<readonly string[]>;
  delete(cacheName: string): Promise<boolean>;
}

const OPEN_TOURNAMENT_CACHE_PREFIX = 'opentournament-';

export function getPwaRuntimeAction(environment: string | undefined): 'register' | 'cleanup' {
  return environment === 'production' ? 'register' : 'cleanup';
}

export async function cleanupDevelopmentPwa(
  serviceWorkers: ServiceWorkerContainerLike,
  cacheStorage?: CacheStorageLike,
): Promise<void> {
  const [registrations, cacheNames] = await Promise.all([
    serviceWorkers.getRegistrations(),
    cacheStorage?.keys() ?? Promise.resolve([]),
  ]);

  await Promise.all([
    ...registrations.map((registration) => registration.unregister()),
    ...cacheNames
      .filter((cacheName) => cacheName.startsWith(OPEN_TOURNAMENT_CACHE_PREFIX))
      .map((cacheName) => cacheStorage!.delete(cacheName)),
  ]);
}
