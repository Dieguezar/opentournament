import { describe, expect, it, vi } from 'vitest';

import { OverlayLiveController } from './overlay-live';

interface PendingRequest {
  signal: AbortSignal | undefined;
  resolve(response: Response): void;
}

class MockEventSource {
  readonly listeners = new Map<string, Set<() => void>>();
  closed = false;

  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string) {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

function deferredFetch() {
  const pending: PendingRequest[] = [];
  const fetchImpl = vi.fn(
    (_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        pending.push({ signal: init?.signal ?? undefined, resolve });
      }),
  );

  return { fetchImpl, pending };
}

function overlay(name: string) {
  return new Response(JSON.stringify({ overlay: { tournament: { name } } }), { status: 200 });
}

async function flush() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

describe('OverlayLiveController', () => {
  it('coalesces invalidations and refetches the authoritative snapshot after the active request', async () => {
    const { fetchImpl, pending } = deferredFetch();
    const source = new MockEventSource();
    const snapshots: string[] = [];
    const controller = new OverlayLiveController({
      slug: 'spring-major',
      fetchImpl,
      eventSourceFactory: () => source,
      onSnapshot: (snapshot) => snapshots.push(snapshot.tournament.name),
      onUnavailable: vi.fn(),
    });

    controller.start();
    source.emit('overlay.invalidated');
    source.emit('overlay.invalidated');
    source.emit('open');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    pending[0]?.resolve(overlay('before-result'));
    await flush();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    pending[1]?.resolve(overlay('after-result'));
    await flush();

    expect(snapshots).toEqual(['before-result', 'after-result']);
    controller.dispose();
  });

  it('aborts and rejects a stale response when a route instance is superseded', async () => {
    const oldRequests = deferredFetch();
    const nextRequests = deferredFetch();
    const oldSource = new MockEventSource();
    const nextSource = new MockEventSource();
    const snapshots: string[] = [];
    const oldController = new OverlayLiveController({
      slug: 'old-tournament',
      fetchImpl: oldRequests.fetchImpl,
      eventSourceFactory: () => oldSource,
      onSnapshot: (snapshot) => snapshots.push(snapshot.tournament.name),
      onUnavailable: vi.fn(),
    });
    const nextController = new OverlayLiveController({
      slug: 'new-tournament',
      fetchImpl: nextRequests.fetchImpl,
      eventSourceFactory: () => nextSource,
      onSnapshot: (snapshot) => snapshots.push(snapshot.tournament.name),
      onUnavailable: vi.fn(),
    });

    oldController.start();
    oldController.dispose();
    nextController.start();
    oldRequests.pending[0]?.resolve(overlay('stale-private-state'));
    nextRequests.pending[0]?.resolve(overlay('current-public-state'));
    await flush();

    expect(oldRequests.pending[0]?.signal?.aborted).toBe(true);
    expect(oldSource.closed).toBe(true);
    expect(snapshots).toEqual(['current-public-state']);
    nextController.dispose();
  });

  it('treats a not-found snapshot as unavailable and closes the SSE connection', async () => {
    const { fetchImpl, pending } = deferredFetch();
    const source = new MockEventSource();
    const onUnavailable = vi.fn();
    const onSnapshot = vi.fn();
    const controller = new OverlayLiveController({
      slug: 'private-tournament',
      fetchImpl,
      eventSourceFactory: () => source,
      onSnapshot,
      onUnavailable,
    });

    controller.start();
    pending[0]?.resolve(new Response(null, { status: 404 }));
    await flush();

    expect(onSnapshot).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(source.closed).toBe(true);
    expect([...source.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
  });
});
