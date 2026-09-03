import { randomUUID } from 'node:crypto';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config.js';

const STORAGE_TIMEOUT_MS = 5_000;

const client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

async function withStorageTimeout<T>(
  operation: (abortSignal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STORAGE_TIMEOUT_MS);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function ensurePrivateBucket(): Promise<void> {
  try {
    await withStorageTimeout((abortSignal) =>
      client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }), { abortSignal }),
    );
  } catch {
    await withStorageTimeout((abortSignal) =>
      client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }), { abortSignal }),
    );
  }
}

export async function putPrivateObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await ensurePrivateBucket();
  await withStorageTimeout((abortSignal) =>
    client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.byteLength,
      }),
      { abortSignal },
    ),
  );
}

export async function getPrivateObject(key: string, maxBytes: number): Promise<Uint8Array> {
  return withStorageTimeout(async (abortSignal) => {
    const response = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
      abortSignal,
    });
    if (
      !response.Body ||
      (response.ContentLength !== undefined && response.ContentLength > maxBytes)
    ) {
      throw new Error('Stored media is unavailable or exceeds the configured response bound');
    }
    const bytes = await response.Body.transformToByteArray();
    if (bytes.byteLength > maxBytes) {
      throw new Error('Stored media exceeds the configured response bound');
    }
    return bytes;
  });
}

export async function deletePrivateObject(key: string): Promise<void> {
  await withStorageTimeout((abortSignal) =>
    client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), { abortSignal }),
  );
}

export const ALLOWED_EVIDENCE_TYPES = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export function newEvidenceKey(contentType: string): string {
  const ext = ALLOWED_EVIDENCE_TYPES.get(contentType) ?? 'bin';
  return `private/evidence/${randomUUID()}.${ext}`;
}

export async function createPresignedUpload(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 600 });
}

export async function createPresignedDownload(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await withStorageTimeout((abortSignal) =>
      client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), { abortSignal }),
    );
    return true;
  } catch {
    return false;
  }
}
