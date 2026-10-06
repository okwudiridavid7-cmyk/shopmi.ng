import sharp, { type Metadata, type OverlayOptions } from "sharp";
import { getFontPair, getLogoIcon } from "../lib/logoCatalog";
import { newKey, publicUrl, putObject, readPublicByUrl } from "../lib/storage";

/** Decoding bombs: refuse anything above ~40 megapixels before allocating it. */
const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export class ImageRejectedError extends Error {
  status = 400;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Decodes the bytes (ignoring the client's filename and mimetype), checks the real
 * format, and re-encodes to WebP. Re-encoding drops EXIF/GPS and breaks polyglot
 * files, so nothing but pixels ever reaches storage.
 */
export async function normalizeImage(
  input: Buffer,
  opts: { maxSize?: number; allowAnimated?: boolean } = {}
): Promise<{ buffer: Buffer; width: number; height: number }> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new ImageRejectedError("That file isn't a readable image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ImageRejectedError("Only JPEG, PNG, WebP and GIF images are allowed.");
  }
  const animated = Boolean(opts.allowAnimated && meta.format === "gif" && (meta.pages ?? 1) > 1);
  const maxSize = opts.maxSize ?? 1600;
  try {
    const { data, info } = await sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
      animated,
    })
      .rotate()
      .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height };
  } catch {
    throw new ImageRejectedError("That image couldn't be processed.");
  }
}

export async function storePublicImage(
  input: Buffer,
  prefix: string,
  opts: { maxSize?: number; allowAnimated?: boolean } = {}
): Promise<{ key: string; url: string }> {
  const { buffer } = await normalizeImage(input, opts);
  const key = newKey(prefix, "webp");
  await putObject("public", key, buffer, "image/webp");
  return { key, url: publicUrl(key) };
}

export type WatermarkOptions = {
  text: string;
  logo?: Buffer | null;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  opacity?: number;
};

/** Overlays the shop logo (or name) on an already-normalised image buffer. */
export async function watermarkBuffer(input: Buffer, opts: WatermarkOptions): Promise<Buffer> {
  const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 800;
  const opacity = Math.min(1, Math.max(0.15, opts.opacity ?? 0.55));
  const position = opts.position ?? "bottom-right";
  const pad = Math.round(Math.min(width, height) * 0.03);
  const composites: OverlayOptions[] = [];

  if (opts.logo) {
    try {
      const logoSize = Math.max(24, Math.round(Math.min(width, height) * 0.18));
      const sized = await sharp(opts.logo, { limitInputPixels: MAX_INPUT_PIXELS })
        .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .ensureAlpha()
        .png()
        .toBuffer();
      // Scale the logo's own alpha by the opacity setting.
      const logoPng = await sharp(sized)
        .composite([
          {
            input: Buffer.from([255, 255, 255, Math.round(255 * opacity)]),
            raw: { width: 1, height: 1, channels: 4 },
            tile: true,
            blend: "dest-in",
          },
        ])
        .png()
        .toBuffer();
      const left = position.includes("right") ? width - logoSize - pad : pad;
      const top = position.includes("bottom") ? height - logoSize - pad : pad;
      composites.push({ input: logoPng, top, left, blend: "over" });
    } catch {
      /* fall back to the text label */
    }
  }

  if (composites.length === 0) {
    const fontSize = Math.max(16, Math.round(width * 0.032));
    const label = (opts.text || "Shopmi").slice(0, 40);
    const textWidth = Math.min(width - 32, Math.round(fontSize * label.length * 0.55 + 16));
    const textHeight = fontSize + 16;
    const x = position.includes("right") ? width - textWidth - 16 : 16;
    const y = position.includes("top") ? 16 : height - textHeight - 16;
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        `<rect x="${x}" y="${y}" width="${textWidth}" height="${textHeight}" rx="6" fill="#000" fill-opacity="${(opacity * 0.7).toFixed(2)}"/>` +
        `<text x="${x + 8}" y="${y + textHeight - 8}" fill="#fff" fill-opacity="${Math.min(1, opacity + 0.25).toFixed(2)}" font-size="${fontSize}" font-family="Inter, DejaVu Sans, sans-serif">${escapeXml(label)}</text>` +
        `</svg>`
    );
    composites.push({ input: svg, top: 0, left: 0 });
  }

  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .composite(composites)
    .webp({ quality: 82 })
    .toBuffer();
}

