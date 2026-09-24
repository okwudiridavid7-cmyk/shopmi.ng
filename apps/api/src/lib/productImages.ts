import type { ProductImageAsset } from "@vendors/shared-types";

/** Normalize legacy string[] or object[] from DB into ProductImageAsset[]. */
export function parseProductImageAssets(raw: unknown): ProductImageAsset[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductImageAsset[] = [];
  for (const entry of raw) {
    if (typeof entry === "string" && entry.trim()) {
      out.push({ original: entry, watermarked: null });
    } else if (entry && typeof entry === "object") {
      const o = entry as { original?: unknown; watermarked?: unknown };
      if (typeof o.original === "string" && o.original.trim()) {
        out.push({
          original: o.original,
          watermarked:
            typeof o.watermarked === "string" ? o.watermarked : null,
        });
      }
    }
  }
  return out;
}

/** Public/display URLs — respects per-product watermark toggle. */
export function resolveProductDisplayImages(
  raw: unknown,
  watermarkEnabled: boolean
): string[] {
  return parseProductImageAssets(raw)
    .map((a) => {
      if (watermarkEnabled && a.watermarked) return a.watermarked;
      return a.original;
    })
    .filter(Boolean);
}

export function serializeProductImageAssets(
  assets: ProductImageAsset[]
): ProductImageAsset[] {
  return assets.map((a) => ({
    original: a.original,
    watermarked: a.watermarked ?? null,
  }));
}
