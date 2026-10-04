import type { StoreThemeId } from "@vendors/shared-types";

export type StoreThemeCredit = {
  name: string;
  author: string;
  url: string;
  license: string;
};

export type StoreThemeMeta = {
  id: StoreThemeId;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  /** Background, surface, ink and default accent - used for gallery chips. */
  swatches: [string, string, string, string];
  /** Accent used when the seller has not picked a brand colour. */
  defaultBrand: string;
  /** Width of the nav + page container. */
  container: string;
  /** Screenshot shown in the theme gallery. */
  preview: string;
  credit: StoreThemeCredit | null;
};

export const STORE_THEMES: StoreThemeMeta[] = [
  {
    id: "classic",
    name: "Classic",
    tagline: "The original Shopmi.ng storefront",
    description:
      "Brand-coloured header, banner carousel, promo rows and a filterable catalogue.",
    bestFor: ["Any shop"],
    swatches: ["#ffffff", "#f4f4f5", "#111113", "#ff822e"],
    defaultBrand: "#ff822e",
    container: "max-w-6xl",
    preview: "/themes/classic.jpg",
    credit: null,
  },
  {
    id: "mono",
    name: "Mono",
    tagline: "Quiet, product-first and fast",
    description:
      "A feature grid of your top three products, a moving product strip and clean square cards with price tags.",
    bestFor: ["Electronics", "Accessories", "Lifestyle"],
    swatches: ["#fafafa", "#ffffff", "#0a0a0a", "#155dfc"],
    defaultBrand: "#155dfc",
    container: "max-w-7xl",
    preview: "/themes/mono.jpg",
    credit: {
      name: "Next.js Commerce",
      author: "Vercel, Inc.",
      url: "https://github.com/vercel/commerce",
      license: "MIT",
    },
  },
  {
    id: "runway",
    name: "Runway",
    tagline: "Big imagery, bold type",
    description:
      "Full-width hero, scrolling announcement bar, tall product cards that swap photos on hover and image tiles for each collection.",
    bestFor: ["Fashion", "Shoes", "Accessories"],
    swatches: ["#ffffff", "#f3f2f0", "#1e1c1a", "#1e1c1a"],
    defaultBrand: "#1e1c1a",
    container: "max-w-7xl",
    preview: "/themes/runway.jpg",
    credit: {
      name: "Pilot",
      author: "Weaverse JSC",
      url: "https://github.com/Weaverse/pilot",
      license: "MIT",
    },
  },
  {
    id: "atelier",
    name: "Atelier",
    tagline: "Warm, calm and story-led",
    description:
      "Serif headlines on warm cream, a centred logo, large collection tiles and an about block that tells your story.",
    bestFor: ["Beauty", "Home & decor", "Handmade", "Food"],
    swatches: ["#f6f1ea", "#fbf8f3", "#2b2420", "#8a5a3b"],
    defaultBrand: "#8a5a3b",
    container: "max-w-6xl",
    preview: "/themes/atelier.jpg",
    credit: {
      name: "Sofa Society (Medusa fashion starter)",
      author: "Agilo",
      url: "https://github.com/Agilo/fashion-starter",
      license: "MIT",
    },
  },
  {
    id: "bazaar",
    name: "Bazaar",
    tagline: "Dense, deal-driven catalogue",
    description:
      "Big search bar, category strip, deals beside the banner and compact cards with ratings, stock and quick add to cart.",
    bestFor: ["Large catalogues", "Electronics", "Food", "Wholesale"],
    swatches: ["#f3f4f6", "#ffffff", "#111827", "#1a56db"],
    defaultBrand: "#1a56db",
    container: "max-w-7xl",
    preview: "/themes/bazaar.jpg",
    credit: {
      name: "Flowbite e-commerce blocks (free tier)",
      author: "Bergside Inc.",
      url: "https://github.com/themesberg/flowbite",
      license: "MIT",
    },
  },
  {
    id: "pop",
    name: "Pop",
    tagline: "Loud, playful, thick outlines",
    description:
      "Neo-brutalist cards with hard shadows, a tilted product collage, a marquee strip and buttons that press in.",
    bestFor: ["Lifestyle", "Fashion", "Food", "Toys"],
    swatches: ["#fff4d6", "#ffffff", "#000000", "#ff5c8a"],
    defaultBrand: "#ff5c8a",
    container: "max-w-6xl",
    preview: "/themes/pop.jpg",
    credit: {
      name: "Neobrutalism components",
      author: "Samuel Breznjak",
      url: "https://github.com/ekmas/neobrutalism-components",
      license: "MIT",
    },
  },
];

/** Shop types offered as filters in the theme library. */
export const THEME_FILTERS = ["Fashion", "Beauty", "Electronics", "Food", "Home & decor", "Lifestyle"];

export function storeThemeMeta(id: StoreThemeId): StoreThemeMeta {
  return STORE_THEMES.find((t) => t.id === id) ?? STORE_THEMES[0]!;
}

export const THEME_PREVIEW_PARAM = "theme";

export function themePreviewStorageKey(slug: string): string {
  return `shopmi-theme-preview:${slug}`;
}
