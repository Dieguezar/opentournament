import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { MAX_PUBLIC_MEDIA_BYTES } from '../services/public-media.js';
import { publishInitialProfileAvatar, readPublishedAvatar } from '../services/profile-media.js';

const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function notFound(reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  return reply
    .status(404)
    .send({ error: { code: 'NOT_FOUND', message: 'The resource does not exist' } });
}

async function readUpload(request: FastifyRequest): Promise<Uint8Array> {
  const file = await request.file({ limits: { files: 1, fileSize: MAX_PUBLIC_MEDIA_BYTES } });
  if (!file) throw Object.assign(new Error('An image file is required'), { statusCode: 400 });
  const bytes = await file.toBuffer();
  if (file.file.truncated)
    throw Object.assign(new Error('The image exceeds the upload limit'), { statusCode: 413 });
  return bytes;
}

export async function registerPublicMediaRoutes(app: FastifyInstance): Promise<void> {
  app.post('/profile/public/avatar', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    try {
      const media = await publishInitialProfileAvatar(request.user!.id, await readUpload(request));
      return reply.status(201).send({ media: { id: media.id } });
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number(error.statusCode)
          : 500;
      return reply
        .status(statusCode)
        .send({ error: { code: statusCode === 409 ? 'AVATAR_EXISTS' : 'INVALID_MEDIA' } });
    }
  });

  app.get('/media/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!mediaIdPattern.test(id)) return notFound(reply);
    try {
      const media = await readPublishedAvatar(id);
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
