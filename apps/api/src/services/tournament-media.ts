import { and, eq, isNotNull, isNull, or } from 'drizzle-orm';
import {
  auditLogs,
  publicMedia,
  tournamentAppearances,
  tournaments,
  type Db,
} from '@opentournament/database';
import { db } from '../db.js';
import { getPrivateObject } from './storage.js';
import {
  MAX_PUBLIC_MEDIA_BYTES,
  discardStagedPublicImage,
  stagePublicImage,
} from './public-media.js';
import { retirePublicMedia } from './media-retirement.js';

type Slot = 'logo' | 'banner';
type Tournament = { id: string; organizationId: string };
type Media = { bytes: Uint8Array; mimeType: string; sizeBytes: number; checksum: string };

function mediaError(message: string, statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

function slotColumn(slot: Slot) {
  return slot === 'logo' ? tournamentAppearances.logoMediaId : tournamentAppearances.bannerMediaId;
}

function slotUpdate(slot: Slot, mediaId: string | null) {
  return slot === 'logo'
    ? { logoMediaId: mediaId, updatedAt: new Date() }
    : { bannerMediaId: mediaId, updatedAt: new Date() };
}

export async function publishTournamentMedia(
  actorId: string,
  tournament: Tournament,
  slot: Slot,
  input: Uint8Array,
): Promise<{ id: string }> {
  const [appearance] = await db
    .select({ mediaId: slotColumn(slot) })
    .from(tournamentAppearances)
    .where(eq(tournamentAppearances.tournamentId, tournament.id))
    .limit(1);
  const previousMediaId = appearance?.mediaId ?? null;
  const staged = await stagePublicImage(input);
  let media: { id: string };

  try {
    [media] = await db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(publicMedia)
        .values({
          tournamentId: tournament.id,
          kind: slot,
          objectKey: staged.objectKey,
          mimeType: staged.mimeType,
          sizeBytes: staged.bytes.byteLength,
          width: staged.width,
          height: staged.height,
          checksum: staged.checksum,
        })
        .returning({ id: publicMedia.id });
      if (!created) throw new Error('Media publication did not create a row');
      await transaction
        .insert(tournamentAppearances)
        .values({ tournamentId: tournament.id })
        .onConflictDoNothing();
      const [attached] = await transaction
        .update(tournamentAppearances)
        .set(slotUpdate(slot, created.id))
        .where(
          and(
            eq(tournamentAppearances.tournamentId, tournament.id),
            previousMediaId ? eq(slotColumn(slot), previousMediaId) : isNull(slotColumn(slot)),
          ),
        )
        .returning({ id: tournamentAppearances.tournamentId });
      if (!attached) throw mediaError('The media changed during replacement', 409);
      await transaction.insert(auditLogs).values({
        organizationId: tournament.organizationId,
        actorId,
        action: 'tournament.media.published',
        resourceType: 'public_media',
        resourceId: created.id,
        after: { slot },
      });
      return [created, attached];
    });
  } catch (error) {
    await discardStagedPublicImage(staged).catch(() => undefined);
    throw error;
  }
  await retirePublicMedia(db, previousMediaId).catch(() => undefined);
  return media;
}

export async function removeTournamentMedia(
  actorId: string,
  tournament: Tournament,
  slot: Slot,
): Promise<boolean> {
  const [appearance] = await db
    .select({ mediaId: slotColumn(slot) })
    .from(tournamentAppearances)
    .where(eq(tournamentAppearances.tournamentId, tournament.id))
    .limit(1);
  if (!appearance?.mediaId) return false;
  const [detached] = await db
    .update(tournamentAppearances)
    .set(slotUpdate(slot, null))
    .where(
      and(
        eq(tournamentAppearances.tournamentId, tournament.id),
        eq(slotColumn(slot), appearance.mediaId),
      ),
    )
    .returning({ id: tournamentAppearances.tournamentId });
  if (!detached) return false;
  await db.insert(auditLogs).values({
    organizationId: tournament.organizationId,
    actorId,
    action: 'tournament.media.removed',
    resourceType: 'public_media',
    resourceId: appearance.mediaId,
    after: { slot },
  });
  await retirePublicMedia(db, appearance.mediaId);
  return true;
}

export async function readPublishedTournamentMedia(mediaId: string): Promise<Media | null> {
  const [media] = await db
    .select()
    .from(publicMedia)
    .innerJoin(
      tournamentAppearances,
      eq(tournamentAppearances.tournamentId, publicMedia.tournamentId),
    )
    .innerJoin(tournaments, eq(tournaments.id, publicMedia.tournamentId))
    .where(
      and(
        eq(publicMedia.id, mediaId),
        eq(publicMedia.state, 'active'),
        or(
          eq(tournamentAppearances.logoMediaId, publicMedia.id),
          eq(tournamentAppearances.bannerMediaId, publicMedia.id),
        ),
        eq(tournaments.visibility, 'public'),
        isNotNull(tournaments.publishedAt),
        isNull(tournaments.deletedAt),
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
