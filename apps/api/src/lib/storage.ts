import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../config/env";

/**
 * File storage. Public objects (product images, logos, banners) are served from a
 * cookieless media origin; private objects (invoices, KYC documents) are only ever
 * streamed through authenticated API routes.
 *
 * Production uses Cloudflare R2. Local development falls back to disk.
 */
export type Bucket = "public" | "private";

export const r2Configured = Boolean(
  env.r2AccountId &&
    env.r2AccessKeyId &&
    env.r2SecretAccessKey &&
    env.r2PublicBucket &&
    env.r2PrivateBucket &&
    env.mediaUrl
);

if (env.isProd && !r2Configured) {
  console.error(
    "[storage] R2 is not configured. Uploads go to local disk, which Render wipes on deploy and the worker cannot see."
  );
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    });
  }
  return client;
}

const bucketName = (b: Bucket) => (b === "public" ? env.r2PublicBucket : env.r2PrivateBucket);
const localRoot = (b: Bucket) => (b === "public" ? env.uploadsDir : env.privateUploadsDir);

const KEY_RE = /^[a-z0-9][a-z0-9/_.-]{0,250}$/i;

/** Keys are generated server-side; this guards every read/write against traversal anyway. */
export function assertSafeKey(key: string): string {
  if (!KEY_RE.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error("Invalid storage key");
  }
  return key;
}

function localPath(bucket: Bucket, key: string): string {
  const root = localRoot(bucket);
  const full = path.resolve(root, assertSafeKey(key));
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

/** Unguessable object key: `<prefix>/<32 hex chars>.<ext>`. */
export function newKey(prefix: string, ext: string): string {
  const cleanPrefix = prefix.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "");
  const cleanExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return assertSafeKey(`${cleanPrefix}/${crypto.randomBytes(16).toString("hex")}.${cleanExt}`);
}

export async function putObject(
  bucket: Bucket,
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  assertSafeKey(key);
  if (r2Configured) {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucketName(bucket),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: bucket === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
        ...(bucket === "private" ? { ContentDisposition: "attachment" } : {}),
      })
    );
    return;
  }
  const file = localPath(bucket, key);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, body);
}

export async function getObject(bucket: Bucket, key: string): Promise<Buffer | null> {
  assertSafeKey(key);
  if (r2Configured) {
    try {
      const res = await s3().send(new GetObjectCommand({ Bucket: bucketName(bucket), Key: key }));
      if (!res.Body) return null;
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name === "NoSuchKey" || name === "NotFound") return null;
      throw e;
    }
  }
  try {
    return await fs.promises.readFile(localPath(bucket, key));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function deleteObject(bucket: Bucket, key: string): Promise<void> {
  assertSafeKey(key);
  if (r2Configured) {
    await s3().send(new DeleteObjectCommand({ Bucket: bucketName(bucket), Key: key }));
    return;
  }
  await fs.promises.rm(localPath(bucket, key), { force: true });
}

function mediaBase(): string {
  return r2Configured ? env.mediaUrl : `${env.apiUrl}/uploads`;
}

export function publicUrl(key: string): string {
  return `${mediaBase()}/${assertSafeKey(key)}`;
}

/**
 * Maps one of our own public media URLs (current or legacy `${API_URL}/uploads/...`)
 * back to its storage key. Anything else returns null, so callers never fetch
 * arbitrary URLs or local paths.
 */
export function keyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const bases = [`${mediaBase()}/`, `${env.apiUrl}/uploads/`, "/uploads/"];
  if (env.mediaUrl) bases.push(`${env.mediaUrl}/`);
  for (const base of bases) {
    if (url.startsWith(base)) {
      const key = url.slice(base.length).split(/[?#]/)[0] ?? "";
      try {
        return assertSafeKey(decodeURIComponent(key));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Reads one of our own public images by URL. Returns null for foreign URLs. */
export async function readPublicByUrl(url: string | null | undefined): Promise<Buffer | null> {
  const key = keyFromPublicUrl(url);
  return key ? getObject("public", key) : null;
}
