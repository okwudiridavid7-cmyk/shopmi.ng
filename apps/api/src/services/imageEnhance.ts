import sharp from "sharp";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { newKey, publicUrl, putObject } from "../lib/storage";
import { enhanceBuffer, loadOwnImage, normalizeImage, watermarkBuffer } from "./images";
import { AiUnavailableError } from "./aiDescription";

const PHOTOROOM_URL = "https://sdk.photoroom.com/v1/segment";
const TIMEOUT_MS = 45_000;

export function enhancerConfigured(): boolean {
  return Boolean(env.photoroomApiKey);
}

/** Photoroom background removal onto a white background (marketplace style). */
export async function removeBackground(input: Buffer): Promise<Buffer> {
  if (!enhancerConfigured()) {
    throw new AiUnavailableError("Background removal isn't set up on this platform yet.");
  }
  const jpeg = await sharp(input).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
  const form = new FormData();
  form.append("image_file", new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), "image.jpg");
  form.append("bg_color", "#FFFFFF");
  form.append("format", "png");

  let res: Response;
  try {
    res = await fetch(PHOTOROOM_URL, {
      method: "POST",
      headers: { "x-api-key": env.photoroomApiKey },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[enhance] request failed:", err instanceof Error ? err.message : err);
    throw new Error("The image service didn't respond. Try again in a minute.");
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.error(`[enhance] Photoroom ${res.status}: ${detail}`);
    if (res.status === 400) throw new AiUnavailableError("We couldn't find a product in that photo.");
    if (res.status === 401 || res.status === 402 || res.status === 403) {
      throw new AiUnavailableError("Background removal is unavailable right now.");
    }
    throw new Error("The image service is busy. Try again in a minute.");
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Same watermark the upload route applies, so enhanced photos behave like uploads. */
export async function watermarkedCopy(tenantId: string, buffer: Buffer): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, themeSettings: true },
  });
  const theme = (tenant?.themeSettings as Record<string, unknown> | null) ?? {};
  const logo = await loadOwnImage(typeof theme.logoUrl === "string" ? theme.logoUrl : null);
  const marked = await watermarkBuffer(buffer, {
    text: tenant?.name ?? "Shop",
    logo,
    position: "bottom-right",
    opacity: 0.55,
  });
  const key = newKey(`t/${tenantId}/products`, "webp");
  await putObject("public", key, marked, "image/webp");
  return publicUrl(key);
}

/** Background removal, then a light auto-enhance; stores the result and a watermarked copy. */
export async function enhanceProductImage(
  tenantId: string,
  source: Buffer
): Promise<{ originalUrl: string; watermarkedUrl: string }> {
  const cutout = await removeBackground(source);
  const { buffer } = await normalizeImage(await enhanceBuffer(cutout), { maxSize: 1600 });
  const key = newKey(`t/${tenantId}/products`, "webp");
  await putObject("public", key, buffer, "image/webp");
  const watermarkedUrl = await watermarkedCopy(tenantId, buffer);
  return { originalUrl: publicUrl(key), watermarkedUrl };
}
