import type { FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';

export interface RealtimeEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

type Listener = (event: RealtimeEvent) => void;

const channels = new Map<string, Set<Listener>>();

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

export function sseReply(reply: FastifyReply, channelsToSubscribe: string[]) {
  const raw = reply.raw;
  raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  raw.write(': conectado\n\n');

  const unsubscribers = channelsToSubscribe.map((channel) =>
    subscribe(channel, (event) => {
      raw.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    }),
  );

  const keepAlive = setInterval(() => {
    raw.write(': ping\n\n');
  }, 15_000);

  raw.on('close', () => {
    clearInterval(keepAlive);
    for (const unsubscribe of unsubscribers) unsubscribe();
  });
}
