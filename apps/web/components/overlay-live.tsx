'use client';

import { useEffect, useState, type ReactNode } from 'react';

export interface OverlaySnapshot extends Record<string, unknown> {
  tournament: Record<string, unknown> & { name: string };
}

interface OverlayEventSource {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  close(): void;
}

interface OverlayLiveControllerOptions {
  slug: string;
  fetchImpl: typeof fetch;
  eventSourceFactory: (url: string) => OverlayEventSource;
  onSnapshot(snapshot: OverlaySnapshot): void;
  onUnavailable(): void;
}

interface OverlayLiveProps {
  slug: string;
  view: string;
  children(snapshot: OverlaySnapshot): ReactNode;
}

function isOverlayPayload(value: unknown): value is { overlay: OverlaySnapshot } {
  if (!value || typeof value !== 'object') return false;
  const overlay = value as { overlay?: unknown };
  if (!overlay.overlay || typeof overlay.overlay !== 'object') return false;
  const snapshot = overlay.overlay as { tournament?: unknown };
  if (!snapshot.tournament || typeof snapshot.tournament !== 'object') return false;
  return typeof (snapshot.tournament as { name?: unknown }).name === 'string';
}

export class OverlayLiveController {
  private readonly refresh = () => {
    this.isDirty = true;
    void this.drain();
  };

  private connection: OverlayEventSource | null = null;
  private currentRequest: AbortController | null = null;
  private isDirty = false;
  private isDisposed = false;
  private isFetching = false;
  private latestAccepted = 0;
  private latestIssued = 0;

  constructor(private readonly options: OverlayLiveControllerOptions) {}

  start() {
    if (this.isDisposed || this.connection) return;
    this.connection = this.options.eventSourceFactory(
      `/api/v1/events/public?tournament=${encodeURIComponent(this.options.slug)}`,
    );
    this.connection.addEventListener('open', this.refresh);
    this.connection.addEventListener('overlay.invalidated', this.refresh);
    this.refresh();
  }

  refreshNow() {
    this.refresh();
  }

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.currentRequest?.abort();
    this.currentRequest = null;
    this.closeConnection();
  }

  private async drain() {
    if (this.isDisposed || this.isFetching) return;
    this.isFetching = true;

    while (this.isDirty && !this.isDisposed) {
      this.isDirty = false;
      const sequence = ++this.latestIssued;
      const abortController = new AbortController();
      this.currentRequest = abortController;

      try {
        const response = await this.options.fetchImpl(
          `/api/v1/tournaments/by-slug/${encodeURIComponent(this.options.slug)}/overlay`,
          { cache: 'no-store', signal: abortController.signal },
        );
        if (this.isDisposed || sequence <= this.latestAccepted) continue;
        if (response.status === 404) {
          this.options.onUnavailable();
          this.dispose();
          break;
        }
        if (!response.ok) continue;

        const payload: unknown = await response.json();
        if (!isOverlayPayload(payload) || this.isDisposed || sequence <= this.latestAccepted)
          continue;
        this.latestAccepted = sequence;
        this.options.onSnapshot(payload.overlay);
      } catch {
        // EventSource reconnects independently; a later open or invalidation retries the snapshot.
      } finally {
        if (this.currentRequest === abortController) this.currentRequest = null;
      }
    }

    this.isFetching = false;
  }

  private closeConnection() {
    if (!this.connection) return;
    this.connection.removeEventListener('open', this.refresh);
    this.connection.removeEventListener('overlay.invalidated', this.refresh);
    this.connection.close();
    this.connection = null;
  }
}

export function OverlayLive({ slug, view, children }: OverlayLiveProps) {
  const routeKey = `${slug}\u0000${view}`;
  const [snapshot, setSnapshot] = useState<{ routeKey: string; value: OverlaySnapshot } | null>(
    null,
  );

  useEffect(() => {
    const controller = new OverlayLiveController({
      slug,
      fetchImpl: (input, init) => fetch(input, init),
      eventSourceFactory: (url) => new EventSource(url),
      onSnapshot: (value) => setSnapshot({ routeKey, value }),
      onUnavailable: () => setSnapshot(null),
    });
    controller.start();
    if (typeof window === 'undefined') return () => controller.dispose();
    const refreshOnReconnect = () => controller.refreshNow();
    window.addEventListener('online', refreshOnReconnect);
    return () => {
      window.removeEventListener('online', refreshOnReconnect);
      controller.dispose();
    };
  }, [routeKey]);

  return snapshot?.routeKey === routeKey ? children(snapshot.value) : null;
}
