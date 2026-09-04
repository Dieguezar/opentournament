import type { FastifyInstance, FastifyRequest } from 'fastify';
import { db } from '../db.js';
import { requireAuth } from '../plugins/auth.js';
import { getTournament, isTournamentAdmin } from '../services/permissions.js';
import { emitTournamentEvent } from '../services/realtime.js';
import { MAX_PUBLIC_MEDIA_BYTES } from '../services/public-media.js';
import {
  publishProfileAvatar,
  readPublishedAvatar,
  removeProfileAvatar,
} from '../services/profile-media.js';
import {
  publishTournamentMedia,
  readPublishedTournamentMedia,
  removeTournamentMedia,
} from '../services/tournament-media.js';

const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Slot = 'logo' | 'banner';

function notFound(reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  return reply
    .status(404)
    .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
}

function isSlot(slot: string): slot is Slot {
  return slot === 'logo' || slot === 'banner';
}

async function readUpload(request: FastifyRequest): Promise<Uint8Array> {
  const file = await request.file({ limits: { files: 1, fileSize: MAX_PUBLIC_MEDIA_BYTES } });
  if (!file) throw Object.assign(new Error('An image file is required'), { statusCode: 400 });
  const bytes = await file.toBuffer();
  if (file.file.truncated)
    throw Object.assign(new Error('The image exceeds the upload limit'), { statusCode: 413 });
  return bytes;
}

function sendMediaError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  const statusCode =
    error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 500;
  return reply.status(statusCode).send({
    error: {
      code:
        statusCode === 413
          ? 'MEDIA_TOO_LARGE'
          : statusCode === 503
            ? 'MEDIA_UNAVAILABLE'
            : 'INVALID_MEDIA',
    },
  });
}

export async function registerPublicMediaRoutes(app: FastifyInstance): Promise<void> {
  app.post('/profile/public/avatar', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    try {
      const media = await publishProfileAvatar(request.user!.id, await readUpload(request));
      return reply.status(201).send({ media: { id: media.id } });
    } catch (error) {
      return sendMediaError(reply, error);
    }
  });

  app.delete('/profile/public/avatar', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    if (!(await removeProfileAvatar(request.user!.id))) return notFound(reply);
    return reply.status(204).send();
  });

  app.post('/tournaments/:id/appearance/:slot', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id, slot } = request.params as { id: string; slot: string };
    if (!isSlot(slot)) return notFound(reply);
    const tournament = await getTournament(db, id);
    if (!tournament) return notFound(reply);
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply
        .status(403)
        .send({ error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' } });
    }
    try {
      const media = await publishTournamentMedia(
        request.user!.id,
        tournament,
        slot,
        await readUpload(request),
      );
      emitTournamentEvent(id, 'tournament.updated', { appearance: true });
      return reply.status(201).send({ media: { id: media.id } });
    } catch (error) {
      return sendMediaError(reply, error);
    }
  });

  app.delete('/tournaments/:id/appearance/:slot', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { id, slot } = request.params as { id: string; slot: string };
    if (!isSlot(slot)) return notFound(reply);
    const tournament = await getTournament(db, id);
    if (!tournament) return notFound(reply);
    if (!(await isTournamentAdmin(db, id, request.user!.id))) {
      return reply
        .status(403)
        .send({ error: { code: 'FORBIDDEN', message: 'A tournament admin role is required' } });
    }
    if (!(await removeTournamentMedia(request.user!.id, tournament, slot))) return notFound(reply);
    emitTournamentEvent(id, 'tournament.updated', { appearance: true });
    return reply.status(204).send();
  });

  app.get('/media/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!mediaIdPattern.test(id)) return notFound(reply);
    try {
      const media = (await readPublishedAvatar(id)) ?? (await readPublishedTournamentMedia(id));
      if (!media) return notFound(reply);
      return reply
        .header('Content-Type', media.mimeType)
        .header('Content-Length', String(media.sizeBytes))
        .header('ETag', `"${media.checksum}"`)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .header('X-Content-Type-Options', 'nosniff')
        .send(Buffer.from(media.bytes));
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 503) {
        return reply.status(503).send({ error: { code: 'MEDIA_UNAVAILABLE' } });
      }
      throw error;
    }
  });
}
