import type { ShopBanner, ShopCategory } from "@prisma/client";
import type {
  FaqItem,
  ShopBannerPublic,
  ShopCategoryPublic,
  SocialLinks,
} from "@vendors/shared-types";

export function toShopCategoryPublic(row: ShopCategory): ShopCategoryPublic {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toShopBannerPublic(row: ShopBanner): ShopBannerPublic {
  return {
    id: row.id,
    tenantId: row.tenantId,
    imageUrl: row.imageUrl,
    title: row.title,
    subtitle: row.subtitle,
    ctaText: row.ctaText,
    ctaUrl: row.ctaUrl,
    scrollSpeed: row.scrollSpeed,
    displayOrder: row.displayOrder,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function parseSocialLinks(value: unknown): SocialLinks | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: SocialLinks = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return Object.keys(out).length ? out : null;
}

export function parseFaqContent(value: unknown): FaqItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: FaqItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const q = (entry as { question?: unknown }).question;
    const a = (entry as { answer?: unknown }).answer;
    if (typeof q === "string" && typeof a === "string") {
      items.push({ question: q, answer: a });
    }
  }
  return items.length ? items : [];
}
