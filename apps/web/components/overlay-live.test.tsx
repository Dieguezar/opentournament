import { describe, expect, it, vi } from 'vitest';

import { OverlayLive, OverlayLiveController } from './overlay-live';

interface EffectSlot {
  cleanup?: () => void;
  dependencies: readonly unknown[];
}

let activeHarness: OverlayLiveHarness | null = null;

vi.mock('react', () => ({
  useEffect: (effect: () => void | (() => void), dependencies: readonly unknown[]) =>
    activeHarness?.useEffect(effect, dependencies),
  useState: <Value,>(initialValue: Value) => activeHarness!.useState(initialValue),
}));

class OverlayLiveHarness {
  private readonly effects: EffectSlot[] = [];
  private readonly state: unknown[] = [];
  private hookIndex = 0;

  render(slug: string, view: string) {
    this.hookIndex = 0;
    return OverlayLive({ slug, view, children: (snapshot) => snapshot.tournament.name });
  }

  useState<Value>(initialValue: Value) {
    const index = this.hookIndex++;
    this.state[index] ??= initialValue;
    return [this.state[index] as Value, (value: Value) => (this.state[index] = value)] as const;
  }

  useEffect(effect: () => void | (() => void), dependencies: readonly unknown[]) {
    const index = this.hookIndex++;
    const previous = this.effects[index];
    if (previous && dependencies.every((value, i) => Object.is(value, previous.dependencies[i])))
      return;
    previous?.cleanup?.();
    const cleanup = effect();
    this.effects[index] = {
      cleanup: typeof cleanup === 'function' ? cleanup : undefined,
      dependencies,
    };
  }

  dispose() {
    this.effects.forEach((effect) => effect.cleanup?.());
  }
}

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

  it('reopens SSE and refetches authoritative state after an SSE error', async () => {
    vi.useFakeTimers();
    const { fetchImpl, pending } = deferredFetch();
    const firstSource = new MockEventSource();
    const reconnectedSource = new MockEventSource();
    const sources = [firstSource, reconnectedSource];
    const snapshots: string[] = [];
    const controller = new OverlayLiveController({
      slug: 'spring-major',
      fetchImpl,
      eventSourceFactory: () => sources.shift()!,
      onSnapshot: (snapshot) => snapshots.push(snapshot.tournament.name),
      onUnavailable: vi.fn(),
    });

    controller.start();
    pending[0]?.resolve(overlay('before-restart'));
    await flush();
    firstSource.emit('error');
    await vi.advanceTimersByTimeAsync(3_000);

    expect(firstSource.closed).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    pending[1]?.resolve(overlay('after-restart'));
    await flush();

    expect(snapshots).toEqual(['before-restart', 'after-restart']);
    controller.dispose();
    vi.useRealTimers();
  });
});

describe('OverlayLive route supersession', () => {
  it('hides an accepted old route before a failing replacement can render it again', async () => {
    const requests = deferredFetch();
    const oldSource = new MockEventSource();
    const nextSource = new MockEventSource();
    const sources = [oldSource, nextSource];
    const harness = (activeHarness = new OverlayLiveHarness());
    vi.stubGlobal('fetch', requests.fetchImpl);
    vi.stubGlobal(
      'EventSource',
      class {
        constructor() {
          return sources.shift()!;
        }
      },
    );

    expect(harness.render('old-tournament', 'scoreboard')).toBeNull();
    requests.pending[0]?.resolve(overlay('old-state'));
    await flush();
    expect(harness.render('old-tournament', 'scoreboard')).toBe('old-state');
    oldSource.emit('overlay.invalidated');

    expect(harness.render('new-tournament', 'scoreboard')).toBeNull();
    expect(requests.pending[1]?.signal?.aborted).toBe(true);
    expect(oldSource.closed).toBe(true);
    expect([...oldSource.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);

    requests.pending[2]?.resolve(new Response(null, { status: 500 }));
    await flush();
    expect(harness.render('new-tournament', 'scoreboard')).toBeNull();
    harness.dispose();
    vi.unstubAllGlobals();
  });

  it('restarts the same slug for a new view and rejects the old late response', async () => {
    const requests = deferredFetch();
    const oldSource = new MockEventSource();
    const nextSource = new MockEventSource();
    const sources = [oldSource, nextSource];
    const harness = (activeHarness = new OverlayLiveHarness());
    vi.stubGlobal('fetch', requests.fetchImpl);
    vi.stubGlobal(
      'EventSource',
      class {
        constructor() {
          return sources.shift()!;
        }
      },
    );

    harness.render('spring-major', 'scoreboard');
    expect(harness.render('spring-major', 'up-next')).toBeNull();
    expect(requests.pending[0]?.signal?.aborted).toBe(true);
    expect(oldSource.closed).toBe(true);

    requests.pending[1]?.resolve(overlay('up-next-state'));
    await flush();
    expect(harness.render('spring-major', 'up-next')).toBe('up-next-state');
    requests.pending[0]?.resolve(overlay('old-scoreboard-state'));
    await flush();
    expect(harness.render('spring-major', 'up-next')).toBe('up-next-state');
    harness.dispose();
    vi.unstubAllGlobals();
  });
});
