import type { FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';

export interface RealtimeEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

type Listener = (event: RealtimeEvent) => void;

interface SseOptions {
  publicOverlayInvalidations?: boolean;
}

const channels = new Map<string, Set<Listener>>();
let activeHeartbeats = 0;

export function activeRealtimeSubscriptions(channel: string): number {
  return channels.get(channel)?.size ?? 0;
}

export function activeRealtimeHeartbeats(): number {
  return activeHeartbeats;
}

export function subscribe(channel: string, listener: Listener): () => void {
  const set = channels.get(channel) ?? new Set<Listener>();
  set.add(listener);
  channels.set(channel, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) channels.delete(channel);
  };
}

export function publish(channel: string, event: RealtimeEvent): void {
  for (const listener of channels.get(channel) ?? []) {
    try {
      listener(event);
    } catch {
      // A failing listener must not break the remaining listeners.
    }
  }
}

export function emitTournamentEvent(
  tournamentId: string,
  type: string,
  data: Record<string, unknown>,
): void {
  publish(`tournament:${tournamentId}`, {
    id: randomUUID(),
    type,
    data: { tournamentId, ...data },
  });
}

export function emitUserEvent(userId: string, type: string, data: Record<string, unknown>): void {
  publish(`user:${userId}`, { id: randomUUID(), type, data });
}

export function sseReply(
  reply: FastifyReply,
  channelsToSubscribe: string[],
  options: SseOptions = {},
): void {
  const raw = reply.raw;
  raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
    Connection: 'keep-alive',
    Pragma: 'no-cache',
    'X-Accel-Buffering': 'no',
  });
  raw.write('retry: 3000\n: bootstrap\n\n');

  const unsubscribers = channelsToSubscribe.map((channel) =>
    subscribe(channel, (event) => {
      raw.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      if (options.publicOverlayInvalidations) {
        raw.write('event: overlay.invalidated\ndata: {}\n\n');
      }
    }),
  );

  activeHeartbeats += 1;
  const keepAlive = setInterval(() => {
    raw.write(': heartbeat\n\n');
  }, 15_000);
  let closed = false;

  raw.on('close', () => {
    if (closed) return;
    closed = true;
    clearInterval(keepAlive);
    activeHeartbeats -= 1;
    for (const unsubscribe of unsubscribers) unsubscribe();
  });
}
