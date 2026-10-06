/**
 * Moves legacy disk uploads (`<API_URL>/uploads/<file>`) into R2 and rewrites every
 * stored URL to the media origin. Each file is decoded and re-encoded through the
 * normal image pipeline, so anything that is not a real raster image is dropped.
 *
 *   tsx prisma/migrate-media.ts --dry                  # report only
 *   tsx prisma/migrate-media.ts --from=https://api.shopmi.ng
 *
 * Files are read from the local uploads dir first, then fetched from `--from`
 * (the old API that still serves them). Safe to re-run.
 */
import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../src/config/env";
import { r2Configured } from "../src/lib/storage";
import { storePublicImage } from "../src/services/images";

const prisma = new PrismaClient();
const dry = process.argv.includes("--dry");
const fromArg = process.argv.find((a) => a.startsWith("--from="))?.slice("--from=".length);
const remoteOrigin = fromArg ? new URL(fromArg).origin : null;

const legacyOrigins = new Set(
  [env.apiUrl, remoteOrigin, "http://localhost:4000", "http://127.0.0.1:4000"]
    .filter((o): o is string => Boolean(o))
    .map((o) => new URL(o).origin)
);
const LEGACY_FILE = /^[a-z0-9][a-z0-9/_.-]{0,250}$/i;
const MAX_BYTES = 15 * 1024 * 1024;

const mapped = new Map<string, string | null>();
const stats = { moved: 0, missing: 0, rejected: 0, rowsUpdated: 0 };

function legacyFile(value: string): string | null {
  let pathname: string;
  if (value.startsWith("/uploads/")) {
    pathname = value;
  } else {
    try {
      const u = new URL(value);
      if (!legacyOrigins.has(u.origin)) return null;
      pathname = u.pathname;
    } catch {
      return null;
    }
  }
  if (!pathname.startsWith("/uploads/")) return null;
  const file = decodeURIComponent(pathname.slice("/uploads/".length));
  if (!LEGACY_FILE.test(file) || file.includes("..") || file.startsWith("invoices/")) return null;
  return file;
}

async function readLegacy(file: string): Promise<Buffer | null> {
  const local = path.resolve(env.uploadsDir, file);
  if (local.startsWith(env.uploadsDir + path.sep) && fs.existsSync(local)) {
    return fs.promises.readFile(local);
  }
  if (!remoteOrigin) return null;
  try {
    const res = await fetch(`${remoteOrigin}/uploads/${file}`, {
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > MAX_BYTES ? null : buf;
  } catch {
    return null;
  }
}

async function migrateUrl(value: string): Promise<string> {
  const file = legacyFile(value);
  if (!file) return value;
  if (!mapped.has(file)) {
    const data = await readLegacy(file);
    if (!data) {
      stats.missing += 1;
      console.warn(`missing: ${file}`);
      mapped.set(file, null);
    } else if (dry) {
      mapped.set(file, `(r2)/${file}`);
      stats.moved += 1;
    } else {
      try {
        const { url } = await storePublicImage(data, "legacy", { maxSize: 2400, allowAnimated: true });
        mapped.set(file, url);
        stats.moved += 1;
      } catch {
        stats.rejected += 1;
        console.warn(`not an image, dropped: ${file}`);
        mapped.set(file, null);
      }
    }
  }
  return mapped.get(file) ?? value;
}

async function walk(value: unknown): Promise<unknown> {
  if (typeof value === "string") return migrateUrl(value);
  if (Array.isArray(value)) return Promise.all(value.map(walk));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await walk(v);
    return out;
  }
  return value;
}

const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
const asJson = (v: unknown) => v as Prisma.InputJsonValue;

async function main() {
  if (!dry && !r2Configured) {
    throw new Error("R2 is not configured (R2_* and MEDIA_URL). Run with --dry to preview.");
  }
  console.log(`${dry ? "[dry run] " : ""}legacy origins: ${[...legacyOrigins].join(", ")}`);

  for (const p of await prisma.product.findMany({ select: { id: true, images: true } })) {
    const next = await walk(p.images);
    if (changed(p.images, next)) {
      stats.rowsUpdated += 1;
      if (!dry) await prisma.product.update({ where: { id: p.id }, data: { images: asJson(next) } });
    }
  }

  for (const t of await prisma.tenant.findMany({ select: { id: true, themeSettings: true } })) {
    if (!t.themeSettings) continue;
    const next = await walk(t.themeSettings);
    if (changed(t.themeSettings, next)) {
      stats.rowsUpdated += 1;
      if (!dry) await prisma.tenant.update({ where: { id: t.id }, data: { themeSettings: asJson(next) } });
    }
  }

  for (const b of await prisma.shopBanner.findMany({ select: { id: true, imageUrl: true } })) {
    const next = await migrateUrl(b.imageUrl);
    if (next !== b.imageUrl) {
      stats.rowsUpdated += 1;
      if (!dry) await prisma.shopBanner.update({ where: { id: b.id }, data: { imageUrl: next } });
    }
  }

  for (const c of await prisma.campaign.findMany({ select: { id: true, content: true } })) {
    const next = await walk(c.content);
    if (changed(c.content, next)) {
      stats.rowsUpdated += 1;
      if (!dry) await prisma.campaign.update({ where: { id: c.id }, data: { content: asJson(next) } });
    }
  }

  for (const s of await prisma.platformSetting.findMany()) {
    let next: string;
    try {
      const parsed: unknown = JSON.parse(s.value);
      next = typeof parsed === "object" && parsed ? JSON.stringify(await walk(parsed)) : await migrateUrl(s.value);
    } catch {
      next = await migrateUrl(s.value);
    }
    if (next !== s.value) {
      stats.rowsUpdated += 1;
      if (!dry) await prisma.platformSetting.update({ where: { id: s.id }, data: { value: next } });
    }
  }

  console.log(
    `${dry ? "[dry run] " : ""}files moved: ${stats.moved}, missing: ${stats.missing}, ` +
      `rejected: ${stats.rejected}, rows updated: ${stats.rowsUpdated}`
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
