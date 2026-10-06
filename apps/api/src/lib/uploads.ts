import type { Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { getObject, keyFromPublicUrl } from "./storage";
import { isHttpsUrl } from "./safeUrl";

/**
 * Uploads are held in memory and never written under their client-supplied name.
 * The image service decodes and re-encodes the bytes before anything is stored.
 */
export function memoryUpload(maxBytes: number, maxFiles = 1) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: maxFiles, fields: 20, parts: maxFiles + 20 },
  });
}

export class UploadError extends Error {
  status = 400;
}

export function receiveSingle(
  upload: multer.Multer,
  field: string,
  req: Request,
  res: Response
): Promise<Express.Multer.File> {
  return new Promise((resolve, reject) => {
    upload.single(field)(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? "That file is too large."
            : "Upload failed.";
        return reject(new UploadError(message));
      }
      if (!req.file) return reject(new UploadError("Choose a file to upload."));
      return resolve(req.file);
    });
  });
}

export function receiveArray(
  upload: multer.Multer,
  field: string,
  maxCount: number,
  req: Request,
  res: Response
): Promise<Express.Multer.File[]> {
  return new Promise((resolve, reject) => {
    upload.array(field, maxCount)(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? "One of the files is too large."
            : "Upload failed.";
        return reject(new UploadError(message));
      }
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      return resolve(files);
    });
  });
}

/** Client filenames are display-only; strip anything that could break a header or the UI. */
export function displayFilename(raw: string, fallback = "document"): string {
  const name = raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "")
    .trim()
    .slice(0, 120);
  return name || fallback;
}

/** Streams a private object as a download. Never rendered inline on the API origin. */
export async function sendPrivateObject(
  res: Response,
  key: string,
  opts: { contentType: string; filename: string }
): Promise<void> {
  const body = await getObject("private", key);
  if (!body) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const ascii = opts.filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  res.setHeader("Content-Type", opts.contentType);
  res.setHeader("Content-Length", String(body.length));
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(opts.filename)}`
  );
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.end(body);
}

/** An image URL that points at our own media storage (so it was uploaded and re-encoded by us). */
export const ownMediaUrl = z
  .string()
  .trim()
  .max(500)
  .refine((u) => keyFromPublicUrl(u) !== null, { message: "Upload the image instead of linking to it." });

/** Our own media, or an https image (older products and banners link to external images). */
export const imageRef = z
  .string()
  .trim()
  .max(1000)
  .refine((u) => keyFromPublicUrl(u) !== null || isHttpsUrl(u), {
    message: "Upload the image or use an https:// link.",
  });
