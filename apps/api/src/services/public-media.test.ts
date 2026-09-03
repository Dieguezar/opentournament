import { HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  MAX_PUBLIC_MEDIA_BYTES,
  createPrivateMediaKey,
  discardStagedPublicImage,
  stagePublicImage,
  validatePublicImage,
} from './public-media.js';
import { getPrivateObject, objectExists } from './storage.js';

async function createRaster(width = 2, height = 2, format: 'png' | 'jpeg' | 'webp' = 'png') {
  return sharp({
    create: { width, height, channels: 4, background: { r: 30, g: 120, b: 200, alpha: 1 } },
  })
    .withMetadata({ exif: { IFD0: { ImageDescription: 'untrusted metadata' } } })
    .toFormat(format)
    .toBuffer();
}

describe('public media image ingest', () => {
  it('fully decodes and re-encodes a valid raster using its detected MIME type', async () => {
    const source = await createRaster(3, 2, 'jpeg');

    const image = await validatePublicImage(source);

    expect(image.mimeType).toBe('image/jpeg');
    expect(image.width).toBe(3);
    expect(image.height).toBe(2);
    expect((await sharp(source).metadata()).exif).toBeDefined();
    const encodedMetadata = await sharp(image.bytes).metadata();
    expect(encodedMetadata).toMatchObject({ format: 'jpeg', width: 3, height: 2 });
    expect(encodedMetadata.exif).toBeUndefined();
  });

  it.each([
    ['SVG document', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')],
    ['corrupt bytes', Buffer.from('not an image')],
  ])('rejects %s before staging', async (_label, input) => {
    await expect(validatePublicImage(input)).rejects.toThrow();
  });

  it('rejects byte, dimension, and decoded-pixel limits', async () => {
    await expect(validatePublicImage(Buffer.alloc(MAX_PUBLIC_MEDIA_BYTES + 1))).rejects.toThrow();
    await expect(validatePublicImage(await createRaster(4_097, 1))).rejects.toThrow();
    await expect(validatePublicImage(await createRaster(3_000, 3_000))).rejects.toThrow();
  });

  it('creates opaque keys under the private public-media prefix', () => {
    const first = createPrivateMediaKey('image/png');
    const second = createPrivateMediaKey('image/png');

    expect(first).toMatch(/^private\/public-media\/[0-9a-f-]{36}\.png$/);
    expect(second).toMatch(/^private\/public-media\/[0-9a-f-]{36}\.png$/);
    expect(first).not.toBe(second);
  });

  const runMinioHarness = process.env.RUN_MINIO_HARNESS === 'true';
  (runMinioHarness ? it : it.skip)(
    'stages and discards private bytes in MinIO without creating an object for invalid SVG',
    async () => {
      const source = await createRaster();
      const staged = await stagePublicImage(source);

      expect(staged.objectKey).toMatch(/^private\/public-media\//);
      expect(await objectExists(staged.objectKey)).toBe(true);
      const head = await new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
          secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
        },
      }).send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: staged.objectKey }));
      expect(head.ContentType).toBe(staged.mimeType);
      const stored = await getPrivateObject(staged.objectKey, MAX_PUBLIC_MEDIA_BYTES);
      expect(Buffer.from(stored)).toEqual(staged.bytes);

      await discardStagedPublicImage(staged);
      expect(await objectExists(staged.objectKey)).toBe(false);

      const client = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
          secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
        },
      });
      const before = await client.send(
        new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET,
          Prefix: 'private/public-media/',
        }),
      );
      await expect(
        stagePublicImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
      ).rejects.toThrow();
      const after = await client.send(
        new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET,
          Prefix: 'private/public-media/',
        }),
      );
      expect(after.KeyCount).toBe(before.KeyCount);
    },
  );
});
