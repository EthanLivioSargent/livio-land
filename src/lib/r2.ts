// Cloudflare R2 client wrapper. R2 is S3-compatible so we use the AWS SDK.
// All four R2_* env vars must be set in production:
//   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
// (R2_ENDPOINT is derived from R2_ACCOUNT_ID.)

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET = process.env.R2_BUCKET || "livio-land-photos";

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in env.",
    );
  }
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export function isR2Configured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey);
}

/** Generate a unique R2 key for a listing photo. */
export function makePhotoKey(opts: {
  listingType: "dc" | "land";
  listingId: string;
  originalName: string;
}): string {
  const ext = (opts.originalName.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".jpg").toLowerCase();
  const id = randomBytes(8).toString("hex");
  return `${opts.listingType}/${opts.listingId}/${id}${ext}`;
}

/** Upload a buffer (e.g. from a multipart form upload) to R2 and return the key. */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

/**
 * Generate a presigned URL for a stored object so the browser can fetch it
 * directly from R2 without going through our Next.js server. Default TTL: 1h.
 *
 * External-URL escape hatch: if the `key` is already a fully-qualified http(s)
 * URL, return it as-is. This lets the demo seed (seedDemoLandListings) attach
 * Unsplash / Picsum photos to listings without uploading anything to R2 — the
 * ListingPhoto.r2Key column just stores the public URL directly.
 */
export async function getR2DownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (key.startsWith("https://") || key.startsWith("http://")) return key;
  const client = getR2Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}