/** Loads a shop's logo for watermarking, only from our own storage. */
export async function loadOwnImage(url: string | null | undefined): Promise<Buffer | null> {
  try {
    return await readPublicByUrl(url);
  } catch {
    return null;
  }
}

/** Free local auto-enhance: levels, mild colour lift, sharpen. */
export async function enhanceBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .normalize()
    .modulate({ brightness: 1.03, saturation: 1.06 })
    .sharpen({ sigma: 0.8 })
    .webp({ quality: 86 })
    .toBuffer();
}

const LOGO_COLORS = ["#1f6b4a", "#0e4d6b", "#7a3e1d", "#3d2a6b", "#1a5c4a", "#8b2942"];

export function logoPresets(): { id: string; color: string; label: string }[] {
  return LOGO_COLORS.map((color, i) => ({ id: `preset-${i}`, color, label: `Palette ${i + 1}` }));
}

function iconSvgMarkup(iconId: string, size: number): string {
  const icon = getLogoIcon(iconId);
  const scale = size / 24;
  return `<g transform="translate(${size * 0.22}, ${size * 0.22}) scale(${scale * 0.56})" fill="none" stroke="#f8faf9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${escapeXml(icon.path)}"/></g>`;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

async function storeSvgAsPng(svg: string, prefix: string): Promise<string> {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const key = newKey(prefix, "png");
  await putObject("public", key, png, "image/png");
  return publicUrl(key);
}

/** Square favicon-style logo + horizontal lockup with shop name. */
export async function buildShopLogos(opts: {
  shopName: string;
  iconId: string;
  color: string;
  fontPairId: string;
  prefix: string;
}): Promise<{ squareUrl: string; rectUrl: string }> {
  const color = HEX_COLOR.test(opts.color) ? opts.color : "#1f6b4a";
  const fontPair = getFontPair(opts.fontPairId);
  const name = escapeXml((opts.shopName || "Shop").slice(0, 32));
  const font = escapeXml(fontPair.headingFont);

  const squareSize = 512;
  const squareSvg =
    `<svg width="${squareSize}" height="${squareSize}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${squareSize}" height="${squareSize}" rx="96" fill="${color}"/>` +
    iconSvgMarkup(opts.iconId, squareSize) +
    `</svg>`;

  const rectW = 800;
  const rectH = 200;
  const rectSvg =
    `<svg width="${rectW}" height="${rectH}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${rectW}" height="${rectH}" rx="24" fill="${color}"/>` +
    `<g transform="translate(32, 32)">${iconSvgMarkup(opts.iconId, 136)}</g>` +
    `<text x="200" y="118" fill="#f8faf9" font-size="52" font-family="${font}" font-weight="700">${name}</text>` +
    `</svg>`;

  const [squareUrl, rectUrl] = await Promise.all([
    storeSvgAsPng(squareSvg, opts.prefix),
    storeSvgAsPng(rectSvg, opts.prefix),
  ]);
  return { squareUrl, rectUrl };
}

/** Initials logo used during onboarding. */
export async function generateLogo(opts: { initials: string; color: string; prefix: string }): Promise<string> {
  const initials = escapeXml((opts.initials || "S").slice(0, 3).toUpperCase());
  const color = HEX_COLOR.test(opts.color) ? opts.color : "#1f6b4a";
  const size = 512;
  const svg =
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${size}" height="${size}" rx="96" fill="${color}"/>` +
    `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#f5faf7" font-size="180" font-family="Lora, 'DejaVu Serif', serif" font-weight="700">${initials}</text>` +
    `</svg>`;
  return storeSvgAsPng(svg, opts.prefix);
}
