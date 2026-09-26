import type { ShopBannerPublic } from "@vendors/shared-types";

/** Default autoplay interval (seconds) for hero banners. */
export const BANNER_AUTOPLAY_SEC = 10;

/** Premium stock banners — three slides so the peek carousel always has neighbors. */
export const DEFAULT_PLATFORM_BANNERS: Array<
  Omit<ShopBannerPublic, "id" | "tenantId" | "createdAt" | "updatedAt">
> = [
  {
    imageUrl:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    title: "Independent shops",
    subtitle:
      "Discover makers and retailers with branded storefronts — pay once, track your order.",
    ctaText: "Shop now",
    ctaUrl: "#marketplace",
    scrollSpeed: BANNER_AUTOPLAY_SEC,
    active: true,
    displayOrder: 0,
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1600&q=80",
    title: "Feel at home",
    subtitle: "Live better. Shop the marketplace for everyday essentials.",
    ctaText: "Browse products",
    ctaUrl: "#marketplace",
    scrollSpeed: BANNER_AUTOPLAY_SEC,
    active: true,
    displayOrder: 1,
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80",
    title: "Real checkout",
    subtitle:
      "Secure Paystack payments, clear invoices, and shops sized for small teams.",
    ctaText: "Start browsing",
    ctaUrl: "#marketplace",
    scrollSpeed: BANNER_AUTOPLAY_SEC,
    active: true,
    displayOrder: 2,
  },
];

/** @deprecated Use DEFAULT_PLATFORM_BANNERS[0] — kept for single-slide fallbacks. */
export const DEFAULT_PLATFORM_BANNER = DEFAULT_PLATFORM_BANNERS[0]!;

export const DEFAULT_SHOP_BANNER: Omit<
  ShopBannerPublic,
  "id" | "tenantId" | "createdAt" | "updatedAt"
> = {
  imageUrl:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
  title: "Shop the collection",
  subtitle: "New arrivals and everyday essentials from this store.",
  ctaText: "Browse products",
  ctaUrl: "#products",
  scrollSpeed: BANNER_AUTOPLAY_SEC,
  displayOrder: 0,
  active: true,
};

/** Three shop defaults so storefronts always get the peek carousel. */
export const DEFAULT_SHOP_BANNERS: Array<
  Omit<ShopBannerPublic, "id" | "tenantId" | "createdAt" | "updatedAt">
> = [
  DEFAULT_SHOP_BANNER,
  {
    imageUrl:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
    title: "New season picks",
    subtitle: "Curated looks and bestsellers from this shop.",
    ctaText: "Explore",
    ctaUrl: "#products",
    scrollSpeed: BANNER_AUTOPLAY_SEC,
    displayOrder: 1,
    active: true,
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80",
    title: "Made for you",
    subtitle: "Quality products with secure checkout.",
    ctaText: "Shop now",
    ctaUrl: "#products",
    scrollSpeed: BANNER_AUTOPLAY_SEC,
    displayOrder: 2,
    active: true,
  },
];

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
      scrollSpeed: b.scrollSpeed ?? BANNER_AUTOPLAY_SEC,
    }));
}

/** Ensure at least 3 slides for the peek carousel (pads with defaults). */
export function ensurePeekSlides(
  slides: BannerSlide[],
  defaults: BannerSlide[]
): BannerSlide[] {
  if (slides.length >= 3) return slides;
  if (slides.length === 0) return defaults.slice(0, 3);
  const out = [...slides];
  let i = 0;
  while (out.length < 3 && defaults.length > 0) {
    const d = defaults[i % defaults.length]!;
    out.push({ ...d, id: `${d.id}-pad-${out.length}` });
    i += 1;
  }
  return out;
}

export function platformDefaultSlides(): BannerSlide[] {
  return DEFAULT_PLATFORM_BANNERS.map((b, i) => ({
    id: `platform-default-${i}`,
    imageUrl: b.imageUrl,
    title: b.title,
    subtitle: b.subtitle,
    ctaText: b.ctaText,
    ctaUrl: b.ctaUrl,
    scrollSpeed: b.scrollSpeed ?? BANNER_AUTOPLAY_SEC,
  }));
}

export function shopDefaultSlides(shopName?: string): BannerSlide[] {
  return DEFAULT_SHOP_BANNERS.map((b, i) => ({
    id: `shop-default-${i}`,
    imageUrl: b.imageUrl,
    title: b.title,
    subtitle:
      i === 0 && shopName
        ? `New arrivals and everyday essentials from ${shopName}.`
        : b.subtitle,
    ctaText: b.ctaText,
    ctaUrl: b.ctaUrl,
    scrollSpeed: b.scrollSpeed ?? BANNER_AUTOPLAY_SEC,
  }));
}
