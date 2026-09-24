import path from "path";
import fs from "fs";
import sharp, { type OverlayOptions } from "sharp";
import { env } from "../config/env";
import { getFontPair, getLogoIcon } from "../lib/logoCatalog";

fs.mkdirSync(env.uploadsDir, { recursive: true });

function resolveLocalPath(imageUrlOrPath: string): string | null {
  if (imageUrlOrPath.startsWith("/uploads/")) {
    return path.join(env.uploadsDir, imageUrlOrPath.replace(/^\/uploads\//, ""));
  }
  if (imageUrlOrPath.startsWith(env.apiUrl + "/uploads/")) {
    const rel = imageUrlOrPath.slice((env.apiUrl + "/uploads/").length);
    return path.join(env.uploadsDir, rel);
  }
  return null;
}

async function loadBuffer(imageUrlOrPath: string): Promise<Buffer> {
  const local = resolveLocalPath(imageUrlOrPath);
  if (local && fs.existsSync(local)) {
    return fs.readFileSync(local);
  }
  if (
    imageUrlOrPath.startsWith("http://") ||
    imageUrlOrPath.startsWith("https://")
  ) {
    const res = await fetch(imageUrlOrPath);
    if (!res.ok) throw new Error("Failed to fetch image");
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Unsupported image source");
}

function publicUrl(filename: string): string {
  return `${env.apiUrl}/uploads/${filename}`;
}

export type WatermarkOptions = {
  text: string;
  logoUrl?: string | null;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  opacity?: number;
};

/** Light enhance: normalize + mild sharpen + moderate contrast. */
export async function enhanceImage(imageUrlOrPath: string): Promise<string> {
  const input = await loadBuffer(imageUrlOrPath);
  const filename = `enh-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const outPath = path.join(env.uploadsDir, filename);
  await sharp(input)
    .rotate()
    .normalize()
    .modulate({ brightness: 1.05, saturation: 1.08 })
    .sharpen()
    .jpeg({ quality: 88 })
    .toFile(outPath);
  return publicUrl(filename);
}

/** Overlay shop logo (or text) watermark at configurable corner/opacity. */
export async function watermarkImage(
  imageUrlOrPath: string,
  opts: WatermarkOptions
): Promise<string> {
  const input = await loadBuffer(imageUrlOrPath);
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 800;
  const opacity = Math.min(1, Math.max(0.15, opts.opacity ?? 0.55));
  const position = opts.position ?? "bottom-right";
  const composites: OverlayOptions[] = [];

  if (opts.logoUrl) {
    try {
      const logoBuf = await loadBuffer(opts.logoUrl);
      const logoSize = Math.round(Math.min(width, height) * 0.18);
      const logoPng = await sharp(logoBuf)
        .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      const pad = Math.round(Math.min(width, height) * 0.03);
      let left = pad;
      let top = pad;
      if (position.includes("right")) left = width - logoSize - pad;
      if (position.includes("bottom")) top = height - logoSize - pad;
      composites.push({ input: logoPng, top, left, blend: "over" });
    } catch {
      /* fall through to text */
    }
  }

  if (composites.length === 0) {
    const fontSize = Math.max(16, Math.round(width * 0.032));
    const label = (opts.text || "Vendors").slice(0, 40);
    const escaped = label
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const textWidth = fontSize * label.length * 0.55 + 16;
    const textHeight = fontSize + 16;
    let x = 16;
    let y = height - textHeight - 16;
    if (position.includes("right")) x = width - textWidth - 16;
    if (position.includes("top")) y = 16;

    const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}">
  <rect x="${x}" y="${y}" width="${textWidth}" height="${textHeight}" rx="6" fill="rgba(0,0,0,${opacity * 0.7})"/>
  <text x="${x + 8}" y="${y + textHeight - 8}" fill="rgba(255,255,255,${opacity + 0.25})" font-size="${fontSize}" font-family="system-ui,sans-serif">${escaped}</text>
</svg>`);
    composites.push({ input: svg, top: 0, left: 0 });
  }

  const filename = `wm-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const outPath = path.join(env.uploadsDir, filename);
  await sharp(input)
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(outPath);
  return publicUrl(filename);
}

const LOGO_COLORS = [
  "#1f6b4a",
  "#0e4d6b",
  "#7a3e1d",
  "#3d2a6b",
  "#1a5c4a",
  "#8b2942",
];

export function logoPresets(): { id: string; color: string; label: string }[] {
  return LOGO_COLORS.map((color, i) => ({
    id: `preset-${i}`,
    color,
    label: `Palette ${i + 1}`,
  }));
}

function iconSvgMarkup(iconId: string, color: string, size: number): string {
  const icon = getLogoIcon(iconId);
  const scale = size / 24;
  return `<g transform="translate(${size * 0.22}, ${size * 0.22}) scale(${scale * 0.56})" fill="none" stroke="#f8faf9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.path}"/></g>`;
}

/** Square favicon-style logo + horizontal lockup with shop name. */
export async function buildShopLogos(opts: {
  shopName: string;
  iconId: string;
  color: string;
  fontPairId: string;
}): Promise<{ squareUrl: string; rectUrl: string }> {
  const color = /^#[0-9a-fA-F]{6}$/.test(opts.color) ? opts.color : "#1f6b4a";
  const fontPair = getFontPair(opts.fontPairId);
  const name = (opts.shopName || "Shop").slice(0, 32);
  const escaped = name
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const squareSize = 512;
  const squareSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${squareSize}" height="${squareSize}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${squareSize}" height="${squareSize}" rx="96" fill="${color}"/>
  ${iconSvgMarkup(opts.iconId, color, squareSize)}
</svg>`);

  const squareName = `logo-sq-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  await sharp(squareSvg).png().toFile(path.join(env.uploadsDir, squareName));

  const rectW = 800;
  const rectH = 200;
  const rectSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${rectW}" height="${rectH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${rectW}" height="${rectH}" rx="24" fill="${color}"/>
  <g transform="translate(32, 32)">
    ${iconSvgMarkup(opts.iconId, color, 136)}
  </g>
  <text x="200" y="118" fill="#f8faf9" font-size="52" font-family="${fontPair.headingFont}" font-weight="700">${escaped}</text>
</svg>`);

  const rectName = `logo-rect-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  await sharp(rectSvg).png().toFile(path.join(env.uploadsDir, rectName));

  return {
    squareUrl: publicUrl(squareName),
    rectUrl: publicUrl(rectName),
  };
}

/** Legacy initials logo — kept for onboarding compatibility. */
export async function generateLogo(opts: {
  initials: string;
  color: string;
  shopName?: string;
}): Promise<string> {
  const initials = (opts.initials || "V").slice(0, 3).toUpperCase();
  const color = /^#[0-9a-fA-F]{6}$/.test(opts.color) ? opts.color : "#1f6b4a";
  const size = 512;
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="96" fill="${color}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
    fill="#f5faf7" font-size="180" font-family="Georgia,serif" font-weight="700">${initials}</text>
</svg>`);

  const filename = `logo-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const outPath = path.join(env.uploadsDir, filename);
  await sharp(svg).png().toFile(outPath);
  return publicUrl(filename);
}
