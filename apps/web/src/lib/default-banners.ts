import type { ShopBannerPublic } from "@vendors/shared-types";

/** Premium stock banner — professional retail photography (Unsplash). */
export const DEFAULT_SHOP_BANNER: Omit<
  ShopBannerPublic,
  "id" | "tenantId" | "createdAt" | "updatedAt"
> = {
  imageUrl:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80",
  title: "Shop the collection",
  subtitle: "New arrivals and everyday essentials from this store.",
  ctaText: "Browse products",
  ctaUrl: "#products",
  scrollSpeed: 5,
  displayOrder: 0,
  active: true,
};

export const DEFAULT_PLATFORM_BANNER: Omit<
  ShopBannerPublic,
  "id" | "tenantId" | "createdAt" | "updatedAt"
> = {
  imageUrl:
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1920&q=80",
  title: "Independent shops. Real checkout.",
  subtitle:
    "Find makers and retailers with branded storefronts — pay once, track your order.",
  ctaText: "Start browsing",
  ctaUrl: "#marketplace",
  scrollSpeed: 6,
  active: true,
  displayOrder: 0,
};

export type BannerSlide = {
  id: string;
  imageUrl: string;
  title?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  scrollSpeed?: number;
};

export function toBannerSlides(
  banners: Array<{
    id: string;
    imageUrl: string;
    title?: string | null;
    subtitle?: string | null;
    ctaText?: string | null;
    ctaUrl?: string | null;
    scrollSpeed?: number;
    active?: boolean;
  }>
): BannerSlide[] {
  return banners
    .filter((b) => b.active !== false)
    .map((b) => ({
      id: b.id,
      imageUrl: b.imageUrl,
      title: b.title,
      subtitle: b.subtitle,
      ctaText: b.ctaText,
      ctaUrl: b.ctaUrl,
      scrollSpeed: b.scrollSpeed,
    }));
}
