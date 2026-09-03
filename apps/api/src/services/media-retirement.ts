import { and, eq } from 'drizzle-orm';
import { jobs, publicMedia, type Db } from '@opentournament/database';
import { deletePrivateObject } from './storage.js';

const isPublicMediaKey = (key: string) => key.startsWith('private/public-media/');

export async function deleteRetiredPublicMedia(
  database: Db,
  mediaId: string,
  objectKey: string,
): Promise<void> {
  if (!isPublicMediaKey(objectKey)) throw new Error('A valid public-media object key is required');
  await deletePrivateObject(objectKey);
  await database
    .update(publicMedia)
    .set({ state: 'deleted' })
    .where(
      and(
        eq(publicMedia.id, mediaId),
        eq(publicMedia.objectKey, objectKey),
        eq(publicMedia.state, 'retired'),
      ),
    );
}

export async function retirePublicMedia(database: Db, mediaId: string | null): Promise<void> {
  if (!mediaId) return;
  const [media] = await database
    .update(publicMedia)
    .set({ state: 'retired', retiredAt: new Date() })
    .where(and(eq(publicMedia.id, mediaId), eq(publicMedia.state, 'active')))
    .returning({ id: publicMedia.id, objectKey: publicMedia.objectKey });
  if (!media) return;
  try {
    await deleteRetiredPublicMedia(database, media.id, media.objectKey);
  } catch {
    await database.insert(jobs).values({
      kind: 'public_media.delete',
      runAt: new Date(),
      payload: { mediaId: media.id, objectKey: media.objectKey },
    });
  }
}
