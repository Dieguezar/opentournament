import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { deletePrivateObject, putPrivateObject } from './storage.js';

export const MAX_PUBLIC_MEDIA_BYTES = 2 * 1024 * 1024;
export const MAX_PUBLIC_MEDIA_WIDTH = 4_096;
export const MAX_PUBLIC_MEDIA_HEIGHT = 4_096;
export const MAX_PUBLIC_MEDIA_PIXELS = 8_000_000;

type PublicMediaMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

export type ValidatedPublicImage = {
  bytes: Uint8Array;
  mimeType: PublicMediaMimeType;
  width: number;
  height: number;
  checksum: string;
};

export type StagedPublicImage = ValidatedPublicImage & {
  objectKey: string;
};

function mediaError(message: string, statusCode = 400): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

function detectMimeType(format: string | undefined): PublicMediaMimeType | null {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return null;
  }
}

export async function validatePublicImage(input: Uint8Array): Promise<ValidatedPublicImage> {
  if (input.byteLength === 0) throw mediaError('An image file is required');
  if (input.byteLength > MAX_PUBLIC_MEDIA_BYTES) {
    throw mediaError('The image exceeds the 2 MB upload limit', 413);
  }

  try {
    const metadata = await sharp(input, { failOn: 'error', limitInputPixels: false }).metadata();
    const mimeType = detectMimeType(metadata.format);
    if (!mimeType || !metadata.width || !metadata.height) {
      throw mediaError('Only PNG, JPEG, and WebP images are allowed');
    }
    if (
      metadata.width > MAX_PUBLIC_MEDIA_WIDTH ||
      metadata.height > MAX_PUBLIC_MEDIA_HEIGHT ||
      metadata.width * metadata.height > MAX_PUBLIC_MEDIA_PIXELS
    ) {
      throw mediaError('The image dimensions exceed the configured limit', 413);
    }

    const { data, info } = await sharp(input, {
      failOn: 'error',
      limitInputPixels: MAX_PUBLIC_MEDIA_PIXELS,
    })
      .rotate()
      .toFormat(metadata.format)
      .toBuffer({ resolveWithObject: true });
    if (data.byteLength > MAX_PUBLIC_MEDIA_BYTES) {
      throw mediaError('The decoded image exceeds the 2 MB upload limit', 413);
    }

    return {
      bytes: data,
      mimeType,
      width: info.width,
      height: info.height,
      checksum: createHash('sha256').update(data).digest('hex'),
    };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) throw error;
    throw mediaError('The file is not a valid raster image');
  }
}

export function createPrivateMediaKey(mimeType: PublicMediaMimeType): string {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.slice('image/'.length);
  return `private/public-media/${randomUUID()}.${extension}`;
}

export async function stagePublicImage(input: Uint8Array): Promise<StagedPublicImage> {
  const image = await validatePublicImage(input);
  const objectKey = createPrivateMediaKey(image.mimeType);
  try {
    await putPrivateObject(objectKey, image.bytes, image.mimeType);
  } catch (error) {
    await deletePrivateObject(objectKey).catch(() => undefined);
    throw error;
  }
  return { ...image, objectKey };
}

export async function discardStagedPublicImage(
  image: Pick<StagedPublicImage, 'objectKey'>,
): Promise<void> {
  await deletePrivateObject(image.objectKey);
}
