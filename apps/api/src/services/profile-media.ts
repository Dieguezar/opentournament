import { and, eq, isNull } from 'drizzle-orm';
import { publicMedia, publicPlayerProfiles } from '@opentournament/database';
import { db } from '../db.js';
import { deletePrivateObject, getPrivateObject } from './storage.js';
import {
  MAX_PUBLIC_MEDIA_BYTES,
  discardStagedPublicImage,
  stagePublicImage,
} from './public-media.js';

function mediaError(message: string, statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

export async function publishInitialProfileAvatar(
  userId: string,
  input: Uint8Array,
): Promise<{ id: string }> {
  const [profile] = await db
    .select({ id: publicPlayerProfiles.id, avatarMediaId: publicPlayerProfiles.avatarMediaId })
    .from(publicPlayerProfiles)
    .where(eq(publicPlayerProfiles.userId, userId))
    .limit(1);
  if (!profile || profile.avatarMediaId) {
    throw mediaError('An avatar cannot be published for this profile', 409);
  }

  const staged = await stagePublicImage(input);
  try {
    const media = await db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(publicMedia)
        .values({
          userId,
          kind: 'avatar',
          objectKey: staged.objectKey,
          mimeType: staged.mimeType,
          sizeBytes: staged.bytes.byteLength,
          width: staged.width,
          height: staged.height,
          checksum: staged.checksum,
        })
        .returning({ id: publicMedia.id });
      if (!created) throw new Error('Media publication did not create a row');
      const [attached] = await transaction
        .update(publicPlayerProfiles)
        .set({ avatarMediaId: created.id, updatedAt: new Date() })
        .where(
          and(eq(publicPlayerProfiles.id, profile.id), isNull(publicPlayerProfiles.avatarMediaId)),
        )
        .returning({ id: publicPlayerProfiles.id });
      if (!attached) throw mediaError('An avatar cannot be published for this profile', 409);
      return created;
    });
    return media;
  } catch (error) {
    await discardStagedPublicImage(staged).catch(() => undefined);
    throw error;
  }
}

export async function readPublishedAvatar(mediaId: string): Promise<{
  bytes: Uint8Array;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
} | null> {
  const [media] = await db
    .select()
    .from(publicMedia)
    .innerJoin(publicPlayerProfiles, eq(publicPlayerProfiles.avatarMediaId, publicMedia.id))
    .where(
      and(
        eq(publicMedia.id, mediaId),
        eq(publicMedia.state, 'active'),
        eq(publicPlayerProfiles.isPublished, true),
        eq(publicPlayerProfiles.showAvatar, true),
      ),
    )
    .limit(1);
  if (!media) return null;
  try {
    const bytes = await getPrivateObject(media.public_media.objectKey, MAX_PUBLIC_MEDIA_BYTES);
    return { ...media.public_media, bytes };
  } catch {
    throw mediaError('The media store is temporarily unavailable', 503);
  }
}
